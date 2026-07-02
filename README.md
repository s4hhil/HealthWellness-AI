# 🌟 HealthWellness AI - Secure Multi-Agent Health & Wellness Ecosystem

HealthWellness AI is a secure, full-stack local dashboard that tracks sleep patterns, daily habits, menstrual cycles, and secure medical files. It uses a **Python Flask backend**, a **glassmorphic HTML/CSS/JS frontend**, and a **Multi-Agent Orchestrator**.

---

## 🗺️ How It Works (Quick Architecture)
- **Frontend Dashboard**: User-friendly single-page dashboard on port `3000`.
- **Flask App Server**: Directs REST requests and serving web pages.
- **ADK Multi-Agent Orchestrator**: Automatically routes user queries to the best agent.
- **MCP Server Tools**: Executes local operations (reading files, logging metrics) securely.
- **Security Validation Layer**: Sanitizes inputs and sandboxes medical records.

---

## 🤖 The 10 Specialized AI Agents
- **Personal Health Assistant**: Evaluates lab test results and blood metrics.
- **Wellness Coach**: Tracks targets (hydration, steps) and offers daily motivation.
- **AI Health Companion**: Friendly chat partner for checking general well-being.
- **Habit Tracker**: Logs daily water intake, step counts, and meditation minutes.
- **Sleep Tracker**: Predicts sleep stages and quality based on sleep duration.
- **Medical Records Manager**: Securely lists and reads local health documents.
- **Nutrition Advisor**: Recommends macronutrients and dietary tips.
- **Mental Wellness Assistant**: Conducts mood diagnostics and stress-relief guidance.
- **Productivity Planner**: Schedules focus hours based on sleep history.
- **Women's Wellness Module**: Predicts menstrual cycle phases and symptoms.

---

## ♀️ Women's Wellness & Sleep Refactors
- **AI Mood Predictor**: Takes a **3-question quiz** (Body feel, thoughts state, and social vibe) to automatically predict and log your mood (e.g. *happy, calm, tired, anxious*).
- **Cycle Predictor**: Calculates period start forecasts, ovulation dates, and current cycle phase (Menstrual, Follicular, Ovulatory, Luteal) based on logs.
- **Automated Sleep Logs**: User inputs only **total hours slept**. The system automatically estimates **Deep Sleep** (20%), **REM Sleep** (25%), and the **Sleep Quality Score**.

---

## 🔒 Security Sandbox Guard
- **Directory Escape Blocked**: Prevents folder traversal hacks. Any attempt to read outside the `data/records/` directory (e.g. `../../app.py`) is blocked.
- **Input Sanitization**: Rejects JavaScript injections and malicious scripts automatically.

---

## 🛠️ Quick Installation & Setup

1. **Install Dependencies**:
   ```bash
   pip install flask flask-cors
   ```

2. **Initialize Database & Mock Files**:
   ```bash
   python db.py
   ```

3. **Start Web Server**:
   ```bash
   python app.py
   ```

4. **Access Dashboard**:
   Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 💻 CLI Command Line Tools

Run commands in your terminal to test agent routing and sandboxing:

- **Chat with Orchestration**:
  ```bash
  python cli.py chat -m "check my blood report"
  ```
- **Read Record Safely**:
  ```bash
  python cli.py record read -f "blood_report_2026.txt"
  ```
- **Test Sandbox Traversal (Will block)**:
  ```bash
  python cli.py record read -f "../../app.py"
  ```
  *(Output: `[SECURITY BLOCK] Access Denied`)*
