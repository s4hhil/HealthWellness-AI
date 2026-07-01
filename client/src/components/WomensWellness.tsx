import React, { useState, useEffect } from 'react';

interface WomensWellnessProps {
  onUpdate: () => void;
}

export default function WomensWellness({ onUpdate }: WomensWellnessProps) {
  const [lastPeriodDate, setLastPeriodDate] = useState('2026-06-10');
  const [cycleLength, setCycleLength] = useState('28');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['cramps']);
  const [selectedMood, setSelectedMood] = useState<string>('anxious');
  
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchCurrent = async () => {
    try {
      const res = await fetch('/api/womens-wellness');
      const json = await res.json();
      if (json.success && json.data) {
        setLastPeriodDate(json.data.lastPeriodDate);
        setCycleLength(String(json.data.cycleLength));
        setSelectedSymptoms(json.data.symptoms || []);
        setSelectedMood(json.data.mood || 'neutral');
        // trigger initial prediction calculation
        calculatePrediction(json.data.lastPeriodDate, json.data.cycleLength, json.data.symptoms, json.data.mood);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const calculatePrediction = async (date: string, length: number, symptoms: string[], mood: string) => {
    try {
      const res = await fetch('/api/womens-wellness/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastPeriodDate: date,
          cycleLength: length,
          symptoms,
          mood
        })
      });
      const json = await res.json();
      if (json.success) {
        setPrediction(json.data.prediction);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCurrent();
  }, []);

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/womens-wellness/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastPeriodDate,
          cycleLength: Number(cycleLength),
          symptoms: selectedSymptoms,
          mood: selectedMood
        })
      });
      const json = await res.json();
      if (json.success) {
        setPrediction(json.data.prediction);
        onUpdate();
      } else {
        setErrorMsg(json.error);
      }
    } catch (e) {
      setErrorMsg('Failed to sync cycle log with backend.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSymptom = (sym: string) => {
    if (selectedSymptoms.includes(sym)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== sym));
    } else {
      setSelectedSymptoms([...selectedSymptoms, sym]);
    }
  };

  const symptomsList = ['cramps', 'bloating', 'fatigue', 'headache', 'backache', 'acne'];
  const moodList = [
    { key: 'happy', emoji: '😊', label: 'Happy' },
    { key: 'anxious', emoji: '😰', label: 'Anxious' },
    { key: 'sad', emoji: '😢', label: 'Sad' },
    { key: 'irritable', emoji: '😠', label: 'Irritable' },
    { key: 'energetic', emoji: '⚡', label: 'Energetic' },
    { key: 'tired', emoji: '😴', label: 'Tired' }
  ];

  return (
    <div className="widget" style={{ borderTop: '4px solid var(--accent-rose)' }}>
      <h3 className="widget-title" style={{ color: 'var(--accent-rose)', fontSize: '22px' }}>
        🌸 Women's Wellness & Cycle Predictions
      </h3>

      <div className="womens-wellness-layout" style={{ marginTop: '20px' }}>
        
        {/* Left Panel: Cycle Inputs */}
        <form onSubmit={handleLogSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="form-group">
            <label className="form-label">Last Period Start Date</label>
            <input 
              type="date" 
              className="form-input" 
              value={lastPeriodDate}
              onChange={e => setLastPeriodDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Average Cycle Length (Days)</label>
            <input 
              type="number" 
              className="form-input" 
              min="21"
              max="45"
              value={cycleLength}
              onChange={e => setCycleLength(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Symptom Log</label>
            <div className="symptoms-selector">
              {symptomsList.map(sym => (
                <span 
                  key={sym} 
                  className={`symptom-tag ${selectedSymptoms.includes(sym) ? 'active' : ''}`}
                  onClick={() => toggleSymptom(sym)}
                >
                  {sym.charAt(0).toUpperCase() + sym.slice(1)}
                </span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mood Correlation</label>
            <div className="mood-selector">
              {moodList.map(m => (
                <button
                  type="button"
                  key={m.key}
                  className={`mood-btn ${selectedMood === m.key ? 'active' : ''}`}
                  onClick={() => setSelectedMood(m.key)}
                  title={m.label}
                >
                  {m.emoji}
                </button>
              ))}
            </div>
          </div>

          {errorMsg && (
            <div style={{ color: 'var(--accent-rose)', fontSize: '13px' }}>⚠️ {errorMsg}</div>
          )}

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ 
              background: 'linear-gradient(135deg, var(--accent-rose), var(--accent-purple))',
              boxShadow: '0 4px 15px var(--accent-rose-glow)'
            }}
            disabled={loading}
          >
            {loading ? 'Analyzing...' : 'Log Cycle & Predict'}
          </button>
        </form>

        {/* Right Panel: Predictions and Recommendations */}
        <div className="prediction-panel">
          <h4 style={{ marginBottom: '16px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-glow)', paddingBottom: '10px' }}>
            🔮 Forecasts & Hormone Phase Recommendations
          </h4>

          {prediction ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="prediction-hero">
                <div className="prediction-hero-card">
                  <div className="metric-lbl">Next Period Forecast</div>
                  <div className="prediction-val">{prediction.predictedStart}</div>
                  <div className="metric-lbl">Phase Start Date</div>
                </div>

                <div className="prediction-hero-card" style={{ borderColor: 'rgba(56,189,248,0.2)', background: 'linear-gradient(135deg, rgba(56,189,248,0.05), transparent)' }}>
                  <div className="metric-lbl" style={{ color: 'var(--accent-cyan)' }}>Fertile Window Open</div>
                  <div className="prediction-val" style={{ color: 'var(--accent-cyan)', fontSize: '20px', marginTop: '14px', marginBottom: '14px' }}>
                    {prediction.fertileWindow.start} to {prediction.fertileWindow.end}
                  </div>
                  <div className="metric-lbl">Est. Ovulation: {prediction.ovulationDate}</div>
                </div>
              </div>

              <div className="recommendations-box">
                <h5 style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                  💡 Wellness Coach & Companion Advice:
                </h5>
                <ul className="recommendations-list">
                  {prediction.recommendations.map((rec: string, index: number) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '50px', color: 'var(--text-muted)' }}>
              No prediction available. Enter last cycle dates to calculate forecasts.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
