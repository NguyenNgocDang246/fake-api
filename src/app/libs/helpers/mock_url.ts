// Read inline because NEXT_PUBLIC_* is substituted at build time and a computed key would not be.
// `||`, not `??`: an empty value has to fall back too, or `new URL("")` throws at module load.
const APP_URL = new URL(process.env["NEXT_PUBLIC_DOMAIN"] || "http://localhost:3000");

// The two halves a mock host is built from, exported so a component can tint the id between
// them. `host` carries the port, which is what makes `{id}.localhost:3000` come out right.
export const MOCK_URL_PREFIX = `${APP_URL.protocol}//`;
export const MOCK_HOST_SUFFIX = `.${APP_URL.host}`;

// `projectId` and `path` are inserted verbatim, so docs pages can pass placeholders
// such as "{projectId}" instead of a real id. Built by concatenation rather than through
// `URL`, whose host setter drops a value holding characters no hostname may carry.
function mockBaseUrl(projectId: string): string {
  return `${MOCK_URL_PREFIX}${projectId}${MOCK_HOST_SUFFIX}`;
}

export function mockEndpointUrl(projectId: string, path: string): string {
  return `${mockBaseUrl(projectId)}${path}`;
}
