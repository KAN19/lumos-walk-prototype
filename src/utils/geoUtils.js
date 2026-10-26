/**
 * Calculates Great-Circle distance between two coordinates in meters (Haversine formula).
 * @param {[number, number]} coord1 [lng, lat]
 * @param {[number, number]} coord2 [lng, lat]
 * @returns {number} distance in meters
 */
export function getDistanceMeters(coord1, coord2) {
  if (!coord1 || !coord2) return 0;
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  const R = 6371000; // Radius of Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Formats distance and walking time (assuming average winter pedestrian speed of ~4.5 km/h = 75 m/min).
 * @param {number} meters
 * @returns {{ distanceText: string, walkMinutes: number, fullText: string }}
 */
export function formatWalkDistance(meters) {
  const walkMinutes = Math.max(1, Math.round(meters / 75));
  let distanceText = `${meters} m`;
  if (meters >= 1000) {
    distanceText = `${(meters / 1000).toFixed(1)} km`;
  }
  return {
    distanceText,
    walkMinutes,
    fullText: `${distanceText} • ${walkMinutes} min walk`
  };
}

/**
 * Converts sunny spots array into a GeoJSON FeatureCollection.
 * If selectedSpotId is provided, ONLY that clicked spot's polygon is generated,
 * keeping the map clear and revealing the sunlit area on icon click.
 */
export function spotsToGeoJson(spots, windowsBySpotId, selectedSpotId) {
  if (!selectedSpotId) {
    return { type: 'FeatureCollection', features: [] };
  }

  const activeSpots = spots.filter((s) => s.id === selectedSpotId);

  return {
    type: 'FeatureCollection',
    features: activeSpots.map((spot) => {
      const win = windowsBySpotId[spot.id];
      const isSunny = win?.status === 'sunny';

      return {
        type: 'Feature',
        id: spot.id,
        properties: {
          id: spot.id,
          name: spot.name,
          categoryLabel: spot.categoryLabel,
          status: win?.status || 'shaded',
          isSunny,
          isSelected: true,
          label: win?.label || '',
          skyViewFactor: spot.skyViewFactor
        },
        geometry: {
          type: 'Polygon',
          coordinates: [spot.polygon]
        }
      };
    })
  };
}

/**
 * 2D Point-in-Polygon Ray Casting algorithm (Jordan Curve Theorem).
 * Determines if point [lng, lat] is strictly within a closed polygon ring.
 * @param {[number, number]} point [lng, lat]
 * @param {Array<[number, number]>} polygon Array of [lng, lat]
 * @returns {boolean}
 */
export function isPointInPolygon(point, polygon) {
  if (!point || !polygon || polygon.length < 3) return false;
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Calculates whether user GPS location is inside a sunny spot area,
 * including a realistic urban buffer tolerance (default: 12 meters).
 *
 * @param {[number, number]} userLocation [lng, lat]
 * @param {object} spot The spot object with coordinates and polygon
 * @param {number} bufferMeters Urban tolerance buffer in meters
 * @returns {{ isInside: boolean, distanceMeters: number }}
 */
export function isUserInSpotArea(userLocation, spot, bufferMeters = 12) {
  if (!userLocation || !spot) {
    return { isInside: false, distanceMeters: 999 };
  }

  // 1. Precise Ray-Casting Polygon check
  if (spot.polygon && spot.polygon.length >= 3) {
    const strictlyInside = isPointInPolygon(userLocation, spot.polygon);
    if (strictlyInside) {
      return { isInside: true, distanceMeters: 0 };
    }

    // Check distance to closest polygon vertex
    let minVertexDist = Infinity;
    for (const vertex of spot.polygon) {
      const d = getDistanceMeters(userLocation, vertex);
      if (d < minVertexDist) minVertexDist = d;
    }

    if (minVertexDist <= bufferMeters) {
      return { isInside: true, distanceMeters: Math.round(minVertexDist) };
    }

    return { isInside: false, distanceMeters: Math.max(1, Math.round(minVertexDist - bufferMeters)) };
  }

  // 2. Centroid distance check as fallback
  if (spot.coordinates) {
    const dist = getDistanceMeters(userLocation, spot.coordinates);
    const radius = Math.sqrt((spot.sunlitAreaM2 || 350) / Math.PI) + bufferMeters;
    if (dist <= radius) {
      return { isInside: true, distanceMeters: 0 };
    }
    return { isInside: false, distanceMeters: Math.round(dist - radius) };
  }

  return { isInside: false, distanceMeters: 999 };
}

/**
 * Calculates geometric center (centroid) of a polygon.
 * @param {Array<[number, number]>} polygon
 * @returns {[number, number]} [lng, lat]
 */
export function getPolygonCentroid(polygon) {
  if (!polygon || polygon.length === 0) return [19.4574, 51.7678];
  let sumLng = 0;
  let sumLat = 0;
  // Ignore duplicate closing vertex if present
  const pts = polygon.slice(0, polygon.length - 1);
  pts.forEach(([lng, lat]) => {
    sumLng += lng;
    sumLat += lat;
  });
  return [sumLng / pts.length, sumLat / pts.length];
}

/**
 * Approximates ground area in square meters (m²) of a geographic polygon ring using Shoelace projection.
 * @param {Array<[number, number]>} polygon Array of [lng, lat]
 * @returns {number} area in square meters
 */
export function getPolygonAreaM2(polygon) {
  if (!polygon || polygon.length < 3) return 0;
  let area = 0;
  const latFactor = 111320;
  const [refLng, refLat] = polygon[0];
  const lngFactor = 111320 * Math.cos((refLat * Math.PI) / 180);

  for (let i = 0; i < polygon.length - 1; i++) {
    const x1 = (polygon[i][0] - refLng) * lngFactor;
    const y1 = (polygon[i][1] - refLat) * latFactor;
    const x2 = (polygon[i + 1][0] - refLng) * lngFactor;
    const y2 = (polygon[i + 1][1] - refLat) * latFactor;
    area += x1 * y2 - x2 * y1;
  }
  return Math.round(Math.abs(area / 2));
}

