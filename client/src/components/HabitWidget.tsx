import React, { useState, useEffect } from 'react';

interface Habit {
  id: string;
  habitName: string;
  value: number;
  target: number;
  date: string;
}

interface HabitWidgetProps {
  onUpdate: () => void;
}

export default function HabitWidget({ onUpdate }: HabitWidgetProps) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [activeHabit, setActiveHabit] = useState<string>('Water Intake');
  const [inputValue, setInputValue] = useState<string>('1');
  const [inputTarget, setInputTarget] = useState<string>('8');
  const [loading, setLoading] = useState(false);

  const fetchHabits = async () => {
    try {
      const res = await fetch('/api/habits');
      const json = await res.json();
      if (json.success) setHabits(json.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/habits/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitName: activeHabit,
          value: Number(inputValue),
          target: Number(inputTarget)
        })
      });
      const json = await response.json();
      if (json.success) {
        setHabits(json.data);
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getPercent = (h: Habit) => {
    return Math.min(Math.round((h.value / h.target) * 100), 100);
  };

  return (
    <div className="widget">
      <h3 className="widget-title">🏃‍♂️ Habit Tracker Logs</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Habit List */}
        <div>
          <h4 style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>Daily Habits Progress</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {habits.map(h => (
              <div key={h.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glow)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                  <strong>{h.habitName}</strong>
                  <span>{h.value} / {h.target}</span>
                </div>
                <div style={{ background: 'var(--bg-primary)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${getPercent(h)}%`, 
                      background: 'linear-gradient(to right, var(--accent-purple), var(--accent-cyan))', 
                      height: '100%' 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Log Habit Form */}
        <form onSubmit={handleLog} style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '20px', borderLeft: '1px solid var(--border-glow)' }}>
          <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Quick Log Progress</h4>
          
          <div className="form-group">
            <label className="form-label">Habit Name</label>
            <select 
              className="form-input" 
              value={activeHabit} 
              onChange={e => {
                setActiveHabit(e.target.value);
                if (e.target.value === 'Water Intake') { setInputValue('5'); setInputTarget('8'); }
                else if (e.target.value === 'Daily Steps') { setInputValue('8000'); setInputTarget('10000'); }
                else { setInputValue('1'); setInputTarget('2'); }
              }}
            >
              <option value="Water Intake">Water Intake (Cups)</option>
              <option value="Daily Steps">Daily Steps</option>
              <option value="Mindful Breathing">Mindful Breathing (Sessions)</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Current Value</label>
              <input 
                type="number" 
                className="form-input" 
                value={inputValue} 
                onChange={e => setInputValue(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Target Goal</label>
              <input 
                type="number" 
                className="form-input" 
                value={inputTarget} 
                onChange={e => setInputTarget(e.target.value)} 
                required 
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '8px' }} disabled={loading}>
            Save Habit Entry
          </button>
        </form>

      </div>
    </div>
  );
}
