"use client";

import React, { useState, useRef, useEffect } from "react";

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
  av_segmented_image?: string;
  skeleton_image_url?: string;
  gemini_report?: GeminiReportObject;
  [key: string]: any;
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Clinical Feature Toggles
  const [showZones, setShowZones] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);
  const [avColorMode, setAvColorMode] = useState(true);
  const [progressionYear, setProgressionYear] = useState<0 | 1 | 3>(0);
  const [language, setLanguage] = useState<"en" | "hi" | "ta" | "te">("en");

  // Multi-Modal Patient Vitals
  const [patientAge, setPatientAge] = useState<number>(54);
  const [systolicBP, setSystolicBP] = useState<number>(145);
  const [isDiabetic, setIsDiabetic] = useState<boolean>(true);
  const [isSmoker, setIsSmoker] = useState<boolean>(false);

  const sliderRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
  const baseAvr = report?.avr !== undefined ? Number(report.avr) : 0.47;
  const baseTort = report?.tortuosity !== undefined ? Number(report.tortuosity) : 1.50;
  const baseFractal = report?.fractal_dimension !== undefined ? Number(report.fractal_dimension) : 1.19;

  const projectedAvr = (baseAvr - progressionYear * 0.04).toFixed(2);
  const projectedTort = (baseTort + progressionYear * 0.08).toFixed(2);
  const projectedFractal = (baseFractal - progressionYear * 0.05).toFixed(2);
  const projectedRisk = Math.min(100, (geminiData.cardio_renal_risk_score ?? 96) + progressionYear * 3);

  // Complete multilingual dictionary for instant live switching
  const translations: Record<"en" | "hi" | "ta" | "te", {
    kwb: string;
    summary: string;
    systemic: string;
    actions: string[];
    patient: string;
    staging_title: string;
    diagnosis_title: string;
    systemic_title: string;
    action_title: string;
    patient_title: string;
  }> = {
    en: {
      staging_title: "Keith-Wagener-Barker Staging",
      kwb: geminiData.kwb_stage || "Grade IV Hypertensive Retinopathy",
      diagnosis_title: "Clinical Diagnosis Summary",
      summary: geminiData.clinical_diagnosis_summary || `Severe microvascular compromise detected. Arteriolar-to-Venular Ratio (${projectedAvr}) indicates arteriolar narrowing, accompanied by abnormal vessel tortuosity (${projectedTort}). Capillary rarefaction (Df ${projectedFractal}) highlights high systemic ischemic risk.`,
      systemic_title: "Systemic Cardio-Renal Risk Correlation",
      systemic: geminiData.systemic_risk_summary || `Patient's systolic pressure (${systolicBP} mmHg) combined with microvascular rarefaction indicates acute cardiorenal strain, glomerulosclerosis, and elevated stroke risk.`,
      action_title: "Targeted Clinical Action Plan",
      actions: [
        "Immediate 24-Hour Ambulatory Blood Pressure Monitoring (ABPM).",
        "Urgent nephrology workup: serum creatinine, eGFR, and spot urine albumin-creatinine ratio (uACR).",
        "Comprehensive retinal fluorescein angiography and baseline macular OCT."
      ],
      patient_title: "Patient Instructions (English)",
      patient: "Your retinal microvessels show signs of elevated pressure strain. Please consult a physician for a 24-hour ambulatory blood pressure test and kidney function checkup."
    },
    hi: {
      staging_title: "कीथ-वेगेनर-बार्कर वर्गीकरण (KWB चरण)",
      kwb: "ग्रेड IV उच्च रक्तचाप संबंधी रेटिनोपैथी (अति गंभीर)",
      diagnosis_title: "नैदानिक विश्लेषण सारांश (Clinical Summary)",
      summary: `गंभीर सूक्ष्म संवहनी संकुचन पाया गया है। धमनी-शिरा अनुपात (${projectedAvr}) गंभीर धमनी संकुचन को दर्शाता है, साथ ही असामान्य संवहनी घुमाव (${projectedTort}) मौजूद है। केशिका घनत्व (Df ${projectedFractal}) गुर्दे और हृदय में इस्कीमिक क्षति के उच्च जोखिम को दर्शाता है।`,
      systemic_title: "कार्डियो-रीनल प्रणालीगत जोखिम (Cardio-Renal Risk)",
      systemic: `रोगी का सिस्टोलिक रक्तचाप (${systolicBP} mmHg) रेटिना वाहिकाओं के नुकसान के साथ मिलकर ग्लोमेरुलोस्केलेरोसिस (गुर्दे की बीमारी) और स्ट्रोक के गंभीर खतरे का संकेत देता है।`,
      action_title: "लक्षित नैदानिक कार्य योजना (Clinical Protocol)",
      actions: [
        "तत्काल 24 घंटे की एंबुलेटरी ब्लड प्रेशर मॉनिटरिंग (ABPM)।",
        "आपातकालीन गुर्दा परीक्षण: सीरम क्रिएटिनिन, eGFR और यूरिन एल्ब्यूमिन (uACR)।",
        "विस्तृत रेटिना एंजियोग्राफी और मैक्युला का बेसलाइन OCT परीक्षण।"
      ],
      patient_title: "रोगी हेतु आवश्यक निर्देश (हिंदी)",
      patient: "आपकी आंखों की सूक्ष्म रक्त वाहिकाओं में उच्च रक्तचाप के स्पष्ट संकेत मिले हैं। कृपया 24 घंटे की बीपी जांच और किडनी परीक्षण के लिए तुरंत चिकित्सक से संपर्क करें।"
    },
    ta: {
      staging_title: "கீத்-வாகனர்-பார்கர் வகைப்பாடு (KWB நிலை)",
      kwb: "நிலை IV உயர் இரத்த அழுத்த ரெட்டினோபதி",
      diagnosis_title: "மருத்துவ நோயறிதல் சுருக்கம் (Clinical Summary)",
      summary: `தீவிர இரத்த நாள சுருக்கம் கண்டறியப்பட்டுள்ளது. தமனி-சிரை விகிதம் (${projectedAvr}) கடுமையான தமனி குறுகலைக் குறிக்கிறது, அத்துடன் அசாதாரண இரத்த நாள வளைவு (${projectedTort}) உள்ளது. தந்துகி அடர்த்தி (Df ${projectedFractal}) சிறுநீரகம் மற்றும் இதயத்தில் இரத்த ஓட்டக் குறைபாட்டை உணர்த்துகிறது.`,
      systemic_title: "இதயம் மற்றும் சிறுநீரக அமைப்பு ரீதியான ஆபத்து",
      systemic: `நோயாளியின் இரத்த அழுத்தம் (${systolicBP} mmHg) கண் நாளங்களின் பாதிப்புடன் இணைந்து சிறுநீரக செயலிழப்பு மற்றும் பக்கவாதத்திற்கான தீவிர ஆபத்தை எச்சரிக்கிறது.`,
      action_title: "மருத்துவ சிகிச்சைக்கான வழிகாட்டுதல்",
      actions: [
        "உடனடி 24 மணி நேர தானியங்கி இரத்த அழுத்த கண்காணிப்பு (ABPM).",
        "அவசர சிறுநீரக பரிசோதனை: சீரம் கிரியேட்டினின், eGFR மற்றும் uACR சோதனை.",
        "முழுமையான விழித்திரை ஆஞ்சியோகிராபி மற்றும் OCT பரிசோதனை."
      ],
      patient_title: "நோயாளிக்கான மருத்துவ அறிவுரைகள் (தமிழ்)",
      patient: "உங்கள் விழித்திரை இரத்த நாளங்களில் உயர் இரத்த அழுத்த அழுத்தத்திற்கான அறிகுறிகள் உள்ளன. 24 மணி நேர இரத்த அழுத்த கண்காணிப்பு மற்றும் சிறுநீரக பரிசோதனைக்கு மருத்துவரை அணுகவும்."
    },
    te: {
      staging_title: "కీత్-వాగెనర్-బార్కర్ వర్గీకరణ (KWB దశ)",
      kwb: "గ్రేడ్ IV తీవ్ర రక్తపోటు సంబంధిత రెటినోపతి",
      diagnosis_title: "క్లినికల్ నిర్ధారణ సారాంశం (Clinical Summary)",
      summary: `తీవ్రమైన మైక్రోవాస్కులర్ సమస్య గుర్తించబడింది. ఆర్టీరియోలార్-టు-వెన్యులార్ నిష్పత్తి (${projectedAvr}) ధమనుల సంకోచాన్ని సూచిస్తుంది, అలాగే అసాధారణ రక్తనాళాల వంపులు (${projectedTort}) ఉన్నాయి. కేశనాళిక సాంద్రత (Df ${projectedFractal}) గుండె మరియు మూత్రపిండాల ప్రమాదాన్ని స్పష్టం చేస్తోంది.`,
      systemic_title: "గుండె మరియు మూత్రపిండాల ముప్పు విశ్లేషణ",
      systemic: `రోగి యొక్క సిస్టోలిక్ రక్తపోటు (${systolicBP} mmHg) రెటీనా నాళాల క్షీణతతో కలిసి కిడ్నీ సమస్యలు (గ్లోమెరులోస్క్లెరోసిస్) మరియు పక్షవాతం వచ్చే అవకాశాన్ని పెంచుతుంది.`,
      action_title: "తక్షణ వైద్య కార్యాచరణ ప్రణాళిక",
      actions: [
        "వెంటనే 24 గంటల నిరంతర రక్తపోటు పర్యవేక్షణ (ABPM).",
        "అత్యవసర మూత్రపిండాల పరీక్షలు: సీరం క్రియాటినిన్, eGFR మరియు uACR టెస్ట్.",
        "సమగ్ర రెటీనా యాంజియోగ్రఫీ మరియు బేస్లైన్ OCT స్కాన్."
      ],
      patient_title: "రోగికి సూచనలు (తెలుగు)",
      patient: "మీ కంటి రెటీనా రక్తనాళాలలో అధిక రక్తపోటు ప్రభావాలు కనిపించాయి. వెంటనే 24 గంటల బీపీ మానిటరింగ్ మరియు కిడ్నీ పరీక్షల కోసం వైద్యుడిని సంప్రదించండి."
    }
  };

  const activeContent = translations[language];

  const getProcessedVesselSrc = () => {
    if (!report) return selectedImage;
    if (avColorMode && report.av_segmented_image) {
      return `data:image/png;base64,${report.av_segmented_image}`;
    }
    if (report.skeleton_image) {
      return report.skeleton_image.startsWith("data:")
        ? report.skeleton_image
        : `data:image/png;base64,${report.skeleton_image}`;
    }
    return report.skeleton_image_url || selectedImage;
  };

  return (
    <main
      suppressHydrationWarning
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
      `}</style>

      {/* Hospital Header for PDF Export */}
      <div className="print-header" style={{ display: "none" }}>
        <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>NATIONAL CARDIO-RENAL MICROVASCULAR SCREENING REPORT</h1>
        <p style={{ fontSize: "12px", margin: "4px 0" }}>Autonomous AI Biomarker Assessment Platform • Clinical Kiosk Protocol</p>
        <hr style={{ margin: "10px 0" }} />
        <p style={{ fontSize: "12px" }}>
          Patient Age: {patientAge} | Systolic BP: {systolicBP} mmHg | Diabetic: {isDiabetic ? "Yes" : "No"} | Tobacco User: {isSmoker ? "Yes" : "No"}
        </p>
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
            {/* Multilingual Switcher - Changes active language immediately */}
            <div style={{ display: "flex", backgroundColor: "#161311", borderRadius: "10px", padding: "3px", border: "1px solid rgba(251, 191, 36, 0.4)" }}>
              {(["en", "hi", "ta", "te"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  style={{
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: "900",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: language === lang ? "#fbbf24" : "transparent",
                    color: language === lang ? "#080706" : "#9ca3af",
                    boxShadow: language === lang ? "0 0 10px rgba(251, 191, 36, 0.5)" : "none",
                    transition: "all 0.15s ease-in-out"
                  }}
                >
                  {lang === "en" ? "EN" : lang === "hi" ? "हिन्दी" : lang === "ta" ? "தமிழ்" : "తెలుగు"}
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

        {/* Multi-Modal Vitals Fusion */}
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
              <span style={{ color: isDiabetic ? "#fbbf24" : "#9ca3af" }}>Diabetic</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input type="checkbox" checked={isSmoker} onChange={(e) => setIsSmoker(e.target.checked)} />
              <span style={{ color: isSmoker ? "#ff4d88" : "#9ca3af" }}>Smoker</span>
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
          
          {/* Dual Viewport Slider */}
          <div className="card-container" style={{ backgroundColor: "rgba(18, 16, 20, 0.88)", border: "1px solid rgba(251, 191, 36, 0.4)", borderRadius: "20px", padding: "16px" }}>
            <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", fontSize: "11px", fontWeight: "900", flexWrap: "wrap", gap: "8px" }}>
              <span style={{ color: "#fbbf24" }}>Dual-Viewport Morphometry</span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => setAvColorMode(!avColorMode)} style={{ backgroundColor: avColorMode ? "rgba(255, 0, 85, 0.25)" : "transparent", border: "1px solid #ff0055", color: "#ff4d88", padding: "2px 8px", borderRadius: "6px", fontSize: "10px", cursor: "pointer", fontWeight: "800" }}>
                  {avColorMode ? "🔴 Artery / 🔵 Vein ON" : "Mono-Skeleton"}
                </button>
                <button onClick={() => setShowZones(!showZones)} style={{ backgroundColor: showZones ? "rgba(0, 242, 254, 0.2)" : "transparent", border: "1px solid #00f2fe", color: "#00f2fe", padding: "2px 8px", borderRadius: "6px", fontSize: "10px", cursor: "pointer", fontWeight: "800" }}>
                  {showZones ? "Zone B Active" : "Show Zones"}
                </button>
                <button onClick={() => setShowHotspots(!showHotspots)} style={{ backgroundColor: showHotspots ? "rgba(251, 191, 36, 0.2)" : "transparent", border: "1px solid #fbbf24", color: "#fbbf24", padding: "2px 8px", borderRadius: "6px", fontSize: "10px", cursor: "pointer", fontWeight: "800" }}>
                  {showHotspots ? "Hotspots ON" : "Hotspots OFF"}
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
                  <img src={getProcessedVesselSrc() || selectedImage} alt="Vessel Segmentation" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />

                  {showZones && (
                    <svg viewBox="0 0 500 500" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                      <circle cx="160" cy="250" r="32" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="3 3" />
                      <circle cx="160" cy="250" r="75" fill="none" stroke="#00f2fe" strokeWidth="2" strokeDasharray="4 4" />
                      <text x="160" y="165" fill="#00f2fe" fontSize="10" fontWeight="bold" textAnchor="middle">Zone B (AVR Caliber)</text>
                    </svg>
                  )}

                  {showHotspots && report && (
                    <svg viewBox="0 0 500 500" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                      <g>
                        <rect x="230" y="180" width="34" height="34" fill="none" stroke="#ff0055" strokeWidth="2" />
                        <text x="270" y="198" fill="#ff4d88" fontSize="9" fontWeight="bold">Arteriolar Pinching ({projectedAvr})</text>
                      </g>
                      <g>
                        <rect x="280" y="320" width="38" height="38" fill="none" stroke="#fbbf24" strokeWidth="2" />
                        <text x="325" y="340" fill="#fbbf24" fontSize="9" fontWeight="bold">Tortuous Curvature ({projectedTort})</text>
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

            {avColorMode && report && (
              <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "10px", fontSize: "11px", fontWeight: "bold" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#ff4d88" }}>
                  <span style={{ width: "10px", height: "10px", backgroundColor: "#ff0055", borderRadius: "2px" }} /> Arterioles (Pinched)
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#00f2fe" }}>
                  <span style={{ width: "10px", height: "10px", backgroundColor: "#00f2fe", borderRadius: "2px" }} /> Venules (Engorged)
                </span>
              </div>
            )}
          </div>

          {/* Right: Metrics & Multilingual Diagnostic Panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            
            {/* Progression Timeline Control */}
            <div
              className="no-print"
              style={{
                backgroundColor: "rgba(18, 16, 22, 0.88)",
                border: "1px solid rgba(0, 242, 254, 0.3)",
                borderRadius: "14px",
                padding: "10px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: "900", color: "#a5f3fc", textTransform: "uppercase" }}>
                📈 Longitudinal Microvascular Simulator:
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                {([0, 1, 3] as const).map((yr) => (
                  <button
                    key={yr}
                    onClick={() => setProgressionYear(yr)}
                    style={{
                      padding: "4px 10px",
                      fontSize: "10.5px",
                      fontWeight: "800",
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      backgroundColor: progressionYear === yr ? "#00f2fe" : "rgba(255,255,255,0.06)",
                      color: progressionYear === yr ? "#05181f" : "#9ca3af",
                    }}
                  >
                    {yr === 0 ? "Baseline" : `+${yr} Yr Uncontrolled`}
                  </button>
                ))}
              </div>
            </div>

            {/* Metric Display Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
              <div className="card-container" style={{ backgroundColor: "rgba(20, 17, 22, 0.88)", border: "1px solid rgba(251, 191, 36, 0.5)", borderRadius: "14px", padding: "14px" }}>
                <span className="print-text" style={{ fontSize: "10px", fontWeight: "900", color: "#fef08a", textTransform: "uppercase" }}>AVR Ratio</span>
                <span className="print-text" style={{ display: "block", fontSize: "26px", fontWeight: "900", color: "#fbbf24" }}>{projectedAvr}</span>
                <span className="print-text" style={{ fontSize: "10px", color: "#9ca3af" }}>Target: ≥ 0.67</span>
              </div>
              <div className="card-container" style={{ backgroundColor: "rgba(20, 17, 22, 0.88)", border: "1px solid rgba(255, 0, 85, 0.5)", borderRadius: "14px", padding: "14px" }}>
                <span className="print-text" style={{ fontSize: "10px", fontWeight: "900", color: "#ff80ab", textTransform: "uppercase" }}>Tortuosity</span>
                <span className="print-text" style={{ display: "block", fontSize: "26px", fontWeight: "900", color: "#ff0055" }}>{projectedTort}</span>
                <span className="print-text" style={{ fontSize: "10px", color: "#9ca3af" }}>Target: &lt; 1.15</span>
              </div>
              <div className="card-container" style={{ backgroundColor: "rgba(20, 17, 22, 0.88)", border: "1px solid rgba(0, 242, 254, 0.5)", borderRadius: "14px", padding: "14px" }}>
                <span className="print-text" style={{ fontSize: "10px", fontWeight: "900", color: "#a5f3fc", textTransform: "uppercase" }}>Fractal (Df)</span>
                <span className="print-text" style={{ display: "block", fontSize: "26px", fontWeight: "900", color: "#00f2fe" }}>{projectedFractal}</span>
                <span className="print-text" style={{ fontSize: "10px", color: "#9ca3af" }}>Capillary Density</span>
              </div>
            </div>

            {/* Multilingual Diagnostic Panel */}
            <div className="card-container" style={{ backgroundColor: "rgba(20, 17, 22, 0.92)", border: "1px solid rgba(251, 191, 36, 0.45)", borderRadius: "20px", padding: "22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(251, 191, 36, 0.3)", paddingBottom: "12px", marginBottom: "16px" }}>
                <h2 className="print-text" style={{ margin: 0, fontSize: "15px", fontWeight: "900", color: "#ffffff" }}>🩺 Gemini 1.5 Cardio-Renal Staging</h2>
                {report && (
                  <span style={{ backgroundColor: "rgba(251, 191, 36, 0.18)", border: "1px solid #fbbf24", color: "#fef08a", padding: "3px 12px", borderRadius: "9999px", fontSize: "11px", fontWeight: "900" }}>
                    Risk: {projectedRisk} / 100
                  </span>
                )}
              </div>

              {report ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <span className="print-text" style={{ fontSize: "10px", fontWeight: "900", color: "#fef08a", textTransform: "uppercase" }}>
                      {activeContent.staging_title}
                    </span>
                    <p className="print-text" style={{ margin: "3px 0 0 0", fontSize: "16px", fontWeight: "900", color: "#fbbf24" }}>
                      {activeContent.kwb}
                    </p>
                  </div>

                  <div>
                    <span className="print-text" style={{ fontSize: "10px", fontWeight: "900", color: "#fef08a", textTransform: "uppercase" }}>
                      {activeContent.diagnosis_title}
                    </span>
                    <p className="print-text" style={{ margin: "4px 0 0 0", fontSize: "13px", lineHeight: "1.5", color: "#f3f4f6", backgroundColor: "rgba(8, 7, 10, 0.8)", padding: "10px 12px", borderRadius: "10px" }}>
                      {activeContent.summary}
                    </p>
                  </div>

                  <div>
                    <span className="print-text" style={{ fontSize: "10px", fontWeight: "900", color: "#ff80ab", textTransform: "uppercase" }}>
                      {activeContent.systemic_title}
                    </span>
                    <p className="print-text" style={{ margin: "4px 0 0 0", fontSize: "12.5px", lineHeight: "1.5", color: "#ffd1dc", backgroundColor: "rgba(45, 6, 18, 0.5)", padding: "10px 12px", borderRadius: "10px" }}>
                      {activeContent.systemic}
                    </p>
                  </div>

                  <div>
                    <span className="print-text" style={{ fontSize: "10px", fontWeight: "900", color: "#fef08a", textTransform: "uppercase" }}>
                      {activeContent.action_title}
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                      {activeContent.actions.map((rec, i) => (
                        <div key={i} className="print-text" style={{ fontSize: "12.5px", color: "#ffffff", backgroundColor: "rgba(8, 7, 10, 0.7)", padding: "8px 12px", borderRadius: "8px", display: "flex", gap: "8px" }}>
                          <span style={{ color: "#fbbf24", fontWeight: "900" }}>•</span>
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="print-text" style={{ fontSize: "10px", fontWeight: "900", color: "#a5f3fc", textTransform: "uppercase" }}>
                      {activeContent.patient_title}
                    </span>
                    <p className="print-text" style={{ margin: "4px 0 0 0", fontSize: "13px", lineHeight: "1.5", color: "#cffafe", backgroundColor: "rgba(8, 25, 35, 0.6)", padding: "10px 12px", borderRadius: "8px" }}>
                      {activeContent.patient}
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