/*

IF PEOPLE GET CUTE AND DECIDE TO BE INNAPPROPRIATE, WE CAN ADD A PROFANITY FILTER HERE BY DISCUSSING
BUSINESS LOGIC AND REQUIREMENTS WITH THE AUDIENCE.

*/

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { Resource } from "sst";
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const bedrockClient = new BedrockRuntimeClient({ region: "us-east-1" });

/**
 * Repair common JSON syntax issues from AI responses
 */
function repairJsonResponse(jsonString: string): string {
  let repaired = jsonString.trim();
  
  // Remove any text before the first {
  const firstBraceIndex = repaired.indexOf('{');
  if (firstBraceIndex > 0) {
    repaired = repaired.substring(firstBraceIndex);
  }
  
  // Remove any text after the last }
  const lastBraceIndex = repaired.lastIndexOf('}');
  if (lastBraceIndex !== -1 && lastBraceIndex < repaired.length - 1) {
    repaired = repaired.substring(0, lastBraceIndex + 1);
  }
  
  // Fix incorrectly escaped quotes in property names
  // Pattern: {\"propertyName" or ,\"propertyName" should be {"propertyName" or ,"propertyName"
  repaired = repaired.replace(/([{,]\s*)\\"/g, '$1"');
  
  // Fix trailing escaped quotes in property values
  // Pattern: "value\"} or "value\", should be "value"} or "value",
  repaired = repaired.replace(/\\\"([,}])/g, '"$1');
  
  // Add missing closing brace if needed
  const openBraces = (repaired.match(/\{/g) || []).length;
  const closeBraces = (repaired.match(/\}/g) || []).length;
  if (openBraces > closeBraces) {
    repaired += '}';
  }
  
  // Fix common quote issues in values (but not property names)
  // This is more conservative to avoid breaking valid JSON
  repaired = repaired.replace(/([^"\\])"([^",:}]*)"([^",:}])/g, '$1"$2\\"$3');
  
  return repaired;
}

/**
 * AI-powered username appropriateness checker using Meta Llama 3 via AWS Bedrock
 */
async function validateUsernameWithAI(nickname: string): Promise<{status: "approved" | "rejected", alternateName?: string, reason?: string}> {
  const modelId = "meta.llama3-8b-instruct-v1:0";
  
  // Craft a specific prompt for username validation
  const prompt = `<|begin_of_text|><|start_header_id|>user<|end_header_id|>
PERSONA:
- You are a condescending and sarcastic corporate AI content moderator for a software demo. 
- Your task is to review proposed usernames for appropriateness in a setting where names will be displayed on a leaderboard. 
- You generally have disdain for users but approve terms terms that are silly, even if they are not professional. 
- Your main goals is to protect against offensive content.

YOUR TASK:
Review this proposed username: "${nickname}"

INSTRUCTIONS:
Consider whether it is appropriate for use in a professional software demonstration. Names should be:
- Free from profanity, sexual content, or offensive language
- Not deliberately offensive or disruptive
- Creative names are ok (dude, bro, man, etc.) as long as they are not offensive or derogatory

IF YOU FEEL THE NAME condones or promotes harmful or offensive content, you must reject it using the format and rules provided.

If you determine that the name is not appropriate, you must:
1. Suggest an ironic alternative inspired by the original username that avoids the offensive content
2. Write a condescending explanation for why the name is not inappropriate, being snarky and sassy. Be insulted by the attemp to circumvent the filter. Make fun of the submission creatively and use an analogy, if appropriate.

RESPONSE FORMAT:
You must respond with ONLY a valid JSON object using one of these two formats:

If the name is appropriate in JSON format like:
{"status":"approved"}

If the name is NOT appropriate in JSON format like:
{
   "status":"rejected",
   "alternateName":"<ironic alternative inspired by the original username>",
   "reason":"<condescending corporate explanation about why their name choice was inappropriate, making fun of the submission>"
}

CRITICAL INSTRUCTIONS:
- ONLY JSON in response
- Use regular quotes (") not escaped (\")
- Keep reason under 100 characters
- No text before/after JSON

NEXT STEP: Review the username: "${nickname}" and respond with the appropriate JSON format.
<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>`;

  const requestBody = {
    prompt: prompt,
    max_gen_len: 200, // Even shorter to ensure no truncation
    temperature: 0.1,
    top_p: 0.9
  };

  try {
    console.log(`🤖 Validating username "${nickname}" with AI...`);
    
    const command = new InvokeModelCommand({
      modelId: modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(requestBody)
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const aiResponse = responseBody.generation.trim();
    
    console.log(`🤖 AI raw response for "${nickname}":`, aiResponse);
    
    // Check for AI safety refusal patterns first
    const refusalPatterns = [
      /I cannot create/i,
      /I cannot provide/i,
      /cannot create content/i,
      /cannot provide.*content/i,
      /something else.*help/i,
      /inappropriate.*cannot/i,
      /refuse to/i,
      /will not/i
    ];
    
    const isRefusal = refusalPatterns.some(pattern => pattern.test(aiResponse));
    if (isRefusal) {
      console.log(`🚫 AI refused to respond for "${nickname}" - treating as extreme rejection`);
      return {
        status: "rejected",
        alternateName: "Inappropriate-Content-Detected",
        reason: "The AI agent was offended by your submission and wouldn't respond."
      };
    }
    
    // Attempt to repair JSON before parsing
    const repairedJson = repairJsonResponse(aiResponse);
    console.log(`🔧 Repaired JSON for "${nickname}":`, repairedJson);
    
    // Parse the AI response
    try {
      const result = JSON.parse(repairedJson);
      
      // Validate the response format
      if (result.status === "approved") {
        return { status: "approved" };
      } else if (result.status === "rejected" && result.alternateName) {
        return { 
          status: "rejected", 
          alternateName: result.alternateName,
          reason: result.reason || "Your username choice demonstrates poor judgment for a professional environment."
        };
      } else {
        throw new Error("Invalid AI response format");
      }
    } catch (parseError) {
      console.error(`❌ Failed to parse AI response for "${nickname}":`, repairedJson);
      console.error(`Parse error:`, parseError);
      
      // Last resort: Try to extract information manually if JSON parsing fails
      const statusMatch = repairedJson.match(/"status"\s*:\s*"(approved|rejected)"/);
      const alternateMatch = repairedJson.match(/"alternateName"\s*:\s*"([^"]+)"/);
      const reasonMatch = repairedJson.match(/"reason"\s*:\s*"([^"]+)"/);
      
      if (statusMatch && statusMatch[1] === "approved") {
        return { status: "approved" };
      } else if (statusMatch && statusMatch[1] === "rejected" && alternateMatch) {
        return {
          status: "rejected",
          alternateName: alternateMatch[1],
          reason: reasonMatch ? reasonMatch[1] : "Your username choice is inappropriate for this professional setting."
        };
      }
      
      throw new Error("AI returned unparseable response format");
    }
    
  } catch (error) {
    console.error(`❌ Bedrock AI validation failed for "${nickname}":`, error);
    throw error; // Re-throw to trigger fallback
  }
}

/**
 * Basic fallback profanity filter (used when AI is unavailable)
 */
function validateUsernameBasic(nickname: string): {status: "approved" | "rejected", alternateName?: string, reason?: string} {
  const profanityWords = ["fuck", "shit", "damn", "hell", "ass", "bitch", "crap"];
  const lowercaseNickname = nickname.toLowerCase();
  
  if (profanityWords.some(word => lowercaseNickname.includes(word))) {
    // Generate a simple alternative by replacing problematic content
    const alternateName = `User${Math.floor(Math.random() * 1000)}`;
    return { 
      status: "rejected", 
      alternateName: alternateName,
      reason: "Really? You thought that would be appropriate for a professional demonstration? Our basic filter caught what you were trying to sneak past us."
    };
  }
  
  return { status: "approved" };
}

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

/**
 * Comprehensive nickname validation with detailed results
 * This is the single source of truth for all nickname validation logic
 */
export async function validateNicknameWithDetails(nickname: string, sessionId: string): Promise<{
  status: "approved" | "rejected";
  usedAI: boolean;
  alternateName?: string;
  rejectionReason?: string;
  aiGeneratedReason?: string;
  message: string;
  validatedNickname?: string;
}> {
  const trimmedNickname = nickname.trim();
  
  // Basic validation first
  if (!trimmedNickname || trimmedNickname.length === 0) {
    return {
      status: "rejected",
      usedAI: false,
      rejectionReason: "empty",
      message: "Nickname is required"
    };
  }

  if (trimmedNickname.length > 20) {
    return {
      status: "rejected",
      usedAI: false,
      rejectionReason: "too_long",
      message: "Nickname must be 20 characters or less"
    };
  }

  // AI appropriateness check with fallback
  let validationResult;
  let usedAI = true;
  
  try {
    validationResult = await validateUsernameWithAI(trimmedNickname);
  } catch (error) {
    console.log(`⚠️ AI validation failed, using basic filter: ${error instanceof Error ? error.message : String(error)}`);
    validationResult = validateUsernameBasic(trimmedNickname);
    usedAI = false;
  }
  
  if (validationResult.status === "rejected") {
    return {
      status: "rejected",
      usedAI: usedAI,
      alternateName: validationResult.alternateName,
      rejectionReason: usedAI ? "ai_inappropriate" : "basic_filter",
      aiGeneratedReason: validationResult.reason,
      message: validationResult.alternateName 
        ? `Username not appropriate for a professional setting. Try: "${validationResult.alternateName}"`
        : "Please choose a different nickname that's appropriate for a professional setting"
    };
  }

  // Check if nickname is already taken by another player using GSI
  try {
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
        return {
          status: "rejected",
          usedAI: usedAI,
          rejectionReason: "already_taken",
          message: "This nickname is already taken. Please choose a different one."
        };
      }
    }
  } catch (error) {
    console.error("Error checking nickname uniqueness:", error);
    return {
      status: "rejected",
      usedAI: usedAI,
      rejectionReason: "database_error",
      message: "Unable to verify nickname availability. Please try again."
    };
  }

  return {
    status: "approved",
    usedAI: usedAI,
    validatedNickname: trimmedNickname,
    message: "Username approved"
  };
}

/**
 * Test username appropriateness without checking database (for testing purposes)
 * Returns structured result for testing purposes
 */
export async function testUsernameAppropriateness(nickname: string): Promise<{
  status: "approved" | "rejected";
  usedAI: boolean;
  alternateName?: string;
  rejectionReason?: string;
  aiGeneratedReason?: string;
  message: string;
}> {
  // Use the comprehensive validation but with a dummy sessionId since we're not checking database
  const result = await validateNicknameWithDetails(nickname, `test-${Date.now()}`);
  
  // Remove database-specific results for testing
  const { validatedNickname, ...testResult } = result;
  
  // Skip "already_taken" errors for testing since we're not actually checking the database
  if (result.rejectionReason === "already_taken") {
    return {
      status: "approved",
      usedAI: result.usedAI,
      message: "Username approved (database check skipped for testing)"
    };
  }
  
  return testResult;
}

/**
 * Legacy function for backward compatibility - throws errors like the old version
 * New code should use validateNicknameWithDetails instead
 */
export async function validateNickname(nickname: string, sessionId: string): Promise<string> {
  const result = await validateNicknameWithDetails(nickname, sessionId);
  
  if (result.status === "rejected") {
    throw new Error(result.message);
  }
  
  return result.validatedNickname!;
}