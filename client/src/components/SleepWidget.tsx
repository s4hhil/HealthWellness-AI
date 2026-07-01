import React, { useState, useEffect } from 'react';

interface SleepLog {
  id: string;
  hours: number;
  quality: number;
  date: string;
}

interface SleepWidgetProps {
  onUpdate: () => void;
}

export default function SleepWidget({ onUpdate }: SleepWidgetProps) {
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [hours, setHours] = useState('7.5');
  const [quality, setQuality] = useState('80');
  const [loading, setLoading] = useState(false);

  const fetchSleepLogs = async () => {
    try {
      const res = await fetch('/api/sleep');
      const json = await res.json();
      if (json.success) setLogs(json.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSleepLogs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/sleep/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hours: Number(hours),
          quality: Number(quality)
        })
      });
      const json = await response.json();
      if (json.success) {
        setLogs(json.data);
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="widget">
      <h3 className="widget-title">🌙 Sleep Tracking Module</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Sleep History List */}
        <div>
          <h4 style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>Recent Sleep Logs</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
            {logs.map(log => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border-glow)', fontSize: '13px' }}>
                <span>📅 {log.date}</span>
                <span><strong>{log.hours} Hours</strong> (Quality: {log.quality}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Log Sleep Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '20px', borderLeft: '1px solid var(--border-glow)' }}>
          <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Log Sleep Details</h4>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Duration (Hours)</label>
              <input 
                type="number" 
                step="0.1" 
                min="0" 
                max="24"
                className="form-input" 
                value={hours} 
                onChange={e => setHours(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Quality Score (%)</label>
              <input 
                type="number" 
                min="0" 
                max="100" 
                className="form-input" 
                value={quality} 
                onChange={e => setQuality(e.target.value)} 
                required 
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '8px' }} disabled={loading}>
            Save Sleep Log
          </button>
        </form>

      </div>
    </div>
  );
}
