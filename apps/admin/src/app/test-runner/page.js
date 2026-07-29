'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function TestRunnerPage() {
  const [suites, setSuites] = useState([
    { id: 'unit', name: 'Backend Unit Tests (Jest)', category: 'Backend' },
    { id: 'auth', name: 'Auth & RBAC Middleware', category: 'Backend' },
    { id: 'payment', name: 'Payment Gateway & Webhooks', category: 'Backend' },
    { id: 'security', name: 'Security & Injection Tests', category: 'Backend' },
    { id: 'e2e-web', name: 'E2E Web App (Chromium)', category: 'Frontend E2E' },
    { id: 'e2e-admin', name: 'E2E Admin Panel', category: 'Frontend E2E' },
    { id: 'api', name: 'API Schema & Contract', category: 'API' },
    { id: 'a11y', name: 'Accessibility (WCAG 2.1)', category: 'Compliance' },
    { id: 'visual', name: 'Visual Snapshot Regression', category: 'UI' },
    { id: 'load', name: 'Artillery Load & Stress Test', category: 'Performance' },
  ]);

  const [activeRun, setActiveRun] = useState(null);
  const [logs, setLogs] = useState([]);
  const [selectedSuite, setSelectedSuite] = useState('unit');
  const [isExecuting, setIsExecuting] = useState(false);
  const logsEndRef = useRef(null);

  useEffect(() => {
    let timer;
    if (isExecuting) {
      timer = setInterval(fetchStatus, 1500);
    }
    return () => clearInterval(timer);
  }, [isExecuting]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/v1/test-runner/status', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      const data = await res.json();
      if (data.success && data.activeRun) {
        setActiveRun(data.activeRun);
        setLogs(data.activeRun.logs || []);
        if (data.activeRun.status !== 'running') {
          setIsExecuting(false);
        }
      }
    } catch (e) {
      console.error('Error fetching test status:', e);
    }
  };

  const handleRunTest = async (suiteId) => {
    setIsExecuting(true);
    setLogs([`🚀 Launching test suite: ${suiteId}...`]);
    try {
      const res = await fetch('/api/v1/test-runner/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ suite: suiteId })
      });
      const data = await res.json();
      if (!data.success) {
        setLogs(prev => [...prev, `❌ Failed to launch: ${data.error}`]);
        setIsExecuting(false);
      }
    } catch (e) {
      setLogs(prev => [...prev, `❌ Error launching process: ${e.message}`]);
      setIsExecuting(false);
    }
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh' }}>
      <header style={{ marginBottom: '30px', borderBottom: '1px solid #334155', pb: '20px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#38bdf8', margin: '0 0 8px 0' }}>
          ⚡ LocalSampark Automation Test Control Center
        </h1>
        <p style={{ color: '#94a3b8', margin: 0 }}>
          Execute and monitor 315+ full-stack automated tests across Unit, API, E2E, Visual, and Load testing suites.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px' }}>
        
        {/* Left Side: Test Suites List */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f1f5f9', marginTop: 0, marginBottom: '16px' }}>
            Available Test Suites
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => handleRunTest('all')}
              disabled={isExecuting}
              style={{
                padding: '14px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                color: '#fff',
                border: 'none',
                fontWeight: '700',
                cursor: isExecuting ? 'not-allowed' : 'pointer',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                marginBottom: '10px'
              }}
            >
              ▶ RUN ALL BACKEND TESTS
            </button>

            {suites.map((s) => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  backgroundColor: selectedSuite === s.id ? '#334155' : '#0f172a',
                  borderRadius: '8px',
                  border: '1px solid #334155'
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0' }}>{s.name}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{s.category}</div>
                </div>

                <button
                  onClick={() => { setSelectedSuite(s.id); handleRunTest(s.id); }}
                  disabled={isExecuting}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: isExecuting ? '#475569' : '#0284c7',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: isExecuting ? 'not-allowed' : 'pointer'
                  }}
                >
                  Run
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Live Terminal Console Output */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f1f5f9', margin: 0 }}>
              Execution Output & Logs
            </h2>

            {activeRun && (
              <span style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                backgroundColor: activeRun.status === 'running' ? '#eab308' : activeRun.status === 'passed' ? '#22c55e' : '#ef4444',
                color: '#000'
              }}>
                {activeRun.status.toUpperCase()}
              </span>
            )}
          </div>

          <div style={{
            flex: 1,
            backgroundColor: '#020617',
            borderRadius: '8px',
            padding: '16px',
            fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
            fontSize: '13px',
            color: '#38bdf8',
            overflowY: 'auto',
            minHeight: '450px',
            maxHeight: '600px',
            border: '1px solid #1e293b'
          }}>
            {logs.length === 0 ? (
              <div style={{ color: '#475569', textAlign: 'center', marginTop: '150px' }}>
                Select a test suite from the left and click "Run" to view live execution details.
              </div>
            ) : (
              logs.map((line, idx) => (
                <div key={idx} style={{ marginBottom: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: line.includes('PASSED') || line.includes('passed') ? '#4ade80' : line.includes('FAIL') || line.includes('failed') || line.includes('❌') ? '#f87171' : '#cbd5e1' }}>
                  {line}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

      </div>
    </div>
  );
}
