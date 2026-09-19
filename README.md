# 👁️ RetinaVascular AI
> Non-invasive cardio-renal risk screening from retinal fundus photographs.

---

### What Problem Does This Solve?
High blood pressure and chronic kidney disease develop silently over years with zero pain or obvious vision changes. Because patients feel healthy, they rarely undergo early diagnostic screening until irreversible microvascular damage or a cardiovascular event occurs. Standard screening requires clinical visits, blood draws, and laboratory turnaround times that are not always accessible.

---

### Why the Eye?
Retinal microvessels share structural and physiological characteristics with the microscopic blood vessels in the heart and kidneys. The clear ocular media makes the retina the only site in the human body where live microvasculature can be observed directly and non-invasively. When systemic vascular damage begins, retinal vessels undergo measurable changes: caliber narrowing, pathological tortuosity, and microvessel rarefaction.

---

### Opportunistic Screening Workflow
The platform is designed to sit inside routine primary eye care visits:
* **Optometry & Optical Shops:** While getting eyeglasses prescribed or tested, the fundus camera captures a scan that evaluates vascular stress indicators in the background.
* **Primary Health Camps:** A quick fundus photo provides an immediate objective vascular assessment without needles or laboratory infrastructure.
* **Routine Diabetic Screening:** Integrates into standard annual retinal screenings to provide simultaneous cardio-renal microvascular risk triage.

---

### System Architecture & How It Works

1. **Deterministic Computer Vision Pipeline (FastAPI / OpenCV / Scikit-Image):**
   * **Hemoglobin & Geometry Verification:** Validates genuine fundus photography via green-channel absorption characteristics and circular aperture boundaries.
   * **Vessel Segmentation:** Isolates retinal arterioles and venules using contrast-limited adaptive histogram equalization (CLAHE) and medial-axis skeletonization.
   * **Biometric Feature Extraction:**
     * **AVR (Arteriole-to-Venule Ratio):** Measures vessel thinning associated with chronic hypertension.
     * **Tortuosity Index:** Evaluates vessel winding and buckling caused by continuous shear stress.
     * **Fractal Dimension (Df):** Analyzes vessel branching density to detect capillary rarefaction.

2. **Clinical Reasoning Layer (Gemini 1.5 Flash):**
   * Correlates extracted physical measurements against the Keith-Wagener-Barker (KWB) retinal microvascular staging criteria.
   * Calculates a composite Cardio-Renal Risk Score (1–100).
   * Generates actionable physician referral guidelines and plain-language patient explanations.

3. **Interactive Dashboard (Next.js / React / Tailwind CSS):**
   * Dual-viewport interactive slider comparing raw fundus photographs against segmented vascular skeletons.
   * Direct visual biometric cards reporting calculated AVR, Tortuosity, and Fractal Dimension.
   * Clinical classification panel displaying stage severity and physician follow-up protocols.

---

### Running the Project Locally

#### 1. Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
set GEMINI_API_KEY=your_gemini_api_key
python main.py
```


#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```


