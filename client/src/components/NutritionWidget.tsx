import React, { useState } from 'react';

interface NutritionResponse {
  calories: number;
  diet: string;
  tip: string;
  macronutrients: {
    carbs: string;
    protein: string;
    fats: string;
  };
}

export default function NutritionWidget() {
  const [target, setTarget] = useState('2000');
  const [diet, setDiet] = useState<'balanced' | 'keto' | 'vegan' | 'vegetarian' | 'paleo' | 'low-carb'>('balanced');
  const [data, setData] = useState<NutritionResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `recommend nutrition plan with calorieTarget ${target} and dietPreference ${diet}`
        })
      });
      const json = await response.json();
      if (json.success && json.data.toolCalls.length > 0) {
        const nutritionResult = json.data.toolCalls.find((tc: any) => tc.toolName === 'recommend_nutrition')?.result;
        if (nutritionResult) {
          setData(nutritionResult);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="widget">
      <h3 className="widget-title">🍎 Nutrition Advisor Agent</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Generator Form */}
        <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Generate Meal Target Macro Split</h4>
          
          <div className="form-group">
            <label className="form-label">Daily Calorie Target (kcal)</label>
            <input 
              type="number" 
              className="form-input" 
              value={target} 
              onChange={e => setTarget(e.target.value)} 
              min="1000"
              max="10000"
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Dietary Strategy Preference</label>
            <select 
              className="form-input"
              value={diet}
              onChange={e => setDiet(e.target.value as any)}
            >
              <option value="balanced">Balanced Split</option>
              <option value="keto">Keto (High Fat/Low Carb)</option>
              <option value="vegan">Vegan (Plant Based)</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="low-carb">High Protein / Low Carb</option>
            </select>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Consulting Advisor...' : 'Calculate Macros & Plan'}
          </button>
        </form>

        {/* Results Panel */}
        <div style={{ paddingLeft: '20px', borderLeft: '1px solid var(--border-glow)' }}>
          <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Target Macro Ratios</h4>
          {data ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glow)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                  <span>Diet Type:</span>
                  <strong>{data.diet.toUpperCase()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span>Target Intake:</span>
                  <strong style={{ color: 'var(--accent-cyan)' }}>{data.calories} kcal</strong>
                </div>
              </div>

              <div>
                <strong style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>MACRONUTRIENT BUDGET</strong>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>CARBS</div>
                    <strong style={{ color: 'orange' }}>{data.macronutrients.carbs}</strong>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>PROTEIN</div>
                    <strong style={{ color: 'var(--accent-cyan)' }}>{data.macronutrients.protein}</strong>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>FATS</div>
                    <strong style={{ color: 'var(--accent-purple)' }}>{data.macronutrients.fats}</strong>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '13px', background: 'var(--accent-purple-glow)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(168,85,247,0.2)', color: 'var(--text-primary)' }}>
                💡 <strong>Advisor Tip:</strong> {data.tip}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '40px 0', textAlign: 'center' }}>
              Configure targets and consult our advisor to compute macronutrient budgets.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
