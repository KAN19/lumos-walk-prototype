import React from 'react';
import confetti from 'canvas-confetti';
import { X, Sun, CheckCircle, Coffee, Sparkles, FastForward, AlertTriangle, Play, Pause, Navigation } from 'lucide-react';

export default function SunBathModal({
  spot,
  userLocation,
  elapsedSeconds,
  isRunning,
  isCompleted,
  geofence,
  onTeleportInside,
  onStepOutside,
  onFastForward,
  onTogglePlayPause,
  onClose
}) {
  const TARGET_SECONDS = 15 * 60; // 15 minutes
  const progressPercent = Math.min(100, Math.round((elapsedSeconds / TARGET_SECONDS) * 100));
  const remainingSeconds = Math.max(0, TARGET_SECONDS - elapsedSeconds);
  const remMinutes = Math.floor(remainingSeconds / 60);
  const remSecs = remainingSeconds % 60;

  // SVG circle calculation
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="modal-overlay" id="modal-sun-bath" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button id="btn-close-modal" className="modal-close-btn" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="modal-header">
          <span className="modal-badge">
            <Sparkles size={12} style={{ display: 'inline', marginRight: '4px' }} />
            Proof-of-Sunlight Prescription
          </span>
          <h2 className="modal-title">Sun-Soaking Session</h2>
          <p className="modal-subtitle">
            {spot.name} • {spot.categoryLabel}
          </p>
        </div>

        {/* Live Geofence Verification Status */}
        <div className={`geofence-status-banner ${geofence?.isInside ? 'inside' : 'outside'}`} id="banner-geofence-status">
          <div className="geofence-pill-header">
            <div className={`geofence-badge-tag ${geofence?.isInside ? 'inside' : 'outside'}`}>
              {geofence?.isInside ? (
                <>
                  <Sun size={13} />
                  <span>Verified in Sunlit Area</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={13} />
                  <span>Timer Paused (Outside Area)</span>
                </>
              )}
            </div>
            <span style={{ fontSize: '0.74rem', color: geofence?.isInside ? '#34d399' : '#f59e0b', fontWeight: 600 }}>
              {geofence?.isInside ? '☀️ Soaking Photons' : `~${geofence?.distanceMeters ?? 0}m away`}
            </span>
          </div>

          <p className="geofence-explanation">
            {geofence?.isInside ? (
              <>
                ☀️ <strong>Clinical Geofence Active:</strong> Your GPS is verified inside the sun-exposed ground footprint of <em>{spot.name}</em> (~12,500 Lux). The exposure timer is actively counting toward your daily winter light quota.
              </>
            ) : (
              <>
                ⚠️ <strong>Exposure Paused:</strong> You are currently <strong>{geofence?.distanceMeters ?? 0} meters</strong> outside the sunlit footprint. The timer will only count when you are physically on the selected area!
              </>
            )}
          </p>

          <div className="geofence-action-helpers">
            {!geofence?.isInside ? (
              <button
                id="btn-modal-teleport-inside"
                className="btn-teleport-inside"
                onClick={onTeleportInside}
                title="Simulate GPS: Place yourself directly inside the sunlit area"
              >
                📍 Teleport GPS Inside Area
              </button>
            ) : (
              <button
                id="btn-modal-step-outside"
                className="btn-step-outside"
                onClick={onStepOutside}
                title="Simulate GPS: Step 80m outside to test that the timer pauses"
              >
                🚶 Step Outside (Test Geofence Pause)
              </button>
            )}
          </div>
        </div>

        {/* Circular Timer Visual */}
        <div className="circular-timer-container">
          <div className="timer-circle">
            <svg className="timer-svg" viewBox="0 0 160 160">
              <defs>
                <linearGradient id="sun-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
              </defs>
              <circle
                className="timer-track"
                cx="80"
                cy="80"
                r={radius}
              />
              <circle
                className="timer-progress"
                cx="80"
                cy="80"
                r={radius}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: strokeDashoffset,
                  stroke: !geofence?.isInside && !isCompleted ? '#f59e0b' : 'url(#sun-gradient)'
                }}
              />
            </svg>
            <div className="timer-center-content">
              <span className="timer-digits">
                {String(remMinutes).padStart(2, '0')}:{String(remSecs).padStart(2, '0')}
              </span>
              <span className="timer-sublabel">
                {isCompleted ? 'Goal Met! 🎉' : geofence?.isInside ? 'Soaking Active' : 'Paused (Outside)'}
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Biological Impact */}
        <div className="health-metrics-grid">
          <div className="health-metric-box">
            <div className="health-val">{geofence?.isInside ? '~12.5k' : '0 (Shaded)'}</div>
            <div className="health-name">Photopic Lux</div>
          </div>
          <div className="health-metric-box">
            <div className="health-val" style={{ color: geofence?.isInside ? '#34d399' : '#94a3b8' }}>
              {geofence?.isInside ? '+40%' : 'Paused'}
            </div>
            <div className="health-name">Serotonin Cue</div>
          </div>
          <div className="health-metric-box">
            <div className="health-val" style={{ color: '#60a5fa' }}>
              {Math.round((spot.skyViewFactor || 0.85) * 100)}% Sky
            </div>
            <div className="health-name">Circadian Reset</div>
          </div>
        </div>

        {/* Unlocked Voucher Card when Completed */}
        {isCompleted ? (
          <div className="unlocked-voucher-card" id="card-unlocked-voucher">
            <div className="voucher-title">
              <CheckCircle size={18} />
              <span>Winter Reward Unlocked!</span>
            </div>
            <div className="voucher-perk">{spot.partnerCafe.perk}</div>
            <div className="voucher-cafe-name">
              Valid at <strong>{spot.partnerCafe.name}</strong> ({spot.partnerCafe.distance})
            </div>
            <div className="voucher-code-pill" id="voucher-code-display">
              {spot.partnerCafe.code}
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              Show this code to the barista to redeem your microclimate reward.
            </p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', margin: '10px 0' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Absorb direct natural photons for 15 minutes inside this spot to unlock your warm winter beverage perk.
            </p>
          </div>
        )}

        {/* Modal Controls */}
        <div className="modal-actions">
          {!isCompleted && (
            <button
              id="btn-fast-forward"
              className="btn-secondary"
              onClick={onFastForward}
              title="Demo feature: skip 15 minutes to test voucher unlock"
            >
              <FastForward size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Fast-Forward (Judge Demo)
            </button>
          )}
          <button
            id="btn-complete-or-close"
            className="btn-primary"
            onClick={onClose}
          >
            {isCompleted ? 'Done & Close' : 'Keep Running in Background'}
          </button>
        </div>
      </div>
    </div>
  );
}

