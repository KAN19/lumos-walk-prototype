import { getDistanceMeters } from '../utils/geoUtils';

/**
 * Generates an accurate polygon footprint representing the ground area
 * exposed to direct sunlight around a bench, projected along the solar azimuth.
 *
 * @param {[number, number]} center [lng, lat]
 * @param {number} azimuthDeg Solar azimuth in degrees
 * @param {number} elevationDeg Solar elevation in degrees
 * @param {number} widthMeters Width of the unshaded open space corridor
 * @param {number} lengthMeters Length of the sunlit ground patch
 * @returns {Array<[number, number]>} Closed polygon coordinates
 */
export function generateSunlitExposurePolygon(center, azimuthDeg, elevationDeg, widthMeters = 24, lengthMeters = 38) {
  const [lng, lat] = center;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((lat * Math.PI) / 180);

  // Azimuth angle in radians (from North clockwise)
  const azRad = (azimuthDeg * Math.PI) / 180;

  // Sun beam direction vector pointing toward the bench:
  // Incoming sunlight comes from azimuthDeg, so sun rays travel toward (azimuthDeg + 180)
  const rayDirX = Math.sin(azRad + Math.PI);
  const rayDirY = Math.cos(azRad + Math.PI);

  // Perpendicular vector for corridor width
  const perpX = -rayDirY;
  const perpY = rayDirX;

  const halfWidth = widthMeters / 2;

  // Define 6-point convex footprint of the sunlit ground area:
  // 1. Back-left corner (near obstruction edge)
  // 2. Front-left corner (extended along unshaded ground)
  // 3. Front tip (maximum solar penetration)
  // 4. Front-right corner
  // 5. Back-right corner
  // 6. Back anchor
  const relativePointsMeters = [
    [-halfWidth * perpX - 4 * rayDirX, -halfWidth * perpY - 4 * rayDirY],
    [-halfWidth * 0.9 * perpX + lengthMeters * 0.7 * rayDirX, -halfWidth * 0.9 * perpY + lengthMeters * 0.7 * rayDirY],
    [0 + lengthMeters * rayDirX, 0 + lengthMeters * rayDirY],
    [halfWidth * 0.9 * perpX + lengthMeters * 0.7 * rayDirX, halfWidth * 0.9 * perpY + lengthMeters * 0.7 * rayDirY],
    [halfWidth * perpX - 4 * rayDirX, halfWidth * perpY - 4 * rayDirY],
    [-halfWidth * perpX - 4 * rayDirX, -halfWidth * perpY - 4 * rayDirY] // Close polygon
  ];

  return relativePointsMeters.map(([dx, dy]) => [
    lng + dx / metersPerDegLng,
    lat + dy / metersPerDegLat
  ]);
}

/**
 * Generates surrounding neighborhood bench spots and clear-sky pockets
 * within 50m to 400m of the user's current GPS location.
 */
export function generateSurroundingSpots(userLocation, solarPos) {
  const [uLng, uLat] = userLocation;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((uLat * Math.PI) / 180);

  // Offset configurations around user (distance and relative bearings)
  const spotConfigs = [
    {
      idPrefix: 'bench-south-glade',
      name: 'South-Facing Garden Benches',
      category: 'bench',
      categoryLabel: 'Neighborhood Bench',
      relDistMeters: 85,
      bearingDeg: 165, // South-South-East (catches prime midday sun)
      skyViewFactor: 0.91,
      minSunElevation: 9,
      azimuthRange: [120, 240],
      widthMeters: 26,
      lengthMeters: 42,
      seatingType: 'Dual wooden benches with backrests',
      windShielding: 'Medium (enclosed by residential hedge)',
      description: 'Quiet neighborhood seating pocket with a wide, clear view of the southern sky. Completely unobstructed by trees or tall buildings.',
      cafe: {
        name: 'Local Bakery & Coffee Kiosk',
        distance: '90m away',
        perk: '10% off Hot Cinnamon Drip Coffee',
        code: 'LUMOS-LOCAL10'
      }
    },
    {
      idPrefix: 'bench-open-terrace',
      name: 'Open Sky Corner Loungers',
      category: 'bench',
      categoryLabel: 'Pocket Parklet',
      relDistMeters: 140,
      bearingDeg: 200, // South-South-West
      skyViewFactor: 0.88,
      minSunElevation: 12,
      azimuthRange: [130, 230],
      widthMeters: 22,
      lengthMeters: 36,
      seatingType: 'Public curved teak benches',
      windShielding: 'High (brick retaining wall at rear)',
      description: 'Elevated sidewalk nook with an open horizon. Receives steady winter sunlight throughout late morning and early afternoon.',
      cafe: {
        name: 'Corner Espresso Bar',
        distance: '110m away',
        perk: 'Free oat milk upgrade on hot drinks',
        code: 'LUMOS-CORNER'
      }
    },
    {
      idPrefix: 'plaza-courtyard-pocket',
      name: 'Sunlit Courtyard Clearing',
      category: 'courtyard',
      categoryLabel: 'Sunny Pocket Glade',
      relDistMeters: 210,
      bearingDeg: 140, // South-East
      skyViewFactor: 0.84,
      minSunElevation: 14,
      azimuthRange: [125, 215],
      widthMeters: 32,
      lengthMeters: 48,
      seatingType: 'Park benches facing central sun lawn',
      windShielding: 'Maximum (shielded from north winds)',
      description: 'Sheltered interior green courtyard with clear southern gap between tenement buildings. Excellent wind protection on chilly days.',
      cafe: {
        name: 'Café & Pastry Shop',
        distance: '160m away',
        perk: '15% off Hot Spiced Winter Cider',
        code: 'LUMOS-GLADE15'
      }
    },
    {
      idPrefix: 'bench-promenade-nook',
      name: 'Clear-Sky Promenade Benches',
      category: 'bench',
      categoryLabel: 'Sidewalk Sun-Spot',
      relDistMeters: 290,
      bearingDeg: 180, // Pure South
      skyViewFactor: 0.93,
      minSunElevation: 8,
      azimuthRange: [110, 250],
      widthMeters: 30,
      lengthMeters: 55,
      seatingType: 'Granite seating ledges & wooden benches',
      windShielding: 'Low (wide open street vista)',
      description: 'Broad pedestrian sidewalk vista facing directly south. Maximum open sky factor with uninterrupted daylight until twilight.',
      cafe: {
        name: 'Artisan Roastery',
        distance: '180m away',
        perk: '20% off Hot Winter Cocoa',
        code: 'LUMOS-ROAST20'
      }
    },
    {
      idPrefix: 'park-mini-meadow',
      name: 'Neighborhood Greenery Sun Spot',
      category: 'park',
      categoryLabel: 'Pocket Park Clearing',
      relDistMeters: 360,
      bearingDeg: 220, // South-West (late afternoon sun)
      skyViewFactor: 0.95,
      minSunElevation: 10,
      azimuthRange: [135, 245],
      widthMeters: 40,
      lengthMeters: 60,
      seatingType: 'Ergonomic wooden loungers',
      windShielding: 'Medium',
      description: 'Open grassy micro-park with wide sky visibility. Ideal for afternoon sun absorption before sunset.',
      cafe: {
        name: 'Bistro & Tea House',
        distance: '230m away',
        perk: 'Free ginger honey spoon with hot tea',
        code: 'LUMOS-GINGER'
      }
    }
  ];

  return spotConfigs.map((cfg) => {
    // Calculate spot coordinate offset from user GPS
    const bRad = (cfg.bearingDeg * Math.PI) / 180;
    const dx = cfg.relDistMeters * Math.sin(bRad);
    const dy = cfg.relDistMeters * Math.cos(bRad);

    const spotCoord = [
      uLng + dx / metersPerDegLng,
      uLat + dy / metersPerDegLat
    ];

    // Compute dynamic sunlit exposure polygon oriented with the sun
    const exposurePolygon = generateSunlitExposurePolygon(
      spotCoord,
      solarPos.azimuthDeg,
      solarPos.elevationDeg,
      cfg.widthMeters,
      cfg.lengthMeters
    );

    const areaSquareMeters = Math.round(cfg.widthMeters * cfg.lengthMeters * 0.82);

    return {
      id: `${cfg.idPrefix}-${Math.round(uLng * 1000)}-${Math.round(uLat * 1000)}`,
      name: cfg.name,
      category: cfg.category,
      categoryLabel: cfg.categoryLabel,
      isHyperLocal: true,
      address: `Within ${cfg.relDistMeters}m of your location`,
      coordinates: spotCoord,
      polygon: exposurePolygon,
      sunlitAreaM2: areaSquareMeters,
      skyViewFactor: cfg.skyViewFactor,
      minSunElevation: cfg.minSunElevation,
      azimuthRange: cfg.azimuthRange,
      seatingType: cfg.seatingType,
      windShielding: cfg.windShielding,
      description: cfg.description,
      partnerCafe: {
        name: cfg.cafe.name,
        distance: cfg.cafe.distance,
        address: 'Nearby Partner',
        perk: cfg.cafe.perk,
        code: cfg.cafe.code
      }
    };
  });
}
