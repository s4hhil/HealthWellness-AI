import { useState, useEffect } from 'react';
import ChatWindow from './components/ChatWindow.tsx';
import HabitWidget from './components/HabitWidget.tsx';
import SleepWidget from './components/SleepWidget.tsx';
import RecordsWidget from './components/RecordsWidget.tsx';
import WomensWellness from './components/WomensWellness.tsx';
import NutritionWidget from './components/NutritionWidget.tsx';
import MentalWidget from './components/MentalWidget.tsx';
import CLIConsole from './components/CLIConsole.tsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mcpStatus, setMcpStatus] = useState('connecting');
  const [summaryData, setSummaryData] = useState<any>(null);

  // Poll summary metrics from backend Express API
  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/dashboard/summary');
      const json = await response.json();
      if (json.success) {
        setSummaryData(json.data);
        setMcpStatus('connected');
      } else {
        setMcpStatus('error');
      }
    } catch (e) {
      console.error(e);
      setMcpStatus('disconnected');
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 6000);
    return () => clearInterval(interval);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardSummary();
      case 'chat':
        return <ChatWindow />;
      case 'tracker':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <HabitWidget onUpdate={fetchSummary} />
            <SleepWidget onUpdate={fetchSummary} />
          </div>
        );
      case 'wellness':
        return <WomensWellness onUpdate={fetchSummary} />;
      case 'nutrition':
        return <NutritionWidget />;
      case 'mental':
        return <MentalWidget onUpdate={fetchSummary} />;
      case 'records':
        return <RecordsWidget onUpdate={fetchSummary} />;
      case 'cli':
        return <CLIConsole />;
      default:
        return renderDashboardSummary();
    }
  };

  const renderDashboardSummary = () => {
    if (!summaryData) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
          <div className="status-indicator">
            <span className="status-dot" style={{ backgroundColor: 'orange' }}></span>
            <span>Loading health metrics from backend...</span>
          </div>
        </div>
      );
    }

    const { waterProgress, stepsProgress, averageSleepDuration, averageSleepQuality, recordsCount, moodSummary, womensWellness } = summaryData;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        <div className="dashboard-grid">
          
          {/* Daily Active Habits */}
          <div className="widget">
            <h3 className="widget-title">🏃‍♂️ Active Habits Progress</h3>
            <div className="metrics-row">
              <div className="metric-card">
                <div className="metric-lbl">Water Intake</div>
                <div className="metric-val">{waterProgress.value} / {waterProgress.target}</div>
                <div className="metric-lbl">Cups</div>
              </div>
              <div className="metric-card">
                <div className="metric-lbl">Daily Steps</div>
                <div className="metric-val">{stepsProgress.value.toLocaleString()}</div>
                <div className="metric-lbl">Target: {stepsProgress.target.toLocaleString()}</div>
              </div>
            </div>
            <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Habit completion rate: {Math.round(((waterProgress.value / waterProgress.target) + (stepsProgress.value / stepsProgress.target)) * 50)}%
            </div>
          </div>

          {/* Sleep Architecture */}
          <div className="widget">
            <h3 className="widget-title">🌙 Sleep Quality Index</h3>
            <div className="metrics-row">
              <div className="metric-card">
                <div className="metric-lbl">Avg Duration</div>
                <div className="metric-val">{averageSleepDuration}h</div>
                <div className="metric-lbl">Last 3 Logs</div>
              </div>
              <div className="metric-card">
                <div className="metric-lbl">Quality Score</div>
                <div className="metric-val" style={{ color: 'var(--accent-purple)' }}>{averageSleepQuality}%</div>
                <div className="metric-lbl">Restful</div>
              </div>
            </div>
            <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Sleep state: Consistent circadian alignment.
            </div>
          </div>

          {/* Women's Wellness Overview */}
          <div className="widget">
            <h3 className="widget-title" style={{ color: 'var(--accent-rose)' }}>🌸 Women's Wellness Tracker</h3>
            <div className="metrics-row">
              <div className="metric-card">
                <div className="metric-lbl">Last Period</div>
                <div className="metric-val" style={{ fontSize: '20px', color: 'var(--accent-rose)' }}>{womensWellness.lastPeriodDate}</div>
                <div className="metric-lbl">Logged Date</div>
              </div>
              <div className="metric-card">
                <div className="metric-lbl">Cycle Length</div>
                <div className="metric-val">{womensWellness.cycleLength} Days</div>
                <div className="metric-lbl">Standard Range</div>
              </div>
            </div>
            <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Current logged symptoms: {womensWellness.symptoms.join(', ') || 'None'}
            </div>
          </div>
        </div>

        <div className="dashboard-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
          {/* Integrated Agent Status Panel */}
          <div className="widget">
            <h3 className="widget-title">🤖 Active Health Agent Ecosystem</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                <strong style={{ color: 'var(--accent-cyan)' }}>Personal Health Assistant:</strong> Coordinating metrics
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                <strong style={{ color: 'var(--accent-cyan)' }}>Wellness Coach:</strong> Routines & fitness
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                <strong style={{ color: 'var(--accent-cyan)' }}>Nutrition Advisor:</strong> Calories & meal logs
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                <strong style={{ color: 'var(--accent-cyan)' }}>Women's Wellness Module:</strong> Cycle & symptoms
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                <strong style={{ color: 'var(--accent-cyan)' }}>Mental Wellness Agent:</strong> Mood & box breathing
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                <strong style={{ color: 'var(--accent-cyan)' }}>Medical Records:</strong> Sandboxed verify
              </div>
            </div>
          </div>

          {/* Secure Uploads Quick Stats */}
          <div className="widget">
            <h3 className="widget-title">🛡️ Security & Records</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span>Secure Records Logged:</span>
                <strong>{recordsCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span>Zod Validations:</span>
                <span style={{ color: 'var(--accent-green)' }}>Active</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span>Sandbox Executor:</span>
                <span style={{ color: 'var(--accent-green)' }}>Enabled</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span>Last Mood Score:</span>
                <strong>{moodSummary ? `${moodSummary.moodScore}/10` : 'N/A'}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      
      {/* Sidebar Navigation */}
      <nav className="sidebar">
        <div className="logo-container">
          <div className="logo-icon">🛡️</div>
          <span className="logo-text">HealthWellness AI</span>
        </div>
        
        <ul className="nav-list">
          <li className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <span>📊</span> Dashboard Overview
          </li>
          <li className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
            <span>🤖</span> Ask Health Agents
          </li>
          <li className={`nav-item ${activeTab === 'tracker' ? 'active' : ''}`} onClick={() => setActiveTab('tracker')}>
            <span>📈</span> Habits & Sleep
          </li>
          <li className={`nav-item ${activeTab === 'wellness' ? 'active' : ''}`} onClick={() => setActiveTab('wellness')}>
            <span>🌸</span> Women's Wellness
          </li>
          <li className={`nav-item ${activeTab === 'nutrition' ? 'active' : ''}`} onClick={() => setActiveTab('nutrition')}>
            <span>🍎</span> Nutrition Advisor
          </li>
          <li className={`nav-item ${activeTab === 'mental' ? 'active' : ''}`} onClick={() => setActiveTab('mental')}>
            <span>🧘</span> Mental & Mood
          </li>
          <li className={`nav-item ${activeTab === 'records' ? 'active' : ''}`} onClick={() => setActiveTab('records')}>
            <span>🗂️</span> Medical Records
          </li>
          <li className={`nav-item ${activeTab === 'cli' ? 'active' : ''}`} onClick={() => setActiveTab('cli')}>
            <span>💻</span> Terminal CLI Console
          </li>
        </ul>

        <div className="sidebar-footer">
          <div>Local Deploy: v1.0.0</div>
          <div className="status-indicator">
            <span 
              className="status-dot" 
              style={{ 
                backgroundColor: mcpStatus === 'connected' ? 'var(--accent-green)' : mcpStatus === 'connecting' ? 'orange' : 'red',
                boxShadow: mcpStatus === 'connected' ? '0 0 8px var(--accent-green)' : 'none'
              }}
            ></span>
            <span>MCP Server: {mcpStatus.toUpperCase()}</span>
          </div>
        </div>
      </nav>

      {/* Main Panel */}
      <main className="main-content">
        <header className="dashboard-header">
          <div className="welcome-section">
            <h1>HealthWellness AI System</h1>
            <p>Unified Multi-Agent Health Orchestrator & Model Context Protocol Server</p>
          </div>
          <div className="date-badge">
            📅 {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
}
