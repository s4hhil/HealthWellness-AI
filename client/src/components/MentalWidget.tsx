import React, { useState, useEffect } from 'react';

interface MoodLog {
  id: string;
  moodScore: number;
  stressLevel: number;
  notes: string;
  date: string;
}

interface MentalWidgetProps {
  onUpdate: () => void;
}

export default function MentalWidget({ onUpdate }: MentalWidgetProps) {
  const [logs, setLogs] = useState<MoodLog[]>([]);
  const [mood, setMood] = useState('7');
  const [stress, setStress] = useState('4');
  const [notes, setNotes] = useState('');
  
  const [breathPhase, setBreathPhase] = useState<'idle' | 'inhale' | 'exhale'>('idle');
  const [breathTime, setBreathTime] = useState(4);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/mental');
      const json = await res.json();
      if (json.success) setLogs(json.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/mental/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moodScore: Number(mood),
          stressLevel: Number(stress),
          notes
        })
      });
      const json = await response.json();
      if (json.success) {
        setLogs(json.data);
        setNotes('');
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Timed breathing handler
  useEffect(() => {
    if (breathPhase === 'idle') return;

    const timer = setInterval(() => {
      setBreathTime(prev => {
        if (prev === 1) {
          setBreathPhase(curr => curr === 'inhale' ? 'exhale' : 'inhale');
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [breathPhase]);

  const startBreathing = () => {
    setBreathPhase('inhale');
    setBreathTime(4);
  };

  const stopBreathing = () => {
    setBreathPhase('idle');
  };

  return (
    <div className="widget">
      <h3 className="widget-title">🧘 Mental Wellness & Breathing Assistant</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
        
        {/* Left column: Daily Mood Logger */}
        <div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>Log Mind State</h4>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Mood Score (1-10)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  min="1" 
                  max="10" 
                  value={mood} 
                  onChange={e => setMood(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Stress Level (1-10)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  min="1" 
                  max="10" 
                  value={stress} 
                  onChange={e => setStress(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Journal Notes / Reflections</label>
              <textarea 
                className="form-input" 
                style={{ minHeight: '60px' }}
                placeholder="How are you feeling today?" 
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              Save Mind Log
            </button>
          </form>

          {/* History */}
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ marginBottom: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>Recent Mind Logs</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
              {logs.map(log => (
                <div key={log.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-glow)', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>📅 {log.date}</span>
                    <span>Mood: {log.moodScore} • Stress: {log.stressLevel}</span>
                  </div>
                  {log.notes && <div style={{ color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>"{log.notes}"</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Guided Breathing sphere */}
        <div style={{ borderLeft: '1px solid var(--border-glow)', paddingLeft: '30px', textAlign: 'center' }}>
          <h4 style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '10px' }}>Box Breathing Rest Guide</h4>
          
          <div style={{ minHeight: '260px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            {breathPhase === 'idle' ? (
              <div>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  Slow down your heart rate and ease anxiety with a 4-second box breathing cycles.
                </p>
                <button type="button" className="btn-primary" onClick={startBreathing} style={{ margin: 'auto' }}>
                  Start Breathing
                </button>
              </div>
            ) : (
              <div>
                <div className={`breathing-sphere ${breathPhase}`} />
                <h3 style={{ textTransform: 'uppercase', color: 'var(--accent-cyan)', fontSize: '20px', letterSpacing: '0.1em' }}>
                  {breathPhase}
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Hold phase duration: {breathTime}s
                </p>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={stopBreathing} 
                  style={{ 
                    marginTop: '20px', 
                    background: 'transparent', 
                    border: '1px solid var(--accent-rose)', 
                    color: 'var(--accent-rose)',
                    boxShadow: 'none'
                  }}
                >
                  Stop Session
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
