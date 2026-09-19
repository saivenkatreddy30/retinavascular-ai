from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import cv2, numpy as np, json, os
from morphometry_engine import analyze_retinal_morphometry

app = FastAPI(title="RetinaVascular AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Securely read from the environment variable (safe for GitHub)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
    except Exception as e:
        print(f"Warning: Failed to configure Gemini API: {e}")

def validate_fundus_image(img):
    """
    Validates if the image matches standard retinal fundus biometrics:
    - Verifies optical orange/red color dominance (hemoglobin absorption)
    - Rejects UI screenshots, documents, and non-retinal photos
    """
    # 1. Color channel verification (Retinal fundus has high Red, moderate Green, low Blue)
    b_mean = np.mean(img[:, :, 0])
    g_mean = np.mean(img[:, :, 1])
    r_mean = np.mean(img[:, :, 2])
    
    if r_mean < 35 or r_mean < (b_mean * 1.25):
        return False, "Color spectrum does not match ocular tissue (insufficient retinal hemoglobin signature)."
        
    # 2. Check for circular optical boundary contrast
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    center_brightness = np.mean(gray[128:384, 128:384])
    corners_brightness = (np.mean(gray[:64, :64]) + np.mean(gray[:64, -64:]) + 
                          np.mean(gray[-64:, :64]) + np.mean(gray[-64:, -64:])) / 4.0
    
    if center_brightness < corners_brightness * 0.8:
        return False, "Optical field geometry mismatch: circular ocular aperture not detected."
        
    return True, "Valid"

@app.post("/analyze")
@app.post("/analyze-retina")
async def analyze_retina(file: UploadFile = File(...), language: str = Form("English")):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        return {"error": "Invalid image format. Please upload a valid PNG or JPG file."}

    img = cv2.resize(img, (512, 512))
    
    # 1. Biological Quality & Authenticity Filter
    is_valid, reason = validate_fundus_image(img)
    if not is_valid:
        return {
            "error": f"Invalid Image: {reason} Please upload a standard retinal fundus photograph."
        }
    
    # 2. Optical Green-Band Extraction + CLAHE Contrast Boost
    green = img[:, :, 1]
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(green)
    vessel_mask = cv2.adaptiveThreshold(
        clahe, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY_INV, 15, 3
    )
    
    h, w = vessel_mask.shape
    cv2.rectangle(vessel_mask, (0, 0), (w, h), 0, 10)
    
    # 3. Mathematical Morphometry Extraction
    metrics = analyze_retinal_morphometry(vessel_mask, img)
    
    avr = metrics["avr"]
    tort = metrics["tortuosity_index"]
    df = metrics["fractal_dimension"]
    density = metrics["vessel_density_pct"]
    
    # 4. Continuous Deterministic Risk Penalty Formula
    avr_penalty = max(0, (0.70 - avr) * 120)
    tort_penalty = max(0, (tort - 0.15) * 100)
    df_penalty = max(0, (1.44 - df) * 150)
    calculated_risk_score = int(np.clip(10 + avr_penalty + tort_penalty + df_penalty, 5, 96))
    
    # 5. Gemini 1.5 Flash Clinical Staging Layer
    gemini_success = False
    ai_data = {}
    
    if GEMINI_API_KEY:
        try:
            client = genai.GenerativeModel("gemini-1.5-flash")
            prompt_text = (
                f"You are a clinical neuro-ophthalmologist. Given quantitative retinal morphometry:\n"
                f"- Arteriole-to-Venule Ratio (AVR): {avr} (Normal: 0.65 - 0.75)\n"
                f"- Fractal Dimension (Df): {df} (Normal: >= 1.42)\n"
                f"- Tortuosity Index: {tort} (Normal: < 0.20)\n"
                f"- Vessel Density: {density}%\n\n"
                "Generate a strict JSON response containing:\n"
                "1. kwb_stage: Grade I | Grade II | Grade III | Grade IV | Normal\n"
                "2. systemic_risk_summary: string\n"
                "3. cardio_renal_risk_score: int (1 to 100)\n"
                "4. recommended_clinical_actions: list of strings\n"
                "5. patient_instruction_english: string"
            )
            response = client.generate_content(
                prompt_text,
                generation_config={"response_mime_type": "application/json"}
            )
            ai_data = json.loads(response.text)
            gemini_success = True
            print("Successfully generated clinical report with Gemini 1.5 Flash!")
        except Exception as e:
            print(f"Gemini API call bypassed or quota exhausted: {e}")
            gemini_success = False

    # 6. Fallback or Integration of Results
    if gemini_success:
        stage = ai_data.get("kwb_stage", "Normal")
        summary = ai_data.get("systemic_risk_summary", "Microvascular analysis completed.")
        score = int(ai_data.get("cardio_renal_risk_score", calculated_risk_score))
        actions = ai_data.get("recommended_clinical_actions", ["Follow up with physician"])
        adv_en = ai_data.get("patient_instruction_english", "Please follow your clinical consultation schedule.")
        risk_cat = "Severe Risk" if score > 70 else ("Moderate Risk" if score > 40 else "Low Risk")
    else:
        if calculated_risk_score >= 75:
            stage = "Grade IV" if calculated_risk_score > 88 else "Grade III"
            risk_cat = "Severe Risk"
            summary = f"Severe microvascular compromise detected. Arteriolar-to-Venular Ratio ({avr}) indicates profound arteriolar narrowing, accompanied by abnormal vessel tortuosity ({tort}). Significant capillary rarefaction (Df {df}) highlights high systemic ischemic risk."
            actions = [
                "Immediate 24-Hour Ambulatory Blood Pressure Monitoring (ABPM)",
                "Renal Function Panel: Serum Creatinine, eGFR, and Microalbuminuria",
                "Urgent referral to Cardiology / Ophthalmology within 24 to 48 hours"
            ]
            adv_en = "High microvascular stress detected. You have a significantly elevated risk of hypertension-related complications. Please visit an emergency clinic immediately."
        elif calculated_risk_score >= 45:
            stage = "Grade II"
            risk_cat = "Moderate Risk"
            summary = f"Moderate arteriolar attenuation observed (AVR {avr}) with focal constrictions and tortuosity ({tort}). Capillary density ({density}%) reflects early microvascular alterations."
            actions = [
                "Comprehensive Blood Pressure Profiling and Home BP Log",
                "Fasting Blood Glucose and HbA1c screening",
                "Dietary sodium restriction and clinical review within 2 to 4 weeks"
            ]
            adv_en = "Moderate capillary changes detected. Monitor your blood pressure closely and schedule a follow-up consultation with your doctor."
        else:
            stage = "Normal / Grade I"
            risk_cat = "Low Risk"
            summary = f"Retinal microvasculature is well-preserved. Arteriolar-to-Venular Ratio ({avr}) and branching fractal complexity ({df}) remain within standard physiological thresholds."
            actions = [
                "Routine annual preventive retinal fundus examination",
                "Maintain current cardiovascular and lifestyle health regimen"
            ]
            adv_en = "Your retinal microvasculature appears healthy. No evidence of severe hypertensive damage detected."
        score = calculated_risk_score

    report = {
        "kwb_stage": stage,
        "cardio_renal_risk_score": score,
        "risk_category": risk_cat,
        "clinical_diagnosis_summary": summary,
        "systemic_risk_summary": summary,
        "recommended_clinical_actions": actions,
        "patient_instruction_english": adv_en,
        "source": "Gemini 1.5 Flash" if gemini_success else "Deterministic Rule Engine"
    }

    return {
        "metrics": metrics,
        "biometric_metrics": metrics,
        "clinical_report": report
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)