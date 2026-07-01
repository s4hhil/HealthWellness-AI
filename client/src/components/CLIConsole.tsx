import { useState } from 'react';

interface TerminalLine {
  text: string;
  type: 'prompt' | 'output' | 'error' | 'success';
}

export default function CLIConsole() {
  const [selectedAgent, setSelectedAgent] = useState('nutrition_advisor');
  const [query, setQuery] = useState('Suggest a balanced breakfast');
  const [lines, setLines] = useState<TerminalLine[]>([
    { text: '=== HealthWellness AI Agent CLI Ready ===', type: 'success' },
    { text: 'Use the controls below to trigger direct terminal executions.', type: 'output' }
  ]);
  const [loading, setLoading] = useState(false);

  const triggerCli = async () => {
    setLoading(true);
    const newPromptLine: TerminalLine = {
      text: `$ npm run cli -- --agent ${selectedAgent} --query "${query}"`,
      type: 'prompt'
    };
    setLines(prev => [...prev, newPromptLine]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `${query}`, context: { agent: selectedAgent } })
      });
      const data = await response.json();

      if (data.success) {
        const outputLines: TerminalLine[] = [
          { text: `[CLI] Target Agent: ${selectedAgent}`, type: 'output' },
          { text: `[CLI] Running ADK core orchestrator...`, type: 'output' },
          ...data.data.thoughtTrace.map((t: string) => ({ text: `  * ${t}`, type: 'output' })),
          { text: `\n=== Agent Response ===`, type: 'success' },
          { text: data.data.output, type: 'output' }
        ];
        setLines(prev => [...prev, ...outputLines]);
      } else {
        setLines(prev => [
          ...prev,
          { text: `[CLI Error] ${data.error || 'Failed command'}`, type: 'error' }
        ]);
      }
    } catch (e) {
      setLines(prev => [
        ...prev,
        { text: `[CLI Connection Error] Could not contact local agent daemon.`, type: 'error' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearTerminal = () => {
    setLines([{ text: '=== Console Cleared ===', type: 'success' }]);
  };

  return (
    <div className="widget">
      <h3 className="widget-title">💻 Terminal CLI Console</h3>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
        Run and evaluate raw agent reasoning paths, outputs, and JSON parameters as if executing directly from the host terminal.
      </p>

      {/* Control panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr auto', gap: '12px', marginBottom: '16px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ marginBottom: '4px' }}>Target Agent Key</label>
          <select 
            className="form-input"
            value={selectedAgent}
            onChange={e => setSelectedAgent(e.target.value)}
          >
            <option value="personal_health_assistant">personal_health_assistant</option>
            <option value="wellness_coach">wellness_coach</option>
            <option value="ai_health_companion">ai_health_companion</option>
            <option value="habit_tracker_agent">habit_tracker_agent</option>
            <option value="sleep_tracker_agent">sleep_tracker_agent</option>
            <option value="medical_records_manager">medical_records_manager</option>
            <option value="nutrition_advisor">nutrition_advisor</option>
            <option value="mental_wellness_assistant">mental_wellness_assistant</option>
            <option value="productivity_planner">productivity_planner</option>
            <option value="women's_wellness_module">women's_wellness_module</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ marginBottom: '4px' }}>Query String</label>
          <input 
            type="text" 
            className="form-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g. Suggest a workout"
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <button 
            type="button" 
            className="btn-primary" 
            onClick={triggerCli} 
            disabled={loading}
            style={{ height: '40px' }}
          >
            Execute Script
          </button>
          <button 
            type="button" 
            className="btn-primary" 
            onClick={clearTerminal}
            style={{ 
              height: '40px',
              background: 'transparent',
              border: '1px solid var(--border-glow)',
              color: 'var(--text-secondary)',
              boxShadow: 'none'
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Terminal View */}
      <div className="terminal-window">
        {lines.map((l, i) => (
          <div key={i} className={`terminal-line ${l.type === 'prompt' ? 'terminal-prompt' : l.type === 'error' ? 'terminal-error' : l.type === 'success' ? 'terminal-success' : 'terminal-output'}`}>
            {l.text}
          </div>
        ))}
        {loading && (
          <div className="terminal-line terminal-prompt" style={{ animation: 'logo-glow 1s infinite alternate' }}>
            ... running command in background ...
          </div>
        )}
      </div>
    </div>
  );
}
