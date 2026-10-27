/**
 * Resolves the backend base URL dynamically:
 * - In local development (`npm run dev`), defaults to http://localhost:8000 unless overridden.
 * - In production (`npm run build`), if VITE_BACKEND_URL is not set or set to localhost,
 *   it uses an empty string "" so that all fetch() calls use relative paths (e.g. `/api/v1/...`).
 *   This ensures reverse proxies (like Traefik or Nginx) route seamlessly without CORS or mixed-content issues.
 */
export function getBackendBaseUrl() {
  const envUrl = (import.meta.env.VITE_BACKEND_URL || '').trim();
  if (import.meta.env.PROD) {
    if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
      return '';
    }
    return envUrl;
  }
  return envUrl || 'http://localhost:8000';
}
