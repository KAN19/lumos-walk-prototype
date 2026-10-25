import React from 'react';
import { Sun, Footprints, Compass, SearchCheck, Key, Layers } from 'lucide-react';

export default function Navbar({
  solarPos,
  activeMode,
  onChangeMode,
  hasMapboxToken = false,
  onOpenApiModal,
  osmDataStatus = 'live'
}) {
  return (
    <header className="navbar">
      {/* Brand & Subtitle */}
      <div className="brand-section">
        <div className="brand-logo-icon">
          <Sun size={20} color="#111827" strokeWidth={2.5} />
        </div>
        <div className="brand-text-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="brand-name">LumosWalk</span>
            <span className="brand-tag">Łódź OSM 3D</span>
          </div>
          <span className="brand-subtitle-text">
            OSM Urban Spatial &amp; Shadow Inspector
          </span>
        </div>
      </div>

      {/* Mode Switcher Tabs (100% English) */}
      <div className="app-mode-switch-wrapper" id="nav-mode-switcher">
        <button
          id="tab-mode-inspector"
          className={`mode-tab-btn ${activeMode === 'inspector' ? 'active' : ''}`}
          onClick={() => onChangeMode('inspector')}
          title="Inspect 3D OSM Buildings, Pedestrian Sidewalks & Ground Shadows"
        >
          <SearchCheck size={14} />
          <span>Spatial Inspector</span>
        </button>

        <button
          id="tab-mode-router"
          className={`mode-tab-btn ${activeMode === 'router' ? 'active' : ''}`}
          onClick={() => onChangeMode('router')}
          title="Compare Sunlight-Maximized vs Shortest Walking Routes"
        >
          <Footprints size={14} />
          <span>Sun Path Router</span>
        </button>

        <button
          id="tab-mode-spots"
          className={`mode-tab-btn ${activeMode === 'spots' ? 'active' : ''}`}
          onClick={() => onChangeMode('spots')}
          title="Explore Sunlit Benches, Plazas & Sun Windows"
        >
          <Sun size={14} />
          <span>Sunny Spots</span>
        </button>
      </div>

      {/* Right Status Readouts: Sun Position + OSM Data Status */}
      <div className="nav-metrics">
        <div
          className="metric-chip solar"
          title="Active Solar Elevation & Azimuth Angle for Shadow Raycasting"
        >
          <Compass size={14} color="#f59e0b" />
          <span>
            Sun Position: <strong>{solarPos.elevationDeg}° elev</strong> /{' '}
            <strong>{solarPos.azimuthDeg}° az</strong>
          </span>
        </div>

        <div
          className="metric-chip osm-live-chip"
          title="OpenStreetMap 3D Building Envelopes & Pedestrian Network Active"
        >
          <Layers size={13} color="#10b981" />
          <span>
            OSM Data: <strong>Live</strong>
          </span>
          <span className="status-dot green" />
        </div>

        <button
          id="btn-mapbox-api"
          className={`api-key-nav-btn ${hasMapboxToken ? 'connected' : ''}`}
          onClick={onOpenApiModal}
          title="Configure Mapbox Places API Token (Optional)"
          style={{ padding: '6px 10px' }}
        >
          <Key size={13} />
          <span className={`status-dot ${hasMapboxToken ? 'green' : 'amber'}`} />
        </button>
      </div>
    </header>
  );
}
