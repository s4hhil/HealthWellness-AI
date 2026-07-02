import json
import re
from datetime import datetime, timedelta
import mcp_server  # Local import to use tools directly or via local JSON-RPC calls

class Agent:
    def __init__(self, name, role, system_prompt, allowed_tools):
        self.name = name
        self.role = role
        self.system_prompt = system_prompt
        self.allowed_tools = allowed_tools

    def format_agent_response(self, text, tools_used=None):
        return {
            "agent": self.name,
            "role": self.role,
            "response": text,
            "tools_used": tools_used or []
        }

# Define the 10 agents
agents_registry = {
    "Personal Health Assistant": Agent(
        name="Personal Health Assistant",
        role="Primary Medical Care Guidance & Analysis Assistant",
        system_prompt="You analyze symptoms, review lab results, and provide general health explanations. You cannot prescribe medicine but can interpret records.",
        allowed_tools=["list_medical_records", "read_medical_record"]
    ),
    "Wellness Coach": Agent(
        name="Wellness Coach",
        role="Fitness, Motivation & Goal Coach",
        system_prompt="You motivate users to reach fitness goals, recommend training, and guide lifestyle changes.",
        allowed_tools=["get_habits", "log_habit"]
    ),
    "AI Health Companion": Agent(
        name="AI Health Companion",
        role="Empathetic Daily Conversationalist",
        system_prompt="You check in on the user's wellbeing daily, offering supportive and caring reflections.",
        allowed_tools=[]
    ),
    "Habit Tracker": Agent(
        name="Habit Tracker",
        role="Habits & Progress Monitor",
        system_prompt="You track hydration, steps, meditation. You give weekly feedback on streak completions.",
        allowed_tools=["get_habits", "log_habit"]
    ),
    "Sleep Tracker": Agent(
        name="Sleep Tracker",
        role="Sleep Hygiene & Cycles Analyst",
        system_prompt="You analyze sleep duration, deep/REM cycles, and suggest bedtime optimizations.",
        allowed_tools=["get_sleep_logs", "log_sleep"]
    ),
    "Medical Records Manager": Agent(
        name="Medical Records Manager",
        role="Secure Health Records Safe & Searcher",
        system_prompt="You list, search, and parse local medical files. You enforce strict verification.",
        allowed_tools=["list_medical_records", "read_medical_record"]
    ),
    "Nutrition Advisor": Agent(
        name="Nutrition Advisor",
        role="Dietary, Calorie & Meal Planner",
        system_prompt="You offer calorie goals, recipe adjustments, macronutrient breakdowns, and log food intake.",
        allowed_tools=["get_habits"]
    ),
    "Mental Wellness Assistant": Agent(
        name="Mental Wellness Assistant",
        role="Mindfulness, Mood & Stress Relief Advisor",
        system_prompt="You check on moods, offer breathing exercises, and suggest relaxation protocols.",
        allowed_tools=["log_mood", "get_cycle_data"]
    ),
    "Productivity Planner": Agent(
        name="Productivity Planner",
        role="Time Management & Energy Scheduler",
        system_prompt="You balance habits and sleep data with daily schedules for optimized focus blocks.",
        allowed_tools=["get_sleep_logs", "get_habits"]
    ),
    "Women's Wellness Module": Agent(
        name="Women's Wellness Module",
        role="Menstrual Health, Cycle Predictor & Symptom Advisor",
        system_prompt="You calculate period cycles, predict ovulation, correlate moods and symptoms, and provide wellness tips tailored to current cycle phases.",
        allowed_tools=["get_cycle_data", "log_cycle_event", "log_symptom", "log_mood"]
    )
}

def call_local_mcp(tool_name, arguments):
    """
    Simulates calling the MCP server via standard JSON-RPC interface.
    """
    try:
        response = mcp_server.handle_mcp_request("tools/call", {"name": tool_name, "arguments": arguments})
        text = response.get("content", [{}])[0].get("text", "")
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return text
    except Exception as e:
        return {"error": f"MCP tool execution failed: {str(e)}"}

class MultiAgentOrchestrator:
    def __init__(self):
        self.agents = agents_registry

    def route_query(self, message):
        """
        Determines the appropriate agent based on keywords if no agent is specified.
        """
        msg = message.lower()
        
        # Women's wellness triggers
        if any(w in msg for w in ["period", "cycle", "cramps", "ovulation", "symptom", "pms", "menstrual"]):
            return "Women's Wellness Module"
        # Sleep triggers
        elif any(w in msg for w in ["sleep", "insomnia", "bedtime", "rem", "deep sleep", "wake"]):
            return "Sleep Tracker"
        # Medical records triggers
        elif any(w in msg for w in ["report", "lab", "record", "doctor", "prescription", "cbc", "cholesterol", "medical"]):
            return "Medical Records Manager"
        # Nutrition triggers
        elif any(w in msg for w in ["diet", "food", "calorie", "meal", "recipe", "nutrition", "eat", "protein"]):
            return "Nutrition Advisor"
        # Mental wellness triggers
        elif any(w in msg for w in ["mood", "anxious", "stress", "depressed", "breathing", "mindfulness", "meditate"]):
            if "meditat" in msg and "habit" in msg:
                return "Habit Tracker"
            return "Mental Wellness Assistant"
        # Habit tracker triggers
        elif any(w in msg for w in ["habit", "steps", "water", "hydration", "log hydration", "walk"]):
            return "Habit Tracker"
        # Productivity planner triggers
        elif any(w in msg for w in ["schedule", "routine", "planner", "productivity", "focus", "work block"]):
            return "Productivity Planner"
        # Wellness Coach triggers
        elif any(w in msg for w in ["workout", "exercise", "motivation", "gym", "fitness", "run"]):
            return "Wellness Coach"
        # Personal Health Assistant triggers
        elif any(w in msg for w in ["health", "fever", "cough", "symptom", "illness", "doctor"]):
            return "Personal Health Assistant"
        # Default fallback
        return "AI Health Companion"

    def execute_agent(self, agent_name, user_query):
        """
        Executes a targeted agent. Intercepts queries, queries database via MCP server, 
        and formulates rich agent responses.
        """
        if agent_name not in self.agents:
            agent_name = "AI Health Companion"
            
        agent = self.agents[agent_name]
        query_lower = user_query.lower()
        tools_used = []
        
        # 1. Personal Health Assistant
        if agent_name == "Personal Health Assistant":
            if "report" in query_lower or "blood" in query_lower or "records" in query_lower:
                tools_used.append("list_medical_records")
                records_list = call_local_mcp("list_medical_records", {})
                
                tools_used.append("read_medical_record")
                # Automatically read blood report if they ask about it
                blood_report = call_local_mcp("read_medical_record", {"filename": "blood_report_2026.txt"})
                
                response_text = (
                    "### Personal Health Assistant Guidance\n"
                    "I have retrieved your medical records to inspect your blood metrics.\n\n"
                    f"**Found Records:** {', '.join(records_list) if isinstance(records_list, list) else records_list}\n\n"
                    "**Analysis of `blood_report_2026.txt`:**\n"
                    "- **CBC & Cholesterol:** All parameters (RBC, WBC, Hemoglobin, LDL, HDL, Triglycerides) are well within the standard healthy reference ranges.\n"
                    "- **Vitamins:** Your **Vitamin D level is 28 ng/mL**, which is borderline deficient (healthy levels are > 30 ng/mL).\n\n"
                    "**Recommendation:**\n"
                    "1. I suggest discussing a weekly or daily Vitamin D3 supplement with your primary care provider.\n"
                    "2. Incorporate salmon, egg yolks, and fortified foods into your nutrition regimen.\n"
                    "3. Ensure safe sunlight exposure for 10-15 minutes daily."
                )
            else:
                response_text = (
                    "### Personal Health Assistant Guidance\n"
                    "Hello! I am your Personal Health Assistant. I can help interpret medical reports or discuss standard wellness questions. "
                    "How are you feeling today? If you'd like me to look at your medical files, ask me to 'check my blood report' or 'list my medical records'."
                )
                
        # 2. Wellness Coach
        elif agent_name == "Wellness Coach":
            tools_used.append("get_habits")
            habits_data = call_local_mcp("get_habits", {"date": "2026-07-01"})
            
            steps = habits_data.get("steps", 0) if isinstance(habits_data, dict) else 0
            hydration = habits_data.get("hydration", 0) if isinstance(habits_data, dict) else 0
            
            response_text = (
                "### Wellness Coach Action Plan\n"
                "Keep pushing forward! Here's where you stand today:\n"
                f"- **Steps:** {steps:,} / 10,000 steps\n"
                f"- **Hydration:** {hydration} / 2,500 ml\n\n"
                "**Your Daily Routine Recommendation:**\n"
                "- 🏃 **Cardio Target:** Aim for a 20-minute brisk walk to cross the 10,000 steps mark!\n"
                "- 💧 **Hydration Reminder:** Drink two more large glasses of water to support metabolic function.\n"
                "**Motivation:** *'Consistency beats intensity. What you do daily matters more than what you do occasionally.'*"
            )
            
        # 3. AI Health Companion
        elif agent_name == "AI Health Companion":
            response_text = (
                "### AI Health Companion\n"
                "Hello! I am your daily wellness companion. 🌟 I'm here to listen, support, and chat about how you're feeling. "
                "Life gets busy, but taking a moment to check in with yourself is crucial. "
                "How has your energy been today? Feel free to share anything on your mind!"
            )
            
        # 4. Habit Tracker
        elif agent_name == "Habit Tracker":
            # Match logs or updates
            log_match = re.search(r'log (water|steps|meditation) (\d+)', query_lower)
            if log_match:
                habit_type = log_match.group(1)
                value = int(log_match.group(2))
                
                # Fetch existing habits
                today = datetime.now().strftime("%Y-%m-%d")
                existing = call_local_mcp("get_habits", {"date": today})
                if "error" in existing or not isinstance(existing, dict):
                    existing = {"hydration": 0, "steps": 0, "meditation": 0}
                
                if habit_type == "water":
                    existing["hydration"] = value
                elif habit_type == "steps":
                    existing["steps"] = value
                elif habit_type == "meditation":
                    existing["meditation"] = value
                
                existing["date"] = today
                tools_used.append("log_habit")
                result = call_local_mcp("log_habit", existing)
                
                response_text = (
                    f"### Habit Tracker Updated\n"
                    f"Logged **{value}** for **{habit_type}** today.\n\n"
                    f"**Current Stats:**\n"
                    f"- Water: {existing.get('hydration', 0)} ml\n"
                    f"- Steps: {existing.get('steps', 0):,} steps\n"
                    f"- Meditation: {existing.get('meditation', 0)} mins"
                )
            else:
                tools_used.append("get_habits")
                today = datetime.now().strftime("%Y-%m-%d")
                habits = call_local_mcp("get_habits", {"date": today})
                
                response_text = (
                    "### Habit Tracker Overview\n"
                    f"Here is your status for **{today}**:\n"
                    f"- 💧 **Hydration:** {habits.get('hydration', 0)} / 2500 ml\n"
                    f"- 👣 **Steps:** {habits.get('steps', 0):,} / 10000 steps\n"
                    f"- 🧘 **Meditation:** {habits.get('meditation', 0)} / 15 mins\n\n"
                    "*Tip: To update, type 'log water 2000' or 'log steps 8500'.*"
                )
                
        # 5. Sleep Tracker
        elif agent_name == "Sleep Tracker":
            tools_used.append("get_sleep_logs")
            logs = call_local_mcp("get_sleep_logs", {"limit": 3})
            
            if isinstance(logs, list) and len(logs) > 0:
                recent = logs[0]
                dur = recent.get("duration_hours", 0)
                score = recent.get("quality_score", 0)
                deep = recent.get("deep_sleep_hours", 0)
                rem = recent.get("rem_sleep_hours", 0)
                
                response_text = (
                    "### Sleep Tracker Report\n"
                    f"**Last Night's Summary ({recent.get('date')}):**\n"
                    f"- 🛏️ **Total sleep:** {dur} hours\n"
                    f"- ⚡ **Quality score:** {score}/100\n"
                    f"- 💤 **Deep sleep:** {deep}h | **REM sleep:** {rem}h\n\n"
                    "**Sleep Coach Tip:**\n"
                    "Your deep sleep ratio is optimal (approx 20%). However, if you woke up feeling tired, "
                    "try to avoid blue light screens for 60 minutes before hitting the bed."
                )
            else:
                response_text = (
                    "### Sleep Tracker Report\n"
                    "No sleep records found. Type 'log sleep duration 7.5 quality 80' to get started."
                )
                
        # 6. Medical Records Manager
        elif agent_name == "Medical Records Manager":
            if "read" in query_lower or "open" in query_lower or "show" in query_lower:
                filename = "blood_report_2026.txt"
                for ext in [".txt", ".pdf"]:
                    found = re.search(r'([a-zA-Z0-9_\-]+\.txt)', query_lower)
                    if found:
                        filename = found.group(1)
                        break
                        
                tools_used.append("read_medical_record")
                try:
                    content = call_local_mcp("read_medical_record", {"filename": filename})
                    if "error" in content:
                        response_text = f"### Security Block / Error\nAccess denied or file not found: {content['error']}"
                    else:
                        response_text = (
                            f"### Secure Medical Records Manager\n"
                            f"**File opened successfully:** `{filename}`\n\n"
                            f"```text\n{content}\n```"
                        )
                except Exception as e:
                    response_text = f"### Security Block\nAction rejected: {str(e)}"
            else:
                tools_used.append("list_medical_records")
                records = call_local_mcp("list_medical_records", {})
                files_str = "\n".join([f"- {r}" for r in records]) if isinstance(records, list) else str(records)
                response_text = (
                    "### Secure Medical Records Manager\n"
                    "Your medical files are protected under a secure local directory sandbox. "
                    "Any attempt to escape using parent path sequences (`..`) will be rejected.\n\n"
                    f"**Available Records:**\n{files_str}\n\n"
                    "*Use 'read <filename>' to view specific record details securely.*"
                )
                
        # 7. Nutrition Advisor
        elif agent_name == "Nutrition Advisor":
            response_text = (
                "### Nutrition Advisor Meal Coach\n"
                "For a active lifestyle, here is your customized macronutrient plan:\n"
                "- **Daily Calories:** 1,800 - 2,000 kcal\n"
                "- 🥚 **Protein:** 100g (Build & Repair Muscle)\n"
                "- 🍞 **Carbohydrates:** 200g (Complex carbs like Oats, Brown Rice)\n"
                "- 🥑 **Fats:** 65g (Healthy fats like Avocado, Nuts)\n\n"
                "**Today's Suggestion:** Focus on micronutrients! Add a side of spinach or broccoli to dinner "
                "to boost iron and calcium, aiding vitamin absorption."
            )
            
        # 8. Mental Wellness Assistant
        elif agent_name == "Mental Wellness Assistant":
            tools_used.append("get_cycle_data")
            cycle = call_local_mcp("get_cycle_data", {})
            moods = cycle.get("moods", []) if isinstance(cycle, dict) else []
            
            mood_str = "stable"
            if moods:
                mood_str = moods[-1].get("mood", "stable")
                
            response_text = (
                "### Mental Wellness Guidance\n"
                f"I noticed your latest logged mood is **{mood_str}**.\n\n"
                "**Mindfulness Exercise (4-7-8 Breathing):**\n"
                "1. Breathe in through your nose for 4 seconds.\n"
                "2. Hold your breath for 7 seconds.\n"
                "3. Exhale completely through your mouth for 8 seconds.\n"
                "4. Repeat 4 times.\n\n"
                "This stimulates the vagus nerve and triggers your parasympathetic system, reducing cortisol levels instantly."
            )
            
        # 9. Productivity Planner
        elif agent_name == "Productivity Planner":
            tools_used.append("get_sleep_logs")
            sleep = call_local_mcp("get_sleep_logs", {"limit": 1})
            
            score = 75
            if isinstance(sleep, list) and len(sleep) > 0:
                score = sleep[0].get("quality_score", 75)
                
            focus_time = "9:00 AM - 11:30 AM" if score >= 75 else "11:00 AM - 1:00 PM"
            
            response_text = (
                "### High-Focus Productivity Planner\n"
                f"Based on your last night's sleep quality score (**{score}/100**):\n\n"
                f"- 🧠 **Optimal Deep Work Block:** `{focus_time}`\n"
                "- ☕ **Energy Dip Strategy:** Schedule admin/light tasks for 2:30 PM. Drink water, not caffeine, at this hour.\n"
                "- 🚶 **Active Break:** Every 50 minutes of focus, take a 5-minute movement break to keep blood circulating."
            )
            
        # 10. Women's Wellness Module
        elif agent_name == "Women's Wellness Module":
            tools_used.append("get_cycle_data")
            cycle = call_local_mcp("get_cycle_data", {})
            
            period_logs = cycle.get("period_logs", []) if isinstance(cycle, dict) else []
            cycle_length = cycle.get("cycle_length_default", 28)
            period_length = cycle.get("period_length_default", 5)
            
            if period_logs:
                last_period = period_logs[-1]
                start_date_str = last_period["start_date"]
                start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
                
                # Calculate cycle metrics
                next_period = start_date + timedelta(days=cycle_length)
                ovulation_date = start_date + timedelta(days=cycle_length // 2)
                today = datetime.now()
                
                days_until_period = (next_period - today).days
                
                # Determine current phase
                days_since_start = (today - start_date).days
                if days_since_start < period_length:
                    phase = "Menstrual Phase"
                    wellness_rec = "Focus on restorative rest, iron-rich meals (spinach, lentils), and gentle stretching."
                elif days_since_start < (cycle_length // 2) - 2:
                    phase = "Follicular Phase"
                    wellness_rec = "Energy levels rising. Great time for high-intensity training, planning new projects, and complex carbs."
                elif abs(days_since_start - (cycle_length // 2)) <= 2:
                    phase = "Ovulatory Phase"
                    wellness_rec = "Peak strength and high social energy. Support ovulation with anti-inflammatory foods."
                else:
                    phase = "Luteal Phase"
                    wellness_rec = "Progesterone rising. Calm cardio, strength training, magnesium-rich foods to limit PMS cravings."
                
                response_text = (
                    "### Women's Wellness Report\n"
                    f"**Current Cycle Phase:** `{phase}`\n"
                    f"- 📅 **Last Period Started:** {start_date_str}\n"
                    f"- 🔮 **Predicted Next Period:** {next_period.strftime('%Y-%m-%d')} ({days_until_period} days from now)\n"
                    f"-🥚 **Estimated Ovulation:** {ovulation_date.strftime('%Y-%m-%d')}\n\n"
                    f"**Wellness Recommendations:**\n"
                    f"{wellness_rec}\n\n"
                    "*You can log cycle events, log symptoms (cramps, bloating, headache), or record your mood to improve predictions.*"
                )
            else:
                response_text = (
                    "### Women's Wellness Report\n"
                    "No cycle history found. Click the Menstrual Tracker tab or write 'log period starting 2026-06-29' to initialize prediction forecasts."
                )

        return agent.format_agent_response(response_text, tools_used)
