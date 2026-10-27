import SunCalc from 'suncalc';
import { LODZ_CENTER } from '../data/sunnySpotsLodz';

/**
 * Resolves a Date and ISO string for a given hour in Łódź (Europe/Warsaw timezone).
 * When hour is null, returns the current instant in Łódź.
 */
export function getLodzDateTime(hour = null, minute = 0) {
  const now = new Date();
  const lodzYMD = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Warsaw',
    timeZoneName: 'longOffset'
  }).formatToParts(now);
  const offsetPart = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT+01:00';
  const tzOffset = offsetPart.replace('GMT', '');

  if (hour === null) {
    return {
      date: now,
      isoString: now.toISOString(),
      isoWithOffset: now.toISOString(),
      lodzYMD,
      tzOffset
    };
  }

  const hStr = String(Math.floor(hour)).padStart(2, '0');
  const mStr = String(Math.floor(minute)).padStart(2, '0');
  const isoWithOffset = `${lodzYMD}T${hStr}:${mStr}:00${tzOffset}`;
  const targetDate = new Date(isoWithOffset);

  return {
    date: targetDate,
    isoString: targetDate.toISOString(),
    isoWithOffset,
    lodzYMD,
    tzOffset
  };
}

/**
 * Returns the current hour and minute in Łódź local time (Europe/Warsaw timezone).
 */
export function getLodzCurrentTimeParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Warsaw',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? now.getHours());
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? now.getMinutes());
  return { hour, minute };
}

/**
 * Converts SunCalc's azimuth (where 0 is South, -pi/2 is East)
 * to standard compass bearing (0° North, 90° East, 180° South, 270° West).
 */
export function getCompassSolarPosition(date, lat = LODZ_CENTER.lat, lng = LODZ_CENTER.lng) {
  const d = date instanceof Date ? date : new Date(date);
  const sunPos = SunCalc.getPosition(d, lat, lng);
  const elevationDeg = (sunPos.altitude * 180) / Math.PI;
  // SunCalc returns azimuth: 0 = South, -PI = North, -PI/2 = East, PI/2 = West
  // Standard compass bearing: 0 = North, 90 = East, 180 = South, 270 = West
  let compassBearing = ((sunPos.azimuth * 180) / Math.PI + 180) % 360;
  if (compassBearing < 0) compassBearing += 360;

  return {
    elevationDeg: Math.round(elevationDeg * 10) / 10,
    azimuthDeg: Math.round(compassBearing * 10) / 10,
    rawAltitude: sunPos.altitude,
    rawAzimuth: sunPos.azimuth,
    datetime: d.toISOString()
  };
}

/**
 * Checks whether a specific spot is in direct sunlight at a given timestamp,
 * based on its minimum elevation threshold and azimuth window.
 */
export function isSpotInSun(spot, date, lat = LODZ_CENTER.lat, lng = LODZ_CENTER.lng) {
  const { elevationDeg, azimuthDeg } = getCompassSolarPosition(date, lat, lng);

  // If sun is below horizon or below local building obstruction envelope
  if (elevationDeg < spot.minSunElevation) {
    return false;
  }

  // Check if solar compass azimuth falls within the open southern corridor
  const [minAz, maxAz] = spot.azimuthRange;
  return azimuthDeg >= minAz && azimuthDeg <= maxAz;
}

/**
 * Computes the "Sun Window" countdown:
 * If currently sunny: finds when the shadow will arrive and calculates remaining minutes.
 * If currently in shade: finds when the sun will hit the spot and calculates countdown.
 */
export function calculateSunWindow(spot, currentTime = new Date()) {
  const currentlyInSun = isSpotInSun(spot, currentTime);
  const stepMs = 2 * 60 * 1000; // 2 minute resolution
  const maxLookaheadMs = 4 * 60 * 60 * 1000; // Look ahead up to 4 hours

  if (currentlyInSun) {
    // Look ahead to find shadow onset
    let probeTime = new Date(currentTime.getTime());
    const limit = currentTime.getTime() + maxLookaheadMs;

    while (probeTime.getTime() < limit) {
      probeTime = new Date(probeTime.getTime() + stepMs);
      if (!isSpotInSun(spot, probeTime)) {
        const remainingMinutes = Math.max(1, Math.round((probeTime.getTime() - currentTime.getTime()) / 60000));
        return {
          status: 'sunny',
          minutesRemaining: remainingMinutes,
          transitionTime: probeTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          label: `☀️ In the Sun for another ${remainingMinutes} min`,
          subtext: `Shadow arrives around ${probeTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        };
      }
    }

    return {
      status: 'sunny',
      minutesRemaining: 180,
      transitionTime: 'Sunset',
      label: '☀️ In continuous sunlight until sunset',
      subtext: 'Unobstructed sky view'
    };
  } else {
    // Currently in shade; check if it will enter sun later
    let probeTime = new Date(currentTime.getTime());
    const limit = currentTime.getTime() + maxLookaheadMs;

    while (probeTime.getTime() < limit) {
      probeTime = new Date(probeTime.getTime() + stepMs);
      if (isSpotInSun(spot, probeTime)) {
        const minutesUntilSun = Math.max(1, Math.round((probeTime.getTime() - currentTime.getTime()) / 60000));
        return {
          status: 'shaded',
          minutesRemaining: minutesUntilSun,
          transitionTime: probeTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          label: `🌥️ In shade — Sun hits in ${minutesUntilSun} min`,
          subtext: `Direct light arrives at ${probeTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        };
      }
    }

    return {
      status: 'shaded',
      minutesRemaining: 0,
      transitionTime: 'Tomorrow',
      label: '🌥️ In shade for the rest of today',
      subtext: 'Obstructed by southern building profile'
    };
  }
}

/**
 * Returns astronomical day milestones for Łódź (Sunrise, Sunset, Golden Hour, Solar Noon)
 */
export function getLodzSunTimes(date = new Date()) {
  const times = SunCalc.getTimes(date, LODZ_CENTER.lat, LODZ_CENTER.lng);
  return {
    sunrise: times.sunrise ? times.sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '07:30',
    sunset: times.sunset ? times.sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '16:05',
    solarNoon: times.solarNoon ? times.solarNoon.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '11:47',
    goldenHour: times.goldenHour ? times.goldenHour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '15:20'
  };
}
