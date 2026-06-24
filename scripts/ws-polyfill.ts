// Node < 22 has no global WebSocket, which supabase-js's realtime client needs
// to construct a client. These setup scripts don't use realtime, but importing
// this first provides the `ws` implementation so createClient() doesn't throw.
import ws from 'ws';

if (typeof (globalThis as { WebSocket?: unknown }).WebSocket === 'undefined') {
  (globalThis as { WebSocket?: unknown }).WebSocket = ws as unknown;
}
