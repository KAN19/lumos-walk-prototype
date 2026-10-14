import React from 'react';
import { Sun, RotateCcw, FastForward } from 'lucide-react';

export default function TimeScrubber({
  simulatedMinutes,
  onChangeMinutes,
  onResetToLive,
  isLive,
  solarPos
}) {
  // Convert minutes from midnight (e.g., 720 = 12:00) to HH:MM format
  const hours = Math.floor(simulatedMinutes / 60);
  const mins = simulatedMinutes % 60;
  const timeFormatted = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

  const setPreset = (targetMinutes) => {
    onChangeMinutes(targetMinutes);
  };

  return (
    <div className="time-scrubber-panel" id="panel-time-scrubber">
      <div className="scrubber-header">
        <div className="scrubber-title">
          <Sun size={18} color="#f59e0b" />
          <span>Interactive Sun & Shadow Simulator</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="scrubber-time-badge" id="scrubber-display-time">
            {timeFormatted}
          </div>
          {!isLive && (
            <button
              id="btn-reset-live-time"
              className="scrubber-reset-btn"
              onClick={onResetToLive}
              title="Return to actual current time"
            >
              <RotateCcw size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Back to Live
            </button>
          )}
        </div>
      </div>

      <div className="scrubber-controls">
        <input
          id="range-time-scrubber"
          type="range"
          min={480} // 08:00
          max={990} // 16:30
          step={5} // 5-minute intervals
          value={simulatedMinutes}
          onChange={(e) => onChangeMinutes(Number(e.target.value))}
          className="scrubber-slider"
          aria-label="Time of Day Slider"
        />
      </div>

      <div className="scrubber-ticks">
        <span>08:00 (Sunrise)</span>
        <span>10:00</span>
        <span style={{ color: '#f59e0b', fontWeight: 600 }}>11:47 (Solar Noon)</span>
        <span>14:00</span>
        <span>16:30 (Sunset)</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="filter-btn"
            onClick={() => setPreset(600)} // 10:00
          >
            Morning (10:00)
          </button>
          <button
            className="filter-btn"
            onClick={() => setPreset(707)} // 11:47
          >
            Solar Noon (11:47)
          </button>
          <button
            className="filter-btn"
            onClick={() => setPreset(780)} // 13:00
          >
            Lunch Peak (13:00)
          </button>
          <button
            className="filter-btn"
            onClick={() => setPreset(900)} // 15:00
          >
            Golden Hour (15:00)
          </button>
        </div>
        <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          Elev: {solarPos.elevationDeg}° | Az: {solarPos.azimuthDeg}°
        </span>
      </div>
    </div>
  );
}
