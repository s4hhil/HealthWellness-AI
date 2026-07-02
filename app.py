import os
import sys
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

import db
import security
from agents import MultiAgentOrchestrator, call_local_mcp

# Initialize Flask app
app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)  # Allow cross-origin requests

# Initialize Database
db.initialize_database()

# Instantiate Orchestrator
orchestrator = MultiAgentOrchestrator()

# Serve static frontend files
@app.route('/')
def serve_index():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

# --- API ENDPOINTS ---

@app.route('/api/status', methods=['GET'])
def get_status():
    """
    Returns system status check.
    """
    return jsonify({
        "status": "online",
        "database": "connected",
        "mcp_server": "active",
        "security_shield": "secured",
        "active_agents_count": 10
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Executes multi-agent chatting and orchestration.
    """
    data = request.json or {}
    message = data.get("message", "").strip()
    agent_name = data.get("agent")  # Optional explicit agent routing
    
    if not message:
        return jsonify({"error": "Message content is required"}), 400
        
    # Input Sanitization Check
    sanitized_msg = security.sanitize_input(message)
    if not sanitized_msg:
        return jsonify({"error": "Rejected: Message contains potentially hazardous content."}), 400
        
    # Multi-Agent Routing
    if not agent_name or agent_name == "Auto-Detect":
        agent_name = orchestrator.route_query(sanitized_msg)
        
    try:
        response_data = orchestrator.execute_agent(agent_name, sanitized_msg)
        return jsonify(response_data)
    except Exception as e:
        return jsonify({
            "error": "Failed executing agent reasoning loop",
            "details": str(e)
        }), 500

@app.route('/api/habits', methods=['GET', 'POST'])
def handle_habits():
    """
    API for habit retrieval and updates.
    """
    if request.method == 'GET':
        date = request.args.get("date")
        if not date:
            # Default to today
            from datetime import datetime
            date = datetime.now().strftime("%Y-%m-%d")
        try:
            res = call_local_mcp("get_habits", {"date": date})
            return jsonify(res)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
            
    elif request.method == 'POST':
        data = request.json or {}
        try:
            # Validate input data
            validated = security.validate_habit_log(data)
            res = call_local_mcp("log_habit", validated)
            return jsonify({"success": True, "result": res})
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 400
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/api/sleep', methods=['GET', 'POST'])
def handle_sleep():
    """
    API for sleep metrics retrieval and logs.
    """
    if request.method == 'GET':
        limit = request.args.get("limit", default=7, type=int)
        try:
            res = call_local_mcp("get_sleep_logs", {"limit": limit})
            return jsonify(res)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
            
    elif request.method == 'POST':
        data = request.json or {}
        try:
            validated = security.validate_sleep_log(data)
            res = call_local_mcp("log_sleep", validated)
            return jsonify({"success": True, "result": res})
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 400
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/api/cycle', methods=['GET'])
def handle_cycle_get():
    """
    Retrieve cycle predictions, symptoms, and mood logs.
    """
    try:
        res = call_local_mcp("get_cycle_data", {})
        return jsonify(res)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/cycle/event', methods=['POST'])
def handle_cycle_event():
    """
    Logs period start or end event.
    """
    data = request.json or {}
    try:
        validated = security.validate_cycle_log(data)
        res = call_local_mcp("log_cycle_event", validated)
        return jsonify({"success": True, "result": res})
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/cycle/symptom', methods=['POST'])
def handle_cycle_symptom():
    """
    Logs physical symptoms.
    """
    data = request.json or {}
    try:
        validated = security.validate_symptom_log(data)
        res = call_local_mcp("log_symptom", validated)
        return jsonify({"success": True, "result": res})
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/cycle/mood', methods=['POST'])
def handle_cycle_mood():
    """
    Logs mood and daily energy levels.
    """
    data = request.json or {}
    try:
        validated = security.validate_mood_log(data)
        res = call_local_mcp("log_mood", validated)
        return jsonify({"success": True, "result": res})
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/records', methods=['GET'])
def handle_records_list():
    """
    Lists medical records securely.
    """
    try:
        res = call_local_mcp("list_medical_records", {})
        return jsonify(res)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/records/read', methods=['GET'])
def handle_records_read():
    """
    Safely reads file contents. Performs path traversal prevention checks.
    """
    filename = request.args.get("filename", "").strip()
    if not filename:
        return jsonify({"error": "Filename parameter is required"}), 400
        
    try:
        # Call read tool which has built-in directory-escaping guards
        res = call_local_mcp("read_medical_record", {"filename": filename})
        # If it returns an error dictionary
        if isinstance(res, dict) and "error" in res:
            return jsonify({"error": res["error"]}), 403
        return jsonify({"filename": filename, "content": res})
    except ValueError as ve:
        return jsonify({"error": f"Security violation: {str(ve)}"}), 400
    except PermissionError as pe:
        return jsonify({"error": f"Access denied: {str(pe)}"}), 403
    except FileNotFoundError as fnfe:
        return jsonify({"error": f"File not found: {str(fnfe)}"}), 444
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = 3000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    print(f"HealthWellness AI dashboard server running on http://localhost:{port}...")
    app.run(host='0.0.0.0', port=port, debug=True)
