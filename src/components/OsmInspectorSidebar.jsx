import React from 'react';
import {
  Sun,
  Cloud,
  Compass,
  MapPin,
  Building2,
  Footprints,
  Zap,
  Crosshair,
  Layers,
  Sparkles,
  Clock
} from 'lucide-react';

const SOLAR_PRESETS = [
  { id: 'noon', label: '12:00 Noon', elev: 18.5, az: 195.0, desc: 'Peak Southern Sun' },
  { id: 'morning', label: '09:30 AM', elev: 11.2, az: 142.0, desc: 'Morning SE Sun' },
  { id: 'afternoon', label: '14:30 PM', elev: 12.8, az: 224.0, desc: 'Afternoon SW Sun' },
  { id: 'live', label: 'Live Clock', elev: null, az: null, desc: 'Real-Time Ephemeris' }
];

export default function OsmInspectorSidebar({
  inspectionResult,
  cursorCoords,
  solarPos,
  solarPreset,
  onSelectSolarPreset,
  buildings = [],
  sidewalks = [],
  osmSourceStatus = 'verified-cache',
  onSelectBuildingPoint
}) {
  const {
    point,
    isSunny,
    statusLabel,
    statusSubtext,
    obstructingObject,
    nearestBuilding,
    photopicLux,
    sunElevationDeg,
    sunAzimuthDeg,
    nearestSidewalk
  } = inspectionResult || {};

  const activeBuilding = obstructingObject || nearestBuilding;
  const [selLng, selLat] = point || [19.4574, 51.7678];
  const [curLng, curLat] = cursorCoords || [selLng, selLat];

  return (
    <aside className="spots-sidebar osm-inspector-sidebar" id="sidebar-osm-inspector">
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <div className="sidebar-title">
            <Layers size={19} color="#f59e0b" />
            <span>OSM Spatial Inspector</span>
          </div>
          <span
            className="spots-count-badge"
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              borderColor: 'rgba(16, 185, 129, 0.4)',
              color: '#34d399'
            }}
          >
            {buildings.length} 3D Bldgs • {sidewalks.length} Ways
          </span>
        </div>
        <p className="sidebar-subtitle">
          Click any sidewalk or 3D building on the map to inspect real OpenStreetMap building envelopes, shadow vectors, and pedestrian surfaces.
        </p>

        {/* Solar Angle / Time Preset Bar */}
        <div className="inspector-solar-preset-box">
          <div className="preset-box-header">
            <span className="preset-box-label">
              <Clock size={12} color="#f59e0b" />
              <span>Solar Vector Mode</span>
            </span>
            <span className="preset-box-readout">
              Elev <strong>{sunElevationDeg ?? solarPos.elevationDeg}°</strong> • Az{' '}
              <strong>{sunAzimuthDeg ?? solarPos.azimuthDeg}°</strong>
            </span>
          </div>
          <div className="preset-pills-row">
            {SOLAR_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`solar-preset-pill ${solarPreset === p.id ? 'active' : ''}`}
                onClick={() => onSelectSolarPreset && onSelectSolarPreset(p.id)}
                title={p.desc}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inspector Scrollable Body */}
      <div className="spots-list inspector-cards-list">
        {/* 1. COORDINATES READOUT CARD */}
        <div className="inspector-section-card">
          <div className="inspector-card-header">
            <div className="inspector-card-title">
              <MapPin size={14} color="#f59e0b" />
              <span>Spatial Coordinates (WGS84)</span>
            </div>
            <span className="inspector-crs-tag">EPSG:4326</span>
          </div>

          <div className="coord-readout-grid">
            <div className="coord-box selected">
              <span className="coord-box-label">Selected Pin [Lat, Lng]</span>
              <span className="coord-box-value">
                {selLat.toFixed(6)}° N, {selLng.toFixed(6)}° E
              </span>
            </div>
            <div className="coord-box cursor">
              <span className="coord-box-label">
                <Crosshair size={11} style={{ display: 'inline', marginRight: '4px' }} />
                Live Cursor [Lat, Lng]
              </span>
              <span className="coord-box-value muted">
                {curLat.toFixed(6)}° N, {curLng.toFixed(6)}° E
              </span>
            </div>
          </div>
        </div>

        {/* 2. OPTICAL SUNLIGHT STATUS CARD */}
        {inspectionResult && (
          <div className={`inspector-verdict-card ${isSunny ? 'sunny' : 'shaded'}`}>
            <div className="verdict-top-row">
              <div className="verdict-badge">
                {isSunny ? <Sun size={16} /> : <Cloud size={16} />}
                <span>{statusLabel}</span>
              </div>
              <div className="verdict-lux-pill">
                <Zap size={13} />
                <span>~{(photopicLux || 0).toLocaleString()} Lux</span>
              </div>
            </div>
            <p className="verdict-description">{statusSubtext}</p>
          </div>
        )}

        {/* 3. BUILDING 3D ENVELOPE DETAILS CARD */}
        <div className="inspector-section-card">
          <div className="inspector-card-header">
            <div className="inspector-card-title">
              <Building2 size={14} color="#38bdf8" />
              <span>
                {obstructingObject
                  ? 'Obstructing Building (Shadow Caster)'
                  : 'Nearest OSM 3D Building Envelope'}
              </span>
            </div>
            {obstructingObject ? (
              <span className="inspector-status-pill danger">Blocks Sun</span>
            ) : (
              <span className="inspector-status-pill clear">Clear Line of Sight</span>
            )}
          </div>

          {activeBuilding ? (
            <>
              <div className="inspector-entity-name">{activeBuilding.name}</div>
              <div className="inspector-entity-sub">{activeBuilding.address}</div>

              <div className="inspector-metrics-grid3">
                <div className="metric-tile">
                  <span className="tile-label">OSM Height</span>
                  <span className="tile-val">{activeBuilding.heightMeters} m</span>
                </div>
                <div className="metric-tile">
                  <span className="tile-label">Storeys</span>
                  <span className="tile-val">
                    {activeBuilding.levels > 0 ? `${activeBuilding.levels} floors` : 'Canopy'}
                  </span>
                </div>
                <div className="metric-tile">
                  <span className="tile-label">Shadow Length</span>
                  <span className="tile-val amber">{activeBuilding.shadowLengthMeters} m</span>
                </div>
              </div>

              {obstructingObject ? (
                <div className="inspector-obstruction-note">
                  Solar beam intercepted at <strong>{obstructingObject.hitHeightMeters} m</strong> elevation,{' '}
                  <strong>{obstructingObject.distanceMeters} m</strong> south of selected point.
                </div>
              ) : (
                <div className="inspector-clear-note">
                  Located <strong>{activeBuilding.distanceMeters} m</strong> from selected point. Its{' '}
                  <strong>{activeBuilding.shadowLengthMeters} m</strong> shadow falls away from this spot.
                </div>
              )}
            </>
          ) : (
            <div className="inspector-empty-note">Click on the map to inspect nearby buildings.</div>
          )}
        </div>

        {/* 4. PEDESTRIAN NETWORK / SIDEWALK CARD */}
        <div className="inspector-section-card">
          <div className="inspector-card-header">
            <div className="inspector-card-title">
              <Footprints size={14} color="#34d399" />
              <span>Pedestrian Sidewalk / Corridor</span>
            </div>
            <span className="inspector-crs-tag" style={{ color: '#34d399' }}>
              OSM Highway
            </span>
          </div>

          {nearestSidewalk ? (
            <>
              <div className="inspector-entity-name">{nearestSidewalk.name}</div>
              <div className="inspector-metrics-grid3" style={{ marginTop: '8px' }}>
                <div className="metric-tile">
                  <span className="tile-label">Surface</span>
                  <span className="tile-val" style={{ fontSize: '0.78rem' }}>
                    {nearestSidewalk.surface}
                  </span>
                </div>
                <div className="metric-tile">
                  <span className="tile-label">Width</span>
                  <span className="tile-val">{nearestSidewalk.widthMeters} m</span>
                </div>
                <div className="metric-tile">
                  <span className="tile-label">Distance</span>
                  <span className="tile-val">{nearestSidewalk.distanceMeters} m</span>
                </div>
              </div>
            </>
          ) : (
            <div className="inspector-empty-note">No pedestrian footway indexed near point.</div>
          )}
        </div>

        {/* 5. QUICK JUMP TO VERIFIED 3D BUILDINGS */}
        <div className="inspector-section-card">
          <div className="inspector-card-header">
            <div className="inspector-card-title">
              <Sparkles size={14} color="#f59e0b" />
              <span>Quick-Inspect Łódź 3D Buildings</span>
            </div>
          </div>
          <div className="quick-buildings-list">
            {buildings.slice(0, 8).map((b) => {
              const isCurrent = activeBuilding?.id === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  className={`quick-bldg-btn ${isCurrent ? 'active' : ''}`}
                  onClick={() => onSelectBuildingPoint && onSelectBuildingPoint(b)}
                >
                  <div className="quick-bldg-main">
                    <span className="quick-bldg-name">{b.name}</span>
                    <span className="quick-bldg-addr">{b.address}</span>
                  </div>
                  <span className="quick-bldg-height">{b.heightMeters}m</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
