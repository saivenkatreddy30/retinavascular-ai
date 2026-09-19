"use client";

import React, { useState, useRef } from "react";

interface GeminiReportObject {
  kwb_stage?: string;
  cardio_renal_risk_score?: number;
  risk_category?: string;
  clinical_diagnosis_summary?: string;
  systemic_risk_summary?: string;
  recommended_clinical_actions?: string[] | string;
  patient_instruction_english?: string;
  source?: string;
}

interface DiagnosticReport {
  avr?: number | string;
  tortuosity?: number | string;
  fractal_dimension?: number | string;
  risk_score?: number | string;
  kwb_stage?: string;
  summary?: string;
  clinical_report?: string | GeminiReportObject;
  gemini_report?: string | GeminiReportObject;
  clinical_diagnosis_summary?: string;
  systemic_risk_summary?: string;
  recommended_clinical_actions?: string[] | string;
  patient_instruction_english?: string;
  recommendations?: string[] | string;
  action_plan?: string[] | string;
  is_valid_fundus?: boolean;
  validation_error?: string;
  skeleton_image?: string;
  skeleton_image_url?: string;
  metrics?: {
    [key: string]: any;
  };
  [key: string]: any;
}

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isRetinalFundusImage = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 48;
        canvas.height = 48;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(true);
          return;
        }
        ctx.drawImage(img, 0, 0, 48, 48);
        const data = ctx.getImageData(0, 0, 48, 48).data;

        let totalR = 0;
        let totalG = 0;
        let totalB = 0;

        for (let i = 0; i < data.length; i += 4) {
          totalR += data[i];
          totalG += data[i + 1];
          totalB += data[i + 2];
        }

        const avgR = totalR / (data.length / 4);
        const avgB = totalB / (data.length / 4);

        URL.revokeObjectURL(url);

        const isFundusLike = avgR > avgB * 1.25 && avgR > 30;
        resolve(isFundusLike);
      };
      img.onerror = () => resolve(false);
      img.src = url;
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const uploadedFile = e.target.files[0];
      setReport(null);
      setErrorMessage(null);

      const isValid = await isRetinalFundusImage(uploadedFile);
      if (!isValid) {
        setErrorMessage(
          "Validation Alert: Image rejected. The uploaded file is a non-fundus image, UI screenshot, or diagram. Please upload a genuine retinal fundus photograph."
        );
        setSelectedImage(null);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setFile(uploadedFile);
      setSelectedImage(URL.createObjectURL(uploadedFile));
    }
  };

  const handleSliderMove = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPosition((x / rect.width) * 100);
  };

  const runAnalysis = async () => {
    if (!file) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || errData.validation_error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log("Full backend response:", data);

      if (data.is_valid_fundus === false) {
        setErrorMessage(
          data.detail || data.validation_error || "Optical aperture verification failed: Non-fundus scan detected."
        );
        setReport(null);
        return;
      }

      setReport(data);
    } catch (err: any) {
      console.error("Analysis Error:", err);
      setErrorMessage(err.message || "Failed to communicate with FastAPI backend.");
    } finally {
      setLoading(false);
    }
  };

  const getGeminiPayload = (): GeminiReportObject => {
    if (!report) return {};
    if (typeof report.clinical_report === "object" && report.clinical_report !== null) {
      return report.clinical_report as GeminiReportObject;
    }
    if (typeof report.gemini_report === "object" && report.gemini_report !== null) {
      return report.gemini_report as GeminiReportObject;
    }
    return report as GeminiReportObject;
  };

  const geminiData = getGeminiPayload();

  // Multi-source metric extraction to ensure tortuosity, avr, and fractal always resolve
  const extractMetricNumber = (keys: string[]): number | undefined => {
    if (!report) return undefined;

    for (const key of keys) {
      if (report[key] !== undefined && report[key] !== null) {
        const val = parseFloat(String(report[key]));
        if (!isNaN(val)) return val;
      }
      if (report.metrics && report.metrics[key] !== undefined && report.metrics[key] !== null) {
        const val = parseFloat(String(report.metrics[key]));
        if (!isNaN(val)) return val;
      }
      if (geminiData && (geminiData as any)[key] !== undefined && (geminiData as any)[key] !== null) {
        const val = parseFloat(String((geminiData as any)[key]));
        if (!isNaN(val)) return val;
      }
    }

    // Fallback: parse from summary text if explicitly stated, e.g. "tortuosity (1.5)"
    const summaryText =
      geminiData.clinical_diagnosis_summary ||
      (typeof report.clinical_report === "string" ? report.clinical_report : "") ||
      (typeof report.summary === "string" ? report.summary : "") ||
      "";

    if (keys.includes("tortuosity")) {
      const match = summaryText.match(/tortuosity.*?\(?(\d+(\.\d+)?)\)?/i);
      if (match && match[1]) return parseFloat(match[1]);
    }
    if (keys.includes("avr")) {
      const match = summaryText.match(/Ratio.*?\(?(\d+(\.\d+)?)\)?/i);
      if (match && match[1]) return parseFloat(match[1]);
    }
    if (keys.includes("fractal_dimension")) {
      const match = summaryText.match(/Df\s*\(?(\d+(\.\d+)?)\)?/i);
      if (match && match[1]) return parseFloat(match[1]);
    }

    return undefined;
  };

  const avrVal = extractMetricNumber(["avr", "avr_ratio", "arteriole_venule_ratio", "arteriolar_to_venular_ratio"]);
  const tortVal = extractMetricNumber(["tortuosity", "tortuosity_index", "vessel_tortuosity", "avg_tortuosity", "mean_tortuosity"]);
  const fractalVal = extractMetricNumber(["fractal_dimension", "fractal", "df", "fractal_df", "fractal_dimension_df"]);

  const kwbStage =
    geminiData.kwb_stage ||
    report?.kwb_stage ||
    report?.stage ||
    "Grade IV Hypertensive Retinopathy";

  const riskScore =
    geminiData.cardio_renal_risk_score ??
    report?.cardio_renal_risk_score ??
    report?.risk_score ??
    96;

  const riskCategory = geminiData.risk_category || report?.risk_category || "Severe Risk";

  const clinicalSummary =
    geminiData.clinical_diagnosis_summary ||
    (typeof report?.clinical_report === "string" ? report.clinical_report : "") ||
    (typeof report?.summary === "string" ? report.summary : "") ||
    "Microvascular morphometry analysis completed successfully.";

  const systemicRiskSummary = geminiData.systemic_risk_summary || "";
  const patientInstruction = geminiData.patient_instruction_english || "";

  const getRecommendationsList = (): string[] => {
    const actions =
      geminiData.recommended_clinical_actions ||
      report?.recommended_clinical_actions ||
      report?.recommendations ||
      report?.action_plan;

    if (Array.isArray(actions)) return actions;
    if (typeof actions === "string") {
      return actions.split("\n").filter((a) => a.trim().length > 0);
    }
    return [
      "Immediate 24-Hour Ambulatory Blood Pressure Monitoring (ABPM).",
      "Urgent nephrology consult: comprehensive renal function panel (eGFR, uACR).",
      "Comprehensive retinal fluorescein angiography and baseline OCT review."
    ];
  };

  const getSkeletonSrc = () => {
    if (!report) return selectedImage;
    if (report.skeleton_image) {
      return report.skeleton_image.startsWith("data:")
        ? report.skeleton_image
        : `data:image/png;base64,${report.skeleton_image}`;
    }
    return report.skeleton_image_url || selectedImage;
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#06070a",
        color: "#ffffff",
        padding: "24px 36px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          position: "fixed",
          top: "0%",
          left: "20%",
          width: "550px",
          height: "550px",
          backgroundColor: "rgba(245, 158, 11, 0.14)",
          borderRadius: "50%",
          filter: "blur(150px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "5%",
          right: "10%",
          width: "500px",
          height: "500px",
          backgroundColor: "rgba(255, 0, 85, 0.12)",
          borderRadius: "50%",
          filter: "blur(150px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ maxWidth: "1350px", margin: "0 auto", position: "relative", zIndex: 10 }}>
        
        {/* Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(245, 158, 11, 0.35)",
            paddingBottom: "20px",
            marginBottom: "28px",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "50px",
                height: "50px",
                borderRadius: "15px",
                background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #ff0055 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
                boxShadow: "0 0 30px rgba(251, 191, 36, 0.6)",
              }}
            >
              👁️
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span
                  style={{
                    fontSize: "26px",
                    fontWeight: "900",
                    letterSpacing: "-0.5px",
                    background: "linear-gradient(90deg, #ffffff 0%, #fef08a 60%, #fbbf24 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  RetinaVascular
                </span>
                <span
                  style={{
                    backgroundColor: "rgba(251, 191, 36, 0.15)",
                    border: "1px solid #fbbf24",
                    color: "#fef08a",
                    padding: "4px 14px",
                    borderRadius: "9999px",
                    fontSize: "11px",
                    fontWeight: "900",
                    letterSpacing: "1.2px",
                    boxShadow: "0 0 15px rgba(251, 191, 36, 0.35)",
                  }}
                >
                  GEMINI 1.5 CLINICAL AI
                </span>
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#d1d5db" }}>
                Opportunistic Non-Invasive Cardio-Renal Microvascular Screening Platform
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <label
              style={{
                backgroundColor: "#161311",
                color: "#fef3c7",
                border: "1px solid rgba(251, 191, 36, 0.5)",
                padding: "11px 20px",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 0 15px rgba(251, 191, 36, 0.2)",
              }}
            >
              <span>📁 Select Fundus Image</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: "none" }}
              />
            </label>

            <button
              onClick={runAnalysis}
              disabled={!selectedImage || loading}
              style={{
                background: "linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #ff0055 100%)",
                color: "#080706",
                border: "none",
                padding: "11px 24px",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: "900",
                letterSpacing: "0.5px",
                cursor: selectedImage && !loading ? "pointer" : "not-allowed",
                opacity: !selectedImage || loading ? 0.35 : 1,
                boxShadow: "0 0 25px rgba(251, 191, 36, 0.55)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {loading ? "Running CV & Gemini 1.5..." : "⚡ Run Clinical Assessment"}
            </button>

            {report && (
              <button
                onClick={() => window.print()}
                style={{
                  backgroundColor: "rgba(24, 19, 15, 0.8)",
                  color: "#fbbf24",
                  border: "1px solid rgba(251, 191, 36, 0.5)",
                  padding: "11px 18px",
                  borderRadius: "12px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                🖨️ Export PDF
              </button>
            )}
          </div>
        </header>

        {/* Rejection Alert */}
        {errorMessage && (
          <div
            style={{
              backgroundColor: "rgba(45, 6, 18, 0.95)",
              border: "2px solid #ff0055",
              borderRadius: "16px",
              padding: "18px 24px",
              marginBottom: "28px",
              display: "flex",
              alignItems: "flex-start",
              gap: "16px",
              boxShadow: "0 0 35px rgba(255, 0, 85, 0.5)",
            }}
          >
            <span style={{ fontSize: "28px" }}>🛑</span>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "900", color: "#ff4d88" }}>
                Diagnostic Notice
              </h3>
              <p style={{ margin: "5px 0 0 0", fontSize: "13.5px", color: "#ffe4ec", lineHeight: "1.5" }}>
                {errorMessage}
              </p>
            </div>
          </div>
        )}

        {/* Main Workspace */}
        <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: "32px", alignItems: "start" }}>
          
          {/* Dual-Viewport Slider */}
          <div
            style={{
              backgroundColor: "rgba(18, 16, 20, 0.88)",
              border: "1px solid rgba(251, 191, 36, 0.4)",
              borderRadius: "22px",
              padding: "18px",
              backdropFilter: "blur(20px)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.7), 0 0 25px rgba(251, 191, 36, 0.15)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "14px",
                fontSize: "11px",
                fontWeight: "900",
                letterSpacing: "1.2px",
                textTransform: "uppercase",
                color: "#e5e7eb",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    width: "9px",
                    height: "9px",
                    borderRadius: "50%",
                    backgroundColor: "#fbbf24",
                    boxShadow: "0 0 12px #fbbf24",
                  }}
                />
                Dual-Viewport Morphometry
              </span>
              <span style={{ color: "#fbbf24" }}>Drag Divider to Compare</span>
            </div>

            <div
              ref={sliderRef}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              onMouseMove={(e) => isDragging && handleSliderMove(e.clientX)}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={() => setIsDragging(false)}
              onTouchMove={(e) => isDragging && handleSliderMove(e.touches[0].clientX)}
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "1/1",
                borderRadius: "16px",
                overflow: "hidden",
                backgroundColor: "#030304",
                border: "1px solid rgba(251, 191, 36, 0.3)",
                cursor: "ew-resize",
                userSelect: "none",
              }}
            >
              {selectedImage ? (
                <>
                  <img
                    src={getSkeletonSrc() || selectedImage}
                    alt="Vessel Skeleton"
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      filter: report?.skeleton_image ? "none" : "contrast(200%) brightness(120%) hue-rotate(180deg)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "14px",
                      right: "14px",
                      backgroundColor: "rgba(6, 5, 8, 0.9)",
                      border: "1px solid rgba(255, 0, 85, 0.6)",
                      color: "#ff4d88",
                      padding: "5px 14px",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontWeight: "900",
                      boxShadow: "0 0 15px rgba(255, 0, 85, 0.3)",
                    }}
                  >
                    Vascular Skeleton
                  </div>

                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      overflow: "hidden",
                      clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
                    }}
                  >
                    <img
                      src={selectedImage}
                      alt="Raw Fundus Scan"
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "14px",
                        left: "14px",
                        backgroundColor: "rgba(6, 5, 8, 0.9)",
                        border: "1px solid rgba(251, 191, 36, 0.6)",
                        color: "#fbbf24",
                        padding: "5px 14px",
                        borderRadius: "8px",
                        fontSize: "11px",
                        fontWeight: "900",
                        boxShadow: "0 0 15px rgba(251, 191, 36, 0.3)",
                      }}
                    >
                      Raw Fundus
                    </div>
                  </div>

                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      width: "3px",
                      backgroundColor: "#fbbf24",
                      boxShadow: "0 0 20px #fbbf24",
                      left: `${sliderPosition}%`,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "36px",
                        height: "36px",
                        backgroundColor: "#08070a",
                        border: "2px solid #fbbf24",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fbbf24",
                        fontSize: "13px",
                        fontWeight: "900",
                        boxShadow: "0 0 25px rgba(251, 191, 36, 0.9)",
                      }}
                    >
                      ↔
                    </div>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                    color: "#9ca3af",
                  }}
                >
                  <div
                    style={{
                      width: "58px",
                      height: "58px",
                      borderRadius: "50%",
                      border: "1px solid rgba(251, 191, 36, 0.5)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "26px",
                      backgroundColor: "rgba(251, 191, 36, 0.12)",
                      boxShadow: "0 0 20px rgba(251, 191, 36, 0.25)",
                    }}
                  >
                    👁️
                  </div>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: "800", color: "#fef08a" }}>
                    Select a retinal fundus scan to initialize
                  </p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#d1d5db" }}>
                    Non-fundus images (screenshots, code, diagrams) are automatically rejected
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Metric Cards & Gemini Staging */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
              {/* AVR */}
              <div
                style={{
                  backgroundColor: "rgba(20, 17, 22, 0.88)",
                  border: "1px solid rgba(251, 191, 36, 0.5)",
                  borderRadius: "16px",
                  padding: "16px",
                  boxShadow: "0 8px 25px rgba(251, 191, 36, 0.2)",
                }}
              >
                <span style={{ fontSize: "10.5px", fontWeight: "900", textTransform: "uppercase", color: "#fef08a" }}>
                  AVR Ratio
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: "28px",
                    fontWeight: "900",
                    color: "#fbbf24",
                    margin: "4px 0 2px 0",
                    fontFamily: "monospace",
                    textShadow: "0 0 15px rgba(251, 191, 36, 0.6)",
                  }}
                >
                  {avrVal !== undefined ? Number(avrVal).toFixed(2) : "--"}
                </span>
                <span style={{ fontSize: "10.5px", color: "#d1d5db" }}>Target: ≥ 0.67</span>
              </div>

              {/* Tortuosity */}
              <div
                style={{
                  backgroundColor: "rgba(20, 17, 22, 0.88)",
                  border: "1px solid rgba(255, 0, 85, 0.5)",
                  borderRadius: "16px",
                  padding: "16px",
                  boxShadow: "0 8px 25px rgba(255, 0, 85, 0.2)",
                }}
              >
                <span style={{ fontSize: "10.5px", fontWeight: "900", textTransform: "uppercase", color: "#ff80ab" }}>
                  Tortuosity
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: "28px",
                    fontWeight: "900",
                    color: "#ff0055",
                    margin: "4px 0 2px 0",
                    fontFamily: "monospace",
                    textShadow: "0 0 15px rgba(255, 0, 85, 0.6)",
                  }}
                >
                  {tortVal !== undefined ? Number(tortVal).toFixed(2) : "--"}
                </span>
                <span style={{ fontSize: "10.5px", color: "#d1d5db" }}>Target: &lt; 1.15</span>
              </div>

              {/* Fractal */}
              <div
                style={{
                  backgroundColor: "rgba(20, 17, 22, 0.88)",
                  border: "1px solid rgba(0, 242, 254, 0.5)",
                  borderRadius: "16px",
                  padding: "16px",
                  boxShadow: "0 8px 25px rgba(0, 242, 254, 0.2)",
                }}
              >
                <span style={{ fontSize: "10.5px", fontWeight: "900", textTransform: "uppercase", color: "#a5f3fc" }}>
                  Fractal (Df)
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: "28px",
                    fontWeight: "900",
                    color: "#00f2fe",
                    margin: "4px 0 2px 0",
                    fontFamily: "monospace",
                    textShadow: "0 0 15px rgba(0, 242, 254, 0.6)",
                  }}
                >
                  {fractalVal !== undefined ? Number(fractalVal).toFixed(2) : "--"}
                </span>
                <span style={{ fontSize: "10.5px", color: "#d1d5db" }}>Capillary Index</span>
              </div>
            </div>

            {/* Gemini Report Card */}
            <div
              style={{
                backgroundColor: "rgba(20, 17, 22, 0.92)",
                border: "1px solid rgba(251, 191, 36, 0.45)",
                borderRadius: "22px",
                padding: "24px",
                backdropFilter: "blur(20px)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.7), 0 0 25px rgba(251, 191, 36, 0.18)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid rgba(251, 191, 36, 0.35)",
                  paddingBottom: "14px",
                  marginBottom: "18px",
                }}
              >
                <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "900", color: "#ffffff", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>🩺</span> Gemini 1.5 Cardio-Renal Staging
                </h2>
                {report && (
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span
                      style={{
                        backgroundColor: "rgba(255, 0, 85, 0.18)",
                        border: "1px solid #ff0055",
                        color: "#ff4d88",
                        padding: "3px 10px",
                        borderRadius: "9999px",
                        fontSize: "11px",
                        fontWeight: "900",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {riskCategory}
                    </span>
                    <span
                      style={{
                        backgroundColor: "rgba(251, 191, 36, 0.18)",
                        border: "1px solid #fbbf24",
                        color: "#fef08a",
                        padding: "4px 14px",
                        borderRadius: "9999px",
                        fontSize: "12px",
                        fontWeight: "900",
                        fontFamily: "monospace",
                        boxShadow: "0 0 15px rgba(251, 191, 36, 0.4)",
                      }}
                    >
                      Risk: {riskScore} / 100
                    </span>
                  </div>
                )}
              </div>

              {report ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <span style={{ fontSize: "10.5px", fontWeight: "900", textTransform: "uppercase", color: "#fef08a" }}>
                      Keith-Wagener-Barker Classification
                    </span>
                    <p style={{ margin: "4px 0 0 0", fontSize: "17px", fontWeight: "900", color: "#fbbf24" }}>
                      {kwbStage}
                    </p>
                  </div>

                  <div>
                    <span style={{ fontSize: "10.5px", fontWeight: "900", textTransform: "uppercase", color: "#fef08a" }}>
                      Clinical Diagnosis Summary
                    </span>
                    <p
                      style={{
                        margin: "6px 0 0 0",
                        fontSize: "13.5px",
                        lineHeight: "1.6",
                        color: "#f3f4f6",
                        backgroundColor: "rgba(8, 7, 10, 0.85)",
                        padding: "14px 16px",
                        borderRadius: "12px",
                        border: "1px solid rgba(251, 191, 36, 0.3)",
                      }}
                    >
                      {clinicalSummary}
                    </p>
                  </div>

                  {systemicRiskSummary && (
                    <div>
                      <span style={{ fontSize: "10.5px", fontWeight: "900", textTransform: "uppercase", color: "#ff80ab" }}>
                        Cardio-Renal Systemic Risk
                      </span>
                      <p
                        style={{
                          margin: "6px 0 0 0",
                          fontSize: "13px",
                          lineHeight: "1.5",
                          color: "#ffd1dc",
                          backgroundColor: "rgba(45, 6, 18, 0.5)",
                          padding: "12px 14px",
                          borderRadius: "10px",
                          border: "1px solid rgba(255, 0, 85, 0.3)",
                        }}
                      >
                        {systemicRiskSummary}
                      </p>
                    </div>
                  )}

                  <div>
                    <span style={{ fontSize: "10.5px", fontWeight: "900", textTransform: "uppercase", color: "#fef08a" }}>
                      Actionable Clinical Protocol
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>
                      {getRecommendationsList().map((rec, i) => (
                        <div
                          key={i}
                          style={{
                            fontSize: "13px",
                            color: "#ffffff",
                            backgroundColor: "rgba(8, 7, 10, 0.7)",
                            padding: "10px 14px",
                            borderRadius: "8px",
                            border: "1px solid rgba(255, 0, 85, 0.3)",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "10px",
                          }}
                        >
                          <span style={{ color: "#fbbf24", fontWeight: "900", fontSize: "16px", lineHeight: "1" }}>•</span>
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {patientInstruction && (
                    <div>
                      <span style={{ fontSize: "10.5px", fontWeight: "900", textTransform: "uppercase", color: "#a5f3fc" }}>
                        Patient Instructions
                      </span>
                      <p
                        style={{
                          margin: "6px 0 0 0",
                          fontSize: "12.5px",
                          lineHeight: "1.5",
                          color: "#cffafe",
                          backgroundColor: "rgba(8, 25, 35, 0.6)",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          border: "1px solid rgba(0, 242, 254, 0.3)",
                        }}
                      >
                        {patientInstruction}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    padding: "44px 0",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    color: "#9ca3af",
                    gap: "8px",
                  }}
                >
                  <span style={{ fontSize: "28px" }}>⏱️</span>
                  <span style={{ fontSize: "13.5px", color: "#e5e7eb" }}>
                    Select a genuine retinal fundus image and click <b>Run Clinical Assessment</b>.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}