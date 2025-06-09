import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ScanCommand, PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * Generate a random game ID
 */
function generateGameId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "TEST-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Get random words from all categories
 */
async function getRandomWordsFromCategories(): Promise<string[]> {
  try {
    // Get all categories from the Words table
    const result = await dynamoDb.send(new ScanCommand({
      TableName: Resource.Words.name,
      ProjectionExpression: "words"
    }));

    const items = result.Items || [];
    
    if (items.length === 0) {
      console.log("No word categories found, using fallback words");
      // Fallback to default words if no categories exist
      return [
        "AI", "Synergy", "Innovation", "Scalable", "Digital Transformation",
        "Agile", "Cloud Native", "Big Data", "DevOps", "Machine Learning",
        "Blockchain", "Microservices", "API-First", "Containerization", "ROI",
        "KPI", "Leverage", "Optimize", "Streamline", "Game Changer",
        "Best Practice", "Core Competency", "Value Proposition", "Growth Hacking", "Pivot",
        "Strategic Initiative", "Roadmap", "Milestone", "North Star", "Vision",
        "Workflow", "Pipeline", "Framework", "Methodology", "End-to-End",
        "Holistic Approach", "Cross-functional", "Seamless", "Omnichannel", "Full-stack",
        "Low-code", "No-code", "Self-service", "Automated", "Intelligent",
        "Edge Computing", "IoT", "Digital Twin", "Infrastructure as Code", "Auto-scaling",
        "Load Balancing", "CDN", "GitOps", "Orchestration", "User Experience",
        "Customer Journey", "Thought Leadership", "Market Penetration", "Change Management", "Stakeholder Alignment",
        "Mission Critical", "Sustainable", "Future-Proof", "Innovation Lab", "Center of Excellence",
        "Tiger Team", "War Room", "Deep Dive", "Circle Back", "Touch Base",
        "Ideate", "Best-in-Class", "Collaborative", "Integrated", "Frictionless", "360-degree"
      ];
    }

    // Collect all words from all categories
    const allWords: string[] = [];
    for (const item of items) {
      if (Array.isArray(item.words)) {
        allWords.push(...item.words);
      }
    }

    // Shuffle and return the words
    return allWords.sort(() => Math.random() - 0.5);

  } catch (error) {
    console.error("Error getting words from categories:", error);
    
    // Return fallback words if there's an error
    return [
      "AI", "Synergy", "Innovation", "Scalable", "Digital Transformation",
      "Agile", "Cloud Native", "Big Data", "DevOps", "Machine Learning",
      "Blockchain", "Microservices", "API-First", "Containerization", "ROI"
    ];
  }
}

/**
 * Create Game Function
 * 
 * Creates a test game with dynamic word selection for testing word management functionality.
 */
export async function main(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log("Creating test game with dynamic words");

  try {
    const gameId = generateGameId();
    
    // Get words from the Words table
    const wordList = await getRandomWordsFromCategories();
    
    // Create the game record
    const gameData = {
      gameId,
      status: "testing",
      wordList,
      startTime: new Date().toISOString(),
      secretWords: [
        "Dynamic Selection", "Category Based", "Test Game", "Word Management",
        "Database Driven", "Scalable Words", "Admin Testing", "Backend Integration"
      ],
      updatedAt: new Date().toISOString(),
      stateHistory: [{
        from: "created",
        to: "testing",
        timestamp: new Date().toISOString(),
        reason: "Test game created via admin API"
      }]
    };

    // Store the game in the database
    await dynamoDb.send(new PutCommand({
      TableName: Resource.Games.name,
      Item: gameData
    }));

    console.log(`Created test game ${gameId} with ${wordList.length} words`);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: JSON.stringify({
        gameId,
        status: "testing",
        wordList,
        message: `Test game created successfully with ${wordList.length} dynamic words`
      }),
    };

  } catch (error) {
    console.error("Error creating test game:", error);
    
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: JSON.stringify({
        error: "Failed to create test game",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
} 