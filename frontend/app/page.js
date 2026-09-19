"use client";
import React, { useState } from "react";
import { 
  Eye, Activity, CheckCircle, Volume2, ShieldAlert, 
  Upload, FileText, RefreshCw, VolumeX
} from "lucide-react";

export default function App() {
  const [sliderPos, setSliderPos] = useState(50);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      analyzeImage(selected);
    }
  };

  const analyzeImage = async (fileToSend) => {
    setLoading(true);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    const formData = new FormData();
    formData.append("file", fileToSend);
    formData.append("language", "English");

    try {
      const res = await fetch("http://localhost:8000/analyze-retina", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      
      if (result.error) {
        alert(result.error);
        setData(null);
        setFile(null);
      } else {
        setData(result);
      }
    } catch (err) {
      alert("Error connecting to backend at http://localhost:8000. Make sure python main.py is running!");
      setData(null);
    }
    setLoading(false);
  };

  const speakAudio = (textToSpeak) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Audio speech synthesis is not supported on this browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(textToSpeak);
    utter.lang = "en-US";
    utter.rate = 0.95;

    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utter);
  };

  const metrics = data?.biometric_metrics || data?.metrics;
  const report = data?.clinical_report;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-800 pb-5 mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-sky-500/10 text-sky-400 text-[11px] font-bold px-2.5 py-0.5 rounded border border-sky-500/30 uppercase tracking-widest">
              ISTE Celestia 2.0 • Healthcare Track
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              FastAPI Engine Online (Port 8000)
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1.5 text-white">
            RetinaVascular <span className="text-sky-400">AI</span>
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Quantitative Retinal Microvascular Morphometry & Systemic Cardio-Renal Risk Engine
          </p>
        </div>

        {/* Upload Button */}
        <label className="bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer flex items-center gap-2 transition shadow-lg">
          <Upload className="w-4 h-4" />
          <span>Upload Fundus Scan</span>
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </label>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Viewport + Biometrics */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-2xl relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Interactive Morphometry Dual-Viewport
                </h3>
              </div>
              {report && (
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded border ${
                  report.cardio_renal_risk_score > 70 
                    ? "bg-red-500/20 text-red-400 border-red-500/30"
                    : report.cardio_renal_risk_score > 40 
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30" 
                      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                }`}>
                  {report.kwb_stage} Retinopathy ({report.risk_category})
                </span>
              )}
            </div>

            {/* Slider / Canvas */}
            <div className="relative w-full h-84 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 select-none flex items-center justify-center">
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
                  <p className="text-xs text-slate-400 font-medium">Running U-Net Segmentation & Discrete Morphometry...</p>
                </div>
              ) : metrics ? (
                <>
                  {/* Layer 1: Fluorescent Segmented Microvascular Skeleton */}
                  <div className="absolute inset-0 bg-[#070b14] flex items-center justify-center p-2">
                    <img src={metrics.vessel_mask_image} alt="Vessels" className="h-full object-contain" />
                    <span className="absolute bottom-3 right-3 text-[10px] text-sky-400 font-bold bg-slate-900/90 px-2.5 py-1 rounded border border-sky-500/30">
                      Medial-Axis Thinning • {metrics.bifurcation_count || 0} Bifurcations
                    </span>
                  </div>

                  {/* Layer 2: Raw Optical Fundus Photo Clipped by Slider */}
                  <div 
                    className="absolute inset-0 overflow-hidden" 
                    style={{ width: `${sliderPos}%`, borderRight: '2px solid #38bdf8' }}
                  >
                    <div className="w-full h-full bg-[#1e130a] flex items-center justify-center p-2 min-w-[360px]">
                      <img src={metrics.original_image} alt="Fundus" className="h-full object-contain" />
                      <span className="absolute bottom-3 left-3 text-[10px] text-amber-300 font-bold bg-slate-950/90 px-2.5 py-1 rounded border border-amber-500/40">
                        Green-Band CLAHE Filter
                      </span>
                    </div>
                  </div>

                  {/* Slider Handle */}
                  <div 
                    className="absolute top-0 bottom-0 w-8 -ml-4 flex items-center justify-center cursor-ew-resize pointer-events-none"
                    style={{ left: `${sliderPos}%` }}
                  >
                    <div className="w-5 h-5 rounded-full bg-sky-400 shadow-lg flex items-center justify-center text-slate-950 text-[10px] font-bold">
                      ↔
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-8">
                  <Upload className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-300">No Retinal Scan Loaded</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Click "Upload Fundus Scan" above and select a true ocular photograph to extract capillary geometry.
                  </p>
                </div>
              )}
            </div>

            {metrics && (
              <div className="mt-3 flex items-center justify-between gap-4">
                <span className="text-[11px] text-amber-400 font-medium">← Optical Fundus</span>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={sliderPos}
                  onChange={(e) => setSliderPos(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                />
                <span className="text-[11px] text-sky-400 font-medium">U-Net Skeleton →</span>
              </div>
            )}
          </div>

          {/* Mathematical Biometrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[11px] text-slate-400 font-medium">AVR Caliber Ratio</div>
              <div className={`text-2xl font-black mt-1 ${metrics?.avr < 0.60 ? "text-red-400" : "text-emerald-400"}`}>
                {metrics?.avr ?? "--"}
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className={`h-full ${metrics?.avr < 0.60 ? "bg-red-500" : "bg-emerald-400"}`} 
                  style={{ width: `${Math.min(100, ((metrics?.avr || 0.6) / 0.8) * 100)}%` }}
                ></div>
              </div>
              <div className="text-[10px] text-slate-500 mt-1.5">Standard: 0.65–0.75</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[11px] text-slate-400 font-medium">Tortuosity Index (τ)</div>
              <div className={`text-2xl font-black mt-1 ${metrics?.tortuosity_index > 0.20 ? "text-amber-400" : "text-emerald-400"}`}>
                {metrics?.tortuosity_index ?? "--"}
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className={`h-full ${metrics?.tortuosity_index > 0.20 ? "bg-amber-400" : "bg-emerald-400"}`} 
                  style={{ width: `${Math.min(100, ((metrics?.tortuosity_index || 0.1) / 0.5) * 100)}%` }}
                ></div>
              </div>
              <div className="text-[10px] text-slate-500 mt-1.5">Normal: &lt;0.20</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[11px] text-slate-400 font-medium">Fractal Dim (Df)</div>
              <div className={`text-2xl font-black mt-1 ${metrics?.fractal_dimension < 1.38 ? "text-red-400" : "text-emerald-400"}`}>
                {metrics?.fractal_dimension ?? "--"}
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className={`h-full ${metrics?.fractal_dimension < 1.38 ? "bg-red-400" : "bg-emerald-400"}`} 
                  style={{ width: `${Math.min(100, (((metrics?.fractal_dimension || 1.3) - 1.1) / 0.45) * 100)}%` }}
                ></div>
              </div>
              <div className="text-[10px] text-slate-500 mt-1.5">Normal: ≥1.42</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[11px] text-slate-400 font-medium">Capillary Density</div>
              <div className="text-2xl font-black mt-1 text-sky-400">
                {metrics?.vessel_density_pct ?? "--"}%
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-sky-400" 
                  style={{ width: `${Math.min(100, ((metrics?.vessel_density_pct || 10) / 20) * 100)}%` }}
                ></div>
              </div>
              <div className="text-[10px] text-slate-500 mt-1.5">Vascular Bed Area</div>
            </div>
          </div>
        </div>

        {/* Right Column: Diagnostic Protocol & Spoken Audio */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col justify-between h-full">
            {report ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Clinical Diagnostic Protocol
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    REF: KWB / ETDRS
                  </span>
                </div>

                {/* Score Banner */}
                <div className="bg-slate-950 border border-slate-850 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                      Keith-Wagener Staging
                    </div>
                    <div className="text-xl font-extrabold text-white mt-0.5">
                      {report.kwb_stage} Retinopathy
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Status: <span className="font-semibold text-sky-300">{report.risk_category}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                      Cardio-Renal Risk
                    </div>
                    <div className={`text-3xl font-black ${
                      report.cardio_renal_risk_score > 70 
                        ? "text-red-400" 
                        : report.cardio_renal_risk_score > 40 
                          ? "text-amber-400" 
                          : "text-emerald-400"
                    }`}>
                      {report.cardio_renal_risk_score}
                      <span className="text-sm font-normal text-slate-600">/100</span>
                    </div>
                  </div>
                </div>

                {/* Clinical Assessment */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Ophthalmic & Systemic Assessment
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                    {report.clinical_diagnosis_summary}
                  </p>
                </div>

                {/* Actions */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Physician Action Protocol
                  </h4>
                  <ul className="space-y-1.5">
                    {report.recommended_clinical_actions.map((act, i) => (
                      <li key={i} className="text-xs text-slate-300 flex items-start gap-2 bg-slate-950/50 p-2 rounded border border-slate-850">
                        <CheckCircle className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Audio Card */}
                <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5" /> Verbal Patient Guidance
                    </span>
                    <button 
                      onClick={() => speakAudio(report.patient_instruction_english)}
                      className={`text-xs font-bold px-3 py-1 rounded flex items-center gap-1.5 transition ${
                        isSpeaking 
                          ? "bg-red-500 hover:bg-red-400 text-white animate-pulse" 
                          : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                      }`}
                    >
                      {isSpeaking ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5" /> Stop
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" /> Play Voice
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-emerald-200/90 leading-relaxed font-medium">
                    "{report.patient_instruction_english}"
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-600">
                <Activity className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm font-semibold text-slate-400">Awaiting Image Upload</p>
                <p className="text-xs text-slate-600 mt-1 max-w-xs">
                  Upload a fundus scan to calculate microvascular biomarkers and generate clinical triage.
                </p>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>Deterministic Morphometry Engine</span>
              <button 
                onClick={() => window.print()}
                className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
              >
                <FileText className="w-3 h-3" /> Print Clinical Record
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}