/**
 * Central API utility.
 *
 * Locally:      VITE_API_URL is empty → relative paths like "/api/..." are used
 *               and Vite's dev-server proxy forwards them to http://localhost:3000.
 *
 * Production:   VITE_API_URL is set to "https://hr-gybe.onrender.com" in Vercel's
 *               environment variables, so every fetch becomes an absolute URL to
 *               the Render backend.
 */
const BASE_URL = (import.meta.env.VITE_API_URL as string) || "";

export function apiUrl(path: string): string {
  // Ensure no double-slash when BASE_URL is set
  return `${BASE_URL}${path}`;
}
