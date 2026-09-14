/**
 * Returns the full API URL for a given endpoint.
 * If VITE_API_URL is configured, it prepends the base URL.
 * Otherwise returns the relative endpoint as-is for local Vite proxy forwarding.
 */
export function getApiUrl(endpoint: string): string {
  const baseUrl = import.meta.env.VITE_API_URL;
  if (baseUrl && baseUrl.trim()) {
    const cleanBase = baseUrl.trim().replace(/\/+$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${cleanBase}${cleanEndpoint}`;
  }
  return endpoint;
}
