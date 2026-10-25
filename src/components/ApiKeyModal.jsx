import React, { useState, useEffect } from 'react';
import { Key, CheckCircle, AlertCircle, ExternalLink, X, Shield, RefreshCw } from 'lucide-react';
import { getMapboxToken, setMapboxToken, testMapboxToken } from '../services/localSunSpotsService';

export default function ApiKeyModal({ isOpen, onClose, onTokenUpdated }) {
  const [tokenInput, setTokenInput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { valid: boolean, message: string }

  useEffect(() => {
    if (isOpen) {
      const current = getMapboxToken();
      setTokenInput(current || '');
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async () => {
    const trimmed = tokenInput.trim();
    if (!trimmed) {
      setTestResult({ valid: false, message: 'Please paste a valid Mapbox token starting with pk.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const res = await testMapboxToken(trimmed);
    setIsTesting(false);
    setTestResult(res);

    if (res.valid) {
      setMapboxToken(trimmed);
      if (onTokenUpdated) onTokenUpdated(trimmed);
    }
  };

  const handleClearToken = () => {
    setMapboxToken('');
    setTokenInput('');
    setTestResult({ valid: false, message: 'Mapbox token removed. System will use open data fallback.' });
    if (onTokenUpdated) onTokenUpdated('');
  };

  const hasActiveToken = Boolean(getMapboxToken());

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card api-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b'
              }}
            >
              <Key size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc', fontWeight: 600 }}>
                Real Data & Mapbox API Key
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                Step 1: Real Benches, Parks & Nearby Cafes
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Status Badge */}
        <div style={{ marginTop: '16px', marginBottom: '16px' }}>
          {hasActiveToken ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#6ee7b7',
                fontSize: '0.85rem'
              }}
            >
              <CheckCircle size={16} />
              <span>
                <strong>Mapbox Token Connected:</strong> Live Places API & real-world venues active.
              </span>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                color: '#fbbf24',
                fontSize: '0.85rem'
              }}
            >
              <Shield size={16} />
              <span>
                <strong>No API Key Configured:</strong> Currently using OpenStreetMap Overpass & verified Łódź open data registry.
              </span>
            </div>
          )}
        </div>

        {/* Input Form */}
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="input-mapbox-token"
            style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}
          >
            Mapbox Public Access Token (starts with <code>pk.</code>):
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="input-mapbox-token"
              type="text"
              placeholder="pk.eyJ1IjoieW91cm5hbWUiLCJhIjoi..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                background: '#0f172a',
                border: '1px solid #334155',
                color: '#f8fafc',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-mono, monospace)',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
            Tokens can be saved here in browser memory or placed in your <code>.env</code> file as <code>VITE_MAPBOX_TOKEN</code>.
          </p>
        </div>

        {/* Live Test Feedback */}
        {testResult && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: testResult.valid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${testResult.valid ? '#10b981' : '#ef4444'}`,
              color: testResult.valid ? '#6ee7b7' : '#fca5a5'
            }}
          >
            {testResult.valid ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          {hasActiveToken && (
            <button
              type="button"
              onClick={handleClearToken}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'transparent',
                border: '1px solid #475569',
                color: '#94a3b8',
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              Clear Token
            </button>
          )}

          <button
            type="button"
            onClick={handleTestAndSave}
            disabled={isTesting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              border: 'none',
              color: '#0f172a',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: isTesting ? 'wait' : 'pointer'
            }}
          >
            {isTesting ? <RefreshCw size={14} className="spin" /> : <Key size={14} />}
            <span>{isTesting ? 'Verifying...' : 'Verify & Save Token'}</span>
          </button>
        </div>

        {/* Help Link Footer */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '12px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.75rem',
            color: '#64748b'
          }}
        >
          <span>Need a token? Sign up for free at Mapbox</span>
          <a
            href="https://account.mapbox.com/access-tokens/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              textDecoration: 'none'
            }}
          >
            <span>account.mapbox.com</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
