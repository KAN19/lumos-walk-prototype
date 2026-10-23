import React, { useState } from 'react';
import {
  PRESET_ROUTER_LOCATIONS
} from '../services/sunPathRoutingService';
import {
  Navigation,
  Sun,
  Clock,
  ArrowUpDown,
  Sparkles,
  ShieldAlert,
  Zap,
  MapPin,
  CheckCircle2,
  Eye,
  Footprints,
  Trees
} from 'lucide-react';

export default function RoutePlannerSidebar({
  startLocation,
  destinationLocation,
  onSelectStart,
  onSelectDestination,
  onSwapLocations,
  routeData,
  selectedRouteType, // 'sunny' | 'park' | 'shortest'
  onSelectRouteType,
  isLoadingRoutes,
  userLocation,
  isPickingMapPoint, // null | 'start' | 'dest'
  onStartPickOnMap,
  isWalking,
  onToggleWalking
}) {
  const [showPresetsModal, setShowPresetsModal] = useState(false);

  const startName = startLocation?.name || '📍 Current GPS Location';
  const destName = destinationLocation?.name || 'Manufaktura (Open Sky Esplanade)';

  const sunnyRoute = routeData?.sunnyRoute;
  const parkRoute = routeData?.parkRoute;
  const shortestRoute = routeData?.shortestRoute;
  const comparison = routeData?.comparison;

  return (
    <aside className="spots-sidebar" id="sidebar-route-planner">
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <div className="sidebar-title">
            <Footprints size={20} color="#f59e0b" />
            <span>Sun Path Walking Router</span>
          </div>
          <span className="spots-count-badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fef3c7' }}>
            Dual-Route Comparison
          </span>
        </div>
        <p className="sidebar-subtitle">
          Select origin and destination to compare the standard shortest walk against the sunlight-maximized pedestrian route.
        </p>

        {/* Origin & Destination Input Box */}
        <div className="route-inputs-card">
          {/* Start Point */}
          <div className="route-input-row">
            <div className="route-dot-indicator start" />
            <div className="route-input-content">
              <label className="route-input-label">Start (Origin)</label>
              <div className="route-input-val-row">
                <span className="route-input-value" title={startName}>
                  {startName}
                </span>
                <button
                  className={`btn-route-action ${isPickingMapPoint === 'start' ? 'active' : ''}`}
                  onClick={() => onStartPickOnMap('start')}
                  title="Click anywhere on the map to set starting point"
                >
                  <MapPin size={12} />
                  <span>{isPickingMapPoint === 'start' ? 'Click Map...' : 'Pick'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Swap Button */}
          <div className="route-swap-divider">
            <div className="route-swap-line" />
            <button
              className="route-swap-btn"
              onClick={onSwapLocations}
              title="Swap Start and Destination"
            >
              <ArrowUpDown size={14} />
            </button>
            <div className="route-swap-line" />
          </div>

          {/* Destination Point */}
          <div className="route-input-row">
            <div className="route-dot-indicator dest" />
            <div className="route-input-content">
              <label className="route-input-label">Destination</label>
              <div className="route-input-val-row">
                <span className="route-input-value" title={destName}>
                  {destName}
                </span>
                <button
                  className={`btn-route-action ${isPickingMapPoint === 'dest' ? 'active' : ''}`}
                  onClick={() => onStartPickOnMap('dest')}
                  title="Click anywhere on the map to set destination"
                >
                  <MapPin size={12} />
                  <span>{isPickingMapPoint === 'dest' ? 'Click Map...' : 'Pick'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Destination Presets Horizontal Pills */}
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
            Quick Destinations in Łódź:
          </div>
          <div className="dest-presets-scroll">
            {PRESET_ROUTER_LOCATIONS.filter((l) => l.id !== 'current_gps').map((loc) => {
              const isSelected = destinationLocation?.id === loc.id;
              return (
                <button
                  key={loc.id}
                  className={`preset-dest-pill ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectDestination(loc)}
                >
                  <span>{loc.name.split(' (')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Routes List & Comparison */}
      <div className="spots-list" style={{ padding: '12px' }}>
        {isLoadingRoutes ? (
          <div className="route-loading-box">
            <div className="route-loading-spinner" />
            <p>Calculating 3D shadow projections & walking vectors...</p>
          </div>
        ) : routeData ? (
          <>
            {/* Takeaway Insight Pill */}
            {comparison && (
              <div className="route-insight-banner">
                <Sparkles size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
                <div>
                  <strong>Sunlight Prescription Insight:</strong> Walking just{' '}
                  <span style={{ color: '#fde68a' }}>+{comparison.deltaWalkMinutes} min</span>{' '}
                  yields{' '}
                  <span style={{ color: '#34d399', fontWeight: 700 }}>
                    +{comparison.extraSunMinutes} extra minutes
                  </span>{' '}
                  of direct winter sunlight ({comparison.photonRatio}x more photons)!
                </div>
              </div>
            )}

            {/* ROUTE OPTION 1: The Sunny Walk (Recommended) */}
            {sunnyRoute && (
              <div
                id="card-sunny-route"
                className={`route-card sunny ${selectedRouteType === 'sunny' ? 'is-selected' : ''}`}
                onClick={() => onSelectRouteType('sunny')}
              >
                <div className="route-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="route-badge-sunny">
                      <Sun size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      Sunny Walk
                    </span>
                    <span className="route-recommend-tag">Recommended</span>
                  </div>
                  {selectedRouteType === 'sunny' && (
                    <CheckCircle2 size={16} color="#f59e0b" />
                  )}
                </div>

                <div className="route-metric-hero">
                  <div className="route-time-val">
                    {sunnyRoute.walkMinutes} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>min walk</span>
                  </div>
                  <div className="route-distance-val">
                    {(sunnyRoute.totalDistanceMeters / 1000).toFixed(2)} km
                  </div>
                </div>

                {/* Sun Exposure Meter */}
                <div className="exposure-meter-box">
                  <div className="exposure-meter-header">
                    <span>Direct Sunlight Exposure</span>
                    <strong style={{ color: '#34d399' }}>{sunnyRoute.sunPercent}% in Sun</strong>
                  </div>
                  <div className="exposure-progress-bar">
                    <div
                      className="exposure-progress-fill sunny"
                      style={{ width: `${sunnyRoute.sunPercent}%` }}
                    />
                  </div>
                  <div className="exposure-breakdown-sub">
                    ☀️ {sunnyRoute.sunMinutes} min in direct sun • ☁️ {sunnyRoute.shadeMinutes} min shaded
                  </div>
                </div>

                {/* Microclimate Health Delivery */}
                <div className="route-health-features">
                  <div className="health-feature-item">
                    <Zap size={13} color="#f59e0b" />
                    <span>~{sunnyRoute.photopicLuxAvg.toLocaleString()} Photopic Lux delivered</span>
                  </div>
                  <div className="health-feature-item">
                    <Eye size={13} color="#34d399" />
                    <span>Steered via {sunnyRoute.viaName || 'broad open-sky avenues'}</span>
                  </div>
                </div>

                {/* Route Selection Button */}
                <button
                  className={`btn-select-route ${selectedRouteType === 'sunny' ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectRouteType('sunny');
                  }}
                >
                  {selectedRouteType === 'sunny' ? 'Active Route on Map' : 'Select Sunny Path'}
                </button>
              </div>
            )}

            {/* ROUTE OPTION 2: Park & Greenery Walk (if available) */}
            {parkRoute && (
              <div
                id="card-park-route"
                className={`route-card park ${selectedRouteType === 'park' ? 'is-selected' : ''}`}
                onClick={() => onSelectRouteType('park')}
              >
                <div className="route-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="route-badge-park">
                      <Trees size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      Park Walk
                    </span>
                    <span className="route-recommend-tag" style={{ background: 'rgba(52, 211, 153, 0.15)', borderColor: 'rgba(52, 211, 153, 0.4)', color: '#34d399' }}>
                      Scenic Greenery
                    </span>
                  </div>
                  {selectedRouteType === 'park' && (
                    <CheckCircle2 size={16} color="#34d399" />
                  )}
                </div>

                <div className="route-metric-hero">
                  <div className="route-time-val">
                    {parkRoute.walkMinutes} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>min walk</span>
                  </div>
                  <div className="route-distance-val">
                    {(parkRoute.totalDistanceMeters / 1000).toFixed(2)} km
                  </div>
                </div>

                {/* Sun Exposure Meter */}
                <div className="exposure-meter-box">
                  <div className="exposure-meter-header">
                    <span>Direct Sunlight Exposure</span>
                    <strong style={{ color: '#34d399' }}>{parkRoute.sunPercent}% in Sun</strong>
                  </div>
                  <div className="exposure-progress-bar">
                    <div
                      className="exposure-progress-fill park"
                      style={{ width: `${parkRoute.sunPercent}%` }}
                    />
                  </div>
                  <div className="exposure-breakdown-sub">
                    ☀️ {parkRoute.sunMinutes} min in sun • 🌿 via {parkRoute.viaName || 'Park Corridors'}
                  </div>
                </div>

                {/* Microclimate Health Delivery */}
                <div className="route-health-features">
                  <div className="health-feature-item">
                    <Zap size={13} color="#34d399" />
                    <span>~{parkRoute.photopicLuxAvg.toLocaleString()} Photopic Lux delivered</span>
                  </div>
                  <div className="health-feature-item">
                    <Eye size={13} color="#10b981" />
                    <span>Open park canopies & shaded tree-lined avenues</span>
                  </div>
                </div>

                {/* Route Selection Button */}
                <button
                  className={`btn-select-route ${selectedRouteType === 'park' ? 'selected-park' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectRouteType('park');
                  }}
                >
                  {selectedRouteType === 'park' ? 'Active Route on Map' : 'Select Park Walk'}
                </button>
              </div>
            )}

            {/* ROUTE OPTION 3: Shortest Path */}
            {shortestRoute && (
              <div
                id="card-shortest-route"
                className={`route-card shortest ${selectedRouteType === 'shortest' ? 'is-selected' : ''}`}
                onClick={() => onSelectRouteType('shortest')}
              >
                <div className="route-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="route-badge-shortest">
                      <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      Shortest Path
                    </span>
                    <span className="route-standard-tag">Direct Line</span>
                  </div>
                  {selectedRouteType === 'shortest' && (
                    <CheckCircle2 size={16} color="#38bdf8" />
                  )}
                </div>

                <div className="route-metric-hero">
                  <div className="route-time-val">
                    {shortestRoute.walkMinutes} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>min walk</span>
                  </div>
                  <div className="route-distance-val">
                    {(shortestRoute.totalDistanceMeters / 1000).toFixed(2)} km
                  </div>
                </div>

                {/* Sun Exposure Meter */}
                <div className="exposure-meter-box">
                  <div className="exposure-meter-header">
                    <span>Direct Sunlight Exposure</span>
                    <strong style={{ color: '#f87171' }}>{shortestRoute.sunPercent}% in Sun</strong>
                  </div>
                  <div className="exposure-progress-bar">
                    <div
                      className="exposure-progress-fill shaded"
                      style={{ width: `${shortestRoute.sunPercent}%` }}
                    />
                  </div>
                  <div className="exposure-breakdown-sub">
                    ☁️ {shortestRoute.shadeMinutes} min in shadow • ☀️ only {shortestRoute.sunMinutes} min in sun
                  </div>
                </div>

                {/* Shadow Warning */}
                <div className="shadow-warning-box">
                  <ShieldAlert size={14} color="#f87171" style={{ flexShrink: 0 }} />
                  <span>
                    Traverses narrow tenement canyons (kamienice) with deep winter shadows and low ambient light (~1,900 Lux).
                  </span>
                </div>

                {/* Route Selection Button */}
                <button
                  className={`btn-select-route ${selectedRouteType === 'shortest' ? 'selected-shortest' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectRouteType('shortest');
                  }}
                >
                  {selectedRouteType === 'shortest' ? 'Active Route on Map' : 'Select Shortest Path'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--text-muted)' }}>
            <p>Select your origin and destination to compute sunlight-optimized routes.</p>
          </div>
        )}
      </div>
    </aside>
  );
}
