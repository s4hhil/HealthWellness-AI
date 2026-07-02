import os
import re
from datetime import datetime

# Root directory for records to enforce sandboxing
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RECORDS_DIR = os.path.join(BASE_DIR, 'data', 'records')

def sanitize_input(text):
    """
    Sanitize text input to prevent script injection and standard security vulnerabilities.
    """
    if not isinstance(text, str):
        return ""
    # Strip HTML tags
    clean = re.sub(r'<[^>]*>', '', text)
    # Remove script tags or hazardous js: alerts/eval
    clean = re.sub(r'(javascript:|onload=|onerror=|onclick=)', '', clean, flags=re.IGNORECASE)
    return clean.strip()

def validate_filename(filename):
    """
    Ensure the filename does not escape the records directory.
    Only allows alphanumeric characters, underscores, dashes, and single extensions like .txt.
    No directory separators or double dots allowed.
    """
    if not isinstance(filename, str):
        raise ValueError("Filename must be a string.")
    
    # Strip path separators and check for directory traversal attempts
    base = os.path.basename(filename)
    if base != filename:
        raise ValueError("Directory traversal or path injection detected.")
        
    if ".." in filename or "/" in filename or "\\" in filename:
        raise ValueError("Path traversal sequence detected in filename.")
        
    # Check regex for valid file characters: [a-zA-Z0-9_-]+\.[a-zA-Z0-9]+
    if not re.match(r'^[a-zA-Z0-9_\-]+\.[a-zA-Z0-9]+$', filename):
        raise ValueError("Invalid filename structure.")
        
    return filename

def safe_read_record(filename):
    """
    Safely resolves and reads a medical record file, preventing path traversal.
    """
    try:
        clean_name = validate_filename(filename)
        safe_path = os.path.join(RECORDS_DIR, clean_name)
        
        # Verify absolute path is indeed under RECORDS_DIR
        real_records_dir = os.path.realpath(RECORDS_DIR)
        real_file_path = os.path.realpath(safe_path)
        
        if not real_file_path.startswith(real_records_dir):
            raise PermissionError("Access denied: File lies outside sandbox.")
            
        if not os.path.exists(real_file_path):
            raise FileNotFoundError(f"Record file {clean_name} not found.")
            
        with open(real_file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"Security Alert: Failed safe read for file '{filename}'. Error: {e}")
        raise

def validate_habit_log(data):
    """
    Validates daily habit inputs.
    """
    if not isinstance(data, dict):
        raise ValueError("Habit data must be a JSON object.")
        
    date_str = data.get("date")
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
    except (TypeError, ValueError):
        raise ValueError("Invalid or missing date. Must be YYYY-MM-DD.")
        
    hydration = data.get("hydration", 0)
    steps = data.get("steps", 0)
    meditation = data.get("meditation", 0)
    
    if not isinstance(hydration, (int, float)) or hydration < 0 or hydration > 10000:
        raise ValueError("Hydration must be a positive number under 10000 ml.")
        
    if not isinstance(steps, int) or steps < 0 or steps > 100000:
        raise ValueError("Steps must be a positive integer under 100000.")
        
    if not isinstance(meditation, (int, float)) or meditation < 0 or meditation > 1440:
        raise ValueError("Meditation must be a positive number under 1440 minutes.")
        
    return {
        "date": date_str,
        "hydration": float(hydration),
        "steps": int(steps),
        "meditation": float(meditation)
    }

def validate_sleep_log(data):
    """
    Validates sleep log entry.
    """
    if not isinstance(data, dict):
        raise ValueError("Sleep data must be a JSON object.")
        
    date_str = data.get("date")
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
    except (TypeError, ValueError):
        raise ValueError("Invalid or missing date. Must be YYYY-MM-DD.")
        
    duration = data.get("duration_hours", 0.0)
    deep = data.get("deep_sleep_hours", 0.0)
    rem = data.get("rem_sleep_hours", 0.0)
    quality = data.get("quality_score", 0)
    
    if not isinstance(duration, (int, float)) or duration < 0.0 or duration > 24.0:
        raise ValueError("Duration hours must be a number between 0 and 24.")
        
    if not isinstance(deep, (int, float)) or deep < 0.0 or deep > duration:
        raise ValueError("Deep sleep hours must be between 0 and total duration.")
        
    if not isinstance(rem, (int, float)) or rem < 0.0 or rem > duration:
        raise ValueError("REM sleep hours must be between 0 and total duration.")
        
    if not isinstance(quality, int) or quality < 0 or quality > 100:
        raise ValueError("Quality score must be an integer between 0 and 100.")
        
    return {
        "date": date_str,
        "duration_hours": float(duration),
        "deep_sleep_hours": float(deep),
        "rem_sleep_hours": float(rem),
        "quality_score": int(quality)
    }

def validate_cycle_log(data):
    """
    Validates menstrual cycle logging inputs.
    """
    if not isinstance(data, dict):
        raise ValueError("Cycle data must be a JSON object.")
        
    start_date = data.get("start_date")
    end_date = data.get("end_date")
    
    try:
        s_date = datetime.strptime(start_date, "%Y-%m-%d")
        if end_date:
            e_date = datetime.strptime(end_date, "%Y-%m-%d")
            if e_date < s_date:
                raise ValueError("End date cannot be earlier than start date.")
            if (e_date - s_date).days > 20:
                raise ValueError("Period length cannot exceed 20 days.")
    except (TypeError, ValueError) as e:
        raise ValueError(f"Invalid cycle dates: {e}")
        
    return {
        "start_date": start_date,
        "end_date": end_date
    }

def validate_symptom_log(data):
    """
    Validates symptom logging.
    """
    if not isinstance(data, dict):
        raise ValueError("Symptom log must be a JSON object.")
        
    date_str = data.get("date")
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
    except (TypeError, ValueError):
        raise ValueError("Invalid date. Must be YYYY-MM-DD.")
        
    symptoms = data.get("symptoms", [])
    if not isinstance(symptoms, list):
        raise ValueError("Symptoms must be a list of strings.")
        
    allowed_symptoms = {"cramps", "headache", "fatigue", "bloating", "nausea", "mood_swings", "acne", "backache"}
    validated_symptoms = [s for s in symptoms if s in allowed_symptoms]
    
    intensity = data.get("intensity", "mild")
    if intensity not in {"mild", "moderate", "severe"}:
        intensity = "mild"
        
    return {
        "date": date_str,
        "symptoms": validated_symptoms,
        "intensity": intensity
    }

def validate_mood_log(data):
    """
    Validates mood logging.
    """
    if not isinstance(data, dict):
        raise ValueError("Mood log must be a JSON object.")
        
    date_str = data.get("date")
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
    except (TypeError, ValueError):
        raise ValueError("Invalid date. Must be YYYY-MM-DD.")
        
    mood = data.get("mood", "calm")
    allowed_moods = {"happy", "sad", "anxious", "irritable", "calm", "energetic", "tired"}
    if mood not in allowed_moods:
        mood = "calm"
        
    energy_level = data.get("energy_level", 5)
    if not isinstance(energy_level, int) or energy_level < 1 or energy_level > 10:
        energy_level = 5
        
    return {
        "date": date_str,
        "mood": mood,
        "energy_level": energy_level
    }
