import argparse
import sys
import json
from datetime import datetime

# Local imports
import db
import security
from agents import MultiAgentOrchestrator, call_local_mcp

db.initialize_database()
orchestrator = MultiAgentOrchestrator()

def print_banner():
    print("=" * 60)
    print("      HEALTHWELLNESS AI - SECURE AGENT CLI UTILITY      ")
    print("=" * 60)

def main():
    parser = argparse.ArgumentParser(description="HealthWellness AI local agent execution & security testing CLI tool.")
    subparsers = parser.add_subparsers(dest="command", help="Available sub-commands")
    
    # 1. Chat Sub-command
    chat_parser = subparsers.add_parser("chat", help="Chat with an AI Agent")
    chat_parser.add_argument("-m", "--message", required=True, type=str, help="Your message/query to the agents")
    chat_parser.add_argument("-a", "--agent", type=str, default="Auto-Detect", 
                             choices=["Auto-Detect", "Personal Health Assistant", "Wellness Coach", "AI Health Companion", 
                                      "Habit Tracker", "Sleep Tracker", "Medical Records Manager", "Nutrition Advisor", 
                                      "Mental Wellness Assistant", "Productivity Planner", "Women's Wellness Module"])
    
    # 2. Medical Records Sub-command
    record_parser = subparsers.add_parser("record", help="Manage medical records securely")
    record_parser.add_argument("action", choices=["list", "read"], help="List files or read a file content")
    record_parser.add_argument("-f", "--filename", type=str, help="Filename of the record to view (required for 'read')")
    
    # 3. Habits Sub-command
    habit_parser = subparsers.add_parser("habit", help="View or log daily habits")
    habit_parser.add_argument("action", choices=["get", "log"], help="Get habits for a date or log habit metrics")
    habit_parser.add_argument("-d", "--date", type=str, default=datetime.now().strftime("%Y-%m-%d"), help="Date in YYYY-MM-DD")
    habit_parser.add_argument("-w", "--water", type=float, help="Water intake in ml")
    habit_parser.add_argument("-s", "--steps", type=int, help="Steps count")
    habit_parser.add_argument("-m", "--meditation", type=float, help="Meditation in minutes")
    
    # 4. Cycle Sub-command
    cycle_parser = subparsers.add_parser("cycle", help="Track period logs & predictions")
    cycle_parser.add_argument("action", choices=["prediction", "log-period", "log-symptom", "log-mood"], help="Perform cycle commands")
    cycle_parser.add_argument("-s", "--start-date", type=str, help="Start date YYYY-MM-DD")
    cycle_parser.add_argument("-e", "--end-date", type=str, help="End date YYYY-MM-DD")
    cycle_parser.add_argument("-d", "--date", type=str, default=datetime.now().strftime("%Y-%m-%d"), help="Date for symptom or mood logs")
    cycle_parser.add_argument("--symptoms", nargs="+", help="Symptoms (cramps, headache, fatigue, bloating, nausea, mood_swings)")
    cycle_parser.add_argument("--intensity", type=str, choices=["mild", "moderate", "severe"], default="mild")
    cycle_parser.add_argument("--mood", type=str, choices=["happy", "sad", "anxious", "irritable", "calm", "energetic", "tired"])
    cycle_parser.add_argument("--energy", type=int, choices=range(1, 11), default=5)

    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
        
    print_banner()

    # Handle Command: Chat
    if args.command == "chat":
        sanitized_msg = security.sanitize_input(args.message)
        if not sanitized_msg:
            print("[SECURITY BLOCK] Input rejected. Potential script injection found.")
            sys.exit(1)
            
        target_agent = args.agent
        if target_agent == "Auto-Detect":
            target_agent = orchestrator.route_query(sanitized_msg)
            print(f"[ORCHESTRATOR] Routed request to: {target_agent}")
            
        print(f"[PROMPT] '{sanitized_msg}'")
        print("-" * 60)
        
        try:
            response = orchestrator.execute_agent(target_agent, sanitized_msg)
            print(f"[AGENT] {response['agent']} ({response['role']})")
            print(f"[MCP TOOLS USED] {response['tools_used']}")
            print("-" * 60)
            print(response['response'])
        except Exception as e:
            print(f"[EXECUTION ERROR] {e}")
            
    # Handle Command: Record
    elif args.command == "record":
        if args.action == "list":
            print("[DATABASE] Fetching records list from MCP Server...")
            try:
                records = call_local_mcp("list_medical_records", {})
                print(f"Secure files inside sandbox:")
                for r in records:
                    print(f" - {r}")
            except Exception as e:
                print(f"[ERROR] {e}")
                
        elif args.action == "read":
            if not args.filename:
                print("[ERROR] --filename parameter is required to read a record.")
                sys.exit(1)
                
            print(f"[SECURE CHECK] Checking security access parameters for: {args.filename}")
            try:
                # Triggers traversal guards inside security module
                content = call_local_mcp("read_medical_record", {"filename": args.filename})
                if isinstance(content, dict) and "error" in content:
                    print(f"[SECURITY BLOCK] {content['error']}")
                else:
                    print(f"[DOCUMENT CONTENT] of {args.filename}:")
                    print("-" * 40)
                    print(content)
                    print("-" * 40)
            except Exception as e:
                print(f"[PATH TRAVERSAL BLOCKED] Access Denied: {e}")

    # Handle Command: Habit
    elif args.command == "habit":
        if args.action == "get":
            print(f"[HABITS] Fetching habits for date: {args.date}")
            res = call_local_mcp("get_habits", {"date": args.date})
            print(json.dumps(res, indent=4))
            
        elif args.action == "log":
            if args.water is None and args.steps is None and args.meditation is None:
                print("[ERROR] Specify at least one habit metric to log (--water, --steps, or --meditation)")
                sys.exit(1)
                
            # Read existing
            existing = call_local_mcp("get_habits", {"date": args.date})
            if "error" in existing or not isinstance(existing, dict):
                existing = {"hydration": 0, "steps": 0, "meditation": 0}
                
            if args.water is not None:
                existing["hydration"] = args.water
            if args.steps is not None:
                existing["steps"] = args.steps
            if args.meditation is not None:
                existing["meditation"] = args.meditation
                
            existing["date"] = args.date
            
            try:
                validated = security.validate_habit_log(existing)
                res = call_local_mcp("log_habit", validated)
                print(f"[SUCCESS] {res}")
            except ValueError as ve:
                print(f"[VALIDATION FAILED] {ve}")

    # Handle Command: Cycle
    elif args.command == "cycle":
        if args.action == "prediction":
            print("[CALCULATION] Calculating forecast models...")
            response = orchestrator.execute_agent("Women's Wellness Module", "predict cycle phase and show predictions")
            print(response['response'])
            
        elif args.action == "log-period":
            if not args.start_date:
                print("[ERROR] --start-date is required for logging period start.")
                sys.exit(1)
            payload = {"start_date": args.start_date, "end_date": args.end_date}
            try:
                validated = security.validate_cycle_log(payload)
                res = call_local_mcp("log_cycle_event", validated)
                print(f"[SUCCESS] {res}")
            except ValueError as ve:
                print(f"[VALIDATION ERROR] {ve}")
                
        elif args.action == "log-symptom":
            if not args.symptoms:
                print("[ERROR] --symptoms list is required (e.g. cramps fatigue).")
                sys.exit(1)
            payload = {"date": args.date, "symptoms": args.symptoms, "intensity": args.intensity}
            try:
                validated = security.validate_symptom_log(payload)
                res = call_local_mcp("log_symptom", validated)
                print(f"[SUCCESS] {res}")
            except ValueError as ve:
                print(f"[VALIDATION ERROR] {ve}")
                
        elif args.command == "log-mood":
            if not args.mood:
                print("[ERROR] --mood parameter is required.")
                sys.exit(1)
            payload = {"date": args.date, "mood": args.mood, "energy_level": args.energy}
            try:
                validated = security.validate_mood_log(payload)
                res = call_local_mcp("log_mood", validated)
                print(f"[SUCCESS] {res}")
            except ValueError as ve:
                print(f"[VALIDATION ERROR] {ve}")

    print("=" * 60)

if __name__ == '__main__':
    main()
