import React, { useState, useEffect } from 'react';

interface RecordItem {
  id: string;
  fileName: string;
  category: string;
  size: number;
  date: string;
}

interface RecordsWidgetProps {
  onUpdate: () => void;
}

export default function RecordsWidget({ onUpdate }: RecordsWidgetProps) {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [category, setCategory] = useState<'lab_result' | 'prescription' | 'summary' | 'vaccine' | 'other'>('summary');
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRecords = async () => {
    try {
      const res = await fetch('/api/records');
      const json = await res.json();
      if (json.success) setRecords(json.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const response = await fetch('/api/records/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, fileContent, category })
      });
      const json = await response.json();

      if (json.success) {
        setSuccessMsg(json.message);
        setFileName('');
        setFileContent('');
        fetchRecords();
        onUpdate();
      } else {
        setErrorMsg(json.error || 'Failed to upload document.');
      }
    } catch (e: any) {
      setErrorMsg('Network error: Could not reach verification server.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to format bytes
  const formatSize = (bytes: number) => {
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  return (
    <div className="widget">
      <h3 className="widget-title">🗂️ Medical Records Manager</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
        
        {/* Secure Upload Form */}
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>🛡️ Upload & Verify Document (Sandbox Scan Enabled)</h4>
          
          <div className="form-group">
            <label className="form-label">Document File Name</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. prescription_july.txt"
              value={fileName}
              onChange={e => setFileName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Document Category</label>
            <select 
              className="form-input"
              value={category}
              onChange={e => setCategory(e.target.value as any)}
            >
              <option value="summary">Health Summary / Notes</option>
              <option value="prescription">Prescription Details</option>
              <option value="lab_result">Lab Results Report</option>
              <option value="vaccine">Vaccination Records</option>
              <option value="other">Other Documents</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Document Text Content</label>
            <textarea 
              className="form-input" 
              style={{ minHeight: '80px', fontFamily: 'monospace', resize: 'vertical' }}
              placeholder="Paste the medical text description or summary content here..."
              value={fileContent}
              onChange={e => setFileContent(e.target.value)}
              required
            />
          </div>

          {errorMsg && (
            <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.1)', color: 'var(--accent-rose)', border: '1px solid var(--accent-rose)', borderRadius: '6px', fontSize: '13px' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{ padding: '10px 14px', background: 'rgba(34,197,94,0.1)', color: 'var(--accent-green)', border: '1px solid var(--accent-green)', borderRadius: '6px', fontSize: '13px' }}>
              ✓ {successMsg}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Verifying Sandbox Clean...' : 'Scan & Validate Record'}
          </button>
        </form>

        {/* Uploaded Documents List */}
        <div style={{ borderLeft: '1px solid var(--border-glow)', paddingLeft: '30px' }}>
          <h4 style={{ marginBottom: '16px', fontSize: '15px', color: 'var(--text-secondary)' }}>Verified Secure Documents</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
            {records.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No medical files logged yet. Scan files to verify.</div>
            ) : (
              records.map(rec => (
                <div key={rec.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glow)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>📄 {rec.fileName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Category: {rec.category.replace('_', ' ').toUpperCase()} • Date: {rec.date}
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--accent-cyan)', background: 'var(--accent-cyan-glow)', padding: '4px 8px', borderRadius: '4px' }}>
                    {formatSize(rec.size)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
