// Single source for the public mock-endpoint URL, shared by server components and
// client components alike. Everything that shows a user where their mock lives goes
// through here, so pointing mocks at another host later is a one-file change.
//
// process.env["NEXT_PUBLIC_DOMAIN"] is written inline on purpose: NEXT_PUBLIC_* values
// are substituted at build time, and a computed key would not be substituted at all.
const MOCK_BASE_URL = process.env["NEXT_PUBLIC_DOMAIN"] ?? "http://localhost:3000";

export function mockBaseUrl(): string {
  return MOCK_BASE_URL;
}

/**
 * Build the public URL of one mock endpoint.
 *
 * `projectId` and `path` are inserted verbatim, so docs pages can pass placeholders
 * such as "{projectId}" instead of a real id.
 */
export function mockEndpointUrl(projectId: string, path: string): string {
  return `${MOCK_BASE_URL}/${projectId}${path}`;
}
