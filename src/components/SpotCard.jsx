import React from 'react';
import { Sun, Cloud, Eye, Shield, Coffee, MapPin, Sparkles, Navigation, Maximize2 } from 'lucide-react';
import { formatWalkDistance } from '../utils/geoUtils';

export default function SpotCard({
  spot,
  sunWindow,
  isSelected,
  distanceMeters,
  activeSession,
  onSelectSpot,
  onStartSunBath,
  onTeleportToSpot
}) {
  const isSunny = sunWindow.status === 'sunny';
  const walkInfo = distanceMeters !== undefined ? formatWalkDistance(distanceMeters) : null;
  const isClearSky = spot.skyViewFactor >= 0.88;
  const isSpotSessionActive = activeSession?.spot?.id === spot.id;

  return (
    <div
      id={`spot-card-${spot.id}`}
      className={`spot-card ${isSunny ? 'is-sunny' : 'is-shaded'} ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelectSpot(spot)}
    >
      <div className="spot-card-top">
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="spot-category-tag">{spot.categoryLabel}</span>
              {spot.isHyperLocal && (
                <span className="hyperlocal-pill" title="Hyper-local spot within walking distance of your current position">
                  Neighborhood
                </span>
              )}
              {isSpotSessionActive && (
                <span className="hyperlocal-pill" style={{ background: 'rgba(16, 185, 129, 0.25)', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.5)' }}>
                  ☀️ Active
                </span>
              )}
            </div>
            {walkInfo && (
              <span className="spot-distance-tag" title="Distance from your current position">
                <Navigation size={11} style={{ transform: 'rotate(45deg)' }} />
                <span>{walkInfo.fullText}</span>
              </span>
            )}
          </div>
          <h3 className="spot-name">{spot.name}</h3>
          <div className="spot-address" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <MapPin size={12} style={{ display: 'inline', marginRight: '3px' }} />
              {spot.address}
            </div>
            <button
              id={`btn-teleport-${spot.id}`}
              className="btn-teleport-card"
              onClick={(e) => {
                e.stopPropagation();
                if (onTeleportToSpot) onTeleportToSpot(spot);
              }}
              title="Simulate GPS: Teleport directly inside this spot"
            >
              <MapPin size={11} color="#34d399" />
              <span>Teleport GPS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sun Window Countdown Banner */}
      <div className={`sun-window-pill ${isSunny ? 'sunny' : 'shaded'}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isSunny ? <Sun size={16} color="#f59e0b" /> : <Cloud size={16} color="#94a3b8" />}
          <span>{sunWindow.label}</span>
        </div>
      </div>

      {/* Microclimate Metadata */}
      <div className="spot-meta-row">
        <div className="meta-item" title="Sky View Factor: ratio of visible open sky hemisphere">
          <Eye size={13} color="#94a3b8" />
          <span>SVF: <strong style={{ color: isClearSky ? '#34d399' : 'inherit' }}>{Math.round(spot.skyViewFactor * 100)}% {isClearSky ? 'Clear Sky' : 'Sky'}</strong></span>
        </div>
        <div className="meta-item" title="Estimated ground surface bathed in direct sunlight">
          <Maximize2 size={13} color="#f59e0b" />
          <span>Sunlit Area: <strong>~{spot.sunlitAreaM2 || 350} m²</strong></span>
        </div>
      </div>

      {/* Seating & Environment */}
      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
        🪑 {spot.seatingType}
      </div>

      {/* Local Partner Café Micro-Reward */}
      <div className="partner-cafe-box">
        <div className="cafe-info">
          <Coffee size={14} color="#10b981" />
          <div>
            <strong>{spot.partnerCafe.name}</strong> ({spot.partnerCafe.distance})
          </div>
        </div>
        <span className="cafe-perk">Reward Partner</span>
      </div>

      {/* Action Button */}
      <button
        id={`btn-start-sun-${spot.id}`}
        className={`sun-bath-btn ${!isSunny ? 'shaded' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onStartSunBath(spot);
        }}
      >
        <Sparkles size={16} />
        <span>
          {isSpotSessionActive
            ? 'Open Active Sun Session'
            : isSunny
            ? 'Start 15-min Sun Session'
            : 'Rest Here (Circadian Intake)'}
        </span>
      </button>
    </div>
  );
}
