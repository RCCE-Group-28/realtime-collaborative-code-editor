/**
 * Configuration helper functions to retrieve environment variables.
 * These functions ensure consistency and provide resistance to env misconfiguration.
 */

/**
 * Get the Socket.IO server URL
 * The priority is given to runtime-specific variables.
 */
export function getSocketIOServerUrl(): string {
  const socketioUrl =
    process.env.SOCKETIO_SERVER_URL ||
    process.env.NEXT_PUBLIC_SOCKETIO_SERVER_URL;
  if (!socketioUrl) {
    throw new Error("Socket.IO server URL is not available.");
  }
  return socketioUrl;
}

/**
 * Get the Yjs WebSocket server URL
 * The priority is given to runtime-specific variables.
 */
export function getYjsServerUrl(): string {
  const yjsUrl =
    process.env.YJS_SERVER_URL || process.env.NEXT_PUBLIC_YJS_SERVER_URL;
  if (!yjsUrl) {
    throw new Error("Yjs server URL is not available.");
  }
  return yjsUrl;
}
