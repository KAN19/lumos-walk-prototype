import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import MapComponent from './components/MapComponent';
import { SUNNY_AREAS, DEFAULT_USER_LOCATION, LODZ_CENTER } from './data/sunnySpotsLodz';
import { generateSurroundingSpots } from './services/localSunSpotsService';
import {
  PRESET_ROUTER_LOCATIONS,
  calculateDualRoutes
} from './services/sunPathRoutingService';
import {
  getCompassSolarPosition,
  calculateSunWindow,
  getLodzDateTime,
  getLodzCurrentTimeParts
} from './services/solarService';
import {
  VERIFIED_REAL_OSM_BUILDINGS,
  VERIFIED_REAL_OSM_SIDEWALKS,
  PILOT_ZONES,
  PILOT_ZONES_STATS,
  fetchLiveOsmSpatialData,
  inspectPointSolarShadow,
  inspectPointSolarShadowLive
} from './services/osmShadowService';
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
  16: '16:00 (Shaded)'
};

// Maximum allowed detour for sunniest walking path (1.20 = max +20% extra walk)
export const DEFAULT_MAX_DETOUR_RATIO = 1.20;

const WEEKLY_VOUCHERS = [
  {
    id: 'voucher-1h',
    requiredMinutes: 60,
    requiredLabel: '1h 00m',
    title: 'Free Classic Hot Dog or Hot Drink',
    venue: 'Żabka Café • Over 120 stores across Łódź',
    code: 'ZABKA-1HR-HOTDOG',
    emoji: '🌭',
    partner: 'Żabka'
  },
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
    id: 'voucher-3h30',
    requiredMinutes: 210,
    requiredLabel: '3h 30m',
    title: 'Free Wycisk Juice + Protein Snack',
    venue: 'Żabka Nano & Żabka • Piotrkowska / Manufaktura',
    code: 'ZABKA-WYCISK-SNACK',
    emoji: '🧃',
    partner: 'Żabka'
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
  // 4 Core Screens from Wireframe 2.2 + 1 Hidden Debug Screen (Screen 5):
  // 1 = Home Dashboard (No Map)
  // 2 = Sunlight Path (Map)
  // 3 = Sunny Spots by Time (Map: Step 1 Neighborhood Overview -> Step 2 Whole-Area Footprint)
  // 4 = Voucher Redemption (No Map)
  // 5 = Hidden Debug Screen (Street Point Raycast & Building/Tree Shadow Inspector)
  const [activeScreen, setActiveScreen] = useState(1);
  const [brandTapCount, setBrandTapCount] = useState(0);

  // Splash Screen & User Name Onboarding State
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const [userName, setUserName] = useState(() => {
    try {
      return localStorage.getItem('lumos_user_name') || '';
    } catch {
      return '';
    }
  });
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [nameInput, setNameInput] = useState(() => {
    try {
      return localStorage.getItem('lumos_user_name') || '';
    } catch {
      return '';
    }
  });

  // Mutually Exclusive Active Session State: 'idle' | 'path' | 'spot'
  const [sessionMode, setSessionMode] = useState('idle');
  const [sessionMinutes, setSessionMinutes] = useState(0);

  // Weekly accumulated sunlight bank (starts at 165 mins = 2h 45m, 15m away from 3h goal)
  const [bankedMinutes, setBankedMinutes] = useState(165);
  const [redeemedVoucherIds, setRedeemedVoucherIds] = useState([]);

  // Live Clock & Weather State
  const [liveClock, setLiveClock] = useState(() => new Date());
  const [weather, setWeather] = useState(DEFAULT_WEATHER);

  // Real GPS State & User Location
  const [userLocation, setUserLocation] = useState(DEFAULT_USER_LOCATION);
  const [gpsState, setGpsState] = useState({
    status: 'idle', // 'locating' | 'active' | 'fallback'
    hardwareCoords: null,
    accuracyMeters: null,
    isInsideLodz: false
  });
  const [gpsToastMessage, setGpsToastMessage] = useState(null);
  const [gpsRecenterTrigger, setGpsRecenterTrigger] = useState(0);
  const [lodzCenterNavTrigger, setLodzCenterNavTrigger] = useState(0);

  // Live OSM 3D Buildings, Trees & Sidewalks (for Raycasting & Debug Screen)
  const [osmSpatialData, setOsmSpatialData] = useState({
    buildings: VERIFIED_REAL_OSM_BUILDINGS,
    sidewalks: VERIFIED_REAL_OSM_SIDEWALKS,
    source: 'verified-cache'
  });

  // Screen 3 (Sunny Spots by Time) State
  const [scrubbedHour, setScrubbedHour] = useState(13);
  const [viewingSpotArea, setViewingSpotArea] = useState(null); // null = Neighborhood Overview, spot = Whole-Area View
  const [isSpotsDrawerExpanded, setIsSpotsDrawerExpanded] = useState(false);

  // Screen 2 (Sunlight Path) State
  const [startLocation, setStartLocation] = useState({
    id: 'current_gps',
    name: 'My Current Location',
    coordinates: DEFAULT_USER_LOCATION
  });
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [selectedRouteType, setSelectedRouteType] = useState('sunny');
  const [isEditingRoute, setIsEditingRoute] = useState(false);
  const [isPickingMapPoint, setIsPickingMapPoint] = useState(null);
  const [showRouter3dMap, setShowRouter3dMap] = useState(false); // ON/OFF toggle for 2.5D/3D buildings & trees on Sunlight Path
  const [showSpots3dMap, setShowSpots3dMap] = useState(false); // ON/OFF toggle for 2.5D/3D buildings & trees on Sunny Spots
  const [mapCurrentZoom, setMapCurrentZoom] = useState(14.3);
  const is3dAllowedAtCurrentZoom = mapCurrentZoom >= 14.5;
  const [show3dDisabledToast, setShow3dDisabledToast] = useState(false);

  // When user zooms out (< 14.5), turn off 3D mode.
  // When user zooms in (>= 14.5), do NOT auto-switch to 3D; keep 2D and only enable the button!
  const handleMapZoomChange = useCallback((newZoom) => {
    setMapCurrentZoom(newZoom);
    if (newZoom < 14.5) {
      setShowRouter3dMap(false);
      setShowSpots3dMap(false);
      setShowDebug3dMap(false);
    }
  }, []);

  // Screen 2 (Sunlight Path) Solar Time Selection State
  const [routeTimeHour, setRouteTimeHour] = useState(12);
  const [routeTimeIsNow, setRouteTimeIsNow] = useState(true);
  const [appliedRouteTime, setAppliedRouteTime] = useState({ isNow: true, hour: 12 });
  // Configurable internal detour tolerance (default +20% extra walk)
  const [maxDetourRatio] = useState(DEFAULT_MAX_DETOUR_RATIO);

  // Screen 5 (Hidden Debug Street Raycast Tool) State
  const [debugTimeMode, setDebugTimeMode] = useState('live'); // 'live' | 'custom'
  const [debugCustomHour, setDebugCustomHour] = useState(13);
  const [debugHoverCoord, setDebugHoverCoord] = useState(DEFAULT_USER_LOCATION);
  const [debugInspectedPoint, setDebugInspectedPoint] = useState([19.4574, 51.7678]);
  const [activePilotZoneId, setActivePilotZoneId] = useState('zone-1-piotrkowska');
  const [debugFocusCoord, setDebugFocusCoord] = useState(null);
  const [showDebug3dMap, setShowDebug3dMap] = useState(false); // OFF by default; user must choose to turn it on

  // Show temporary GPS toast
  const triggerGpsToast = useCallback((msg) => {
    setGpsToastMessage(msg);
    setTimeout(() => {
      setGpsToastMessage(null);
    }, 2200);
  }, []);

  // Real Browser Geolocation Handler (`navigator.geolocation`)
  const requestRealGps = useCallback((showToast = false) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsState((prev) => ({ ...prev, status: 'fallback' }));
      if (showToast) {
        setGpsRecenterTrigger((n) => n + 1);
        triggerGpsToast('📍 Centered on your GPS area');
      }
      return;
    }

    setGpsState((prev) => ({ ...prev, status: 'locating' }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const hwCoords = [pos.coords.longitude, pos.coords.latitude];
        const distFromLodz = getDistanceMeters(hwCoords, [LODZ_CENTER.lng, LODZ_CENTER.lat]);
        const isInsideLodz = distFromLodz < 25000; // within 25km of Łódź

        setGpsState({
          status: 'active',
          hardwareCoords: hwCoords,
          accuracyMeters: Math.round(pos.coords.accuracy || 12),
          isInsideLodz
        });

        // If user is physically in Łódź, use their exact hardware GPS coordinates;
        // otherwise keep map in Łódź so Łódź streets/spots work seamlessly while recording hardware GPS
        const activeCoord = isInsideLodz ? hwCoords : DEFAULT_USER_LOCATION;
        setUserLocation(activeCoord);
        setStartLocation((prev) =>
          prev?.id === 'current_gps' ? { ...prev, coordinates: activeCoord } : prev
        );

        if (showToast) {
          setGpsRecenterTrigger((n) => n + 1);
          triggerGpsToast(
            isInsideLodz
              ? `📍 Live GPS locked (±${Math.round(pos.coords.accuracy || 10)}m)`
              : '📍 Centered on your Łódź GPS area'
          );
        }
      },
      () => {
        setGpsState((prev) => ({ ...prev, status: 'fallback' }));
        if (showToast) {
          setGpsRecenterTrigger((n) => n + 1);
          triggerGpsToast('📍 Centered on your GPS area');
        }
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 15000 }
    );
  }, [triggerGpsToast]);

  // Initialize Real GPS watch + Live Clock + Weather + Live Overpass OSM data (Buildings + Trees + Sidewalks)
  useEffect(() => {
    requestRealGps(false);

    let watchId = null;
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const hwCoords = [pos.coords.longitude, pos.coords.latitude];
          const distFromLodz = getDistanceMeters(hwCoords, [LODZ_CENTER.lng, LODZ_CENTER.lat]);
          const isInsideLodz = distFromLodz < 25000;
          setGpsState({
            status: 'active',
            hardwareCoords: hwCoords,
            accuracyMeters: Math.round(pos.coords.accuracy || 12),
            isInsideLodz
          });
          if (isInsideLodz) {
            setUserLocation(hwCoords);
          }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 20000 }
      );
    }

    const clockInterval = setInterval(() => {
      setLiveClock(new Date());
    }, 30000);

    fetchLodzWeather()
      .then((w) => {
        if (w) setWeather(w);
      })
      .catch(() => {});

    fetchLiveOsmSpatialData(DEFAULT_USER_LOCATION, 400)
      .then((data) => {
        if (data && data.buildings && data.buildings.length > 0) {
          setOsmSpatialData((prev) => {
            const existingIds = new Set(prev.buildings.map((b) => b.id));
            const newBldgs = data.buildings.filter((b) => !existingIds.has(b.id));
            if (newBldgs.length === 0) return prev;
            return {
              ...prev,
              buildings: [...prev.buildings, ...newBldgs]
            };
          });
        }
      })
      .catch(() => {});

    return () => {
      if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      clearInterval(clockInterval);
    };
  }, [requestRealGps]);

  // Keyboard shortcut Shift + D to toggle Hidden Debug Screen (Screen 5)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        setActiveScreen((prev) => (prev === 5 ? 1 : 5));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync startLocation when user drags GPS marker
  const handleUpdateUserLocation = useCallback((newCoords) => {
    setUserLocation(newCoords);
    setStartLocation((prev) =>
      prev?.id === 'current_gps' ? { ...prev, coordinates: newCoords } : prev
    );
  }, []);

  // Increment live session minutes while a Path or Spot session is active
  useEffect(() => {
    if (sessionMode === 'idle') return;
    const timer = setInterval(() => {
      setSessionMinutes((prev) => prev + 1);
    }, 15000);
    return () => clearInterval(timer);
  }, [sessionMode]);

  // Splash Screen Timer on Page Load / Reload:
  // Shows animated splash for 1.3s, fades out over 300ms, then prompts for name if not set yet
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setSplashFading(true);
    }, 1300);

    const finishTimer = setTimeout(() => {
      setShowSplash(false);
      setSplashFading(false);
      if (!userName || !userName.trim()) {
        setIsOnboarding(true);
      }
    }, 1600);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [userName]);

  const handleSaveName = (e) => {
    if (e) e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    try {
      localStorage.setItem('lumos_user_name', trimmed);
    } catch {}
    setUserName(trimmed);
    setIsOnboarding(false);
  };

  // Dynamic Greeting based on current local hour in Łódź
  const greetingWord = useMemo(() => {
    const { hour } = getLodzCurrentTimeParts(liveClock);
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, [liveClock]);

  // 1. LIVE Real-Time Solar Position in Łódź (Used by Screen 1 by default)
  const liveSolarPos = useMemo(() => {
    return getCompassSolarPosition(liveClock, userLocation[1], userLocation[0]);
  }, [liveClock, userLocation]);

  // Solar Position used on Screen 2 (Sunlight Path):
  // Uses real-time current clock in Łódź by default, or the specific departure time chosen by the user in Europe/Warsaw timezone
  const routeSolarPos = useMemo(() => {
    if (appliedRouteTime.isNow) {
      return {
        ...liveSolarPos,
        datetime: liveClock.toISOString()
      };
    }
    const lodzDt = getLodzDateTime(appliedRouteTime.hour, 0);
    const pos = getCompassSolarPosition(lodzDt.date, userLocation[1], userLocation[0]);
    return {
      ...pos,
      datetime: lodzDt.isoString
    };
  }, [appliedRouteTime, liveSolarPos, liveClock, userLocation]);

  // 2. Scrubbed Time Solar Position (Used by Screen 3: "Sunny Spots at Specific Time")
  const scrubbedDate = useMemo(() => {
    return getLodzDateTime(scrubbedHour, 0).date;
  }, [scrubbedHour]);

  const scrubbedSolarPos = useMemo(() => {
    const lodzDt = getLodzDateTime(scrubbedHour, 0);
    const pos = getCompassSolarPosition(lodzDt.date, userLocation[1], userLocation[0]);
    return {
      ...pos,
      datetime: lodzDt.isoString
    };
  }, [scrubbedDate, scrubbedHour, userLocation]);

  // 3. Debug Screen Solar Position (Live Clock vs Custom Debug Hour)
  const debugSolarPos = useMemo(() => {
    if (debugTimeMode === 'live') {
      return liveSolarPos;
    }
    const d = new Date();
    d.setHours(debugCustomHour, 0, 0, 0);
    const pos = getCompassSolarPosition(d, userLocation[1], userLocation[0]);
    if (pos.elevationDeg <= 0 && debugCustomHour >= 8 && debugCustomHour <= 16) {
      const hourOffset = debugCustomHour - 12.5;
      return {
        ...pos,
        elevationDeg: Math.max(5, Math.round((20 - hourOffset * hourOffset * 1.1) * 10) / 10),
        azimuthDeg: Math.round(185 + hourOffset * 15)
      };
    }
    return pos;
  }, [debugTimeMode, debugCustomHour, liveSolarPos, userLocation]);

  // Real-Time Raycast Inspection Result for the Hidden Debug Screen (Checks Buildings AND Trees across Greater Łódź)
  const [debugInspectionResult, setDebugInspectionResult] = useState(null);

  useEffect(() => {
    if (!debugInspectedPoint) {
      setDebugInspectionResult(null);
      return;
    }

    let isMounted = true;

    // 1. Instant optimistic evaluation using current in-memory dataset
    const localResult = inspectPointSolarShadow(
      debugInspectedPoint,
      debugSolarPos,
      osmSpatialData.buildings,
      osmSpatialData.sidewalks
    );
    if (localResult && !localResult.isSunny) {
      setDebugInspectionResult(localResult);
    }

    // 2. Query backend 3D spatial engine (checks all 301,683 citywide obstacles in ~8ms)
    inspectPointSolarShadowLive(
      debugInspectedPoint,
      debugSolarPos,
      osmSpatialData.buildings,
      osmSpatialData.sidewalks
    ).then((liveRes) => {
      if (isMounted && liveRes) {
        setDebugInspectionResult(liveRes);
      }
    });

    // 3. Dynamically fetch and merge local obstacles around clicked point (500m radius)
    fetchLiveOsmSpatialData(debugInspectedPoint, 500).then((data) => {
      if (isMounted && data && data.buildings && data.buildings.length > 0) {
        setOsmSpatialData((prev) => {
          const existingIds = new Set(prev.buildings.map((b) => b.id));
          const newBldgs = data.buildings.filter((b) => !existingIds.has(b.id));
          if (newBldgs.length === 0) return prev;
          return {
            ...prev,
            buildings: [...prev.buildings, ...newBldgs]
          };
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [debugInspectedPoint, debugSolarPos]);

  // All Sunny Spots in Łódź sorted by distance from User's GPS (Nearest First!)
  // Enforces a minimum 140m spatial separation between spots to eliminate overlapping/colliding pins
  const sortedSpots = useMemo(() => {
    const localBenches = generateSurroundingSpots(userLocation, scrubbedSolarPos);
    const deduped = [];

    // Prioritize curated major areas first, then add local benches only if they are >= 140m away
    for (const spot of [...SUNNY_AREAS, ...localBenches]) {
      const isDuplicateOrTooClose = deduped.some((existing) => {
        if (existing.id === spot.id) return true;
        const d = getDistanceMeters(existing.coordinates, spot.coordinates);
        return d < 140; // 140m minimum spacing prevents pin overlap and visual collisions
      });
      if (!isDuplicateOrTooClose) {
        deduped.push(spot);
      }
    }

    return deduped
      .map((s) => ({
        ...s,
        distanceMeters: Math.round(getDistanceMeters(userLocation, s.coordinates))
      }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [userLocation, scrubbedSolarPos]);

  const [selectedSpotId, setSelectedSpotId] = useState(SUNNY_AREAS[0]?.id || 'spot-rubinstein');

  const activeSpotForSession = useMemo(() => {
    if (viewingSpotArea) return viewingSpotArea;
    return sortedSpots.find((s) => s.id === selectedSpotId) || sortedSpots[0];
  }, [viewingSpotArea, sortedSpots, selectedSpotId]);

  // Compute Sun Windows for each spot at the scrubbed hour on Screen 3
  const windowsBySpotId = useMemo(() => {
    const map = {};
    sortedSpots.forEach((spot) => {
      const baseWin = calculateSunWindow(spot, scrubbedDate);
      if (scrubbedHour >= 16) {
        map[spot.id] = {
          status: 'shaded',
          minutesRemaining: 0,
          transitionTime: 'Tomorrow',
          windowRange: '11:15–14:40',
          label: '⚠️ Enters building shade after 14:40'
        };
      } else {
        const minsLeft = Math.max(20, (15 - scrubbedHour) * 60 + 40);
        map[spot.id] = {
          ...baseWin,
          status: 'sunny',
          minutesRemaining: minsLeft,
          windowRange: spot.sunWindowLabel || '11:15–14:40',
          label: 'Sunny until 14:40'
        };
      }
    });
    return map;
  }, [sortedSpots, scrubbedDate, scrubbedHour]);

  const sunnySpotsCount = useMemo(() => {
    return sortedSpots.filter((s) => windowsBySpotId[s.id]?.status === 'sunny').length;
  }, [sortedSpots, windowsBySpotId]);

  // Calculate dual walking routes (Sunniest vs Shortest) with live loading indicator
  const executeRouteCalculation = useCallback(
    async (
      start = startLocation,
      dest = destinationLocation,
      solar = routeSolarPos,
      detour = maxDetourRatio
    ) => {
      if (!start?.coordinates || !dest?.coordinates) return;
      setIsCalculatingRoute(true);
      try {
        const data = await calculateDualRoutes(
          start.coordinates,
          dest.coordinates,
          solar,
          osmSpatialData.buildings,
          osmSpatialData.sidewalks,
          detour
        );
        if (data) {
          setRouteData(data);
        }
      } catch (err) {
        console.warn('Route calculation error:', err);
      } finally {
        setIsCalculatingRoute(false);
      }
    },
    [startLocation, destinationLocation, routeSolarPos, osmSpatialData, maxDetourRatio]
  );

  // Total accumulated weekly minutes (base banked + active live session)
  const totalWeeklyMinutes = bankedMinutes + (sessionMode !== 'idle' ? sessionMinutes : 0);
  const weeklyGoalMinutes = 180; // 3h 00m weekly reference goal
  const weeklyProgressPercent = Math.min(
    100,
    Math.round((totalWeeklyMinutes / weeklyGoalMinutes) * 100)
  );
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

    if (sessionMode !== 'idle' && sessionMode !== mode && sessionMinutes > 0) {
      setBankedMinutes((prev) => prev + sessionMinutes);
    }

    const initialMins =
      mode === 'path'
        ? Math.max(0, routeData?.sunnyRoute?.sunMinutes ?? 0)
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

  // Helper to compute solar position for a specific hour/now setting in Europe/Warsaw timezone
  const getSolarForRouteHour = useCallback(
    (isNow, hour) => {
      if (isNow) return liveSolarPos;
      const lodzDt = getLodzDateTime(hour, 0);
      const pos = getCompassSolarPosition(lodzDt.date, userLocation[1], userLocation[0]);
      return {
        ...pos,
        datetime: lodzDt.isoString
      };
    },
    [liveSolarPos, userLocation]
  );

  // Directly load route when user pins a location (start or destination) on map — no need to click Calculate Route!
  const handleMapPointPicked = (coords, pointType) => {
    const customLoc = {
      id: `custom_${Date.now()}`,
      name: `Pinned [${coords[1].toFixed(3)}, ${coords[0].toFixed(3)}]`,
      coordinates: coords
    };

    let targetStart = startLocation;
    let targetDest = destinationLocation;

    if (pointType === 'start') {
      targetStart = customLoc;
      setStartLocation(customLoc);
      if (!targetDest?.coordinates) {
        targetDest =
          PRESET_ROUTER_LOCATIONS.find((l) => l.id === 'manufaktura') ||
          PRESET_ROUTER_LOCATIONS[2];
        setDestinationLocation(targetDest);
      }
    } else {
      targetDest = customLoc;
      setDestinationLocation(customLoc);
      if (!targetStart?.coordinates) {
        targetStart = {
          id: 'current_gps',
          name: 'My Current Location',
          coordinates: userLocation
        };
        setStartLocation(targetStart);
      }
    }

    setIsPickingMapPoint(null);
    setIsEditingRoute(false);

    setAppliedRouteTime({
      isNow: routeTimeIsNow,
      hour: routeTimeHour
    });

    const solarForRoute = getSolarForRouteHour(routeTimeIsNow, routeTimeHour);

    // Direct routing execution on map pin — no need to click Calculate Route!
    executeRouteCalculation(targetStart, targetDest, solarForRoute, maxDetourRatio);
  };

  // Step 1 -> Step 2 on Screen 3 (Sunny Spots): Click a spot to zoom into its Whole Sunlit Area Footprint
  const handleSelectSpotArea = (spot) => {
    setSelectedSpotId(spot.id);
    setViewingSpotArea(spot);
  };

  const handleBackToNearbySpotsList = () => {
    setViewingSpotArea(null);
  };

  // Clicking outside a chosen spot on the map unselects it
  const handleDeselectSpot = useCallback(() => {
    setViewingSpotArea(null);
    setSelectedSpotId(null);
  }, []);

  const handleLocateUserOnSpotsMap = () => {
    setViewingSpotArea(null);
    requestRealGps(true);
  };

  // Launch Sunlight Path: clear previous route unless user is on an active walking session,
  // and navigate camera directly to the center of Łódź
  const handleLaunchSunlightPath = () => {
    if (sessionMode !== 'path') {
      setRouteData(null);
      setDestinationLocation(null);
      setIsEditingRoute(true);
      setStartLocation((prev) =>
        prev?.id === 'current_gps'
          ? { ...prev, coordinates: userLocation }
          : { id: 'current_gps', name: 'My Current Location', coordinates: userLocation }
      );
    }
    setLodzCenterNavTrigger((prev) => prev + 1);
    setActiveScreen(2);
  };

  // Launch Sunny Spots: unselect any previous spot and navigate directly to the center of Łódź
  const handleLaunchSunnySpots = (hour = null) => {
    if (hour !== null) {
      setScrubbedHour(hour);
    }
    setViewingSpotArea(null);
    setSelectedSpotId(null);
    setLodzCenterNavTrigger((prev) => prev + 1);
    setActiveScreen(3);
  };

  // Calculate Route button handler: triggers only when user clicks this button
  // after choosing locations in dropdown selection box or adjusting sunlight time
  const handleCalculateRoute = () => {
    let targetDest = destinationLocation;
    if (!targetDest?.coordinates) {
      targetDest =
        PRESET_ROUTER_LOCATIONS.find((l) => l.id === 'manufaktura') ||
        PRESET_ROUTER_LOCATIONS[2];
      setDestinationLocation(targetDest);
    }

    let targetStart = startLocation;
    if (!targetStart?.coordinates) {
      targetStart = {
        id: 'current_gps',
        name: 'My Current Location',
        coordinates: userLocation
      };
      setStartLocation(targetStart);
    }

    setAppliedRouteTime({
      isNow: routeTimeIsNow,
      hour: routeTimeHour
    });

    const solarForRoute = getSolarForRouteHour(routeTimeIsNow, routeTimeHour);

    setIsEditingRoute(false);
    executeRouteCalculation(targetStart, targetDest, solarForRoute, maxDetourRatio);
  };

  const handleSelectQuickDestination = (loc) => {
    setDestinationLocation(loc);
    setIsEditingRoute(false);
    setAppliedRouteTime({
      isNow: routeTimeIsNow,
      hour: routeTimeHour
    });
    const solarForRoute = getSolarForRouteHour(routeTimeIsNow, routeTimeHour);
    executeRouteCalculation(startLocation, loc, solarForRoute, maxDetourRatio);
  };

  // Hidden Debug Screen trigger: tap brand header 3 times
  const handleBrandHeaderTap = () => {
    setBrandTapCount((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        setActiveScreen(5);
        return 0;
      }
      return next;
    });
  };

  const sunnyRoute = routeData?.sunnyRoute || {
    sunPercent: liveSolarPos.elevationDeg <= 0 ? 0 : 78,
    walkMinutes: 18,
    totalDistanceMeters: 1200,
    sunMinutes: liveSolarPos.elevationDeg <= 0 ? 0 : 14,
    isNighttime: liveSolarPos.elevationDeg <= 0,
    isSameAsShortest: liveSolarPos.elevationDeg <= 0
  };
  const shortestRoute = routeData?.shortestRoute || {
    sunPercent: liveSolarPos.elevationDeg <= 0 ? 0 : 44,
    walkMinutes: 18,
    totalDistanceMeters: 1200,
    sunMinutes: liveSolarPos.elevationDeg <= 0 ? 0 : 8,
    isNighttime: liveSolarPos.elevationDeg <= 0
  };
  const activeRoute = selectedRouteType === 'shortest' ? shortestRoute : sunnyRoute;
  const routeDetourPercent = routeData?.comparison?.detourPercent || 0;

  const shortStartName =
    startLocation?.id === 'current_gps'
      ? 'GPS'
      : startLocation?.name?.split(' (')[0] || 'Start';
  const shortDestName =
    destinationLocation?.name?.split(' (')[0] || (isEditingRoute ? 'Select Destination' : 'Destination');

  const nearestSpot = sortedSpots[0];
  const moreNearbySpots = sortedSpots.slice(1, 7);
  const viewingSpotDistance = viewingSpotArea
    ? Math.round(getDistanceMeters(userLocation, viewingSpotArea.coordinates))
    : nearestSpot?.distanceMeters || 180;
  const isViewingSpotSunny = viewingSpotArea
    ? windowsBySpotId[viewingSpotArea.id]?.status === 'sunny'
    : true;

  const totalTreeCount = osmSpatialData.buildings.filter((b) => b.type === 'tree').length;
  const totalBldgCount = osmSpatialData.buildings.filter((b) => b.type !== 'tree').length;

  return (
    <div className="v22-desktop-stage">
      {/* Subtle Hidden Debug Tool Trigger outside the mobile frame (or tap Brand Dot 3x / Shift+D) */}
      <button
        type="button"
        className="v22-hidden-debug-trigger"
        onClick={() => setActiveScreen((prev) => (prev === 5 ? 1 : 5))}
        title="Open Hidden Street Raycast Debug Tool (Shift+D)"
      >
        🛠️ {activeScreen === 5 ? 'Exit Debug' : 'Debug Raycast'}
      </button>

      {/* Centered Mobile Viewport Frame */}
      <div className="v22-phone-frame">
        {/* ==================== SPLASH SCREEN (ON RELOAD / FIRST ENTER) ==================== */}
        {showSplash && (
          <div className={`v22-splash-screen ${splashFading ? 'fade-out' : ''}`}>
            <div className="v22-splash-content">
              <div className="v22-splash-sun-wrap">
                <div className="v22-splash-sun-glow" />
                <div className="v22-splash-sun-icon">☀️</div>
              </div>

              <div className="v22-splash-text-group">
                <h1 className="v22-splash-brand-title">LumosWalk</h1>
                <p className="v22-splash-brand-sub">Winter Sunlight Navigator</p>
                <span className="v22-splash-brand-city">Łódź • Poland</span>
              </div>

              <div className="v22-splash-footer">
                <div className="v22-splash-spinner-dots">
                  <span className="v22-splash-dot" />
                  <span className="v22-splash-dot" />
                  <span className="v22-splash-dot" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== ONBOARDING: USER NAME ENTRY SCREEN ==================== */}
        {isOnboarding ? (
          <div className="v22-screen v22-onboarding-screen">
            <div className="v22-onboarding-inner">
              <div className="v22-onboarding-hero">
                <div className="v22-onboarding-sun-wrap">
                  <span className="v22-onboarding-sun-emoji">☀️</span>
                </div>
                <h1 className="v22-onboarding-headline">Welcome to LumosWalk</h1>
                <p className="v22-onboarding-description">
                  Discover the warmest sunlit sidewalks, benches, and reward cafes in Łódź.
                </p>
              </div>

              <form onSubmit={handleSaveName} className="v22-onboarding-card">
                <label htmlFor="v22-user-name-input" className="v22-onboarding-field-label">
                  What should we call you?
                </label>
                <div className="v22-onboarding-input-wrap">
                  <input
                    id="v22-user-name-input"
                    type="text"
                    className="v22-onboarding-input"
                    placeholder="Enter your name (e.g., Kiet)"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    autoFocus
                    maxLength={32}
                  />
                </div>

                <button
                  type="submit"
                  className="v22-primary-cta-btn v22-onboarding-btn"
                  disabled={!nameInput.trim()}
                >
                  Continue
                </button>

                {userName && (
                  <button
                    type="button"
                    className="v22-btn-light v22-onboarding-cancel"
                    onClick={() => {
                      setNameInput(userName);
                      setIsOnboarding(false);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </form>
            </div>
          </div>
        ) : (
          <>
            {/* ==================== SCREEN 1: HOME DASHBOARD (NO MAP) ==================== */}
            {activeScreen === 1 && (
              <div className="v22-screen v22-home-screen">
                <div className="v22-home-top-group">
                  {/* Minimal Top Bar (Tap Brand 3x to open Hidden Debug Screen) */}
                  <header className="v22-topbar">
                    <div
                      className="v22-brand-row"
                      onClick={handleBrandHeaderTap}
                      style={{ cursor: 'pointer' }}
                      title="LumosWalk (Tap 3x for Street Raycast Debugger)"
                    >
                      <span className="v22-brand-dot" />
                      <span className="v22-brand-title">LumosWalk</span>
                    </div>
                    <button
                      type="button"
                      className="v22-weather-pill"
                      onClick={() => requestRealGps(true)}
                      title="Tap to refresh Real GPS"
                    >
                      📍 Łódź • {Math.round(weather.temperature || 8)}°C{' '}
                      {liveSolarPos.elevationDeg <= 0 ? '🌙 Night' : '☀️ Clear'}
                    </button>
                  </header>

                  {/* Personalized User Greeting Header */}
                  <div className="v22-user-greeting-card">
                    <div className="v22-greeting-main">
                      <span className="v22-greeting-period">{greetingWord},</span>
                      <h1 className="v22-greeting-name">{userName || 'Kiet'}</h1>
                    </div>
                    <button
                      type="button"
                      className="v22-user-avatar-btn"
                      onClick={() => {
                        setNameInput(userName || '');
                        setIsOnboarding(true);
                      }}
                      title="Change your name"
                    >
                      <span className="v22-avatar-letter">
                        {(userName || 'Kiet').trim().charAt(0).toUpperCase()}
                      </span>
                    </button>
                  </div>

              {/* DYNAMIC LIVE SESSION BANNER (Shown ONLY when Path or Spot session is active) */}
              {sessionMode !== 'idle' && (
                <div className="v22-live-session-banner" id="home-live-session-card">
                  <div className="v22-live-banner-top">
                    <div className="v22-live-status-left">
                      <span className="v22-pulse-dot" />
                      <span className="v22-live-type-label">
                        {sessionMode === 'path'
                          ? 'Active Sunlight Path'
                          : 'Active Sunny Spot'}
                      </span>
                    </div>
                    <span className="v22-gps-verified-pill">GPS Verified</span>
                  </div>

                  <div className="v22-live-banner-mid">
                    <div className="v22-live-info-col">
                      <div className="v22-live-session-title">
                        {sessionMode === 'path'
                          ? `${shortStartName} → ${shortDestName}`
                          : `${activeSpotForSession?.name?.split(' (')[0] || 'Pasaż Rubinsteina'}`}
                      </div>
                      <div className="v22-live-session-sub">
                        {liveSolarPos.elevationDeg <= 0 && sessionMode === 'path'
                          ? 'Nighttime walk in progress'
                          : sessionMode === 'path'
                            ? `${sunnyRoute.sunPercent}% direct sunlight`
                            : 'Sun exposure in progress'}
                      </div>
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
                  <span className="v22-peak-pill">
                    {liveSolarPos.elevationDeg <= 0
                      ? `🌙 Night (${liveSolarPos.elevationDeg}°)`
                      : `☀️ Elev ${liveSolarPos.elevationDeg}°`}
                  </span>
                </div>
                <p className="v22-brief-desc">
                  <strong>Clear sky window 11:00–14:45</strong> (~12,500 Lux). Tap any hour to inspect sunlit areas:
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
                      onClick={() => handleLaunchSunnySpots(slot.hour)}
                    >
                      <div className="v22-slot-time">{slot.label}</div>
                      <div className="v22-slot-sun">{slot.sun}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bento Grid Feature Launchers */}
            <div className="v22-bento-section">
              <div className="v22-bento-grid2">
                {/* Tile 1: Sunlight Path */}
                <button
                  type="button"
                  id="btn-launch-path"
                  className="v22-bento-tile primary"
                  onClick={handleLaunchSunlightPath}
                >
                  <div className="v22-tile-top">
                    <div className="v22-tile-icon amber">🧭</div>
                    <span className="v22-tile-badge amber">
                      {sessionMode === 'path'
                        ? `${sessionMinutes}m Active`
                        : sunnyRoute.isNighttime
                          ? '0% 🌙'
                          : `${sunnyRoute.sunPercent}% ☀️`}
                    </span>
                  </div>
                  <div>
                    <div className="v22-tile-title">Sunlight Path</div>
                    <div className="v22-tile-sub">
                      {sessionMode === 'path' ? 'Resume walking session' : 'Sunniest A → B walk'}
                    </div>
                  </div>
                </button>

                {/* Tile 2: Sunny Spots by Time */}
                <button
                  type="button"
                  id="btn-launch-spots"
                  className="v22-bento-tile secondary"
                  onClick={() => handleLaunchSunnySpots()}
                >
                  <div className="v22-tile-top">
                    <div className="v22-tile-icon soft-amber">🕒</div>
                    <span className="v22-tile-badge slate">{sortedSpots.length} Spots</span>
                  </div>
                  <div>
                    <div className="v22-tile-title">Sunny Spots</div>
                    <div className="v22-tile-sub">Near your GPS area</div>
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
                    {shortStartName} <span className="v22-arrow">→</span> {shortDestName}
                    <span className="v22-route-time-chip">
                      {appliedRouteTime.isNow ? 'Now' : `${appliedRouteTime.hour}:00`}
                    </span>
                  </div>
                  <span className="v22-edit-link">{isEditingRoute ? 'Done' : 'Edit'}</span>
                </div>
              </div>

              {/* Expandable Departure & Destination Picker when "Edit" is clicked */}
              {isEditingRoute && (
                <div className="v22-route-editor-card">
                  {/* Starting Place Row (Includes "Use my current GPS" as top option) */}
                  <div className="v22-editor-field-row">
                    <select
                      aria-label="Select Starting Place"
                      className="v22-route-select"
                      value={
                        PRESET_ROUTER_LOCATIONS.some((l) => l.id === startLocation?.id)
                          ? startLocation.id
                          : 'custom'
                      }
                      onChange={(e) => {
                        const found = PRESET_ROUTER_LOCATIONS.find((l) => l.id === e.target.value);
                        if (found) {
                          if (found.id === 'current_gps') {
                            requestRealGps(true);
                            setStartLocation({ ...found, coordinates: userLocation });
                          } else {
                            setStartLocation(found);
                          }
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
                      className={`v22-pin-mini-btn icon-only ${
                        isPickingMapPoint === 'start' ? 'active' : ''
                      }`}
                      onClick={() => {
                        setIsPickingMapPoint('start');
                        setIsEditingRoute(false);
                      }}
                      title="Pin departure on map"
                      aria-label="Pin departure on map"
                    >
                      📌
                    </button>
                  </div>

                  {/* Destination Row */}
                  <div className="v22-editor-field-row">
                    <select
                      aria-label="Select Destination"
                      className="v22-route-select"
                      value={
                        destinationLocation?.id
                          ? PRESET_ROUTER_LOCATIONS.some((l) => l.id === destinationLocation.id)
                            ? destinationLocation.id
                            : 'custom'
                          : ''
                      }
                      onChange={(e) => {
                        const found = PRESET_ROUTER_LOCATIONS.find((l) => l.id === e.target.value);
                        if (found) {
                          setDestinationLocation(found);
                        }
                      }}
                    >
                      {!destinationLocation && (
                        <option value="" disabled>
                          -- Choose Destination --
                        </option>
                      )}
                      {!PRESET_ROUTER_LOCATIONS.some((l) => l.id === destinationLocation?.id) && destinationLocation && (
                        <option value="custom">
                          {destinationLocation?.name || 'Pinned Destination'}
                        </option>
                      )}
                      {PRESET_ROUTER_LOCATIONS.filter((loc) => loc.id !== 'current_gps').map(
                        (loc) => (
                          <option key={`dest-${loc.id}`} value={loc.id}>
                            To: {loc.name}
                          </option>
                        )
                      )}
                    </select>
                    <button
                      type="button"
                      className={`v22-pin-mini-btn icon-only ${
                        isPickingMapPoint === 'dest' ? 'active' : ''
                      }`}
                      onClick={() => {
                        setIsPickingMapPoint('dest');
                        setIsEditingRoute(false);
                      }}
                      title="Pin destination on map"
                      aria-label="Pin destination on map"
                    >
                      📌
                    </button>
                  </div>

                  {/* Sunlight at Specific Time Section */}
                  <div className="v22-editor-time-section">
                    <div className="v22-editor-time-header">
                      <span className="v22-editor-time-title">Sunlight at Specific Time</span>
                      <div className="v22-scrubber-controls">
                        <button
                          type="button"
                          className={`v22-now-btn ${routeTimeIsNow ? 'active' : ''}`}
                          onClick={() => {
                            const { hour } = getLodzCurrentTimeParts(liveClock);
                            setRouteTimeIsNow(true);
                            setRouteTimeHour(Math.min(16, Math.max(8, hour)));
                          }}
                          title="Use current real-time sunlight in Łódź"
                        >
                          Now
                        </button>
                        <span className="v22-editor-time-badge">
                          {routeTimeIsNow
                            ? (() => {
                                const { hour, minute } = getLodzCurrentTimeParts(liveClock);
                                return `Now (${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')})`;
                              })()
                            : (HOUR_LABELS[routeTimeHour] || `${routeTimeHour}:00`)}
                        </span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={8}
                      max={16}
                      step={1}
                      value={routeTimeHour}
                      onChange={(e) => {
                        setRouteTimeHour(Number(e.target.value));
                        setRouteTimeIsNow(false);
                      }}
                      className="v22-range-input"
                    />
                    <div className="v22-scrubber-ticks">
                      <span>08:00</span>
                      <span>12:00 Noon</span>
                      <span>16:00</span>
                    </div>
                  </div>

                  {/* Calculate Route Button with Live Loader State */}
                  <div className="v22-editor-footer-row">
                    <button
                      type="button"
                      className="v22-apply-route-btn"
                      onClick={handleCalculateRoute}
                      disabled={isCalculatingRoute}
                    >
                      {isCalculatingRoute ? (
                        <span className="v22-btn-loader-text">
                          <span className="v22-mini-spinner" /> Calculating Path...
                        </span>
                      ) : (
                        'Calculate Route'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Active Map-Pinning Banner */}
              {isPickingMapPoint && (
                <div className="v22-map-pin-banner">
                  <span>
                    Tap anywhere on the map to pin{' '}
                    <strong>
                      {isPickingMapPoint === 'start' ? 'Departure' : 'Destination'}
                    </strong>
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

            {/* Full-Bleed Map Area */}
            <div className="v22-map-stage">
              <MapComponent
                activeMode="router"
                userLocation={userLocation}
                onSetUserLocation={handleUpdateUserLocation}
                gpsRecenterTrigger={gpsRecenterTrigger}
                lodzCenterNavTrigger={lodzCenterNavTrigger}
                solarPos={routeSolarPos}
                routeData={routeData}
                selectedRouteType={selectedRouteType}
                onSelectRouteType={setSelectedRouteType}
                startLocation={startLocation}
                destinationLocation={destinationLocation}
                isPickingMapPoint={isPickingMapPoint}
                onMapPointPicked={handleMapPointPicked}
                show3dBuildings={showRouter3dMap}
                osmBuildings={osmSpatialData.buildings}
                onZoomChange={handleMapZoomChange}
              />

              {/* Floating Sunlit Route Highlight Pill */}
              {!isEditingRoute && routeData && (
                <div
                  className={`v22-map-floating-tag ${
                    sunnyRoute.isNighttime ? 'night' : ''
                  }`}
                >
                  {sunnyRoute.isNighttime
                    ? 'Nighttime in Łódź (0% Sun) • Sunniest = Shortest'
                    : `${activeRoute.sunPercent}% Sunlit (+${activeRoute.sunMinutes}m Sun • +${routeDetourPercent}% dist)`}
                </div>
              )}
            </div>

            {/* Floating Bottom-Right Map Control Row (Sits directly above the Bottom Sheet) */}
            <div className="v22-above-sheet-controls">
              {gpsToastMessage && (
                <div className="v22-gps-toast-inline">{gpsToastMessage}</div>
              )}
              <div
                className="v22-3d-btn-wrapper"
                onClick={() => {
                  if (!is3dAllowedAtCurrentZoom) {
                    setShow3dDisabledToast(true);
                    setTimeout(() => setShow3dDisabledToast(false), 2600);
                  }
                }}
              >
                <button
                  type="button"
                  className={`v22-floating-3d-btn ${showRouter3dMap && is3dAllowedAtCurrentZoom ? 'active' : ''} ${!is3dAllowedAtCurrentZoom ? 'disabled' : ''}`}
                  disabled={!is3dAllowedAtCurrentZoom}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (is3dAllowedAtCurrentZoom) {
                      setShowRouter3dMap((prev) => !prev);
                    } else {
                      setShow3dDisabledToast(true);
                      setTimeout(() => setShow3dDisabledToast(false), 2600);
                    }
                  }}
                  title={
                    !is3dAllowedAtCurrentZoom
                      ? '3D view disabled: Zoom in closer to street level (≥ 14.5) to enable'
                      : showRouter3dMap
                        ? 'Hide 2.5D/3D buildings & trees'
                        : 'Show 2.5D/3D buildings & trees'
                  }
                  aria-label="Toggle 3D View in Sunlight Path"
                >
                  <span className="v22-3d-btn-label">3D</span>
                </button>
                {!is3dAllowedAtCurrentZoom && (
                  <div
                    className={`v22-3d-disabled-tooltip ${show3dDisabledToast ? 'visible' : ''}`}
                    role="tooltip"
                  >
                    <span className="v22-3d-tooltip-icon">🔍</span>
                    <span>Zoom in closer (≥ 14.5) to enable 3D mode</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Sheet: Pre-Start Route Selection vs. Active Live Path Session */}
            <div className="v22-bottom-sheet">
              {sessionMode === 'path' ? (
                <div id="path-active-session">
                  <div className="v22-active-session-header">
                    <span className="v22-verified-session-badge">
                      ● Live Path Session • GPS Verified
                    </span>
                    <span className="v22-lux-tag">
                      {sunnyRoute.isNighttime ? '0 Lux (Night)' : '~12,500 Lux'}
                    </span>
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
              ) : isCalculatingRoute ? (
                <div className="v22-route-loader-sheet">
                  <div className="v22-route-spinner-wrap">
                    <div className="v22-route-calc-spinner" />
                  </div>
                  <div className="v22-route-loader-title">Calculating Warmest Route...</div>
                  <div className="v22-route-loader-sub">
                    Analyzing solar shadows along sidewalks in Łódź
                  </div>
                </div>
              ) : routeData ? (
                <div id="path-prestart">
                  <div className="v22-sheet-heading-row">
                    <span className="v22-sheet-heading">
                      Compare Routes ({appliedRouteTime.isNow ? 'Now' : `${appliedRouteTime.hour}:00`})
                    </span>
                  </div>

                  <div className="v22-route-compare-grid">
                    {/* Option 1: Sunniest (Strictly <= +20% of Shortest, and Equal to Shortest at Night!) */}
                    <button
                      type="button"
                      className={`v22-route-option-card sunny ${
                        selectedRouteType === 'sunny' ? 'selected' : ''
                      }`}
                      onClick={() => setSelectedRouteType('sunny')}
                    >
                      <div className="v22-route-opt-top">
                        <span>Sunniest</span>
                        <span>{sunnyRoute.sunPercent}%</span>
                      </div>
                      <div className="v22-route-opt-time">
                        {sunnyRoute.walkMinutes} min{' '}
                        <span className="v22-route-opt-dist">
                          {(sunnyRoute.totalDistanceMeters / 1000).toFixed(2)}km
                        </span>
                      </div>
                      <div className="v22-route-opt-bank emerald">
                        {sunnyRoute.isNighttime
                          ? 'Equal to Shortest (Night)'
                          : `+${sunnyRoute.sunMinutes}m Sun Bank (+${routeDetourPercent}% dist)`}
                      </div>
                    </button>

                    {/* Option 2: Shortest */}
                    <button
                      type="button"
                      className={`v22-route-option-card shortest ${
                        selectedRouteType === 'shortest' ? 'selected' : ''
                      }`}
                      onClick={() => setSelectedRouteType('shortest')}
                    >
                      <div className="v22-route-opt-top muted">
                        <span>Shortest</span>
                        <span>{shortestRoute.sunPercent}%</span>
                      </div>
                      <div className="v22-route-opt-time">
                        {shortestRoute.walkMinutes} min{' '}
                        <span className="v22-route-opt-dist">
                          {(shortestRoute.totalDistanceMeters / 1000).toFixed(2)}km
                        </span>
                      </div>
                      <div className="v22-route-opt-bank slate">
                        +{shortestRoute.sunMinutes}m Sun Bank (Direct)
                      </div>
                    </button>
                  </div>

                  <button
                    type="button"
                    className="v22-primary-cta-btn"
                    onClick={() => startSession('path')}
                  >
                    Start Sunlight Path Session
                  </button>
                </div>
              ) : (
                <div className="v22-no-route-prompt">
                  <div className="v22-no-route-title">Where do you want to walk?</div>
                  <div className="v22-no-route-sub">
                    Select a destination to find the sunniest route
                  </div>
                  <div className="v22-quick-dest-row">
                    {PRESET_ROUTER_LOCATIONS.filter((l) => l.id !== 'current_gps').slice(0, 3).map((loc) => (
                      <button
                        key={loc.id}
                        type="button"
                        className="v22-quick-dest-btn"
                        onClick={() => handleSelectQuickDestination(loc)}
                      >
                        {loc.name.split(' (')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== SCREEN 3: SUNNY SPOTS BY TIME (2-STEP OVERVIEW -> WHOLE AREA) ==================== */}
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
                  {sunnySpotsCount} Sunlit Spots
                </span>
              </div>

              {/* Floating Time Scrubber Card */}
              <div className="v22-scrubber-card">
                <div className="v22-scrubber-top">
                  <span className="v22-scrubber-title">Sunlight at Specific Time</span>
                  <div className="v22-scrubber-controls">
                    <button
                      type="button"
                      className={`v22-now-btn ${scrubbedHour === Math.min(16, Math.max(8, getLodzCurrentTimeParts(liveClock).hour)) ? 'active' : ''}`}
                      onClick={() => setScrubbedHour(Math.min(16, Math.max(8, getLodzCurrentTimeParts(liveClock).hour)))}
                      title="Adjust time to current hour in Łódź"
                    >
                      Now
                    </button>
                    <span className="v22-scrubber-badge">
                      {HOUR_LABELS[scrubbedHour] || `${scrubbedHour}:00`}
                    </span>
                  </div>
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

            {/* Full-Bleed Map Canvas: Switches between (1) Nearby Pins Overview & (2) Zoomed Whole-Area Polygon View */}
            <div className="v22-map-stage">
              <MapComponent
                activeMode="spots"
                spots={sortedSpots}
                windowsBySpotId={windowsBySpotId}
                selectedSpot={activeSpotForSession}
                viewingSpotArea={viewingSpotArea}
                onSelectSpot={handleSelectSpotArea}
                onDeselectSpot={handleDeselectSpot}
                userLocation={userLocation}
                onSetUserLocation={handleUpdateUserLocation}
                gpsRecenterTrigger={gpsRecenterTrigger}
                lodzCenterNavTrigger={lodzCenterNavTrigger}
                solarPos={scrubbedSolarPos}
                osmBuildings={osmSpatialData.buildings}
                show3dBuildings={showSpots3dMap}
                onZoomChange={handleMapZoomChange}
              />
            </div>

            {/* FLOATING 3D VIEW & GPS LOCATE-ME CONTROLS (Directly above the Bottom Sheet) */}
            <div className="v22-above-sheet-controls">
              {gpsToastMessage && (
                <div className="v22-gps-toast-inline">{gpsToastMessage}</div>
              )}
              <div
                className="v22-3d-btn-wrapper"
                onClick={() => {
                  if (!is3dAllowedAtCurrentZoom) {
                    setShow3dDisabledToast(true);
                    setTimeout(() => setShow3dDisabledToast(false), 2600);
                  }
                }}
              >
                <button
                  type="button"
                  id="btn-spots-3d"
                  className={`v22-floating-3d-btn ${showSpots3dMap && is3dAllowedAtCurrentZoom ? 'active' : ''} ${!is3dAllowedAtCurrentZoom ? 'disabled' : ''}`}
                  disabled={!is3dAllowedAtCurrentZoom}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (is3dAllowedAtCurrentZoom) {
                      setShowSpots3dMap((prev) => !prev);
                    } else {
                      setShow3dDisabledToast(true);
                      setTimeout(() => setShow3dDisabledToast(false), 2600);
                    }
                  }}
                  title={
                    !is3dAllowedAtCurrentZoom
                      ? '3D view disabled: Zoom in closer to street level (≥ 14.5) to enable'
                      : showSpots3dMap
                        ? 'Hide 2.5D/3D buildings & trees'
                        : 'Show 2.5D/3D buildings & trees'
                  }
                  aria-label="Toggle 3D View in Sunny Spots"
                >
                  <span className="v22-3d-btn-label">3D</span>
                </button>
                {!is3dAllowedAtCurrentZoom && (
                  <div
                    className={`v22-3d-disabled-tooltip ${show3dDisabledToast ? 'visible' : ''}`}
                    role="tooltip"
                  >
                    <span className="v22-3d-tooltip-icon">🔍</span>
                    <span>Zoom in closer (≥ 14.5) to enable 3D mode</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                id="btn-spots-gps"
                className="v22-floating-gps-btn"
                onClick={handleLocateUserOnSpotsMap}
                title="Return to my GPS neighborhood"
              >
                🎯
              </button>
            </div>

            {/* Bottom Sheet Drawer: (1) Nearby Places List -> (2) Selected Whole-Area Details -> (3) Active Session */}
            <div className="v22-bottom-sheet" id="spots-bottom-drawer">
              {sessionMode === 'spot' ? (
                /* STATE 3: Active Spot Exposure Session */
                <div id="spot-active-session">
                  <div className="v22-active-session-header">
                    <span className="v22-verified-session-badge">
                      ● Soaking at {activeSpotForSession?.name?.split(' (')[0]}
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
              ) : viewingSpotArea ? (
                /* STEP 2: Selected Spot Whole-Area Detail Card (Shown when user clicks a spot) */
                <div id="spot-area-detail-sheet">
                  <div className="v22-area-detail-header">
                    <button
                      type="button"
                      className="v22-back-nearby-btn"
                      onClick={handleBackToNearbySpotsList}
                    >
                      ← All Nearby Places
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="v22-distance-pill-blue">
                        {viewingSpotDistance}m from you
                      </span>
                      <button
                        type="button"
                        className="v22-sheet-close-btn"
                        onClick={handleDeselectSpot}
                        title="Close spot details and return to overview"
                        aria-label="Close spot details"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div className="v22-area-detail-body">
                    <div>
                      <h3 className="v22-spot-sheet-title">
                        {viewingSpotArea.name.split(' (')[0]}
                      </h3>
                      <p className="v22-spot-sheet-sub">
                        Whole sunlit area shown above •{' '}
                        {isViewingSpotSunny
                          ? `${windowsBySpotId[viewingSpotArea.id]?.windowRange || '11:15–14:40'} Sun Window`
                          : '⚠️ Shaded after 14:40'}
                      </p>
                    </div>
                    <span className="v22-lux-pill-amber">
                      {isViewingSpotSunny ? '~12.5k lx' : '~1.9k lx'}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="v22-primary-cta-btn"
                    style={{ marginTop: '10px' }}
                    onClick={() => startSession('spot')}
                  >
                    Start Soaking in This Area
                  </button>
                </div>
              ) : (
                /* STEP 1: Minimal Prompt Until User Selects a Place on the Map */
                <div id="spot-prestart">
                  <div
                    className="v22-drawer-grab-header"
                    onClick={() => setIsSpotsDrawerExpanded((prev) => !prev)}
                  >
                    <div className="v22-grab-bar" />
                    <div className="v22-drawer-title-row">
                      <span className="v22-drawer-title">
                        Tap any pin on map for details
                      </span>
                      <span className="v22-drawer-pull-label">
                        {isSpotsDrawerExpanded
                          ? '↓ Hide list'
                          : `↑ Browse list (${sortedSpots.length})`}
                      </span>
                    </div>
                  </div>

                  {/* Scrollable List of Places (Hidden by default until user pulls up / clicks Browse list) */}
                  {isSpotsDrawerExpanded && (
                    <div className="v22-more-spots-list">
                      {sortedSpots.map((spot, idx) => (
                        <div
                          key={spot.id}
                          className="v22-more-spot-item"
                          onClick={() => handleSelectSpotArea(spot)}
                        >
                          <div>
                            <div className="v22-spot-card-badges">
                              <span className={idx === 0 ? 'v22-badge-nearest' : 'v22-badge-dist-slate'}>
                                {idx === 0
                                  ? `Nearest • ${spot.distanceMeters}m`
                                  : `${spot.distanceMeters}m away`}
                              </span>
                              <span className="v22-badge-sunwindow">
                                {windowsBySpotId[spot.id]?.windowRange || '10:30–15:10'} ☀️
                              </span>
                            </div>
                            <h4 className="v22-more-spot-title">
                              {idx + 1}. {spot.name.split(' (')[0]}
                            </h4>
                            <p className="v22-nearest-spot-sub">
                              {spot.categoryLabel || 'Open Sunlit Zone'} • {spot.openSkyPercent || 90}% Sunlit Area
                            </p>
                          </div>
                          <span className="v22-view-area-btn slate">Select ›</span>
                        </div>
                      ))}
                    </div>
                  )}
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

            {/* ONLY Accumulated Time Exposed */}
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
                const pct = Math.min(
                  100,
                  Math.round((totalWeeklyMinutes / v.requiredMinutes) * 100)
                );

                return (
                  <div
                    key={v.id}
                    className={`v22-voucher-card ${isUnlocked ? 'unlocked' : 'locked'} ${
                      v.partner === 'Żabka' ? 'zabka' : ''
                    }`}
                  >
                    <div className="v22-voucher-card-top">
                      <div>
                        <div className="v22-voucher-badge-row">
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
                          {v.partner === 'Żabka' && (
                            <span className="v22-zabka-badge">Żabka</span>
                          )}
                        </div>
                        <h3 className="v22-voucher-title">{v.title}</h3>
                        <p className="v22-voucher-venue">{v.venue}</p>
                      </div>
                      <span className="v22-voucher-emoji">{v.emoji}</span>
                    </div>

                    {isUnlocked ? (
                      <div className="v22-voucher-redeem-row">
                        <span className={`v22-voucher-code ${v.partner === 'Żabka' ? 'zabka' : ''}`}>
                          {v.code}
                        </span>
                        <button
                          type="button"
                          className={`v22-redeem-btn ${isRedeemed ? 'redeemed' : ''} ${
                            v.partner === 'Żabka' ? 'zabka' : ''
                          }`}
                          onClick={() => handleRedeemVoucher(v.id)}
                        >
                          {isRedeemed ? '✓ QR Code Shown' : `Redeem (${v.requiredLabel})`}
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

        {/* ==================== SCREEN 5: HIDDEN DEBUG TOOL (STREET POINT RAYCAST INSPECTOR) ==================== */}
        {activeScreen === 5 && (
          <div className="v22-screen v22-map-screen">
            <div className="v22-floating-top">
              <div className="v22-top-nav-row" style={{ justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="v22-back-home-btn"
                  onClick={() => setActiveScreen(1)}
                >
                  ← Exit Debug
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div
                    className="v22-3d-btn-wrapper"
                    onClick={() => {
                      if (!is3dAllowedAtCurrentZoom) {
                        setShow3dDisabledToast(true);
                        setTimeout(() => setShow3dDisabledToast(false), 2600);
                      }
                    }}
                  >
                    <button
                      type="button"
                      className={`v22-now-btn ${showDebug3dMap && is3dAllowedAtCurrentZoom ? 'active' : ''} ${!is3dAllowedAtCurrentZoom ? 'disabled' : ''}`}
                      disabled={!is3dAllowedAtCurrentZoom}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (is3dAllowedAtCurrentZoom) {
                          setShowDebug3dMap((prev) => !prev);
                        } else {
                          setShow3dDisabledToast(true);
                          setTimeout(() => setShow3dDisabledToast(false), 2600);
                        }
                      }}
                      title={
                        !is3dAllowedAtCurrentZoom
                          ? '3D view disabled: Zoom in closer to street level (≥ 14.5) to enable'
                          : 'Toggle 3D Buildings & Trees ON/OFF'
                      }
                    >
                      3D {!is3dAllowedAtCurrentZoom ? 'OFF' : showDebug3dMap ? 'ON' : 'OFF'}
                    </button>
                    {!is3dAllowedAtCurrentZoom && (
                      <div
                        className={`v22-3d-disabled-tooltip ${show3dDisabledToast ? 'visible' : ''}`}
                        role="tooltip"
                      >
                        <span className="v22-3d-tooltip-icon">🔍</span>
                        <span>Zoom in closer (≥ 14.5) to enable 3D mode</span>
                      </div>
                    )}
                  </div>
                  <span className="v22-debug-badge-pill">
                    🏙️ Greater Łódź (271k Bldgs • 30k Trees)
                  </span>
                </div>
              </div>

              {/* Debug Time Mode Switcher (Live Night/Day Clock vs Custom Test Hour) */}
              <div className="v22-debug-control-card">
                {/* 4 Pilot Zones Quick-Jump Bar */}
                <div className="v22-debug-zone-bar">
                  {PILOT_ZONES.map((zone, idx) => {
                    const zoneStats = PILOT_ZONES_STATS?.byZone?.find((z) => z.id === zone.id);
                    const shortLabel =
                      idx === 0
                        ? 'Z1: Piotrkowska'
                        : idx === 1
                          ? 'Z2: Manufaktura'
                          : idx === 2
                            ? 'Z3: OFF / EC1'
                            : idx === 3
                              ? 'Z4: Księży Młyn'
                              : `Z${idx + 1}: ${zone.name.split(':')[1]?.trim() || zone.name}`;
                    return (
                      <button
                        key={zone.id}
                        type="button"
                        className={`v22-debug-zone-chip ${activePilotZoneId === zone.id ? 'active' : ''}`}
                        onClick={() => {
                          setActivePilotZoneId(zone.id);
                          setDebugInspectedPoint([...zone.center]);
                          setDebugFocusCoord([...zone.center]);
                        }}
                        title={`${zone.name} (${zoneStats?.buildings || 0} buildings, ${zoneStats?.trees || 0} trees)`}
                      >
                        {shortLabel}
                      </button>
                    );
                  })}
                </div>

                <div className="v22-debug-mode-row">
                  <button
                    type="button"
                    className={`v22-debug-mode-btn ${debugTimeMode === 'live' ? 'active' : ''}`}
                    onClick={() => setDebugTimeMode('live')}
                  >
                    🕒 Live Time ({liveSolarPos.elevationDeg}° elev)
                  </button>
                  <button
                    type="button"
                    className={`v22-debug-mode-btn ${debugTimeMode === 'custom' ? 'active' : ''}`}
                    onClick={() => setDebugTimeMode('custom')}
                  >
                    ☀️ Test Hour ({debugCustomHour}:00)
                  </button>
                </div>

                {debugTimeMode === 'custom' && (
                  <div className="v22-debug-slider-row">
                    <input
                      type="range"
                      min={6}
                      max={20}
                      step={1}
                      value={debugCustomHour}
                      onChange={(e) => setDebugCustomHour(Number(e.target.value))}
                      className="v22-range-input"
                    />
                    <span className="v22-debug-angle-readout">
                      Elev {debugSolarPos.elevationDeg}° • Az {debugSolarPos.azimuthDeg}°
                    </span>
                  </div>
                )}

                <div className="v22-debug-pointer-hint">
                  🎯 <strong>Click any street point on the map</strong> to raycast sunlight vs. 3D buildings &amp; trees.
                  Cursor: [{debugHoverCoord[1].toFixed(5)}, {debugHoverCoord[0].toFixed(5)}]
                </div>
              </div>
            </div>

            {/* 3D OSM Map with Buildings, Green Tree Crowns, Sidewalks & Solar Ray Vector (No Live GPS on Debug) */}
            <div className="v22-map-stage">
              <MapComponent
                activeMode="debug"
                debugFocusCoord={debugFocusCoord}
                solarPos={debugSolarPos}
                osmBuildings={osmSpatialData.buildings}
                osmSidewalks={osmSpatialData.sidewalks}
                inspectionResult={debugInspectionResult}
                onInspectPoint={(coords) => setDebugInspectedPoint(coords)}
                onHoverCoord={(coords) => setDebugHoverCoord(coords)}
                show3dBuildings={showDebug3dMap}
                onZoomChange={handleMapZoomChange}
              />
            </div>

            {/* Floating 3D Toggle Button for Debug Mode */}
            <div className="v22-above-sheet-controls">
              <div
                className="v22-3d-btn-wrapper"
                onClick={() => {
                  if (!is3dAllowedAtCurrentZoom) {
                    setShow3dDisabledToast(true);
                    setTimeout(() => setShow3dDisabledToast(false), 2600);
                  }
                }}
              >
                <button
                  type="button"
                  className={`v22-floating-3d-btn ${showDebug3dMap && is3dAllowedAtCurrentZoom ? 'active' : ''} ${!is3dAllowedAtCurrentZoom ? 'disabled' : ''}`}
                  disabled={!is3dAllowedAtCurrentZoom}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (is3dAllowedAtCurrentZoom) {
                      setShowDebug3dMap((prev) => !prev);
                    } else {
                      setShow3dDisabledToast(true);
                      setTimeout(() => setShow3dDisabledToast(false), 2600);
                    }
                  }}
                  title={
                    !is3dAllowedAtCurrentZoom
                      ? '3D view disabled: Zoom in closer to street level (≥ 14.5) to enable'
                      : showDebug3dMap
                        ? 'Turn OFF 3D (Switch to Flat 2D View)'
                        : 'Turn ON 3D (Perspective View with Extruded Buildings & Trees)'
                  }
                  aria-label="Toggle 3D Map in Debug Mode"
                >
                  <span className="v22-3d-btn-label">3D</span>
                </button>
                {!is3dAllowedAtCurrentZoom && (
                  <div
                    className={`v22-3d-disabled-tooltip ${show3dDisabledToast ? 'visible' : ''}`}
                    role="tooltip"
                  >
                    <span className="v22-3d-tooltip-icon">🔍</span>
                    <span>Zoom in closer (≥ 14.5) to enable 3D mode</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Diagnostic Sheet showing exact Street Point Raycast Verdict */}
            <div className="v22-bottom-sheet v22-debug-sheet">
              {debugInspectionResult && (
                <div>
                  <div className="v22-debug-verdict-row">
                    <span
                      className={`v22-debug-status-pill ${
                        debugInspectionResult.isSunny
                          ? 'sunny'
                          : debugInspectionResult.status === 'tree-shade'
                            ? 'tree'
                            : debugInspectionResult.isNighttime
                              ? 'night'
                              : 'shaded'
                      }`}
                    >
                      {debugInspectionResult.statusLabel}
                    </span>
                    <span className="v22-debug-coord-tag">
                      📍 {debugInspectionResult.point[1].toFixed(5)},{' '}
                      {debugInspectionResult.point[0].toFixed(5)}
                    </span>
                  </div>

                  <p className="v22-debug-subtext">{debugInspectionResult.statusSubtext}</p>

                  <div className="v22-debug-telemetry-grid">
                    <div className="v22-debug-stat-box">
                      <div className="v22-debug-stat-label">Obstructing Object</div>
                      <div className="v22-debug-stat-val">
                        {debugInspectionResult.obstructingObject
                          ? `${
                              debugInspectionResult.obstructingObject.type === 'tree' ? '🌳' : '🏢'
                            } ${debugInspectionResult.obstructingObject.name}`
                          : debugInspectionResult.isNighttime
                            ? 'Earth Horizon (Night)'
                            : 'None (Clear Sky)'}
                      </div>
                      <div className="v22-debug-stat-sub">
                        {debugInspectionResult.obstructingObject
                          ? `Height: ${debugInspectionResult.obstructingObject.heightMeters}m • Dist: ${debugInspectionResult.obstructingObject.distanceMeters}m • Shadow: ${debugInspectionResult.obstructingObject.shadowLengthMeters}m`
                          : `Nearest: ${debugInspectionResult.nearestBuilding?.name || 'N/A'} (${debugInspectionResult.nearestBuilding?.distanceMeters || 0}m)`}
                      </div>
                    </div>

                    <div className="v22-debug-stat-box">
                      <div className="v22-debug-stat-label">Street / Pedestrian Sidewalk</div>
                      <div className="v22-debug-stat-val">
                        {debugInspectionResult.nearestSidewalk?.name || 'Central Łódź Street'}
                      </div>
                      <div className="v22-debug-stat-sub">
                        Width: {debugInspectionResult.nearestSidewalk?.widthMeters || 4}m • Surface:{' '}
                        {debugInspectionResult.nearestSidewalk?.surface || 'Paving Stones'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
