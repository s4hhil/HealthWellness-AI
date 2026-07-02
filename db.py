import os
import json
import threading
from datetime import datetime, timedelta

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
RECORDS_DIR = os.path.join(DATA_DIR, 'records')

# Ensure directories exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(RECORDS_DIR, exist_ok=True)

# Lock for thread safety
db_lock = threading.RLock()

def get_file_path(filename):
    return os.path.join(DATA_DIR, filename)

def read_json(filename, default_value):
    path = get_file_path(filename)
    with db_lock:
        if not os.path.exists(path):
            write_json(filename, default_value)
            return default_value
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return default_value

def write_json(filename, data):
    path = get_file_path(filename)
    with db_lock:
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"Error writing JSON {filename}: {e}")
            return False

# Initialize mock data
def initialize_database():
    # Habit Tracker Mock Data
    default_habits = {
        "2026-06-28": {"hydration": 2200, "steps": 8400, "meditation": 15, "completed": ["hydration", "steps", "meditation"]},
        "2026-06-29": {"hydration": 1800, "steps": 6200, "meditation": 0, "completed": ["hydration"]},
        "2026-06-30": {"hydration": 2500, "steps": 10500, "meditation": 20, "completed": ["hydration", "steps", "meditation"]},
        "2026-07-01": {"hydration": 1200, "steps": 4300, "meditation": 10, "completed": []}
    }
    read_json('habits.json', default_habits)

    # Sleep Tracker Mock Data
    default_sleep = [
        {"date": "2026-06-28", "duration_hours": 7.5, "deep_sleep_hours": 1.8, "rem_sleep_hours": 1.5, "quality_score": 78},
        {"date": "2026-06-29", "duration_hours": 6.2, "deep_sleep_hours": 1.1, "rem_sleep_hours": 1.2, "quality_score": 62},
        {"date": "2026-06-30", "duration_hours": 8.0, "deep_sleep_hours": 2.1, "rem_sleep_hours": 1.9, "quality_score": 88},
        {"date": "2026-07-01", "duration_hours": 7.0, "deep_sleep_hours": 1.5, "rem_sleep_hours": 1.4, "quality_score": 75}
    ]
    read_json('sleep.json', default_sleep)

    # Women's Wellness Module (Cycle, symptoms, moods)
    # Average cycle: 28 days. Average period length: 5 days.
    # Log previous cycle starts.
    default_cycle = {
        "cycle_length_default": 28,
        "period_length_default": 5,
        "period_logs": [
            {"start_date": "2026-05-04", "end_date": "2026-05-08"},
            {"start_date": "2026-06-01", "end_date": "2026-06-05"},
            {"start_date": "2026-06-29", "end_date": "2026-07-03"}  # Current or very recent cycle
        ],
        "symptoms": [
            {"date": "2026-06-29", "symptoms": ["cramps", "fatigue"], "intensity": "moderate"},
            {"date": "2026-06-30", "symptoms": ["headache", "fatigue"], "intensity": "mild"},
            {"date": "2026-07-01", "symptoms": ["bloating"], "intensity": "mild"}
        ],
        "moods": [
            {"date": "2026-06-29", "mood": "irritable", "energy_level": 3},
            {"date": "2026-06-30", "mood": "anxious", "energy_level": 4},
            {"date": "2026-07-01", "mood": "calm", "energy_level": 6}
        ]
    }
    read_json('cycle.json', default_cycle)

    # Medical Records files creation
    records = {
        "blood_report_2026.txt": """HealthWellness AI - Secure Medical Records Manager
Date: 2026-03-15
Patient: Jane Doe

LAB RESULTS - COMPLETE BLOOD COUNT (CBC):
- Red Blood Cell (RBC) count: 4.5 M/uL (Normal)
- White Blood Cell (WBC) count: 6.8 K/uL (Normal)
- Hemoglobin: 13.8 g/dL (Normal)
- Platelets: 250 K/uL (Normal)

CHOLESTEROL PANEL:
- Total Cholesterol: 185 mg/dL (Normal, < 200)
- LDL: 98 mg/dL (Optimal, < 100)
- HDL: 65 mg/dL (Excellent, > 50)
- Triglycerides: 110 mg/dL (Normal, < 150)

VITAMIN LEVELS:
- Vitamin D-25 Hydroxy: 28 ng/mL (Borderline low, target > 30)
- Vitamin B12: 450 pg/mL (Normal)

RECOMMENDATION: Consider daily Vitamin D3 supplement of 1000 IU. Keep up the balanced diet.""",

        "annual_physical_2025.txt": """HealthWellness AI - Secure Medical Records Manager
Date: 2025-10-12
Patient: Jane Doe

ANNUAL PHYSICAL EXAMINATION REPORT:
- Age: 28
- Height: 5'6" (167.6 cm)
- Weight: 138 lbs (62.6 kg)
- BMI: 22.3 (Normal range)
- Blood Pressure: 118/76 mmHg (Normal)
- Heart Rate: 72 bpm (Regular rhythm)

PHYSICAL NOTES:
Lungs clear to auscultation. Abdomen soft, non-tender. Reflexes intact. Eye and ear exams normal.
Patient reports moderate occupational stress and average sleep of 6.5 hours.

PLAN:
1. Focus on stress management via mindfulness or yoga.
2. Target 7.5+ hours of sleep nightly.
3. Next routine physical checkup in one year.""",

        "prescription_may_2026.txt": """HealthWellness AI - Secure Medical Records Manager
Date: 2026-05-12
Dr. Sarah Lin, MD - General Medicine
Rx Prescription

Patient: Jane Doe

Medication: Ergocalciferol (Vitamin D2) 1.25 mg (50,000 USP Units)
Dosage: 1 capsule by mouth once weekly for 8 weeks.
Refills: 0

Instructions: Take with food (preferably high in healthy fats) to improve absorption.
Notes: Indicated for borderline Vitamin D deficiency. Re-check Vitamin D levels in 3 months."""
    }

    for filename, content in records.items():
        filepath = os.path.join(RECORDS_DIR, filename)
        if not os.path.exists(filepath):
            try:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content.strip())
            except Exception as e:
                print(f"Error writing mock record {filename}: {e}")

if __name__ == '__main__':
    initialize_database()
    print("Database initialized successfully.")
