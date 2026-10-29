export const SEQUENZY_PRODUCTION_API_BASE_URL =
  "https://api.sequenzy.com/api/v1";

type SequenzyEnvironment = Readonly<Record<string, string | undefined>>;

export function getSequenzyApiBaseUrl(
  // n8n Cloud does not expose custom environment variables. This narrowly
  // scoped override is for self-hosted/local node development only.
  // eslint-disable-next-line @n8n/community-nodes/no-restricted-globals
  environment: SequenzyEnvironment = process.env
): string {
  const configuredBaseUrl = environment["SEQUENZY_API_BASE_URL"]?.trim();

  if (!configuredBaseUrl) {
    return SEQUENZY_PRODUCTION_API_BASE_URL;
  }

  return configuredBaseUrl.replace(/\/+$/, "");
}
