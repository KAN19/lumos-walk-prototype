import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import SpotsSidebar from './components/SpotsSidebar';
import MapComponent from './components/MapComponent';
import TimeScrubber from './components/TimeScrubber';
import SunBathModal from './components/SunBathModal';
import { SUNNY_AREAS, DEFAULT_USER_LOCATION } from './data/sunnySpotsLodz';
import { generateSurroundingSpots } from './services/localSunSpotsService';
import { isUserInSpotArea, getPolygonCentroid } from './utils/geoUtils';
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

  // Active Sun-Soaking Session State:
  // { spot, elapsedSeconds, isRunning, isCompleted, isModalOpen }
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

  // Request actual user geolocation if available
  const handleLocateMe = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.longitude, pos.coords.latitude]);
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

  // Real-time Geofence calculation for active Sun Session:
  // Evaluates whether current userLocation is inside activeSession.spot area
  const sessionGeofence = useMemo(() => {
    if (!activeSession?.spot) return { isInside: false, distanceMeters: 999 };
    return isUserInSpotArea(userLocation, activeSession.spot);
  }, [userLocation, activeSession?.spot]);

  // CLINICAL EXPOSURE TIMER ENGINE:
  // "Only when the user is on the selected area then it counts the exposure time."
  useEffect(() => {
    if (!activeSession || !activeSession.isRunning || activeSession.isCompleted) return;

    const timer = setInterval(() => {
      // Strict geofence requirement: Only increment seconds if user is verified in the sunlit area!
      if (sessionGeofence.isInside) {
        setActiveSession((prev) => {
          if (!prev || !prev.isRunning || prev.isCompleted) return prev;
          const nextSec = prev.elapsedSeconds + 1;
          const TARGET_SECONDS = 15 * 60; // 15 mins

          if (nextSec >= TARGET_SECONDS) {
            // Trigger victory celebration confetti
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

  // Session Control Handlers
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
    // Move user ~85 meters away
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

  // Handle scrubber changes
  const handleScrubberChange = (minutes) => {
    setSimulatedMinutes(minutes);
  };

  const handleResetToLive = () => {
    setSimulatedMinutes(null);
  };

  // Convert current real time to minutes from midnight for scrubber initialization
  const currentMinutesFromMidnight = realTime.getHours() * 60 + realTime.getMinutes();

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        weather={weather}
        solarPos={solarPos}
        sunTimes={sunTimes}
        simulatedTime={simulatedMinutes !== null ? effectiveDate : null}
        isScrubberOpen={isScrubberOpen}
        onToggleScrubber={() => setIsScrubberOpen((prev) => !prev)}
      />

      {/* Main Workspace (Sidebar + Map) */}
      <main className="main-workspace">
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

        <MapComponent
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

      {/* Sun-Bath & Clinical Voucher Modal */}
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

