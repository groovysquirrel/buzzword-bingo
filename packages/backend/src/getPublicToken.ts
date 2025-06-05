import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "./lib/handler";
import { createPublicToken, generateDeviceId } from "./lib/token";

/**
 * Generate a public access token for status boards
 * 
 * This endpoint allows status boards to get read-only access to leaderboard data
 * without requiring user authentication. It generates a device-specific token
 * that can be stored in localStorage.
 */
async function getPublicToken(event: APIGatewayProxyEvent) {
  try {
    const body = JSON.parse(event.body || "{}");
    let { deviceId } = body;

    // Generate a new device ID if not provided
    if (!deviceId) {
      deviceId = generateDeviceId();
    }

    // Create a public access token for this device
    const publicToken = createPublicToken(deviceId);

    console.log(`Generated public token for device: ${deviceId}`);

    return JSON.stringify({
      success: true,
      deviceId,
      publicToken,
      permissions: ["read_leaderboard", "read_events"],
      expiresAt: null, // Public tokens don't expire (for now)
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Public token generation error:", error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate public token",
      timestamp: new Date().toISOString(),
    });
  }
}

export const main = handler(getPublicToken); 