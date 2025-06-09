import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ScanCommand, PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * Game Configuration Interface
 */
interface GameSettings {
  gridSize: "3x3" | "4x4" | "5x5";
  selectedCategories: string[];
  gameMode?: "normal" | "speed" | "challenge";
}

/**
 * Grid size to word count mapping
 */
const GRID_WORD_REQUIREMENTS = {
  "3x3": { total: 9, markable: 8 }, // 8 markable + 1 FREE
  "4x4": { total: 16, markable: 15 }, // 15 markable + 1 FREE  
  "5x5": { total: 25, markable: 24 } // 24 markable + 1 FREE
};

/**
 * Generate a buzzword-based GameID
 */
function generateBuzzwordGameId(): string {
  const buzzwords = ["AI", "Pivot", "Synergy", "Scale", "Cloud", "Agile", "ROI", "Growth"];
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const buzzword = buzzwords[Math.floor(Math.random() * buzzwords.length)];
  let code = "";
  for (let i = 0; i < 3; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${buzzword}-${code}`;
}

/**
 * Get words from selected categories
 */
async function getWordsFromCategories(categories: string[]): Promise<string[]> {
  try {
    const allWords: string[] = [];
    
    for (const category of categories) {
      const result = await dynamoDb.send(new ScanCommand({
        TableName: Resource.Words.name,
        FilterExpression: "category = :category",
        ExpressionAttributeValues: {
          ":category": category
        },
        ProjectionExpression: "words"
      }));

      if (result.Items && result.Items.length > 0) {
        for (const item of result.Items) {
          if (Array.isArray(item.words)) {
            allWords.push(...item.words);
          }
        }
      }
    }

    return allWords;
  } catch (error) {
    console.error("Error getting words from categories:", error);
    throw new Error("Failed to load words from selected categories");
  }
}

/**
 * Validate that we have enough words for the game
 */
function validateWordRequirements(words: string[], gridSize: string): boolean {
  const requirements = GRID_WORD_REQUIREMENTS[gridSize as keyof typeof GRID_WORD_REQUIREMENTS];
  return words.length >= requirements.markable;
}

/**
 * Create Game With Settings Function
 * 
 * Creates a new game with configurable settings including word categories and grid size.
 * Expects JSON body with: { gridSize, selectedCategories, gameMode? }
 */
export async function main(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log("Creating game with custom settings");

  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
        },
        body: JSON.stringify({
          success: false,
          error: "Request body is required",
          message: "Please provide game settings in the request body"
        }),
      };
    }

    const gameSettings: GameSettings = JSON.parse(event.body);

    // Validate input
    if (!gameSettings.gridSize || !["3x3", "4x4", "5x5"].includes(gameSettings.gridSize)) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
        },
        body: JSON.stringify({
          success: false,
          error: "Invalid grid size",
          message: "Grid size must be 3x3, 4x4, or 5x5"
        }),
      };
    }

    if (!Array.isArray(gameSettings.selectedCategories) || gameSettings.selectedCategories.length === 0) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
        },
        body: JSON.stringify({
          success: false,
          error: "Invalid categories",
          message: "Please select at least one word category"
        }),
      };
    }

    // Get words from selected categories
    const availableWords = await getWordsFromCategories(gameSettings.selectedCategories);
    
    // Validate we have enough words
    if (!validateWordRequirements(availableWords, gameSettings.gridSize)) {
      const required = GRID_WORD_REQUIREMENTS[gameSettings.gridSize].markable;
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
        },
        body: JSON.stringify({
          success: false,
          error: "Insufficient words",
          message: `Selected categories only have ${availableWords.length} words, but ${gameSettings.gridSize} games need at least ${required} words. Please select more categories or add more words to existing categories.`
        }),
      };
    }

    // Generate game ID
    const gameId = generateBuzzwordGameId();
    
    // Create the game record with new configuration fields
    const gameData = {
      gameId,
      status: "open",
      // Game Settings
      gridSize: gameSettings.gridSize,
      selectedCategories: gameSettings.selectedCategories,
      gameMode: gameSettings.gameMode || "normal",
      // Word Management
      wordList: availableWords.slice(0, 100), // Limit to reasonable number
      availableWordCount: availableWords.length,
      requiredWordCount: GRID_WORD_REQUIREMENTS[gameSettings.gridSize].markable,
      // Metadata
      startTime: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      secretWords: [
        "Dynamic Selection", "Category Based", "Configurable Grid", "Word Management",
        "Database Driven", "Scalable Words", "Admin Control", "Flexible Gaming"
      ],
      stateHistory: [{
        from: "created",
        to: "open",
        timestamp: new Date().toISOString(),
        reason: `Game created with ${gameSettings.gridSize} grid using categories: ${gameSettings.selectedCategories.join(', ')}`
      }]
    };

    // Store the game in the database
    await dynamoDb.send(new PutCommand({
      TableName: Resource.Games.name,
      Item: gameData
    }));

    console.log(`Created game ${gameId} with ${gameSettings.gridSize} grid and ${availableWords.length} available words`);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: JSON.stringify({
        success: true,
        gameId,
        gridSize: gameSettings.gridSize,
        selectedCategories: gameSettings.selectedCategories,
        availableWordCount: availableWords.length,
        requiredWordCount: GRID_WORD_REQUIREMENTS[gameSettings.gridSize].markable,
        message: `Game created successfully with ${gameSettings.gridSize} grid using ${gameSettings.selectedCategories.length} categories`
      }),
    };

  } catch (error) {
    console.error("Error creating game with settings:", error);
    
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: JSON.stringify({
        success: false,
        error: "Failed to create game",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
} 