import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import SpotsSidebar from './components/SpotsSidebar';
import RoutePlannerSidebar from './components/RoutePlannerSidebar';
import MapComponent from './components/MapComponent';
import TimeScrubber from './components/TimeScrubber';
import SunBathModal from './components/SunBathModal';
import { SUNNY_AREAS, DEFAULT_USER_LOCATION } from './data/sunnySpotsLodz';
import { generateSurroundingSpots } from './services/localSunSpotsService';
import { isUserInSpotArea, getPolygonCentroid } from './utils/geoUtils';
import {
  PRESET_ROUTER_LOCATIONS,
  calculateDualRoutes
} from './services/sunPathRoutingService';
import confetti from 'canvas-confetti';
import {
  getCompassSolarPosition,
  calculateSunWindow,
  getLodzSunTimes
} from './services/solarService';
import { fetchLodzWeather, DEFAULT_WEATHER } from './services/weatherService';

export default function App() {
  const [realTime, setRealTime] = useState(new Date());
  const [simulatedMinutes, setSimulatedMinutes] = useState(null); // null means live time
  const [isScrubberOpen, setIsScrubberOpen] = useState(false);
  const [weather, setWeather] = useState(DEFAULT_WEATHER);
  const [userLocation, setUserLocation] = useState(DEFAULT_USER_LOCATION);

  // Active Mode: 'router' (Feature 1: Sun Path A->B) or 'spots' (Feature 2: Sunny Benches)
  const [activeMode, setActiveMode] = useState('router');

  // =========================================================================
  // FEATURE 1: SUN PATH WALKING ROUTER STATE
  // =========================================================================
  const [startLocation, setStartLocation] = useState({
    id: 'current_gps',
    name: '📍 My Current Location',
    coordinates: DEFAULT_USER_LOCATION
  });

  const [destinationLocation, setDestinationLocation] = useState(
    PRESET_ROUTER_LOCATIONS.find((l) => l.id === 'manufaktura') || PRESET_ROUTER_LOCATIONS[2]
  );

  const [routeData, setRouteData] = useState(null);
  const [selectedRouteType, setSelectedRouteType] = useState('sunny'); // 'sunny' | 'shortest'
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [isPickingMapPoint, setIsPickingMapPoint] = useState(null); // null | 'start' | 'dest'

  // =========================================================================
  // FEATURE 2: ACTIVE SUN-SOAKING SESSION STATE
  // =========================================================================
  const [activeSession, setActiveSession] = useState(null);

  // Poll live weather on mount
  useEffect(() => {
    fetchLodzWeather().then((data) => setWeather(data));
    const weatherTimer = setInterval(() => {
      fetchLodzWeather().then((data) => setWeather(data));
    }, 5 * 60 * 1000); // every 5 mins

    return () => clearInterval(weatherTimer);
  }, []);

  // Update real-time clock every 30 seconds
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setRealTime(new Date());
    }, 30 * 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Sync Start Location with User GPS if start is set to 'current_gps'
  useEffect(() => {
    if (startLocation?.id === 'current_gps') {
      setStartLocation((prev) => ({
        ...prev,
        coordinates: userLocation
      }));
    }
  }, [userLocation]);

  // Request actual user geolocation if available
  const handleLocateMe = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = [pos.coords.longitude, pos.coords.latitude];
          setUserLocation(loc);
          if (startLocation?.id === 'current_gps') {
            setStartLocation((prev) => ({ ...prev, coordinates: loc }));
          }
        },
        (err) => {
          console.warn('Geolocation denied or unavailable, keeping central Piotrkowska position:', err);
          setUserLocation(DEFAULT_USER_LOCATION);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setUserLocation(DEFAULT_USER_LOCATION);
    }
  };

  // Compute the currently active date (live or simulated)
  const effectiveDate = useMemo(() => {
    if (simulatedMinutes === null) {
      return realTime;
    }
    const d = new Date(realTime.getTime());
    const hours = Math.floor(simulatedMinutes / 60);
    const mins = simulatedMinutes % 60;
    d.setHours(hours, mins, 0, 0);
    return d;
  }, [realTime, simulatedMinutes]);

  // Compute astronomical coordinates for Łódź at effective date
  const solarPos = useMemo(() => {
    return getCompassSolarPosition(effectiveDate);
  }, [effectiveDate]);

  const sunTimes = useMemo(() => {
    return getLodzSunTimes(effectiveDate);
  }, [effectiveDate]);

  // Combine hyper-local surrounding benches (< 400m) + landmark areas
  const allSpots = useMemo(() => {
    const surrounding = generateSurroundingSpots(userLocation, solarPos);
    return [...surrounding, ...SUNNY_AREAS];
  }, [userLocation, solarPos]);

  // Selected spot ID (null by default; area polygon only appears when an icon is clicked!)
  const [selectedSpotId, setSelectedSpotId] = useState(null);

  const selectedSpot = useMemo(() => {
    if (selectedSpotId) {
      return allSpots.find((s) => s.id === selectedSpotId) || null;
    }
    return null;
  }, [allSpots, selectedSpotId]);

  // Compute live Sun Windows for all spots at effective date
  const windowsBySpotId = useMemo(() => {
    const map = {};
    allSpots.forEach((spot) => {
      map[spot.id] = calculateSunWindow(spot, effectiveDate);
    });
    return map;
  }, [allSpots, effectiveDate]);

  // =========================================================================
  // ROUTING CALCULATION ENGINE (FEATURE 1: SHORT VS SUNNY ROUTE)
  // =========================================================================
  useEffect(() => {
    if (!startLocation?.coordinates || !destinationLocation?.coordinates) return;

    let isCurrent = true;
    setIsLoadingRoutes(true);

    calculateDualRoutes(startLocation.coordinates, destinationLocation.coordinates, solarPos)
      .then((data) => {
        if (isCurrent) {
          setRouteData(data);
          setIsLoadingRoutes(false);
        }
      })
      .catch((err) => {
        console.error('Failed to compute dual routes:', err);
        if (isCurrent) setIsLoadingRoutes(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [
    startLocation?.coordinates?.[0],
    startLocation?.coordinates?.[1],
    destinationLocation?.coordinates?.[0],
    destinationLocation?.coordinates?.[1],
    solarPos.azimuthDeg
  ]);

  // Real-time Geofence calculation for active Sun Session (Feature 2)
  const sessionGeofence = useMemo(() => {
    if (!activeSession?.spot) return { isInside: false, distanceMeters: 999 };
    return isUserInSpotArea(userLocation, activeSession.spot);
  }, [userLocation, activeSession?.spot]);

  // CLINICAL EXPOSURE TIMER ENGINE (FEATURE 2)
  // "Only when the user is on the selected area then it counts the exposure time."
  useEffect(() => {
    if (!activeSession || !activeSession.isRunning || activeSession.isCompleted) return;

    const timer = setInterval(() => {
      if (sessionGeofence.isInside) {
        setActiveSession((prev) => {
          if (!prev || !prev.isRunning || prev.isCompleted) return prev;
          const nextSec = prev.elapsedSeconds + 1;
          const TARGET_SECONDS = 15 * 60; // 15 mins

          if (nextSec >= TARGET_SECONDS) {
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#f59e0b', '#fbbf24', '#10b981', '#ffffff']
            });
            return {
              ...prev,
              elapsedSeconds: TARGET_SECONDS,
              isCompleted: true
            };
          }
          return { ...prev, elapsedSeconds: nextSec };
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSession?.isRunning, activeSession?.isCompleted, sessionGeofence.isInside]);

  // Route Planning Handlers
  const handleSelectStart = (location) => {
    if (location.id === 'current_gps') {
      setStartLocation({
        id: 'current_gps',
        name: '📍 My Current Location',
        coordinates: userLocation
      });
    } else {
      setStartLocation(location);
    }
  };

  const handleSelectDestination = (location) => {
    setDestinationLocation(location);
  };

  const handleSwapLocations = () => {
    const prevStart = startLocation;
    const prevDest = destinationLocation;
    setStartLocation(prevDest);
    setDestinationLocation(prevStart);
  };

  const handleStartPickOnMap = (targetType) => {
    setIsPickingMapPoint((prev) => (prev === targetType ? null : targetType));
  };

  const handleMapPointPicked = (coords, targetType) => {
    if (targetType === 'start') {
      setStartLocation({
        id: `custom_start_${Math.round(coords[0] * 1000)}`,
        name: `📍 Selected Start (${coords[1].toFixed(4)}, ${coords[0].toFixed(4)})`,
        coordinates: coords
      });
    } else if (targetType === 'dest') {
      setDestinationLocation({
        id: `custom_dest_${Math.round(coords[0] * 1000)}`,
        name: `🏁 Selected Destination (${coords[1].toFixed(4)}, ${coords[0].toFixed(4)})`,
        coordinates: coords
      });
    }
    setIsPickingMapPoint(null);
  };

  // Spot Session Handlers (Feature 2)
  const handleStartSunSession = (spot) => {
    setSelectedSpotId(spot.id);
    setActiveSession({
      spot,
      elapsedSeconds: 0,
      isRunning: true,
      isCompleted: false,
      isModalOpen: true
    });
  };

  const handleTeleportToSpot = (spot) => {
    if (!spot) return;
    setSelectedSpotId(spot.id);
    if (spot.polygon && spot.polygon.length > 0) {
      const center = getPolygonCentroid(spot.polygon);
      setUserLocation(center);
    } else if (spot.coordinates) {
      setUserLocation(spot.coordinates);
    }
  };

  const handleStepOutsideSpot = (spot) => {
    const target = spot || activeSession?.spot;
    if (!target) return;
    const [lng, lat] = target.coordinates || userLocation;
    setUserLocation([lng + 0.00095, lat + 0.00065]);
  };

  const handleFastForwardSession = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f59e0b', '#fbbf24', '#10b981', '#ffffff']
    });
    setActiveSession((prev) => {
      if (!prev) return null;
      return { ...prev, elapsedSeconds: 15 * 60, isCompleted: true };
    });
  };

  const handleTogglePlayPauseSession = () => {
    setActiveSession((prev) => {
      if (!prev) return null;
      return { ...prev, isRunning: !prev.isRunning };
    });
  };

  // Scrubber changes
  const handleScrubberChange = (minutes) => {
    setSimulatedMinutes(minutes);
  };

  const handleResetToLive = () => {
    setSimulatedMinutes(null);
  };

  const currentMinutesFromMidnight = realTime.getHours() * 60 + realTime.getMinutes();

  return (
    <div className="app-container">
      {/* Top Navbar with Mode Switcher */}
      <Navbar
        weather={weather}
        solarPos={solarPos}
        sunTimes={sunTimes}
        simulatedTime={simulatedMinutes !== null ? effectiveDate : null}
        isScrubberOpen={isScrubberOpen}
        onToggleScrubber={() => setIsScrubberOpen((prev) => !prev)}
        activeMode={activeMode}
        onChangeMode={(newMode) => setActiveMode(newMode)}
      />

      {/* Main Workspace (Sidebar + Map) */}
      <main className="main-workspace">
        {activeMode === 'router' ? (
          <RoutePlannerSidebar
            startLocation={startLocation}
            destinationLocation={destinationLocation}
            onSelectStart={handleSelectStart}
            onSelectDestination={handleSelectDestination}
            onSwapLocations={handleSwapLocations}
            routeData={routeData}
            selectedRouteType={selectedRouteType}
            onSelectRouteType={(type) => setSelectedRouteType(type)}
            isLoadingRoutes={isLoadingRoutes}
            userLocation={userLocation}
            isPickingMapPoint={isPickingMapPoint}
            onStartPickOnMap={handleStartPickOnMap}
          />
        ) : (
          <SpotsSidebar
            spots={allSpots}
            windowsBySpotId={windowsBySpotId}
            selectedSpot={selectedSpot}
            userLocation={userLocation}
            activeSession={activeSession}
            onSelectSpot={(spot) => setSelectedSpotId(spot.id)}
            onStartSunBath={handleStartSunSession}
            onTeleportToSpot={handleTeleportToSpot}
          />
        )}

        <MapComponent
          // Feature 2 Props
          spots={allSpots}
          windowsBySpotId={windowsBySpotId}
          selectedSpot={selectedSpot}
          userLocation={userLocation}
          onSetUserLocation={(newLoc) => setUserLocation(newLoc)}
          onSelectSpot={(spot) => setSelectedSpotId(spot.id)}
          onLocateMe={handleLocateMe}
          solarPos={solarPos}
          activeSession={activeSession}
          sessionGeofence={sessionGeofence}
          onOpenSessionModal={() => setActiveSession((prev) => prev ? { ...prev, isModalOpen: true } : null)}
          onTeleportToSpot={handleTeleportToSpot}
          onStepOutsideSpot={handleStepOutsideSpot}

          // Feature 1 Router Props
          activeMode={activeMode}
          routeData={routeData}
          selectedRouteType={selectedRouteType}
          onSelectRouteType={(type) => setSelectedRouteType(type)}
          startLocation={startLocation}
          destinationLocation={destinationLocation}
          isPickingMapPoint={isPickingMapPoint}
          onMapPointPicked={handleMapPointPicked}
        />
      </main>

      {/* Floating Time Scrubber (Simulation Mode) */}
      {isScrubberOpen && (
        <TimeScrubber
          simulatedMinutes={simulatedMinutes ?? currentMinutesFromMidnight}
          onChangeMinutes={handleScrubberChange}
          onResetToLive={handleResetToLive}
          isLive={simulatedMinutes === null}
          solarPos={solarPos}
        />
      )}

      {/* Sun-Bath & Clinical Voucher Modal (Feature 2) */}
      {activeSession && activeSession.isModalOpen && (
        <SunBathModal
          spot={activeSession.spot}
          userLocation={userLocation}
          elapsedSeconds={activeSession.elapsedSeconds}
          isRunning={activeSession.isRunning}
          isCompleted={activeSession.isCompleted}
          geofence={sessionGeofence}
          onTeleportInside={() => handleTeleportToSpot(activeSession.spot)}
          onStepOutside={() => handleStepOutsideSpot(activeSession.spot)}
          onFastForward={handleFastForwardSession}
          onTogglePlayPause={handleTogglePlayPauseSession}
          onClose={() => setActiveSession((prev) => prev ? { ...prev, isModalOpen: false } : null)}
        />
      )}
    </div>
  );
}


