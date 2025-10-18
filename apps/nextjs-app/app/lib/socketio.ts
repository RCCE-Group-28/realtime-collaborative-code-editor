/**
 * Utility to emit Socket.IO events from Next.js API routes
 * by making HTTP requests to the Socket.IO server
 */

import { getSocketIOServerUrl } from "./config";

export async function emitSocketEvent(
  room: string,
  event: string,
  data: unknown,
): Promise<boolean> {
  try {
    const response = await fetch(`${getSocketIOServerUrl()}/emit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ room, event, data }),
    });

    if (!response.ok) {
      console.error(`Failed to emit socket event: ${response.statusText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error emitting socket event:", error);
    return false;
  }
}
