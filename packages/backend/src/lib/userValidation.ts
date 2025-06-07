/*

IF PEOPLE GET CUTE AND DECIDE TO BE INNAPPROPRIATE, WE CAN ADD A PROFANITY FILTER HERE BY DISCUSSING
BUSINESS LOGIC AND REQUIREMENTS WITH THE AUDIENCE.

*/

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { Resource } from "sst";
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * Get the current nickname for a session ID from the database
 * This ensures we always use the fresh nickname, not the stale one from session tokens
 */
export async function getCurrentNickname(sessionId: string, fallbackNickname: string): Promise<string> {
  try {
    const playerResult = await dynamoDb.send(new GetCommand({
      TableName: Resource.Players.name,
      Key: { sessionId }
    }));

    if (playerResult.Item && playerResult.Item.nickname) {
      return playerResult.Item.nickname;
    }
  } catch (error) {
    console.log(`⚠️ Could not fetch current nickname for ${sessionId}, using fallback: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return fallbackNickname;
}

export async function validateNickname(nickname: string, sessionId: string) {
    const trimmedNickname = nickname.trim();
    
    if (!nickname || trimmedNickname.length === 0) {
      throw new Error("Nickname is required");
    }
  
    if (trimmedNickname.length > 20) {
      throw new Error("Nickname must be 20 characters or less");
    }
  
    // Basic profanity filter (simple version)
    const profanityWords = ["fuck", "shit", "damn", "hell"];
    const lowercaseNickname = nickname.toLowerCase();
    if (profanityWords.some(word => lowercaseNickname.includes(word))) {
      throw new Error("Please choose a different nickname");
    }

    // Check if nickname is already taken by another player using GSI
    const nicknameResult = await dynamoDb.send(new QueryCommand({
    TableName: Resource.Players.name,
      IndexName: "NicknameIndex",
      KeyConditionExpression: "nickname = :nickname",
    ExpressionAttributeValues: {
        ":nickname": trimmedNickname
    }
  }));

    // If we found players with this nickname, check if any are different from current session
    if (nicknameResult.Items && nicknameResult.Items.length > 0) {
      const conflictingPlayers = nicknameResult.Items.filter(
        (item: any) => item.sessionId !== sessionId
      );
      
      if (conflictingPlayers.length > 0) {
    throw new Error("This nickname is already taken. Please choose a different one.");
      }
  }

  return trimmedNickname;
  }