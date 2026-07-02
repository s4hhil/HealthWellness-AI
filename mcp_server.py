import json
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# Import database and security layers
import db
import security

# Ensure DB is initialized
db.initialize_database()

# Define the MCP Tools list following the MCP Spec
MCP_TOOLS = [
    {
        "name": "get_habits",
        "description": "Retrieve daily habits data for a specific date.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "date": {"type": "string", "description": "Date in YYYY-MM-DD format."}
            },
            "required": ["date"]
        }
    },
    {
        "name": "log_habit",
        "description": "Log or update hydration, steps, and meditation for a specific date.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "date": {"type": "string", "description": "Date in YYYY-MM-DD format."},
                "hydration": {"type": "number", "description": "Hydration in ml."},
                "steps": {"type": "integer", "description": "Number of steps taken."},
                "meditation": {"type": "number", "description": "Meditation duration in minutes."}
            },
            "required": ["date"]
        }
    },
    {
        "name": "get_sleep_logs",
        "description": "Retrieve sleep logs. Optional limit parameters can be passed.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Number of recent logs to fetch. Defaults to 7."}
            }
        }
    },
    {
        "name": "log_sleep",
        "description": "Log nightly sleep metrics including duration and sleep stages.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "date": {"type": "string", "description": "Date of morning wake-up YYYY-MM-DD."},
                "duration_hours": {"type": "number", "description": "Total sleep duration in hours."},
                "deep_sleep_hours": {"type": "number", "description": "Deep sleep duration in hours."},
                "rem_sleep_hours": {"type": "number", "description": "REM sleep duration in hours."},
                "quality_score": {"type": "integer", "description": "Sleep quality score (0-100)."}
            },
            "required": ["date", "duration_hours", "quality_score"]
        }
    },
    {
        "name": "get_cycle_data",
        "description": "Get menstrual cycle period history, logged symptoms, and mood logs.",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "log_cycle_event",
        "description": "Log a new period cycle start and optional end date.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "start_date": {"type": "string", "description": "Start date of period YYYY-MM-DD."},
                "end_date": {"type": "string", "description": "End date of period YYYY-MM-DD (optional)."}
            },
            "required": ["start_date"]
        }
    },
    {
        "name": "log_symptom",
        "description": "Log symptoms for a specific date to evaluate cycle trends.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "date": {"type": "string", "description": "Date of symptoms YYYY-MM-DD."},
                "symptoms": {
                    "type": "array", 
                    "items": {"type": "string"}, 
                    "description": "List of symptoms (cramps, headache, fatigue, bloating, nausea, mood_swings, acne, backache)."
                },
                "intensity": {"type": "string", "enum": ["mild", "moderate", "severe"]}
            },
            "required": ["date", "symptoms"]
        }
    },
    {
        "name": "log_mood",
        "description": "Log daily mood and energy levels for correlation analysis.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "date": {"type": "string", "description": "Date of mood log YYYY-MM-DD."},
                "mood": {"type": "string", "enum": ["happy", "sad", "anxious", "irritable", "calm", "energetic", "tired"]},
                "energy_level": {"type": "integer", "minimum": 1, "maximum": 10}
            },
            "required": ["date", "mood", "energy_level"]
        }
    },
    {
        "name": "list_medical_records",
        "description": "Get a list of stored medical records filenames securely.",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "read_medical_record",
        "description": "Read content of a specific medical record file securely with path traversal protection.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "filename": {"type": "string", "description": "Filename of medical record (e.g. blood_report_2026.txt)"}
            },
            "required": ["filename"]
        }
    }
]

def handle_mcp_request(method, params):
    """
    Directs the MCP method request to appropriate handlers, applying validation.
    """
    if method == "tools/list":
        return {"tools": MCP_TOOLS}
        
    elif method == "tools/call":
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        
        if not tool_name:
            raise ValueError("Tool name is missing from call request.")
            
        # Route tools
        if tool_name == "get_habits":
            date = security.sanitize_input(arguments.get("date"))
            if not date:
                raise ValueError("Date is required.")
            habits = db.read_json('habits.json', {})
            return {"content": [{"type": "text", "text": json.dumps(habits.get(date, {"message": "No habits logged for this date."}))}]}
            
        elif tool_name == "log_habit":
            validated = security.validate_habit_log(arguments)
            habits = db.read_json('habits.json', {})
            date = validated["date"]
            
            # Keep track of completed keys
            completed = []
            if validated["hydration"] >= 2000:
                completed.append("hydration")
            if validated["steps"] >= 10000:
                completed.append("steps")
            if validated["meditation"] >= 10:
                completed.append("meditation")
                
            habits[date] = {
                "hydration": validated["hydration"],
                "steps": validated["steps"],
                "meditation": validated["meditation"],
                "completed": completed
            }
            db.write_json('habits.json', habits)
            return {"content": [{"type": "text", "text": f"Successfully logged habits for {date}: {habits[date]}."}]}
            
        elif tool_name == "get_sleep_logs":
            limit = arguments.get("limit", 7)
            if not isinstance(limit, int):
                limit = 7
            sleep_logs = db.read_json('sleep.json', [])
            sorted_logs = sorted(sleep_logs, key=lambda x: x['date'], reverse=True)
            return {"content": [{"type": "text", "text": json.dumps(sorted_logs[:limit])}]}
            
        elif tool_name == "log_sleep":
            validated = security.validate_sleep_log(arguments)
            sleep_logs = db.read_json('sleep.json', [])
            
            # Check if entry already exists for date, update it
            date = validated["date"]
            sleep_logs = [log for log in sleep_logs if log["date"] != date]
            sleep_logs.append(validated)
            
            db.write_json('sleep.json', sleep_logs)
            return {"content": [{"type": "text", "text": f"Successfully logged sleep for {date}."}]}
            
        elif tool_name == "get_cycle_data":
            cycle_data = db.read_json('cycle.json', {})
            return {"content": [{"type": "text", "text": json.dumps(cycle_data)}]}
            
        elif tool_name == "log_cycle_event":
            validated = security.validate_cycle_log(arguments)
            cycle_data = db.read_json('cycle.json', {})
            
            # Check if start_date exists, append or update
            start_date = validated["start_date"]
            end_date = validated.get("end_date")
            
            period_logs = cycle_data.get("period_logs", [])
            # Remove any log with matching start date
            period_logs = [log for log in period_logs if log["start_date"] != start_date]
            period_logs.append({"start_date": start_date, "end_date": end_date})
            # Sort by start_date ascending
            period_logs = sorted(period_logs, key=lambda x: x["start_date"])
            
            cycle_data["period_logs"] = period_logs
            db.write_json('cycle.json', cycle_data)
            return {"content": [{"type": "text", "text": f"Successfully logged period cycle starting on {start_date}."}]}
            
        elif tool_name == "log_symptom":
            validated = security.validate_symptom_log(arguments)
            cycle_data = db.read_json('cycle.json', {})
            
            symptoms = cycle_data.get("symptoms", [])
            # Filter out old entry for same day
            symptoms = [s for s in symptoms if s["date"] != validated["date"]]
            symptoms.append(validated)
            
            cycle_data["symptoms"] = symptoms
            db.write_json('cycle.json', cycle_data)
            return {"content": [{"type": "text", "text": f"Successfully logged symptoms for {validated['date']}."}]}
            
        elif tool_name == "log_mood":
            validated = security.validate_mood_log(arguments)
            cycle_data = db.read_json('cycle.json', {})
            
            moods = cycle_data.get("moods", [])
            moods = [m for m in moods if m["date"] != validated["date"]]
            moods.append(validated)
            
            cycle_data["moods"] = moods
            db.write_json('cycle.json', cycle_data)
            return {"content": [{"type": "text", "text": f"Successfully logged mood for {validated['date']}."}]}
            
        elif tool_name == "list_medical_records":
            records_dir = os.path.join(db.DATA_DIR, 'records')
            files = [f for f in os.listdir(records_dir) if os.path.isfile(os.path.join(records_dir, f))]
            return {"content": [{"type": "text", "text": json.dumps(files)}]}
            
        elif tool_name == "read_medical_record":
            filename = arguments.get("filename")
            # This calls security check internally
            content = security.safe_read_record(filename)
            return {"content": [{"type": "text", "text": content}]}
            
        else:
            raise ValueError(f"Unknown tool: {tool_name}")
            
    else:
        raise ValueError(f"Method '{method}' not supported by MCP server.")

class MCPServerHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path == '/mcp':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                req = json.loads(post_data.decode('utf-8'))
                method = req.get("method")
                params = req.get("params", {})
                req_id = req.get("id")
                
                result = handle_mcp_request(method, params)
                
                response = {
                    "jsonrpc": "2.0",
                    "result": result,
                    "id": req_id
                }
                status_code = 200
            except Exception as e:
                response = {
                    "jsonrpc": "2.0",
                    "error": {
                        "code": -32603,
                        "message": str(e)
                    },
                    "id": None
                }
                status_code = 500

            self.send_response(status_code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        # A simple check page
        if self.path == '/' or self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "healthy", "service": "HealthWellness AI MCP Server"}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def run_server(port=3001):
    server_address = ('', port)
    httpd = HTTPServer(server_address, MCPServerHandler)
    print(f"HealthWellness AI MCP Server running on port {port}...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping MCP Server.")
        sys.exit(0)

if __name__ == '__main__':
    port = 3001
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    run_server(port)
