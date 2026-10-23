import React from 'react';
import { Sun, Cloud, Compass, Clock, Sliders, AlertTriangle, Footprints } from 'lucide-react';

export default function Navbar({
  weather,
  solarPos,
  sunTimes,
  simulatedTime,
  isScrubberOpen,
  onToggleScrubber,
  activeMode,
  onChangeMode
}) {
  const isSimulating = Boolean(simulatedTime);
  const displayTime = simulatedTime
    ? simulatedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <header className="navbar">
      {/* Brand & City Pilot */}
      <div className="brand-section">
        <div className="brand-logo-icon">
          <Sun size={22} color="#111827" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="brand-name">LumosWalk</span>
            <span className="brand-tag">Łódź Pilot</span>
          </div>
        </div>
      </div>

      {/* Mode Switcher Tabs: Mode 1 (Sun Path) vs Mode 2 (Sunny Spots) */}
      <div className="app-mode-switch-wrapper" id="nav-mode-switcher">
        <button
          id="tab-mode-router"
          className={`mode-tab-btn ${activeMode === 'router' ? 'active' : ''}`}
          onClick={() => onChangeMode('router')}
          title="Mode 1: Sun Path — A to B Walking Router (Shortest vs Sunny Path)"
        >
          <Footprints size={15} />
          <span>Sun Path Router</span>
        </button>
        <button
          id="tab-mode-spots"
          className={`mode-tab-btn ${activeMode === 'spots' ? 'active' : ''}`}
          onClick={() => onChangeMode('spots')}
          title="Mode 2: Sunny Spots — Stationary Benches & Sun Window Countdowns"
        >
          <Sun size={15} />
          <span>Sunny Spots</span>
        </button>
      </div>

      {/* Real-time Solar & Microclimate Metrics */}
      <div className="nav-metrics">
        {/* Solar Ephemeris readout */}
        <div className="metric-chip solar" title="Current Solar Elevation & Azimuth in Łódź">
          <Compass size={15} color="#f59e0b" />
          <span>Sun: <strong>{solarPos.elevationDeg}° elev</strong> / {solarPos.azimuthDeg}° az</span>
        </div>

        {/* Weather & Cloud Cover */}
        <div className="metric-chip" title="Real-time Open-Meteo Feed for Central Łódź">
          <Cloud size={15} color="#94a3b8" />
          <span>{weather.temperature}°C • Cloud: <strong>{weather.cloudCover}%</strong></span>
        </div>

        {/* Polish Szaruga Alert Pill */}
        {weather.isSzaruga ? (
          <div className="metric-chip szaruga-alert" title="Cloud cover exceeds 80%. System pivots to high Sky View Factor open spaces.">
            <AlertTriangle size={15} color="#ef4444" />
            <span><strong>Szaruga Mode:</strong> High-Sky Parks</span>
          </div>
        ) : (
          <div className="metric-chip" style={{ borderColor: 'rgba(16, 185, 129, 0.3)', color: '#6ee7b7' }}>
            <span>DNI: <strong>{weather.directIrradiance} W/m²</strong></span>
          </div>
        )}

        {/* Current / Simulated Time Display */}
        <div className="metric-chip" style={{ fontFamily: 'var(--font-mono)' }}>
          <Clock size={14} color="#f59e0b" />
          <span>{isSimulating ? 'Simulated:' : 'Live:'} <strong>{displayTime}</strong></span>
        </div>

        {/* Scrubber Toggle Button */}
        <button
          id="btn-toggle-time-scrubber"
          className={`time-scrub-btn ${isScrubberOpen ? 'active' : ''}`}
          onClick={onToggleScrubber}
          title="Scrub time across the day to simulate shadow movement"
        >
          <Sliders size={15} />
          <span>{isScrubberOpen ? 'Close Scrubber' : 'Simulate Sun Hours'}</span>
        </button>
      </div>
    </header>
  );
}
