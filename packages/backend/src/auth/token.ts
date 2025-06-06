import { createHmac, randomUUID } from "crypto";
import { SessionTokenPayload } from "./types";

// Secret key for HMAC signing - in production this should be from environment
const SECRET_KEY = process.env.SESSION_SECRET || "buzzword-bingo-secret-key-dev";
const PUBLIC_SECRET = process.env.PUBLIC_SECRET || "buzzword-bingo-public-key-dev";

/**
 * Public access token payload for status boards
 */
export interface PublicTokenPayload {
  deviceId: string;
  type: "public";
  createdAt: string;
  permissions: string[]; // ["read_leaderboard", "read_events"]
}

/**
 * Generate a new session ID
 */
export function generateSessionId(): string {
  return randomUUID();
}

/**
 * Generate a device ID for public access
 */
export function generateDeviceId(): string {
  return `device-${randomUUID()}`;
}

/**
 * Create a signed session token using HMAC
 */
export function createSessionToken(payload: SessionTokenPayload): string {
  const payloadString = JSON.stringify(payload);
  const signature = createHmac("sha256", SECRET_KEY)
    .update(payloadString)
    .digest("hex");
  
  // Return base64 encoded payload + signature
  const tokenData = {
    payload: payloadString,
    signature,
  };
  
  return Buffer.from(JSON.stringify(tokenData)).toString("base64");
}

/**
 * Create a public access token for status boards
 */
export function createPublicToken(deviceId: string): string {
  const payload: PublicTokenPayload = {
    deviceId,
    type: "public",
    createdAt: new Date().toISOString(),
    permissions: ["read_leaderboard", "read_events"]
  };

  const payloadString = JSON.stringify(payload);
  const signature = createHmac("sha256", PUBLIC_SECRET)
    .update(payloadString)
    .digest("hex");
  
  // Return base64 encoded payload + signature
  const tokenData = {
    payload: payloadString,
    signature,
  };
  
  return Buffer.from(JSON.stringify(tokenData)).toString("base64");
}

/**
 * Verify and decode a session token
 */
export function verifySessionToken(token: string): SessionTokenPayload | null {
  try {
    const tokenData = JSON.parse(Buffer.from(token, "base64").toString());
    const { payload, signature } = tokenData;
    
    // Verify signature
    const expectedSignature = createHmac("sha256", SECRET_KEY)
      .update(payload)
      .digest("hex");
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    // Parse and return payload
    return JSON.parse(payload) as SessionTokenPayload;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

/**
 * Verify and decode a public access token
 */
export function verifyPublicToken(token: string): PublicTokenPayload | null {
  try {
    const tokenData = JSON.parse(Buffer.from(token, "base64").toString());
    const { payload, signature } = tokenData;
    
    // Verify signature
    const expectedSignature = createHmac("sha256", PUBLIC_SECRET)
      .update(payload)
      .digest("hex");
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    // Parse and return payload
    const parsedPayload = JSON.parse(payload) as PublicTokenPayload;
    
    // Verify it's actually a public token
    if (parsedPayload.type !== "public") {
      return null;
    }
    
    return parsedPayload;
  } catch (error) {
    console.error("Public token verification failed:", error);
    return null;
  }
}

/**
 * Verify either a session token or public token
 * Returns unified result indicating the type and data
 */
export function verifyAnyToken(token: string): { type: "user", data: SessionTokenPayload } | { type: "public", data: PublicTokenPayload } | null {
  // Try session token first
  const sessionToken = verifySessionToken(token);
  if (sessionToken) {
    return { type: "user", data: sessionToken };
  }
  
  // Try public token
  const publicToken = verifyPublicToken(token);
  if (publicToken) {
    return { type: "public", data: publicToken };
  }
  
  return null;
}

/**
 * Extract session info from API Gateway event headers
 */
export function extractSessionFromHeaders(headers: Record<string, string | undefined>): SessionTokenPayload | null {
  const authHeader = headers.authorization || headers.Authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  const token = authHeader.substring(7); // Remove "Bearer " prefix
  return verifySessionToken(token);
}

/**
 * Generate a random secret word for bingo winners
 */
export function generateSecretWord(): string {
  const adjectives = ["Agile", "Digital", "Synergistic", "Innovative", "Disruptive", "Cloud", "AI-Powered"];
  const nouns = ["Pipeline", "Framework", "Ecosystem", "Platform", "Solution", "Paradigm", "Transformation"];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${adjective} ${noun}`;
} 