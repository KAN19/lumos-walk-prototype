import React from 'react';
import { Sun, Cloud, Compass, MapPin, Building, Footprints, X, Zap } from 'lucide-react';

export default function OsmShadowInspectorDrawer({ inspectionResult, onClose }) {
  if (!inspectionResult) return null;

  const {
    point,
    isSunny,
    statusSubtext,
    obstructingObject,
    photopicLux,
    sunElevationDeg,
    sunAzimuthDeg,
    nearestSidewalk
  } = inspectionResult;

  const [lng, lat] = point;

  return (
    <div className="inspector-mobile-drawer">
      <div className="inspector-drawer-handle" />

      {/* Header */}
      <div className="inspector-drawer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className={`inspector-status-icon ${isSunny ? 'sunny' : 'shaded'}`}>
            {isSunny ? <Sun size={20} /> : <Cloud size={20} />}
          </div>
          <div>
            <div className="inspector-status-title">
              {isSunny ? '☀️ DIRECT SUNLIGHT' : '🌥️ IN BUILDING SHADOW'}
            </div>
            <div className="inspector-coord-text">
              <MapPin size={12} style={{ display: 'inline', marginRight: '3px' }} />
              {lat.toFixed(6)}° N, {lng.toFixed(6)}° E
            </div>
          </div>
        </div>

        <button className="inspector-close-btn" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>

      {/* Primary Status Card */}
      <div className={`inspector-alert-card ${isSunny ? 'sunny' : 'shaded'}`}>
        <p style={{ margin: 0, fontSize: '0.84rem', lineHeight: 1.45 }}>
          {statusSubtext}
        </p>
      </div>

      {/* Diagnostic Metrics Grid */}
      <div className="inspector-grid">
        <div className="inspector-grid-item">
          <div className="item-label">
            <Compass size={13} color="#f59e0b" />
            <span>Solar Angle</span>
          </div>
          <div className="item-value">
            {sunElevationDeg}° <span className="item-sub">elev</span> • {sunAzimuthDeg}° <span className="item-sub">az</span>
          </div>
        </div>

        <div className="inspector-grid-item">
          <div className="item-label">
            <Zap size={13} color={isSunny ? '#f59e0b' : '#94a3b8'} />
            <span>Photopic Lux</span>
          </div>
          <div className="item-value" style={{ color: isSunny ? '#fde047' : '#94a3b8' }}>
            ~{photopicLux.toLocaleString()} <span className="item-sub">Lux</span>
          </div>
        </div>

        <div className="inspector-grid-item full-width">
          <div className="item-label">
            <Building size={13} color="#38bdf8" />
            <span>{isSunny ? 'Southern Sky Corridor' : 'Obstructing Building (OSM Data)'}</span>
          </div>
          {obstructingObject ? (
            <div style={{ marginTop: '4px' }}>
              <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.88rem' }}>
                {obstructingObject.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                Address: {obstructingObject.address} • OSM Height: <strong>{obstructingObject.heightMeters} m</strong> ({obstructingObject.levels > 0 ? `${obstructingObject.levels} floors` : 'canopy'})
              </div>
              <div style={{ fontSize: '0.76rem', color: '#f87171', marginTop: '2px' }}>
                Solar beam blocked at <strong>{obstructingObject.hitHeightMeters}m</strong> height ({obstructingObject.distanceMeters}m from pin).
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.82rem', color: '#6ee7b7', marginTop: '4px' }}>
              Unobstructed southern sky view. No building within 150m blocks incoming rays at {sunElevationDeg}° elevation.
            </div>
          )}
        </div>

        {nearestSidewalk && (
          <div className="inspector-grid-item full-width">
            <div className="item-label">
              <Footprints size={13} color="#a78bfa" />
              <span>Nearest Pedestrian Sidewalk (OSM Network)</span>
            </div>
            <div style={{ marginTop: '4px', fontSize: '0.82rem', color: '#e2e8f0' }}>
              <strong>{nearestSidewalk.name}</strong> • Surface: {nearestSidewalk.surface} ({nearestSidewalk.distanceMeters}m away)
            </div>
          </div>
        )}
      </div>

      <div className="inspector-footer-note">
        💡 <em>3D building envelopes and footways extracted from OpenStreetMap Łódź.</em>
      </div>
    </div>
  );
}
