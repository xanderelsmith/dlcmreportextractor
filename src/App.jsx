import React, { useState } from 'react';
import { parseReports, LOCATION_MAPPING } from './utils/parser';
import { submitToGoogleForm } from './utils/googleForm';

const ALL_LOCATIONS = Object.values(LOCATION_MAPPING);

function App() {
  const [rawText, setRawText] = useState('');
  const [reports, setReports] = useState([]);
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);
  const [editing, setEditing] = useState(null); // { id, field, label, value }

  const handleParse = () => {
    const parsed = parseReports(rawText);
    setReports(parsed);
  };

  const handleValueChange = (id, field, value) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, [field]: value, status: 'ready' } : r));
  };

  const handleSaveEdit = () => {
    if (editing) {
      handleValueChange(editing.id, editing.field, parseInt(editing.value) || 0);
      setEditing(null);
    }
  };

  const handleDuplicate = (report) => {
    const newService = report.service === 'Search the Scriptures' ? 'Sunday Worship Service' : 'Search the Scriptures';
    const newReport = {
      ...report,
      id: `${report.id}-dup`,
      service: newService,
      status: 'ready'
    };
    setReports(prev => [...prev, newReport]);
  };

  const handleSubmitAll = async () => {
    const readyReports = reports.filter(r => r.status === 'ready' && r.location !== 'Unknown');
    if (readyReports.length === 0) {
      alert('No valid reports ready for submission. Please fix locations first.');
      return;
    }

    setIsSubmittingAll(true);
    for (const report of readyReports) {
      const currentTotal = report.adultBrothers + report.adultSisters + report.youthBrothers + report.youthSisters + report.childrenBoys + report.childrenGirls;
      const submissionData = { ...report, total: currentTotal };
      
      await submitToGoogleForm(submissionData);
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'submitted' } : r));
    }
    setIsSubmittingAll(false);
    alert('All valid reports have been submitted!');
  };

  const handleShare = () => {
    let summaryText = `AGBEDE TRANSFORMER GROUP\n\n`;
    
    // Try to extract date from the first few lines of raw text
    const dateMatch = rawText.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/);
    const reportDate = dateMatch ? dateMatch[1] : new Date().toLocaleDateString();

    ['Search the Scriptures', 'Sunday Worship Service', 'Thursday Revival and Evangelism Training Service', 'Monday Bible Study'].forEach(serviceName => {
      const serviceReports = reports.filter(r => r.service === serviceName);
      if (serviceReports.length === 0) return;

      const adultsMen = serviceReports.reduce((acc, r) => acc + r.adultBrothers, 0);
      const adultsWomen = serviceReports.reduce((acc, r) => acc + r.adultSisters, 0);
      const youthBoys = serviceReports.reduce((acc, r) => acc + r.youthBrothers, 0);
      const youthGirls = serviceReports.reduce((acc, r) => acc + r.youthSisters, 0);
      const childrenBoys = serviceReports.reduce((acc, r) => acc + r.childrenBoys, 0);
      const childrenGirls = serviceReports.reduce((acc, r) => acc + r.childrenGirls, 0);
      const total = serviceReports.reduce((acc, r) => acc + r.total, 0);

      const displayTitle = serviceName === 'Search the Scriptures' ? 'SEARCH THE SCRIPTURE (STS)' : serviceName.toUpperCase();
      
      summaryText += `*${displayTitle}*\n`;
      summaryText += `*${reportDate}.*\n\n`;
      summaryText += `ADULT\nMen: ${adultsMen}\nWomen: ${adultsWomen}\nSubtotal: ${adultsMen + adultsWomen}\n\n`;
      summaryText += `YOUTHS\nBoys: ${youthBoys}\nGirls: ${youthGirls}\nSubtotal: ${youthBoys + youthGirls}\n\n`;
      summaryText += `CHILDREN\nBoys: ${childrenBoys}\nGirls: ${childrenGirls}\nSubtotal: ${childrenBoys + childrenGirls}\n\n`;
      summaryText += `🔴 Grand Total: ${total}\n\n---\n\n`;
    });

    navigator.clipboard.writeText(summaryText.trim());
    alert('Summary copied to clipboard! You can now paste it into WhatsApp.');
  };

  return (
    <div className="container">
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: '800', background: 'linear-gradient(to right, #60a5fa, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textAlign: 'center' }}>
          DLBC Report Extractor
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>Extract, verify, and submit group attendance reports with ease.</p>
      </header>

      <section className="card" style={{ marginBottom: '3rem' }}>
        <textarea
          placeholder="Paste WhatsApp messages here..."
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
        />
        <button onClick={handleParse} style={{ width: '100%', padding: '1rem', fontSize: '1.2rem', background: '#3b82f6' }}>
          Generate Report Cards ⚡
        </button>
      </section>

      <div className="grid">
        {reports.map((report) => {
          const isSoloSunday = (report.service === 'Search the Scriptures' || report.service === 'Sunday Worship Service') &&
            !reports.some(r => r.location === report.location && r.service !== report.service && r.id !== report.id);

          return (
            <div key={report.id} className={`card ${isSoloSunday ? 'glow' : ''}`}>
              {report.location === 'Unknown' ? (
                <div style={{ marginBottom: '1rem' }}>
                  <label className="flash" style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem' }}>PICK LOCATION 👇</label>
                  <select 
                    className="dropdown-select"
                    onChange={(e) => handleValueChange(report.id, 'location', e.target.value)}
                  >
                    <option value="Unknown">Choose Location...</option>
                    {ALL_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                </div>
              ) : (
                <h3 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '1.4rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                  {report.location}
                </h3>
              )}

              <div className="metric-row">
                <span className="metric-label" style={{ fontWeight: 'bold' }}>Service</span>
                <span className="metric-value" style={{ color: '#fbbf24' }}>{report.service}</span>
              </div>

              {[
                { label: 'Adult Brothers', key: 'adultBrothers' },
                { label: 'Adult Sisters', key: 'adultSisters' },
                { label: 'Youth Brothers', key: 'youthBrothers' },
                { label: 'Youth Sisters', key: 'youthSisters' },
                { label: 'Children Boys', key: 'childrenBoys' },
                { label: 'Children Girls', key: 'childrenGirls' },
              ].map(metric => (
                <div className="metric-row" key={metric.key}>
                  <span className="metric-label">{metric.label}</span>
                  <button 
                    className="metric-value-btn"
                    onClick={() => setEditing({ 
                      id: report.id, 
                      field: metric.key, 
                      label: metric.label, 
                      value: report[metric.key] 
                    })}
                  >
                    {report[metric.key]}
                  </button>
                </div>
              ))}

              <div className="metric-row" style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '1rem' }}>
                <span className="metric-label" style={{ fontWeight: 'bold', color: '#fff' }}>Calculated Total</span>
                <span className="metric-value" style={{ 
                  fontSize: '1.2rem', 
                  color: (report.adultBrothers + report.adultSisters + report.youthBrothers + report.youthSisters + report.childrenBoys + report.childrenGirls !== report.total) ? '#ef4444' : '#4ade80' 
                }}>
                  {report.adultBrothers + report.adultSisters + report.youthBrothers + report.youthSisters + report.childrenBoys + report.childrenGirls}
                </span>
              </div>

              {report.isTotalMismatch && (
                <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.5rem', textAlign: 'right' }}>
                  ⚠ Original report said total was {report.total}
                </div>
              )}

              {report.status === 'submitted' && (
                <div style={{ color: '#4ade80', fontSize: '0.8rem', marginTop: '1rem', textAlign: 'center', fontWeight: 'bold' }}>
                  ✓ SUBMITTED TO FORM
                </div>
              )}

              {isSoloSunday && (
                <button 
                  onClick={() => handleDuplicate(report)}
                  style={{ marginTop: '1rem', width: '100%', background: 'rgba(168, 85, 247, 0.2)', color: '#d8b4fe', border: '1px dashed #a855f7' }}
                >
                  Duplicate for {report.service === 'Search the Scriptures' ? 'SWS' : 'STS'}? ➕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {reports.length > 0 && (
        <div style={{ marginTop: '5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
            <button 
              onClick={handleSubmitAll} 
              disabled={isSubmittingAll}
              style={{ width: '100%', padding: '1.5rem', fontSize: '1.5rem', background: '#22c55e', fontWeight: 'bold', boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)' }}
            >
              {isSubmittingAll ? '🚀 Submitting All...' : '🚀 Submit All Valid Entries to Google Forms'}
            </button>
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
              Only cards with valid locations will be submitted.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ color: '#fff', margin: 0 }}>🌟 AGBEDE TRANSFORMER GROUP SUMMARY</h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            {['Search the Scriptures', 'Sunday Worship Service', 'Thursday Revival and Evangelism Training Service', 'Monday Bible Study'].map(serviceName => {
              const serviceReports = reports.filter(r => r.service === serviceName);
              if (serviceReports.length === 0) return null;

              return (
                <div key={serviceName} className="card" style={{ background: 'rgba(30, 41, 59, 0.7)', border: `2px solid ${serviceName === 'Search the Scriptures' ? '#fbbf24' : '#3b82f6'}` }}>
                  <h3 style={{ color: serviceName === 'Search the Scriptures' ? '#fbbf24' : '#60a5fa', marginBottom: '1.5rem', textTransform: 'uppercase' }}>
                    {serviceName === 'Search the Scriptures' ? '🔍 SEARCH THE SCRIPTURE (STS)' : `📖 ${serviceName.toUpperCase()}`}
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                    <div style={{ textAlign: 'left', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
                      <h4 style={{ color: '#fbbf24', borderBottom: '1px solid #fbbf24', paddingBottom: '0.5rem' }}>ADULT</h4>
                      <p className="metric-row"><span className="metric-label">Men</span> <span className="metric-value">{serviceReports.reduce((acc, r) => acc + r.adultBrothers, 0)}</span></p>
                      <p className="metric-row"><span className="metric-label">Women</span> <span className="metric-value">{serviceReports.reduce((acc, r) => acc + r.adultSisters, 0)}</span></p>
                      <p className="metric-row" style={{ fontWeight: 'bold' }}><span className="metric-label">Subtotal</span> <span className="metric-value">{serviceReports.reduce((acc, r) => acc + r.adultBrothers + r.adultSisters, 0)}</span></p>
                    </div>

                    <div style={{ textAlign: 'left', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
                      <h4 style={{ color: '#60a5fa', borderBottom: '1px solid #60a5fa', paddingBottom: '0.5rem' }}>YOUTHS</h4>
                      <p className="metric-row"><span className="metric-label">Boys</span> <span className="metric-value">{serviceReports.reduce((acc, r) => acc + r.youthBrothers, 0)}</span></p>
                      <p className="metric-row"><span className="metric-label">Girls</span> <span className="metric-value">{serviceReports.reduce((acc, r) => acc + r.youthSisters, 0)}</span></p>
                      <p className="metric-row" style={{ fontWeight: 'bold' }}><span className="metric-label">Subtotal</span> <span className="metric-value">{serviceReports.reduce((acc, r) => acc + r.youthBrothers + r.youthSisters, 0)}</span></p>
                    </div>

                    <div style={{ textAlign: 'left', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
                      <h4 style={{ color: '#a855f7', borderBottom: '1px solid #a855f7', paddingBottom: '0.5rem' }}>CHILDREN</h4>
                      <p className="metric-row"><span className="metric-label">Boys</span> <span className="metric-value">{serviceReports.reduce((acc, r) => acc + r.childrenBoys, 0)}</span></p>
                      <p className="metric-row"><span className="metric-label">Girls</span> <span className="metric-value">{serviceReports.reduce((acc, r) => acc + r.childrenGirls, 0)}</span></p>
                      <p className="metric-row" style={{ fontWeight: 'bold' }}><span className="metric-label">Subtotal</span> <span className="metric-value">{serviceReports.reduce((acc, r) => acc + r.childrenBoys + r.childrenGirls, 0)}</span></p>
                    </div>
                  </div>

                  <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px dashed rgba(255,255,255,0.1)' }}>
                    <h2 style={{ color: '#fff' }}>
                      <span style={{ color: '#ef4444' }}>🔴</span> Grand Total: {serviceReports.reduce((acc, r) => acc + r.total, 0)}
                    </h2>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: '#fff', marginBottom: '1rem', textAlign: 'center' }}>
              Edit {editing.label}
            </h2>
            <input 
              type="number" 
              className="modal-input" 
              value={editing.value}
              autoFocus
              onChange={(e) => setEditing({ ...editing, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') setEditing(null);
              }}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setEditing(null)} style={{ flex: 1, background: '#64748b' }}>Cancel</button>
              <button onClick={handleSaveEdit} style={{ flex: 1 }}>Save</button>
            </div>
          </div>
        </div>
      )}
      {reports.length > 0 && (
        <button className="fab-button" onClick={handleShare}>
          Share Structured Summary 📋
        </button>
      )}
    </div>
  );
}

export default App;
