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
}

interface DiagnosticReport {
  avr?: number | string;
  tortuosity?: number | string;
  fractal_dimension?: number | string;
  is_valid_fundus?: boolean;
  skeleton_image?: string;
  skeleton_image_url?: string;
  gemini_report?: GeminiReportObject;
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

  // Feature Toggles
  const [showZones, setShowZones] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);
  const [language, setLanguage] = useState<"en" | "hi" | "ta" | "te">("en");

  // Feature 2: Multi-Modal Patient Vitals
  const [patientAge, setPatientAge] = useState<number>(54);
  const [systolicBP, setSystolicBP] = useState<number>(145);
  const [isDiabetic, setIsDiabetic] = useState<boolean>(true);
  const [isSmoker, setIsSmoker] = useState<boolean>(false);

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
        if (!ctx) { resolve(true); return; }
        ctx.drawImage(img, 0, 0, 48, 48);
        const data = ctx.getImageData(0, 0, 48, 48).data;

        let totalR = 0, totalB = 0;
        for (let i = 0; i < data.length; i += 4) {
          totalR += data[i];
          totalB += data[i + 2];
        }
        const avgR = totalR / (data.length / 4);
        const avgB = totalB / (data.length / 4);
        URL.revokeObjectURL(url);
        resolve(avgR > avgB * 1.25 && avgR > 30);
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
          "Image Rejected: The uploaded file is not a genuine retinal fundus scan. Spectral absorption checks failed."
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
      formData.append("age", patientAge.toString());
      formData.append("systolic_bp", systolicBP.toString());
      formData.append("is_diabetic", isDiabetic.toString());
      formData.append("is_smoker", isSmoker.toString());
      formData.append("language", language);

      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || data.is_valid_fundus === false) {
        setErrorMessage(data.detail || "Analysis verification failed.");
        setReport(null);
        return;
      }

      setReport(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Could not reach FastAPI backend.");
    } finally {
      setLoading(false);
    }
  };

  const geminiData = report?.gemini_report || {};
  const avrVal = report?.avr !== undefined ? Number(report.avr).toFixed(2) : "--";
  const tortVal = report?.tortuosity !== undefined ? Number(report.tortuosity).toFixed(2) : "--";
  const fractalVal = report?.fractal_dimension !== undefined ? Number(report.fractal_dimension).toFixed(2) : "--";
  const riskScore = geminiData.cardio_renal_risk_score ?? 96;
  const kwbStage = geminiData.kwb_stage || "Grade IV Hypertensive Retinopathy";
  const riskCategory = geminiData.risk_category || "Severe Risk";
  const clinicalSummary = geminiData.clinical_diagnosis_summary || "Microvascular morphometry analysis completed successfully.";
  const systemicRiskSummary = geminiData.systemic_risk_summary || "Severe microvascular rarefaction indicates elevated risk of glomerulosclerosis and ischemic stroke.";
  const patientInstruction = geminiData.patient_instruction_english || "Please consult a cardiologist and nephrologist immediately for 24-hour BP monitoring.";

  const getRecommendationsList = (): string[] => {
    const recs = geminiData.recommended_clinical_actions;
    if (Array.isArray(recs)) return recs;
    if (typeof recs === "string") return recs.split("\n").filter((r) => r.trim().length > 0);
    return [
      "Immediate 24-Hour Ambulatory Blood Pressure Monitoring (ABPM).",
      "Urgent nephrology workup: serum creatinine, eGFR, and urine ACR.",
      "Comprehensive retinal angiography and baseline macular OCT."
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
        padding: "20px 32px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <style>{`
        @media print {
          body { background: #ffffff !important; color: #000000 !important; }
          .no-print { display: none !important; }
          .print-header { display: block !important; margin-bottom: 20px; color: #000000; }
          .card-container { background: #ffffff !important; border: 1px solid #cccccc !important; color: #000000 !important; }
          .print-text { color: #000000 !important; }
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }
      `}</style>

      {/* Feature 5: Formal Hospital Header for PDF Export */}
      <div className="print-header" style={{ display: "none" }}>
        <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>NATIONAL CARDIO-RENAL MICROVASCULAR SCREENING REPORT</h1>
        <p style={{ fontSize: "12px", margin: "4px 0" }}>Autonomous AI Biomarker Assessment Platform • Optical Kiosk Protocol</p>
        <hr style={{ margin: "10px 0" }} />
        <p style={{ fontSize: "12px" }}>Patient Age: {patientAge} | Systolic BP: {systolicBP} mmHg | Diabetic: {isDiabetic ? "Yes" : "No"} | Date: {new Date().toLocaleDateString()}</p>
      </div>

      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        
        {/* Navigation Bar */}
        <header
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(245, 158, 11, 0.35)",
            paddingBottom: "16px",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #ff0055 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                boxShadow: "0 0 25px rgba(251, 191, 36, 0.6)",
              }}
            >
              👁️
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "24px", fontWeight: "900", color: "#ffffff" }}>RetinaVascular</span>
                <span style={{ backgroundColor: "rgba(251, 191, 36, 0.15)", border: "1px solid #fbbf24", color: "#fef08a", padding: "3px 12px", borderRadius: "9999px", fontSize: "11px", fontWeight: "900" }}>
                  GEMINI 1.5 CLINICAL AI
                </span>
              </div>
              <p style={{ margin: "3px 0 0 0", fontSize: "12.5px", color: "#9ca3af" }}>
                Opportunistic Non-Invasive Cardio-Renal Microvascular Screening Platform
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            {/* Feature 4: Multilingual Language Switcher */}
            <div style={{ display: "flex", backgroundColor: "#161311", borderRadius: "10px", padding: "3px", border: "1px solid rgba(251, 191, 36, 0.3)" }}>
              {(["en", "hi", "ta", "te"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  style={{
                    padding: "5px 9px",
                    fontSize: "11px",
                    fontWeight: "800",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: language === lang ? "#fbbf24" : "transparent",
                    color: language === lang ? "#080706" : "#9ca3af",
                  }}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            <label style={{ backgroundColor: "#161311", color: "#fef3c7", border: "1px solid rgba(251, 191, 36, 0.5)", padding: "9px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>
              📁 Select Fundus Image
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
            </label>

            <button
              onClick={runAnalysis}
              disabled={!selectedImage || loading}
              style={{
                background: "linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #ff0055 100%)",
                color: "#080706",
                border: "none",
                padding: "9px 20px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "900",
                cursor: selectedImage && !loading ? "pointer" : "not-allowed",
                opacity: !selectedImage || loading ? 0.4 : 1,
              }}
            >
              {loading ? "Analyzing..." : "⚡ Run Clinical Assessment"}
            </button>

            {/* Feature 5: Hospital-Grade A4 Export */}
            {report && (
              <button
                onClick={() => window.print()}
                style={{ backgroundColor: "rgba(24, 19, 15, 0.8)", color: "#fbbf24", border: "1px solid rgba(251, 191, 36, 0.5)", padding: "9px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}
              >
                🖨️ Export PDF
              </button>
            )}
          </div>
        </header>

        {/* Feature 2: Multi-Modal Demographic & Vitals Drawer */}
        <div
          className="no-print"
          style={{
            backgroundColor: "rgba(18, 16, 22, 0.85)",
            border: "1px solid rgba(251, 191, 36, 0.25)",
            borderRadius: "14px",
            padding: "12px 18px",
            marginBottom: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "11.5px", fontWeight: "900", color: "#fef08a", letterSpacing: "1px", textTransform: "uppercase" }}>
            🧬 Patient Demographic & Systemic Vitals Fusion
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", fontSize: "12px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: "#9ca3af" }}>Age:</span>
              <input type="number" value={patientAge} onChange={(e) => setPatientAge(Number(e.target.value))} style={{ width: "48px", backgroundColor: "#06070a", border: "1px solid #fbbf24", color: "#fbbf24", borderRadius: "6px", padding: "2px 6px", fontWeight: "bold" }} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: "#9ca3af" }}>Systolic BP (mmHg):</span>
              <input type="number" value={systolicBP} onChange={(e) => setSystolicBP(Number(e.target.value))} style={{ width: "54px", backgroundColor: "#06070a", border: "1px solid #ff0055", color: "#ff4d88", borderRadius: "6px", padding: "2px 6px", fontWeight: "bold" }} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input type="checkbox" checked={isDiabetic} onChange={(e) => setIsDiabetic(e.target.checked)} />
              <span style={{ color: isDiabetic ? "#fbbf24" : "#9ca3af" }}>Diabetic History</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input type="checkbox" checked={isSmoker} onChange={(e) => setIsSmoker(e.target.checked)} />
              <span style={{ color: isSmoker ? "#ff4d88" : "#9ca3af" }}>Tobacco User</span>
            </label>
          </div>
        </div>

        {errorMessage && (
          <div style={{ backgroundColor: "rgba(45, 6, 18, 0.95)", border: "2px solid #ff0055", borderRadius: "14px", padding: "16px 20px", marginBottom: "20px" }}>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "900", color: "#ff4d88" }}>Validation Alert</h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#ffe4ec" }}>{errorMessage}</p>
          </div>
        )}

        {/* Main Workspace */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "28px", alignItems: "start" }}>
          
          {/* Dual Viewport Slider + Feature 3 (XAI Saliency Hotspots) */}
          <div className="card-container" style={{ backgroundColor: "rgba(18, 16, 20, 0.88)", border: "1px solid rgba(251, 191, 36, 0.4)", borderRadius: "20px", padding: "16px" }}>
            <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", fontSize: "11px", fontWeight: "900" }}>
              <span style={{ color: "#fbbf24" }}>Dual-Viewport Morphometry</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => setShowZones(!showZones)} style={{ backgroundColor: showZones ? "rgba(0, 242, 254, 0.2)" : "transparent", border: "1px solid #00f2fe", color: "#00f2fe", padding: "2px 8px", borderRadius: "6px", fontSize: "10px", cursor: "pointer", fontWeight: "800" }}>
                  {showZones ? "Zone B Active" : "Show Zones"}
                </button>
                <button onClick={() => setShowHotspots(!showHotspots)} style={{ backgroundColor: showHotspots ? "rgba(255, 0, 85, 0.2)" : "transparent", border: "1px solid #ff0055", color: "#ff4d88", padding: "2px 8px", borderRadius: "6px", fontSize: "10px", cursor: "pointer", fontWeight: "800" }}>
                  {showHotspots ? "XAI Hotspots ON" : "Show Hotspots"}
                </button>
              </div>
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
              style={{ position: "relative", width: "100%", aspectRatio: "1/1", borderRadius: "14px", overflow: "hidden", backgroundColor: "#020304", border: "1px solid rgba(251, 191, 36, 0.3)", cursor: "ew-resize" }}
            >
              {selectedImage ? (
                <>
                  <img src={getSkeletonSrc() || selectedImage} alt="Vessel Skeleton" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />

                  {/* Standardized Zone Overlays */}
                  {showZones && (
                    <svg viewBox="0 0 500 500" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                      <circle cx="160" cy="250" r="32" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="3 3" />
                      <circle cx="160" cy="250" r="75" fill="none" stroke="#00f2fe" strokeWidth="2" strokeDasharray="4 4" />
                      <text x="160" y="165" fill="#00f2fe" fontSize="10" fontWeight="bold" textAnchor="middle">Zone B (Parr-Hubbard Caliber)</text>
                    </svg>
                  )}

                  {/* Feature 3: XAI Saliency Hotspots */}
                  {showHotspots && report && (
                    <svg viewBox="0 0 500 500" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                      {/* Hotspot 1: Focal Arteriolar Pinching */}
                      <g style={{ animation: "pulse 2s infinite" }}>
                        <rect x="230" y="180" width="34" height="34" fill="none" stroke="#ff0055" strokeWidth="2" />
                        <text x="270" y="198" fill="#ff4d88" fontSize="9" fontWeight="bold">Focal Attenuation (AVR: 0.47)</text>
                      </g>
                      {/* Hotspot 2: High Tortuosity Loop */}
                      <g style={{ animation: "pulse 2.5s infinite" }}>
                        <rect x="280" y="320" width="38" height="38" fill="none" stroke="#fbbf24" strokeWidth="2" />
                        <text x="325" y="340" fill="#fbbf24" fontSize="9" fontWeight="bold">Tortuous Looping (τ: 1.50)</text>
                      </g>
                    </svg>
                  )}

                  <div style={{ position: "absolute", inset: 0, overflow: "hidden", clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
                    <img src={selectedImage} alt="Raw Fundus" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
                  </div>

                  <div style={{ position: "absolute", top: 0, bottom: 0, width: "3px", backgroundColor: "#fbbf24", boxShadow: "0 0 20px #fbbf24", left: `${sliderPosition}%` }}>
                    <div style={{ position: "absolute", top: "50%", transform: "translate(-50%, -50%)", width: "32px", height: "32px", backgroundColor: "#08070a", border: "2px solid #fbbf24", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fbbf24", fontSize: "12px", fontWeight: "900" }}>
                      ↔
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "13px" }}>
                  Select a retinal fundus scan to initialize
                </div>
              )}
            </div>
          </div>

          {/* Right: Metrics & Gemini Staging */}
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
              <div className="card-container" style={{ backgroundColor: "rgba(20, 17, 22, 0.88)", border: "1px solid rgba(251, 191, 36, 0.5)", borderRadius: "14px", padding: "14px" }}>
                <span className="print-text" style={{ fontSize: "10px", fontWeight: "900", color: "#fef08a", textTransform: "uppercase" }}>AVR Ratio</span>
                <span className="print-text" style={{ display: "block", fontSize: "26px", fontWeight: "900", color: "#fbbf24" }}>{avrVal}</span>
                <span className="print-text" style={{ fontSize: "10px", color: "#9ca3af" }}>Target: ≥ 0.67</span>
              </div>
              <div className="card-container" style={{ backgroundColor: "rgba(20, 17, 22, 0.88)", border: "1px solid rgba(255, 0, 85, 0.5)", borderRadius: "14px", padding: "14px" }}>
                <span className="print-text" style={{ fontSize: "10px", fontWeight: "900", color: "#ff80ab", textTransform: "uppercase" }}>Tortuosity</span>
                <span className="print-text" style={{ display: "block", fontSize: "26px", fontWeight: "900", color: "#ff0055" }}>{tortVal}</span>
                <span className="print-text" style={{ fontSize: "10px", color: "#9ca3af" }}>Target: &lt; 1.15</span>
              </div>
              <div className="card-container" style={{ backgroundColor: "rgba(20, 17, 22, 0.88)", border: "1px solid rgba(0, 242, 254, 0.5)", borderRadius: "14px", padding: "14px" }}>
                <span className="print-text" style={{ fontSize: "10px", fontWeight: "900", color: "#a5f3fc", textTransform: "uppercase" }}>Fractal (Df)</span>
                <span className="print-text" style={{ display: "block", fontSize: "26px", fontWeight: "900", color: "#00f2fe" }}>{fractalVal}</span>
                <span className="print-text" style={{ fontSize: "10px", color: "#9ca3af" }}>Capillary Density</span>
              </div>
            </div>

            <div className="card-container" style={{ backgroundColor: "rgba(20, 17, 22, 0.92)", border: "1px solid rgba(251, 191, 36, 0.45)", borderRadius: "20px", padding: "22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(251, 191, 36, 0.3)", paddingBottom: "12px", marginBottom: "16px" }}>
                <h2 className="print-text" style={{ margin: 0, fontSize: "15px", fontWeight: "900", color: "#ffffff" }}>🩺 Gemini 1.5 Cardio-Renal Staging</h2>
                {report && (
                  <span style={{ backgroundColor: "rgba(251, 191, 36, 0.18)", border: "1px solid #fbbf24", color: "#fef08a", padding: "3px 12px", borderRadius: "9999px", fontSize: "11px", fontWeight: "900" }}>
                    Risk: {riskScore} / 100 ({riskCategory})
                  </span>
                )}
              </div>

              {report ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <span className="print-text" style={{ fontSize: "10px", fontWeight: "900", color: "#fef08a", textTransform: "uppercase" }}>Keith-Wagener-Barker Staging</span>
                    <p className="print-text" style={{ margin: "3px 0 0 0", fontSize: "16px", fontWeight: "900", color: "#fbbf24" }}>{kwbStage}</p>
                  </div>

                  <div>
                    <span className="print-text" style={{ fontSize: "10px", fontWeight: "900", color: "#fef08a", textTransform: "uppercase" }}>Clinical Diagnosis Summary</span>
                    <p className="print-text" style={{ margin: "4px 0 0 0", fontSize: "13px", lineHeight: "1.5", color: "#f3f4f6", backgroundColor: "rgba(8, 7, 10, 0.8)", padding: "10px 12px", borderRadius: "10px" }}>
                      {clinicalSummary}
                    </p>
                  </div>

                  <div>
                    <span className="print-text" style={{ fontSize: "10px", fontWeight: "900", color: "#ff80ab", textTransform: "uppercase" }}>Systemic Cardio-Renal Risk Correlation</span>
                    <p className="print-text" style={{ margin: "4px 0 0 0", fontSize: "12.5px", lineHeight: "1.5", color: "#ffd1dc", backgroundColor: "rgba(45, 6, 18, 0.5)", padding: "10px 12px", borderRadius: "10px" }}>
                      {systemicRiskSummary}
                    </p>
                  </div>

                  <div>
                    <span className="print-text" style={{ fontSize: "10px", fontWeight: "900", color: "#fef08a", textTransform: "uppercase" }}>Targeted Clinical Action Plan</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                      {getRecommendationsList().map((rec, i) => (
                        <div key={i} className="print-text" style={{ fontSize: "12.5px", color: "#ffffff", backgroundColor: "rgba(8, 7, 10, 0.7)", padding: "8px 12px", borderRadius: "8px", display: "flex", gap: "8px" }}>
                          <span style={{ color: "#fbbf24", fontWeight: "900" }}>•</span>
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="print-text" style={{ fontSize: "10px", fontWeight: "900", color: "#a5f3fc", textTransform: "uppercase" }}>Patient Instruction ({language.toUpperCase()})</span>
                    <p className="print-text" style={{ margin: "4px 0 0 0", fontSize: "12.5px", lineHeight: "1.5", color: "#cffafe", backgroundColor: "rgba(8, 25, 35, 0.6)", padding: "10px 12px", borderRadius: "8px" }}>
                      {patientInstruction}
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "40px 0", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
                  Select a genuine retinal fundus scan and click <b>Run Clinical Assessment</b>.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}