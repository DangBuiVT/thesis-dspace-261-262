export default function globalSetup() {
  if (process.env.PORTAL_URL || process.env.API_URL) {
    if (!process.env.PORTAL_URL || !process.env.API_URL) {
      throw new Error("Remote tests need both PORTAL_URL and API_URL.");
    }
    return;
  }
  // Local setup is performed by start-test-api.cjs before the server starts.
}
