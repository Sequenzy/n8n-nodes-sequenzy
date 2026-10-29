export const SEQUENZY_PRODUCTION_API_BASE_URL =
  "https://api.sequenzy.com/api/v1";

// Verified community nodes may not read environment variables, so the local
// development override lives in the optional credential field instead.
// Credentials saved before that field existed have no value and use production.
export function getSequenzyApiBaseUrl(configuredBaseUrl?: unknown): string {
  const baseUrl =
    typeof configuredBaseUrl === "string" ? configuredBaseUrl.trim() : "";

  if (!baseUrl) {
    return SEQUENZY_PRODUCTION_API_BASE_URL;
  }

  return baseUrl.replace(/\/+$/, "");
}
