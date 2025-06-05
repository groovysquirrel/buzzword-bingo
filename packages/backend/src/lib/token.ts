import { createHmac, randomUUID } from "crypto";
import { SessionTokenPayload } from "./types";

// Secret key for HMAC signing - in production this should be from environment
const SECRET_KEY = process.env.SESSION_SECRET || "buzzword-bingo-secret-key-dev";

/**
 * Generate a new session ID
 */
export function generateSessionId(): string {
  return randomUUID();
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