import React, { useState, useMemo } from 'react';
import SpotCard from './SpotCard';
import { Sun, Filter, ArrowUpDown, Navigation, MapPin, Sparkles } from 'lucide-react';
import { getDistanceMeters } from '../utils/geoUtils';

export default function SpotsSidebar({
  spots,
  windowsBySpotId,
  selectedSpot,
  userLocation,
  activeSession,
  onSelectSpot,
  onStartSunBath,
  onTeleportToSpot
}) {
  const [filter, setFilter] = useState('all'); // all, local, sunny, plaza, park, bench
  const [sortBy, setSortBy] = useState('nearest'); // nearest, sunTime, skyView

  // Precompute distances for all spots from userLocation
  const distancesBySpotId = useMemo(() => {
    const map = {};
    spots.forEach((spot) => {
      map[spot.id] = getDistanceMeters(userLocation, spot.coordinates);
    });
    return map;
  }, [spots, userLocation]);

  // Filter spots
  const filteredSpots = spots.filter((spot) => {
    const win = windowsBySpotId[spot.id];
    const isSunny = win?.status === 'sunny';

    if (filter === 'local') return spot.isHyperLocal;
    if (filter === 'sunny') return isSunny;
    if (filter === 'plaza') return spot.category === 'plaza';
    if (filter === 'park') return spot.category === 'park';
    if (filter === 'bench') return spot.category === 'bench' || spot.category === 'courtyard';
    return true;
  });

  // Sort spots (Default: Nearest to user's current location)
  const sortedSpots = [...filteredSpots].sort((a, b) => {
    const distA = distancesBySpotId[a.id] ?? 999999;
    const distB = distancesBySpotId[b.id] ?? 999999;

    if (sortBy === 'nearest') {
      return distA - distB;
    }
    if (sortBy === 'sunTime') {
      const winA = windowsBySpotId[a.id];
      const winB = windowsBySpotId[b.id];
      const sunnyA = winA?.status === 'sunny' ? 1 : 0;
      const sunnyB = winB?.status === 'sunny' ? 1 : 0;
      if (sunnyA !== sunnyB) return sunnyB - sunnyA;
      return (winB?.minutesRemaining || 0) - (winA?.minutesRemaining || 0);
    }
    if (sortBy === 'skyView') {
      return b.skyViewFactor - a.skyViewFactor;
    }
    return 0;
  });

  const sunnyCount = spots.filter((s) => windowsBySpotId[s.id]?.status === 'sunny').length;
  const localCount = spots.filter((s) => s.isHyperLocal).length;

  return (
    <aside className="spots-sidebar" id="sidebar-sunny-spots">
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <div className="sidebar-title">
            <Sun size={20} color="#f59e0b" />
            <span>Surrounding Sunny Spots</span>
          </div>
          <span className="spots-count-badge" id="badge-sunny-count">
            {sunnyCount} in Direct Sun
          </span>
        </div>
        <p className="sidebar-subtitle">
          Hyper-local benches & open-sky clearings. Select any spot to highlight its full sun-exposed area.
        </p>

        {/* Sort selector bar */}
        <div className="sort-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            <ArrowUpDown size={12} color="#f59e0b" />
            <span>Sort:</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              id="sort-nearest"
              className={`filter-btn ${sortBy === 'nearest' ? 'active' : ''}`}
              onClick={() => setSortBy('nearest')}
              title="Sort by nearest to current GPS position"
            >
              📍 Nearest
            </button>
            <button
              id="sort-suntime"
              className={`filter-btn ${sortBy === 'sunTime' ? 'active' : ''}`}
              onClick={() => setSortBy('sunTime')}
              title="Sort by longest sun window remaining"
            >
              ☀️ Most Sun
            </button>
            <button
              id="sort-skyview"
              className={`filter-btn ${sortBy === 'skyView' ? 'active' : ''}`}
              onClick={() => setSortBy('skyView')}
              title="Sort by clear sky factor"
            >
              🌌 Clear Sky
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="filter-bar">
          <button
            id="filter-all"
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({spots.length})
          </button>
          <button
            id="filter-local"
            className={`filter-btn ${filter === 'local' ? 'active' : ''}`}
            onClick={() => setFilter('local')}
            style={{ borderColor: 'rgba(59, 130, 246, 0.4)', color: filter === 'local' ? '#fff' : '#93c5fd' }}
          >
            📍 Near Me ({localCount})
          </button>
          <button
            id="filter-sunny"
            className={`filter-btn ${filter === 'sunny' ? 'active' : ''}`}
            onClick={() => setFilter('sunny')}
          >
            ☀️ Sunlit Now ({sunnyCount})
          </button>
          <button
            id="filter-bench"
            className={`filter-btn ${filter === 'bench' ? 'active' : ''}`}
            onClick={() => setFilter('bench')}
          >
            🪑 Benches
          </button>
          <button
            id="filter-plaza"
            className={`filter-btn ${filter === 'plaza' ? 'active' : ''}`}
            onClick={() => setFilter('plaza')}
          >
            🏛️ Plazas
          </button>
        </div>
      </div>

      {/* Spots List */}
      <div className="spots-list">
        {sortedSpots.map((spot) => (
          <SpotCard
            key={spot.id}
            spot={spot}
            sunWindow={windowsBySpotId[spot.id] || { status: 'shaded', label: 'Computing...' }}
            isSelected={selectedSpot?.id === spot.id}
            distanceMeters={distancesBySpotId[spot.id]}
            activeSession={activeSession}
            onSelectSpot={onSelectSpot}
            onStartSunBath={onStartSunBath}
            onTeleportToSpot={onTeleportToSpot}
          />
        ))}

        {sortedSpots.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
            <p>No spots match the selected filter.</p>
          </div>
        )}
      </div>
    </aside>
  );
}
