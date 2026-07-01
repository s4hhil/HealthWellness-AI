import express from 'express';
import cors from 'cors';
import { AgentWorkflow } from './adk/workflow.js';
import { 
  allAgentsList, 
  predictCycleTool, 
  logHabitTool, 
  logSleepTool, 
  recommendNutritionTool, 
  validateRecordTool, 
  analyzeMoodTool 
} from './agents/allAgents.js';
import { SecurityValidator } from './security/validator.js';
import { mcpServer } from './mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize the ADK Multi-Agent Workflow Router
const healthWorkflow = new AgentWorkflow(allAgentsList);

// --- In-Memory Database for Demo/Local Execution ---
const database = {
  habits: [
    { id: '1', habitName: 'Water Intake', value: 5, target: 8, date: '2026-07-01' },
    { id: '2', habitName: 'Daily Steps', value: 7200, target: 10000, date: '2026-07-01' },
    { id: '3', habitName: 'Mindful Breathing', value: 1, target: 2, date: '2026-07-01' }
  ],
  sleepLogs: [
    { id: '1', hours: 7.2, quality: 78, date: '2026-06-30' },
    { id: '2', hours: 6.8, quality: 65, date: '2026-06-29' },
    { id: '3', hours: 8.0, quality: 90, date: '2026-06-28' }
  ],
  medicalRecords: [
    { id: '1', fileName: 'blood_report_june2026.pdf', category: 'lab_result', size: 1024, date: '2026-06-15' },
    { id: '2', fileName: 'allergy_prescription.pdf', category: 'prescription', size: 512, date: '2026-05-20' }
  ],
  womensWellness: {
    lastPeriodDate: '2026-06-10',
    cycleLength: 28,
    symptoms: ['cramps', 'fatigue'],
    mood: 'anxious'
  },
  moodLogs: [
    { id: '1', moodScore: 7, stressLevel: 5, notes: 'Felt productive but slightly tired', date: '2026-07-01' },
    { id: '2', moodScore: 6, stressLevel: 7, notes: 'Busy workday, evening relaxation helped', date: '2026-06-30' }
  ]
};

// --- REST API Endpoints ---

// 1. Health Metrics Dashboard Summary
app.get('/api/dashboard/summary', (req, res) => {
  try {
    // Calculate simple health metrics
    const waterCompleted = database.habits.find(h => h.habitName === 'Water Intake')?.value || 0;
    const stepsCompleted = database.habits.find(h => h.habitName === 'Daily Steps')?.value || 0;
    const averageSleep = database.sleepLogs.reduce((acc, log) => acc + log.hours, 0) / (database.sleepLogs.length || 1);
    
    res.json({
      success: true,
      data: {
        waterProgress: { value: waterCompleted, target: 8 },
        stepsProgress: { value: stepsCompleted, target: 10000 },
        averageSleepQuality: 82,
        averageSleepDuration: parseFloat(averageSleep.toFixed(1)),
        recordsCount: database.medicalRecords.length,
        moodSummary: database.moodLogs[0] || { moodScore: 7, stressLevel: 4 },
        womensWellness: database.womensWellness
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Chat / Multi-Agent Routing Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message query is required' });
    }

    // Security check on incoming prompt
    if (SecurityValidator.containsMaliciousPatterns(message)) {
      return res.status(400).json({
        success: false,
        error: 'Security Warning: Dangerous input patterns detected. Execution aborted.'
      });
    }

    const sanitizedMessage = SecurityValidator.sanitizeString(message);
    
    // Inject DB context dynamically
    const mergedContext = {
      ...database.womensWellness,
      ...context
    };

    console.log(`[Express] Routing query: "${sanitizedMessage}"`);
    const workflowResult = await healthWorkflow.execute(sanitizedMessage, mergedContext);
    
    res.json({
      success: true,
      data: workflowResult
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Women's Wellness Endpoints
app.get('/api/womens-wellness', (req, res) => {
  res.json({ success: true, data: database.womensWellness });
});

app.post('/api/womens-wellness/log', async (req, res) => {
  try {
    const { lastPeriodDate, cycleLength, symptoms, mood } = req.body;

    if (!lastPeriodDate || !cycleLength) {
      return res.status(400).json({ success: false, error: 'lastPeriodDate and cycleLength are required' });
    }

    if (!SecurityValidator.validatePeriodDate(lastPeriodDate)) {
      return res.status(400).json({ success: false, error: 'Invalid lastPeriodDate. Must be in YYYY-MM-DD format and cannot be in the future.' });
    }

    const length = Number(cycleLength);
    if (isNaN(length) || length < 21 || length > 45) {
      return res.status(400).json({ success: false, error: 'Cycle length must be between 21 and 45 days.' });
    }

    // Update DB
    database.womensWellness = {
      lastPeriodDate,
      cycleLength: length,
      symptoms: Array.isArray(symptoms) ? symptoms.map(s => SecurityValidator.sanitizeString(s)) : [],
      mood: SecurityValidator.sanitizeString(mood || 'neutral')
    };

    // Trigger ADK sub-agent prediction
    const cycleAgent = healthWorkflow.getAgent("Women's Wellness Module");
    let prediction = null;
    if (cycleAgent) {
      const toolRes = await cycleAgent.run('Predict next cycle period details', database.womensWellness);
      prediction = toolRes.toolCalls.find(tc => tc.toolName === 'predict_cycle')?.result || null;
    }

    res.json({
      success: true,
      message: 'Women\'s wellness metrics logged and updated.',
      data: {
        current: database.womensWellness,
        prediction
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Habits Log Endpoint
app.post('/api/habits/log', (req, res) => {
  try {
    const { habitName, value, target } = req.body;
    if (!habitName || value === undefined || !target) {
      return res.status(400).json({ success: false, error: 'Missing habit fields.' });
    }

    const sanitizedName = SecurityValidator.sanitizeString(habitName);
    const numValue = Number(value);
    const numTarget = Number(target);

    // Update in-memory entry if exists for today, else push
    const idx = database.habits.findIndex(h => h.habitName === sanitizedName);
    if (idx !== -1) {
      database.habits[idx].value = numValue;
      database.habits[idx].target = numTarget;
    } else {
      database.habits.push({
        id: String(database.habits.length + 1),
        habitName: sanitizedName,
        value: numValue,
        target: numTarget,
        date: new Date().toISOString().split('T')[0]
      });
    }

    res.json({ success: true, data: database.habits });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Sleep Log Endpoint
app.post('/api/sleep/log', (req, res) => {
  try {
    const { hours, quality } = req.body;
    if (hours === undefined || quality === undefined) {
      return res.status(400).json({ success: false, error: 'Missing sleep fields.' });
    }

    const numHours = Number(hours);
    const numQuality = Number(quality);

    if (numHours < 0 || numHours > 24 || numQuality < 0 || numQuality > 100) {
      return res.status(400).json({ success: false, error: 'Invalid bounds for sleep metrics.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const newLog = {
      id: String(database.sleepLogs.length + 1),
      hours: numHours,
      quality: numQuality,
      date: todayStr
    };
    database.sleepLogs.unshift(newLog); // Put newest first

    res.json({ success: true, data: database.sleepLogs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Medical Records Upload (Security Validation Included)
app.post('/api/records/upload', (req, res) => {
  try {
    const { fileName, fileContent, category } = req.body;

    if (!fileName || !fileContent || !category) {
      return res.status(400).json({ success: false, error: 'fileName, fileContent, and category are required.' });
    }

    const cleanFileName = SecurityValidator.sanitizeFileName(fileName);
    if (SecurityValidator.containsMaliciousPatterns(fileContent) || SecurityValidator.containsMaliciousPatterns(cleanFileName)) {
      return res.status(400).json({
        success: false,
        error: 'Security Warning: Dangerous file elements or potential scripting threats detected!'
      });
    }

    const newRecord = {
      id: String(database.medicalRecords.length + 1),
      fileName: cleanFileName,
      category,
      size: Math.round(fileContent.length * 0.75), // rough base64 byte estimation
      date: new Date().toISOString().split('T')[0]
    };

    database.medicalRecords.unshift(newRecord);

    res.json({
      success: true,
      message: 'Medical document uploaded and validated successfully.',
      data: newRecord
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Mental Wellness Endpoint
app.post('/api/mental/log', (req, res) => {
  try {
    const { moodScore, stressLevel, notes } = req.body;
    if (moodScore === undefined || stressLevel === undefined) {
      return res.status(400).json({ success: false, error: 'moodScore and stressLevel are required.' });
    }

    const ms = Number(moodScore);
    const sl = Number(stressLevel);

    if (ms < 1 || ms > 10 || sl < 1 || sl > 10) {
      return res.status(400).json({ success: false, error: 'Values must be between 1 and 10.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const newLog = {
      id: String(database.moodLogs.length + 1),
      moodScore: ms,
      stressLevel: sl,
      notes: SecurityValidator.sanitizeString(notes || ''),
      date: todayStr
    };
    database.moodLogs.unshift(newLog);

    res.json({ success: true, data: database.moodLogs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET endpoints for detailed logs
app.get('/api/habits', (req, res) => res.json({ success: true, data: database.habits }));
app.get('/api/sleep', (req, res) => res.json({ success: true, data: database.sleepLogs }));
app.get('/api/records', (req, res) => res.json({ success: true, data: database.medicalRecords }));
app.get('/api/mental', (req, res) => res.json({ success: true, data: database.moodLogs }));

// --- MCP Standalone JSON-RPC Executor via Post Endpoint ---
app.post('/mcp/api', async (req, res) => {
  try {
    const { method, params } = req.body;
    if (!method) {
      return res.status(400).json({ success: false, error: 'JSON-RPC method parameter missing.' });
    }

    // Call underlying MCP tools programmatically
    const registeredTools = [
      'predict_cycle',
      'log_habit',
      'log_sleep',
      'recommend_nutrition',
      'validate_and_log_record',
      'analyze_mood_correlation'
    ];

    if (method === 'list_tools') {
      return res.json({
        success: true,
        tools: registeredTools
      });
    }

    if (method === 'call_tool') {
      const { name, arguments: toolArgs } = params || {};
      if (!name || !registeredTools.includes(name)) {
        return res.status(404).json({ success: false, error: `Tool ${name} not found.` });
      }

      // Route the tool call to the respective agent tool executor
      let result;
      if (name === 'predict_cycle') {
        const parsed = predictCycleTool.parameters.safeParse(toolArgs);
        if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
        result = predictCycleTool.execute(parsed.data);
      } else if (name === 'log_habit') {
        const parsed = logHabitTool.parameters.safeParse(toolArgs);
        if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
        result = logHabitTool.execute(parsed.data);
      } else if (name === 'log_sleep') {
        const parsed = logSleepTool.parameters.safeParse(toolArgs);
        if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
        result = logSleepTool.execute(parsed.data);
      } else if (name === 'recommend_nutrition') {
        const parsed = recommendNutritionTool.parameters.safeParse(toolArgs);
        if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
        result = recommendNutritionTool.execute(parsed.data);
      } else if (name === 'validate_and_log_record') {
        const parsed = validateRecordTool.parameters.safeParse(toolArgs);
        if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
        result = validateRecordTool.execute(parsed.data);
      } else if (name === 'analyze_mood_correlation') {
        const parsed = analyzeMoodTool.parameters.safeParse(toolArgs);
        if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
        result = analyzeMoodTool.execute(parsed.data);
      }

      return res.json({
        success: true,
        result
      });
    }

    res.status(400).json({ success: false, error: `Method ${method} unsupported.` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Standard error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Express Error]', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error. Please contact admin.'
  });
});

app.listen(PORT, () => {
  console.log(`[HealthWellness AI Express] Server running on http://localhost:${PORT}`);
});

// Configure standard stdio transport for local command-line MCP client connections (e.g. Claude Desktop)
if (process.argv.includes('--mcp-stdio')) {
  (async () => {
    try {
      const transport = new StdioServerTransport();
      await mcpServer.connect(transport);
      console.error('[MCP Stdio Transport] Connected successfully.');
    } catch (e) {
      console.error('[MCP Stdio Transport] Failed to connect:', e);
    }
  })();
}
