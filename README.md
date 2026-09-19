RetinaVascular AI
A 3-second glance into the eye to screen for silent heart and kidney damage before symptoms appear.

What Problem Does This Solve?
High blood pressure and early chronic kidney disease are silent conditions. For years, people feel healthy, experience normal vision, and show zero symptoms. Because of this, early testing rarely happens until after serious vascular damage or a cardiac event occurs. Early lab tests and specialist consultations can also be difficult to access in rural health camps and primary health centres.

Why the Eye?
The tiny blood vessels in the retina share the exact same tissue structure and respond to blood pressure stress in the same way as capillaries in the heart and kidneys.

Because the eye has a clear lens, the retina is the only place in the living human body where internal microvessels can be observed directly without surgery. When systemic vascular damage begins, retinal vessels narrow, twist, and drop in density at the same time.

Where Is It Used? (Opportunistic Screening)
People do not typically visit eye clinics for kidney or heart checks, so this tool integrates into existing routine workflows:

Optometry & Optical Shops: While getting glasses fitted or taking a driving vision test, the fundus camera analyzes vessel geometry in the background to flag early hypertensive risks.

Rural Camps & Primary Health Centres: Health workers using portable smartphone lens attachments can snap a photo and deliver clear, spoken guidance in under 3 seconds without drawing blood.

Annual Diabetic Checkups: Patients getting mandated annual diabetic eye scans receive a dual assessment for both eye health and silent cardio-renal microvascular risks.

How It Works
The system combines an interactive user interface, deterministic image processing, and clinical AI:

Interactive Clinical Dashboard (Frontend - Next.js / React):

Real-time dual-viewport slider comparing the raw fundus capture with the segmented vascular skeleton.

Dynamic visual metric cards displaying real-time microvascular health numbers.

Spoken audio guidance engine for accessible triage in rural and low-literacy settings.

Deterministic Computer Vision (Backend - OpenCV / Scikit-Image):

Validates genuine retinal scans via hemoglobin color absorption and circular aperture geometry.

Extracts capillary skeletons to measure concrete biological markers:

AVR (Arteriole-to-Venule Ratio): Detects vessel caliber narrowing.

Tortuosity: Measures abnormal twisting and buckling under vascular pressure.

Fractal Dimension (Df): Evaluates capillary branching density and microvessel loss.

Clinical Reasoning Layer (Gemini 1.5 Flash):

Assesses biometric measurements against the Keith-Wagener-Barker staging scale.

Computes an overall Cardio-Renal Risk Score (1–100).

Generates actionable physician referral protocols and clear patient instructions.

Quickstart
1. Backend Setup (FastAPI / Python)
Bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
set GEMINI_API_KEY=your_gemini_api_key
python main.py
(Runs at http://localhost:8000)

2. Frontend Setup (Next.js / React)
Bash
cd frontend
npm install
npm run dev
(Runs at http://localhost:3000)
