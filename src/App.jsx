import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import MapComponent from './components/MapComponent';
import { SUNNY_AREAS, DEFAULT_USER_LOCATION } from './data/sunnySpotsLodz';
import { generateSurroundingSpots } from './services/localSunSpotsService';
import {
  PRESET_ROUTER_LOCATIONS,
  calculateDualRoutes
} from './services/sunPathRoutingService';
import {
  getCompassSolarPosition,
  calculateSunWindow
} from './services/solarService';
import { fetchLodzWeather, DEFAULT_WEATHER } from './services/weatherService';
import { getDistanceMeters } from './utils/geoUtils';

const HOUR_LABELS = {
  8: '08:00 (Morning)',
  9: '09:00 (Morning)',
  10: '10:00 (Mid-Morning)',
  11: '11:00 (Pre-Noon)',
  12: '12:00 (Solar Noon)',
  13: '13:00 (Lunch Peak)',
  14: '14:00 (Afternoon)',
  15: '15:00 (Golden Hour)',
  16: '16:00 (Late Afternoon)'
};

const WEEKLY_VOUCHERS = [
  {
    id: 'voucher-2h',
    requiredMinutes: 120,
    requiredLabel: '2h 00m',
    title: '-30% Warm Winter Latte',
    venue: 'Drukarz Café • Piotrkowska 102',
    code: 'LUMOS-2HR-LATTE',
    emoji: '☕'
  },
  {
    id: 'voucher-3h',
    requiredMinutes: 180,
    requiredLabel: '3h 00m',
    title: 'Free Fresh Cinnamon Roll + Tea',
    venue: 'Owoce i Warzywa • Traugutta 1',
    code: 'LUMOS-3HR-ROLL',
    emoji: '🥐'
  },
  {
    id: 'voucher-5h',
    requiredMinutes: 300,
    requiredLabel: '5h 00m',
    title: '2-for-1 Weekend Specialty Brunch',
    venue: 'Manufaktura Roastery • Drewnowska 58',
    code: 'LUMOS-5HR-BRUNCH',
    emoji: '🥞'
  }
];

function formatHoursMins(totalMins) {
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hrs}h ${String(mins).padStart(2, '0')}m`;
}

export default function App() {
  // 4 Core Screens from Wireframe 2.2:
  // 1 = Home Dashboard (No Map), 2 = Sunlight Path (Map), 3 = Sunny Spots by Time (Map), 4 = Voucher Redemption (No Map)
  const [activeScreen, setActiveScreen] = useState(1);

  // Mutually Exclusive Active Session State: 'idle' | 'path' | 'spot'
  const [sessionMode, setSessionMode] = useState('idle');
  const [sessionMinutes, setSessionMinutes] = useState(0);

  // Weekly accumulated sunlight bank (starts at 165 mins = 2h 45m, 15m away from 3h goal)
  const [bankedMinutes, setBankedMinutes] = useState(165);
  const [redeemedVoucherIds, setRedeemedVoucherIds] = useState([]);

  // Weather & Location State
  const [weather, setWeather] = useState(DEFAULT_WEATHER);
  const [userLocation, setUserLocation] = useState(DEFAULT_USER_LOCATION);

  // Screen 3 Time Scrubber State (8 to 16 hour, defaults to 13:00 Lunch Peak)
  const [scrubbedHour, setScrubbedHour] = useState(13);

  // Screen 2 Route Planner State
  const [startLocation, setStartLocation] = useState({
    id: 'current_gps',
    name: '📍 GPS',
    coordinates: DEFAULT_USER_LOCATION
  });
  const [destinationLocation, setDestinationLocation] = useState(
    PRESET_ROUTER_LOCATIONS.find((l) => l.id === 'manufaktura') || PRESET_ROUTER_LOCATIONS[2]
  );
  const [routeData, setRouteData] = useState(null);
  const [selectedRouteType, setSelectedRouteType] = useState('sunny');
  const [isEditingRoute, setIsEditingRoute] = useState(false);
  const [isPickingMapPoint, setIsPickingMapPoint] = useState(null);

  // Fetch Łódź live weather on mount
  useEffect(() => {
    fetchLodzWeather()
      .then((w) => {
        if (w) setWeather(w);
      })
      .catch(() => {});
  }, []);

  // Increment live session minutes while a Path or Spot session is active
  useEffect(() => {
    if (sessionMode === 'idle') return;
    const timer = setInterval(() => {
      setSessionMinutes((prev) => prev + 1);
    }, 15000); // +1 min every 15s for responsive live demo
    return () => clearInterval(timer);
  }, [sessionMode]);

  // Compute simulated Date for the scrubbed hour in Łódź
  const simulatedDate = useMemo(() => {
    const d = new Date();
    d.setHours(scrubbedHour, 0, 0, 0);
    return d;
  }, [scrubbedHour]);

  // Compute solar position at scrubbed hour (with reliable winter midday floor so demo is always vivid)
  const solarPos = useMemo(() => {
    const pos = getCompassSolarPosition(simulatedDate);
    if (pos.elevationDeg <= 4) {
      // Map hours 8..16 to a realistic Łódź solar arc if winter night/low sun
      const hourOffset = scrubbedHour - 12.5;
      const syntheticElev = Math.max(4, Math.round((20 - hourOffset * hourOffset * 1.1) * 10) / 10);
      const syntheticAz = Math.round(185 + hourOffset * 15);
      return {
        ...pos,
        elevationDeg: syntheticElev,
        azimuthDeg: syntheticAz
      };
    }
    return pos;
  }, [simulatedDate, scrubbedHour]);

  // All Sunny Spots in Łódź
  const allSpots = useMemo(() => {
    const localBenches = generateSurroundingSpots(userLocation, solarPos);
    return [...SUNNY_AREAS, ...localBenches];
  }, [userLocation, solarPos]);

  const [selectedSpotId, setSelectedSpotId] = useState(SUNNY_AREAS[0]?.id || 'spot-rubinstein');

  const selectedSpot = useMemo(() => {
    return allSpots.find((s) => s.id === selectedSpotId) || allSpots[0];
  }, [allSpots, selectedSpotId]);

  // Compute Sun Windows for each spot at the scrubbed hour
  const windowsBySpotId = useMemo(() => {
    const map = {};
    allSpots.forEach((spot) => {
      const baseWin = calculateSunWindow(spot, simulatedDate);
      // At hours >= 15, reflect late afternoon shadow onset
      if (scrubbedHour >= 15) {
        map[spot.id] = {
          status: 'shaded',
          minutesRemaining: 0,
          transitionTime: 'Tomorrow',
          label: '⚠️ Shaded after 14:40'
        };
      } else {
        const minsLeft = Math.max(20, (15 - scrubbedHour) * 60 - 20);
        map[spot.id] = {
          ...baseWin,
          status: 'sunny',
          minutesRemaining: minsLeft,
          label: 'Sunny until 14:40'
        };
      }
    });
    return map;
  }, [allSpots, simulatedDate, scrubbedHour]);

  const sunnySpotsCount = useMemo(() => {
    return allSpots.filter((s) => windowsBySpotId[s.id]?.status === 'sunny').length;
  }, [allSpots, windowsBySpotId]);

  // Calculate dual walking routes (Sunniest vs Shortest)
  useEffect(() => {
    if (!startLocation?.coordinates || !destinationLocation?.coordinates) return;
    let isCurrent = true;

    calculateDualRoutes(startLocation.coordinates, destinationLocation.coordinates, solarPos)
      .then((data) => {
        if (isCurrent && data) {
          setRouteData(data);
        }
      })
      .catch(() => {});

    return () => {
      isCurrent = false;
    };
  }, [startLocation, destinationLocation, solarPos.azimuthDeg, solarPos.elevationDeg]);

  // Total accumulated weekly minutes (base banked + active live session)
  const totalWeeklyMinutes = bankedMinutes + (sessionMode !== 'idle' ? sessionMinutes : 0);
  const weeklyGoalMinutes = 180; // 3h 00m weekly reference goal
  const weeklyProgressPercent = Math.min(100, Math.round((totalWeeklyMinutes / weeklyGoalMinutes) * 100));
  const minsRemainingTo3h = Math.max(0, weeklyGoalMinutes - totalWeeklyMinutes);

  const unlockedVouchersCount = WEEKLY_VOUCHERS.filter(
    (v) => totalWeeklyMinutes >= v.requiredMinutes
  ).length;

  // Mutually Exclusive Session Starters
  const startSession = (mode) => {
    if (mode === 'idle') {
      if (sessionMode !== 'idle' && sessionMinutes > 0) {
        setBankedMinutes((prev) => prev + sessionMinutes);
      }
      setSessionMode('idle');
      setSessionMinutes(0);
      return;
    }

    // Starting 'path' cancels 'spot' and vice versa; bank any previous session minutes first
    if (sessionMode !== 'idle' && sessionMode !== mode && sessionMinutes > 0) {
      setBankedMinutes((prev) => prev + sessionMinutes);
    }

    const initialMins =
      mode === 'path'
        ? routeData?.sunnyRoute?.sunMinutes || 18
        : 12;

    setSessionMode(mode);
    setSessionMinutes(initialMins);
  };

  const handleBoostSessionMinutes = (extraMins = 15) => {
    setSessionMinutes((prev) => prev + extraMins);
  };

  const handleRedeemVoucher = (voucherId) => {
    if (redeemedVoucherIds.includes(voucherId)) return;
    setRedeemedVoucherIds((prev) => [...prev, voucherId]);
    try {
      confetti({
        particleCount: 55,
        spread: 65,
        origin: { y: 0.7 }
      });
    } catch {}
  };

  const handleMapPointPicked = (coords, pointType) => {
    const customLoc = {
      id: `custom_${Date.now()}`,
      name: `Pinned [${coords[1].toFixed(3)}, ${coords[0].toFixed(3)}]`,
      coordinates: coords
    };
    if (pointType === 'start') {
      setStartLocation(customLoc);
    } else {
      setDestinationLocation(customLoc);
    }
    setIsPickingMapPoint(null);
    setIsEditingRoute(false);
  };

  const sunnyRoute = routeData?.sunnyRoute || {
    sunPercent: 78,
    walkMinutes: 22,
    totalDistanceMeters: 1400,
    sunMinutes: 18
  };
  const shortestRoute = routeData?.shortestRoute || {
    sunPercent: 44,
    walkMinutes: 18,
    totalDistanceMeters: 1200,
    sunMinutes: 8
  };
  const activeRoute = selectedRouteType === 'shortest' ? shortestRoute : sunnyRoute;

  const shortStartName = startLocation?.id === 'current_gps'
    ? 'GPS'
    : startLocation?.name?.split(' (')[0] || 'Start';
  const shortDestName = destinationLocation?.name?.split(' (')[0] || 'Manufaktura';

  const selectedSpotDistance = selectedSpot
    ? getDistanceMeters(userLocation, selectedSpot.coordinates)
    : 180;
  const isSelectedSpotSunny = windowsBySpotId[selectedSpot?.id]?.status === 'sunny';

  return (
    <div className="v22-desktop-stage">
      {/* Centered Mobile Viewport Frame */}
      <div className="v22-phone-frame">
        {/* ==================== SCREEN 1: HOME DASHBOARD (NO MAP) ==================== */}
        {activeScreen === 1 && (
          <div className="v22-screen v22-home-screen">
            <div className="v22-home-top-group">
              {/* Minimal Top Bar */}
              <header className="v22-topbar">
                <div className="v22-brand-row">
                  <span className="v22-brand-dot" />
                  <span className="v22-brand-title">LumosWalk</span>
                </div>
                <span className="v22-weather-pill">
                  📍 Łódź • {Math.round(weather.temperature || 8)}°C Clear
                </span>
              </header>

              {/* DYNAMIC LIVE SESSION BANNER (Shown ONLY when Path or Spot session is active) */}
              {sessionMode !== 'idle' && (
                <div className="v22-live-session-banner" id="home-live-session-card">
                  <div className="v22-live-banner-top">
                    <div className="v22-live-status-left">
                      <span className="v22-pulse-dot" />
                      <span className="v22-live-type-label">
                        {sessionMode === 'path' ? '🧭 Active Sunlight Path' : '🪑 Active Sunny Spot'}
                      </span>
                    </div>
                    <span className="v22-gps-verified-pill">✓ GPS Verified</span>
                  </div>

                  <div className="v22-live-banner-mid">
                    <div>
                      <div className="v22-live-session-title">
                        {sessionMode === 'path'
                          ? `${shortStartName} → ${shortDestName} (${activeRoute.sunPercent}% ☀️)`
                          : selectedSpot?.name?.split(' (')[0]}
                      </div>
                      <div className="v22-live-session-sub">Accumulating ~12,500 Lux</div>
                    </div>
                    <div className="v22-live-timer-col">
                      <div className="v22-live-timer-val">+{sessionMinutes}m</div>
                      <div className="v22-live-timer-sub">this session</div>
                    </div>
                  </div>

                  <div className="v22-live-banner-actions">
                    <button
                      type="button"
                      className="v22-btn-resume"
                      onClick={() => setActiveScreen(sessionMode === 'path' ? 2 : 3)}
                    >
                      Return to Session
                    </button>
                    <button
                      type="button"
                      className="v22-btn-end-small"
                      onClick={() => startSession('idle')}
                    >
                      End
                    </button>
                  </div>
                </div>
              )}

              {/* Weekly Sunlight Bank Summary Card */}
              <div className="v22-card v22-weekly-bank-card">
                <div className="v22-bank-row">
                  <div>
                    <span className="v22-eyebrow-amber">Weekly Sun Accumulation</span>
                    <h2 className="v22-bank-hero-val">
                      {formatHoursMins(totalWeeklyMinutes)}{' '}
                      <span className="v22-bank-goal-sub">/ 3h 00m</span>
                    </h2>
                    <p className="v22-bank-caption">
                      {minsRemainingTo3h > 0
                        ? `${minsRemainingTo3h} mins away from your 3h weekly café reward ☕`
                        : '🎉 3h weekly café reward unlocked! Ready to redeem'}
                    </p>
                  </div>
                  <div className="v22-bank-ring">
                    <span className="v22-ring-pct">{weeklyProgressPercent}%</span>
                    <span className="v22-ring-sub">Week</span>
                  </div>
                </div>
                <div className="v22-progress-track">
                  <div
                    className="v22-progress-fill"
                    style={{ width: `${weeklyProgressPercent}%` }}
                  />
                </div>
              </div>

              {/* Today's Solar Forecast Brief */}
              <div className="v22-card v22-solar-brief-card">
                <div className="v22-brief-header">
                  <span className="v22-brief-title">🌤️ Today&apos;s Solar Window</span>
                  <span className="v22-peak-pill">Peak Sun Now</span>
                </div>
                <p className="v22-brief-desc">
                  <strong>Clear sky until 14:45</strong> (~12,500 Lux). Heavy clouds arrive after 15:00.
                </p>
                <div className="v22-hourly-grid">
                  {[
                    { hour: 12, label: '12:00', sun: '☀️ 90%', active: scrubbedHour === 12, shaded: false },
                    { hour: 13, label: '13:00', sun: '☀️ 85%', active: scrubbedHour === 13, shaded: false },
                    { hour: 14, label: '14:00', sun: '🌤️ 65%', active: scrubbedHour === 14, shaded: false },
                    { hour: 15, label: '15:00', sun: '☁️ 20%', active: scrubbedHour === 15, shaded: true }
                  ].map((slot) => (
                    <button
                      key={slot.hour}
                      type="button"
                      className={`v22-hour-slot ${slot.active ? 'active' : ''} ${slot.shaded ? 'shaded' : ''}`}
                      onClick={() => {
                        setScrubbedHour(slot.hour);
                        setActiveScreen(3);
                      }}
                    >
                      <div className="v22-slot-time">{slot.label}</div>
                      <div className="v22-slot-sun">{slot.sun}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bento Grid Feature Launchers (No "Open Map" clutter) */}
            <div className="v22-bento-section">
              <div className="v22-bento-grid2">
                {/* Tile 1: Sunlight Path */}
                <button
                  type="button"
                  id="btn-launch-path"
                  className="v22-bento-tile primary"
                  onClick={() => setActiveScreen(2)}
                >
                  <div className="v22-tile-top">
                    <div className="v22-tile-icon amber">🧭</div>
                    <span className="v22-tile-badge amber">{sunnyRoute.sunPercent}% ☀️</span>
                  </div>
                  <div>
                    <div className="v22-tile-title">Sunlight Path</div>
                    <div className="v22-tile-sub">Sunniest A → B walk</div>
                  </div>
                </button>

                {/* Tile 2: Sunny Spots by Time */}
                <button
                  type="button"
                  id="btn-launch-spots"
                  className="v22-bento-tile secondary"
                  onClick={() => setActiveScreen(3)}
                >
                  <div className="v22-tile-top">
                    <div className="v22-tile-icon soft-amber">🕒</div>
                    <span className="v22-tile-badge slate">{allSpots.length} Spots</span>
                  </div>
                  <div>
                    <div className="v22-tile-title">Sunny Spots</div>
                    <div className="v22-tile-sub">Scrub any hour</div>
                  </div>
                </button>
              </div>

              {/* Tile 3: Wide Voucher Card */}
              <button
                type="button"
                id="btn-launch-vouchers"
                className="v22-bento-wide-card"
                onClick={() => setActiveScreen(4)}
              >
                <div className="v22-wide-left">
                  <div className="v22-tile-icon emerald">☕</div>
                  <div>
                    <div className="v22-tile-title">Café Voucher Perks</div>
                    <div className="v22-wide-sub">
                      {formatHoursMins(totalWeeklyMinutes)} accumulated • {unlockedVouchersCount} unlocked
                    </div>
                  </div>
                </div>
                <span className="v22-view-pill">View ›</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================== SCREEN 2: SUNLIGHT PATH (MAP + ROUTE SESSION) ==================== */}
        {activeScreen === 2 && (
          <div className="v22-screen v22-map-screen">
            {/* Floating Top Bar */}
            <div className="v22-floating-top">
              <div className="v22-top-nav-row">
                <button
                  type="button"
                  className="v22-back-home-btn"
                  onClick={() => setActiveScreen(1)}
                >
                  ← Home
                </button>
                <div
                  className="v22-route-pill-bar"
                  onClick={() => setIsEditingRoute((prev) => !prev)}
                >
                  <div className="v22-route-pill-text">
                    📍 {shortStartName} <span className="v22-arrow">→</span> 🏁 {shortDestName}
                  </div>
                  <span className="v22-edit-link">{isEditingRoute ? 'Done' : 'Edit'}</span>
                </div>
              </div>

              {/* Expandable Departure (A) & Destination (B) Picker when "Edit" is clicked */}
              {isEditingRoute && (
                <div className="v22-route-editor-card">
                  {/* Departure (A) Row */}
                  <div className="v22-editor-field-row">
                    <span className="v22-point-pill start">A</span>
                    <select
                      aria-label="Select Departure"
                      className="v22-route-select"
                      value={
                        PRESET_ROUTER_LOCATIONS.some((l) => l.id === startLocation?.id)
                          ? startLocation.id
                          : 'custom'
                      }
                      onChange={(e) => {
                        const found = PRESET_ROUTER_LOCATIONS.find((l) => l.id === e.target.value);
                        if (found) {
                          setStartLocation(
                            found.id === 'current_gps'
                              ? { ...found, coordinates: userLocation }
                              : found
                          );
                        }
                      }}
                    >
                      {!PRESET_ROUTER_LOCATIONS.some((l) => l.id === startLocation?.id) && (
                        <option value="custom">{startLocation?.name || 'Pinned Start'}</option>
                      )}
                      {PRESET_ROUTER_LOCATIONS.map((loc) => (
                        <option key={`start-${loc.id}`} value={loc.id}>
                          From: {loc.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={`v22-pin-mini-btn ${isPickingMapPoint === 'start' ? 'active' : ''}`}
                      onClick={() => {
                        setIsPickingMapPoint('start');
                        setIsEditingRoute(false);
                      }}
                      title="Tap map to set Departure (A)"
                    >
                      📌 Pin A
                    </button>
                  </div>

                  {/* Destination (B) Row */}
                  <div className="v22-editor-field-row">
                    <span className="v22-point-pill dest">B</span>
                    <select
                      aria-label="Select Destination"
                      className="v22-route-select"
                      value={
                        PRESET_ROUTER_LOCATIONS.some((l) => l.id === destinationLocation?.id)
                          ? destinationLocation.id
                          : 'custom'
                      }
                      onChange={(e) => {
                        const found = PRESET_ROUTER_LOCATIONS.find((l) => l.id === e.target.value);
                        if (found) {
                          setDestinationLocation(
                            found.id === 'current_gps'
                              ? { ...found, coordinates: userLocation }
                              : found
                          );
                        }
                      }}
                    >
                      {!PRESET_ROUTER_LOCATIONS.some((l) => l.id === destinationLocation?.id) && (
                        <option value="custom">{destinationLocation?.name || 'Pinned Destination'}</option>
                      )}
                      {PRESET_ROUTER_LOCATIONS.map((loc) => (
                        <option key={`dest-${loc.id}`} value={loc.id}>
                          To: {loc.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={`v22-pin-mini-btn ${isPickingMapPoint === 'dest' ? 'active' : ''}`}
                      onClick={() => {
                        setIsPickingMapPoint('dest');
                        setIsEditingRoute(false);
                      }}
                      title="Tap map to set Destination (B)"
                    >
                      📌 Pin B
                    </button>
                  </div>

                  {/* Quick Actions Row: Swap A ⇅ B & Close */}
                  <div className="v22-editor-footer-row">
                    <button
                      type="button"
                      className="v22-swap-route-btn"
                      onClick={() => {
                        const prevStart = startLocation;
                        setStartLocation(destinationLocation);
                        setDestinationLocation(prevStart);
                      }}
                    >
                      ⇅ Swap A &amp; B
                    </button>
                    <button
                      type="button"
                      className="v22-apply-route-btn"
                      onClick={() => setIsEditingRoute(false)}
                    >
                      Calculate Route ✓
                    </button>
                  </div>
                </div>
              )}

              {/* Active Map-Pinning Banner */}
              {isPickingMapPoint && (
                <div className="v22-map-pin-banner">
                  <span>
                    👆 Tap anywhere on the map to pin{' '}
                    <strong>{isPickingMapPoint === 'start' ? 'Departure (A)' : 'Destination (B)'}</strong>
                  </span>
                  <button
                    type="button"
                    className="v22-cancel-pin-btn"
                    onClick={() => setIsPickingMapPoint(null)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Full-Bleed Map Area (Lazy-Loaded!) */}
            <div className="v22-map-stage">
              <MapComponent
                activeMode="router"
                userLocation={userLocation}
                onSetUserLocation={setUserLocation}
                solarPos={solarPos}
                routeData={routeData}
                selectedRouteType={selectedRouteType}
                onSelectRouteType={setSelectedRouteType}
                startLocation={startLocation}
                destinationLocation={destinationLocation}
                isPickingMapPoint={isPickingMapPoint}
                onMapPointPicked={handleMapPointPicked}
              />

              {/* Floating Sunlit Route Highlight Pill */}
              <div className="v22-map-floating-tag">
                ☀️ {activeRoute.sunPercent}% Sunlit (+{activeRoute.sunMinutes}m Sun Exposure)
              </div>
            </div>

            {/* Bottom Sheet: Pre-Start Route Selection vs. Active Live Path Session */}
            <div className="v22-bottom-sheet">
              {sessionMode !== 'path' ? (
                <div id="path-prestart">
                  <div className="v22-sheet-heading">Compare Routes</div>
                  <div className="v22-route-compare-grid">
                    {/* Option 1: Sunniest */}
                    <button
                      type="button"
                      className={`v22-route-option-card sunny ${selectedRouteType === 'sunny' ? 'selected' : ''}`}
                      onClick={() => setSelectedRouteType('sunny')}
                    >
                      <div className="v22-route-opt-top">
                        <span>☀️ Sunniest</span>
                        <span>{sunnyRoute.sunPercent}%</span>
                      </div>
                      <div className="v22-route-opt-time">
                        {sunnyRoute.walkMinutes} min{' '}
                        <span className="v22-route-opt-dist">
                          {(sunnyRoute.totalDistanceMeters / 1000).toFixed(1)}km
                        </span>
                      </div>
                      <div className="v22-route-opt-bank emerald">
                        +{sunnyRoute.sunMinutes}m Sun Bank
                      </div>
                    </button>

                    {/* Option 2: Shortest */}
                    <button
                      type="button"
                      className={`v22-route-option-card shortest ${selectedRouteType === 'shortest' ? 'selected' : ''}`}
                      onClick={() => setSelectedRouteType('shortest')}
                    >
                      <div className="v22-route-opt-top muted">
                        <span>⚡ Shortest</span>
                        <span>{shortestRoute.sunPercent}%</span>
                      </div>
                      <div className="v22-route-opt-time">
                        {shortestRoute.walkMinutes} min{' '}
                        <span className="v22-route-opt-dist">
                          {(shortestRoute.totalDistanceMeters / 1000).toFixed(1)}km
                        </span>
                      </div>
                      <div className="v22-route-opt-bank slate">
                        +{shortestRoute.sunMinutes}m Sun Bank
                      </div>
                    </button>
                  </div>

                  <button
                    type="button"
                    className="v22-primary-cta-btn"
                    onClick={() => startSession('path')}
                  >
                    ☀️ Start Sunlight Path Session
                  </button>
                </div>
              ) : (
                <div id="path-active-session">
                  <div className="v22-active-session-header">
                    <span className="v22-verified-session-badge">
                      ● Live Path Session • GPS Verified
                    </span>
                    <span className="v22-lux-tag">~12,500 Lux</span>
                  </div>

                  <div className="v22-active-session-metrics">
                    <div>
                      <div className="v22-metric-label">Current Walk Exposure</div>
                      <div className="v22-metric-big">
                        +{sessionMinutes} mins{' '}
                        <span className="v22-counting-tag">counting...</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="v22-metric-label">Weekly Bank</div>
                      <div className="v22-metric-bank">
                        {formatHoursMins(totalWeeklyMinutes)}{' '}
                        {totalWeeklyMinutes >= 180 ? '🎉' : ''}
                      </div>
                    </div>
                  </div>

                  <div className="v22-sheet-actions-row">
                    <button
                      type="button"
                      className="v22-btn-light"
                      onClick={() => setActiveScreen(1)}
                    >
                      Minimize to Home
                    </button>
                    <button
                      type="button"
                      className="v22-btn-boost"
                      onClick={() => handleBoostSessionMinutes(15)}
                      title="Simulate +15 mins of sunlight exposure"
                    >
                      +15m Demo
                    </button>
                    <button
                      type="button"
                      className="v22-btn-dark"
                      onClick={() => startSession('idle')}
                    >
                      Finish Walk
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== SCREEN 3: SUNNY SPOTS BY TIME (MAP + SPOT SESSION) ==================== */}
        {activeScreen === 3 && (
          <div className="v22-screen v22-map-screen">
            {/* Floating Top Header + Time Scrubber Control */}
            <div className="v22-floating-top">
              <div className="v22-top-nav-row" style={{ justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="v22-back-home-btn"
                  onClick={() => setActiveScreen(1)}
                >
                  ← Home
                </button>
                <span className="v22-spots-count-pill">
                  ☀️ {sunnySpotsCount} Sunlit Spots
                </span>
              </div>

              {/* Floating Time Scrubber Card */}
              <div className="v22-scrubber-card">
                <div className="v22-scrubber-top">
                  <span className="v22-scrubber-title">🕒 Sunlight at Specific Time</span>
                  <span className="v22-scrubber-badge">
                    {HOUR_LABELS[scrubbedHour] || `${scrubbedHour}:00`}
                  </span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={16}
                  step={1}
                  value={scrubbedHour}
                  onChange={(e) => setScrubbedHour(Number(e.target.value))}
                  className="v22-range-input"
                />
                <div className="v22-scrubber-ticks">
                  <span>08:00</span>
                  <span>12:00 Noon</span>
                  <span>16:00</span>
                </div>
              </div>
            </div>

            {/* Full-Bleed Map with Sun Polygons */}
            <div className="v22-map-stage">
              <MapComponent
                activeMode="spots"
                spots={allSpots}
                windowsBySpotId={windowsBySpotId}
                selectedSpot={selectedSpot}
                onSelectSpot={(spot) => setSelectedSpotId(spot.id)}
                userLocation={userLocation}
                onSetUserLocation={setUserLocation}
                solarPos={solarPos}
              />
            </div>

            {/* Bottom Sheet: Pre-start Spot Info vs. Active Spot Exposure Session */}
            <div className="v22-bottom-sheet">
              {sessionMode !== 'spot' ? (
                <div id="spot-prestart">
                  {/* Quick Spot Switcher Pills */}
                  <div className="v22-spot-Horizontal-pills">
                    {allSpots.slice(0, 6).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`v22-mini-spot-pill ${selectedSpot?.id === s.id ? 'active' : ''}`}
                        onClick={() => setSelectedSpotId(s.id)}
                      >
                        {s.name.split(' (')[0]}
                      </button>
                    ))}
                  </div>

                  <div className="v22-spot-prestart-row">
                    <div>
                      <span
                        className={`v22-sun-window-tag ${isSelectedSpotSunny ? 'sunny' : 'shaded'}`}
                      >
                        {isSelectedSpotSunny
                          ? '11:15 – 14:40 Sun Window'
                          : '⚠️ Shaded after 14:40'}
                      </span>
                      <h3 className="v22-spot-sheet-title">
                        {selectedSpot?.name?.split(' (')[0] || 'Pasaż Rubinsteina Benches'}
                      </h3>
                      <p className="v22-spot-sheet-sub">
                        {selectedSpotDistance}m away • {isSelectedSpotSunny ? '~12,500 Lux' : '~1,900 Lux (Shade)'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="v22-start-soak-btn"
                      onClick={() => startSession('spot')}
                    >
                      Start Soaking
                    </button>
                  </div>
                </div>
              ) : (
                <div id="spot-active-session">
                  <div className="v22-active-session-header">
                    <span className="v22-verified-session-badge">
                      ● Soaking at {selectedSpot?.name?.split(' (')[0]}
                    </span>
                    <span className="v22-lux-tag">Sunny for 1h 40m</span>
                  </div>

                  <div className="v22-active-session-metrics">
                    <div>
                      <div className="v22-metric-label">Session Time Exposed</div>
                      <div className="v22-metric-big">+{sessionMinutes} mins</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="v22-metric-label">Weekly Bank</div>
                      <div className="v22-metric-bank">
                        {formatHoursMins(totalWeeklyMinutes)}{' '}
                        {totalWeeklyMinutes >= 180 ? '🎉' : ''}
                      </div>
                    </div>
                  </div>

                  <div className="v22-sheet-actions-row">
                    <button
                      type="button"
                      className="v22-btn-light"
                      onClick={() => setActiveScreen(1)}
                    >
                      Minimize to Home
                    </button>
                    <button
                      type="button"
                      className="v22-btn-boost"
                      onClick={() => handleBoostSessionMinutes(15)}
                      title="Simulate +15 mins of sunlight exposure"
                    >
                      +15m Demo
                    </button>
                    <button
                      type="button"
                      className="v22-btn-dark"
                      onClick={() => startSession('idle')}
                    >
                      End Session
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== SCREEN 4: PURE VOUCHER REDEMPTION & WEEKLY BANK ==================== */}
        {activeScreen === 4 && (
          <div className="v22-screen v22-voucher-screen">
            <div className="v22-voucher-topbar">
              <button
                type="button"
                className="v22-back-home-btn"
                onClick={() => setActiveScreen(1)}
              >
                ← Home
              </button>
              <span className="v22-catalog-title">Sun Rewards Catalog</span>
            </div>

            {/* ONLY Accumulated Time Exposed (No Live Timer Here!) */}
            <div className="v22-sun-bank-hero">
              <div className="v22-hero-top">
                <span className="v22-hero-eyebrow">Accumulated Sunlight Bank</span>
                <span className="v22-hero-week-pill">This Week</span>
              </div>
              <div className="v22-hero-main-val">
                <span className="v22-hero-hrs">{formatHoursMins(totalWeeklyMinutes)}</span>
                <span className="v22-hero-mins">({totalWeeklyMinutes} mins verified exposure)</span>
              </div>

              {/* Mini 7-Day Consistency Bar */}
              <div className="v22-week-days-grid">
                {[
                  { day: 'M', val: '25m', dim: false },
                  { day: 'T', val: '30m', dim: false },
                  { day: 'W', val: '20m', dim: false },
                  { day: 'T', val: '35m', dim: false },
                  { day: 'F', val: '30m', dim: false },
                  { day: 'S', val: '25m', dim: false },
                  {
                    day: 'S',
                    val: totalWeeklyMinutes > 165 ? `${totalWeeklyMinutes - 165}m` : '--',
                    dim: totalWeeklyMinutes <= 165
                  }
                ].map((d, idx) => (
                  <div key={idx} className={`v22-day-col ${d.dim ? 'dim' : ''}`}>
                    <div className="v22-day-letter">{d.day}</div>
                    <div className="v22-day-val">{d.val}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="v22-section-heading">Redeem Weekly Sunlight Vouchers</div>

            {/* Tiered Voucher Cards (2h, 3h, 5h) */}
            <div className="v22-voucher-list">
              {WEEKLY_VOUCHERS.map((v) => {
                const isUnlocked = totalWeeklyMinutes >= v.requiredMinutes;
                const isRedeemed = redeemedVoucherIds.includes(v.id);
                const minsShort = Math.max(0, v.requiredMinutes - totalWeeklyMinutes);
                const pct = Math.min(100, Math.round((totalWeeklyMinutes / v.requiredMinutes) * 100));

                return (
                  <div
                    key={v.id}
                    className={`v22-voucher-card ${isUnlocked ? 'unlocked' : 'locked'}`}
                  >
                    <div className="v22-voucher-card-top">
                      <div>
                        <span
                          className={`v22-voucher-req-badge ${
                            isUnlocked ? 'unlocked' : minsShort <= 30 ? 'near' : 'locked'
                          }`}
                        >
                          {isUnlocked
                            ? `✓ Unlocked • Requires ${v.requiredLabel}`
                            : minsShort <= 30
                            ? `Requires ${v.requiredLabel} (${minsShort}m more needed)`
                            : `Requires ${v.requiredLabel} Weekly Goal`}
                        </span>
                        <h3 className="v22-voucher-title">{v.title}</h3>
                        <p className="v22-voucher-venue">{v.venue}</p>
                      </div>
                      <span className="v22-voucher-emoji">{v.emoji}</span>
                    </div>

                    {isUnlocked ? (
                      <div className="v22-voucher-redeem-row">
                        <span className="v22-voucher-code">{v.code}</span>
                        <button
                          type="button"
                          className={`v22-redeem-btn ${isRedeemed ? 'redeemed' : ''}`}
                          onClick={() => handleRedeemVoucher(v.id)}
                        >
                          {isRedeemed ? '✓ QR Code Shown' : `Redeem (${v.requiredMinutes / 60}h)`}
                        </button>
                      </div>
                    ) : (
                      <div className="v22-voucher-progress-block">
                        <div className="v22-progress-track small">
                          <div
                            className="v22-progress-fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="v22-voucher-progress-meta">
                          <span>
                            {formatHoursMins(totalWeeklyMinutes)} / {v.requiredLabel} accumulated
                          </span>
                          <strong>{pct}%</strong>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
