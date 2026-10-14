import { LODZ_CENTER } from '../data/sunnySpotsLodz';

const OPEN_METEO_URL = `https://api.open-meteo.com/v1/forecast?latitude=${LODZ_CENTER.lat}&longitude=${LODZ_CENTER.lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,cloud_cover,cloud_cover_low,direct_normal_irradiance,diffuse_radiation,uv_index,wind_speed_10m&timezone=Europe%2FWarsaw`;

export const DEFAULT_WEATHER = {
  temperature: 3.5,
  apparentTemperature: 0.8,
  cloudCover: 45, // %
  lowCloudCover: 30, // %
  directIrradiance: 310, // W/m²
  diffuseRadiation: 120, // W/m²
  uvIndex: 1.4,
  windSpeed: 12, // km/h
  isSzaruga: false, // Polish gray overcast condition (cloudCover > 80%)
  conditionText: 'Partly Sunny Winter Daylight',
  updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

/**
 * Fetches real-time microclimate and solar irradiance data for central Łódź.
 */
export async function fetchLodzWeather() {
  try {
    const res = await fetch(OPEN_METEO_URL);
    if (!res.ok) throw new Error(`Weather fetch failed: ${res.statusText}`);
    const data = await res.json();
    const curr = data.current;

    const cloud = curr.cloud_cover ?? 45;
    const isSzaruga = cloud >= 80;
    const directRad = curr.direct_normal_irradiance ?? 250;

    let conditionText = 'Bright Winter Sun';
    if (isSzaruga) {
      conditionText = 'Szaruga (Dense Polish Winter Overcast)';
    } else if (cloud > 50) {
      conditionText = 'Scattered Clouds & Sunny Windows';
    } else if (cloud > 20) {
      conditionText = 'Mostly Clear Daylight';
    }

    return {
      temperature: Math.round((curr.temperature_2m ?? 3.5) * 10) / 10,
      apparentTemperature: Math.round((curr.apparent_temperature ?? 1) * 10) / 10,
      cloudCover: cloud,
      lowCloudCover: curr.cloud_cover_low ?? 20,
      directIrradiance: Math.round(directRad),
      diffuseRadiation: Math.round(curr.diffuse_radiation ?? 110),
      uvIndex: curr.uv_index ?? 1.2,
      windSpeed: Math.round(curr.wind_speed_10m ?? 12),
      isSzaruga,
      conditionText,
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  } catch (err) {
    console.warn('Using default Łódź winter weather model:', err);
    return DEFAULT_WEATHER;
  }
}
