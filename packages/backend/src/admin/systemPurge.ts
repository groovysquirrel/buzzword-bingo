import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ScanCommand, BatchWriteCommand, PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../lib/handler";
import { createDefaultGame, generateBuzzwordGameId } from "../lib/gameUtils";
import { addEvent } from "../lib/gameEvents";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * Default word categories to seed into the database
 * These are organized by logical business/tech categories for better game balance
 */
const DEFAULT_WORD_CATEGORIES = {
  "Technology": [
    "AI", "Machine Learning", "Cloud Native", "Microservices", "Kubernetes",
    "Serverless", "Edge Computing", "Big Data", "IoT", "Blockchain",
    "Digital Twin", "API-First", "DevOps", "GitOps", "Infrastructure as Code",
    "Containerization", "Orchestration", "Auto-scaling", "Load Balancing", "CDN"
  ],
  "Business": [
    "Synergy", "Leverage", "Optimize", "Streamline", "Paradigm Shift",
    "Disruptive Innovation", "Game Changer", "Best Practice", "Core Competency", "Value Proposition",
    "Market Penetration", "Thought Leadership", "Customer Journey", "User Experience", "Growth Hacking",
    "Agile Transformation", "Digital Transformation", "Change Management", "Stakeholder Alignment", "ROI"
  ],
  "Strategy": [
    "Strategic Initiative", "Roadmap", "Milestone", "KPI", "OKR",
    "North Star", "Vision", "Mission Critical", "Scalable", "Sustainable",
    "Future-Proof", "Innovation Lab", "Center of Excellence", "Tiger Team", "War Room",
    "Deep Dive", "Circle Back", "Touch Base", "Ideate", "Pivot"
  ],
  "Process": [
    "Workflow", "Pipeline", "Framework", "Methodology", "Best-in-Class",
    "End-to-End", "Holistic Approach", "Cross-functional", "Collaborative", "Integrated",
    "Seamless", "Frictionless", "Omnichannel", "360-degree", "Full-stack",
    "Low-code", "No-code", "Self-service", "Automated", "Intelligent"
  ]
};

/**
 * System Purge - DANGER ZONE!
 * 
 * This endpoint clears ALL data from ALL tables, reseeds words, and creates a default game.
 * Use only for testing and development.
 */
async function systemPurge(event: APIGatewayProxyEvent) {
  console.log("🚨 SYSTEM PURGE INITIATED - THIS WILL DELETE ALL DATA");
  
  const tables = [
    { name: Resource.Players.name, keys: ["sessionId"] },
    { name: Resource.Games.name, keys: ["gameId"] },
    { name: Resource.BingoProgress.name, keys: ["sessionId", "word"] },
    { name: Resource.BingoCards.name, keys: ["sessionId", "gameId"] },
    { name: Resource.CompletedBingo.name, keys: ["sessionId", "gameId"] },
    { name: Resource.Events.name, keys: ["eventId"] },
    { name: Resource.Words.name, keys: ["category"] }, // Added Words table
  ];

  const purgeResults = [];

  for (const table of tables) {
    try {
      console.log(`Purging table: ${table.name}`);
      
      // Scan all items in the table
      let scanResult: any;
      let allItems: any[] = [];
      
      do {
        scanResult = await dynamoDb.send(new ScanCommand({
          TableName: table.name,
          ExclusiveStartKey: scanResult?.LastEvaluatedKey,
        }));
        
        if (scanResult.Items) {
          allItems.push(...scanResult.Items);
        }
      } while (scanResult.LastEvaluatedKey);

      console.log(`Found ${allItems.length} items in ${table.name}`);

      if (allItems.length === 0) {
        purgeResults.push({
          tableName: table.name,
          itemsFound: 0,
          itemsDeleted: 0,
          status: "empty"
        });
        continue;
      }

      // Delete items in batches
      const batchSize = 25; // DynamoDB limit
      let totalDeleted = 0;

      for (let i = 0; i < allItems.length; i += batchSize) {
        const batch = allItems.slice(i, i + batchSize);
        
        const deleteRequests = batch.map(item => {
          // Create the key based on table structure
          const key: any = {};
          for (const keyField of table.keys) {
            key[keyField] = item[keyField];
          }
          
          return {
            DeleteRequest: { Key: key }
          };
        });

        await dynamoDb.send(new BatchWriteCommand({
          RequestItems: {
            [table.name]: deleteRequests,
          },
        }));

        totalDeleted += batch.length;
        console.log(`Deleted batch ${Math.ceil((i + batchSize) / batchSize)} from ${table.name}`);
      }

      purgeResults.push({
        tableName: table.name,
        itemsFound: allItems.length,
        itemsDeleted: totalDeleted,
        status: "purged"
      });

    } catch (error) {
      console.error(`Error purging ${table.name}:`, error);
      purgeResults.push({
        tableName: table.name,
        itemsFound: 0,
        itemsDeleted: 0,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  const totalItemsDeleted = purgeResults.reduce((sum, result) => sum + result.itemsDeleted, 0);

  console.log(`🚨 SYSTEM PURGE COMPLETE - Deleted ${totalItemsDeleted} total items`);

  // Step 1: Reseed word categories
  console.log("📝 Reseeding word categories...");
  let seedResults = {
    categoriesCreated: 0,
    totalWords: 0,
    categories: [] as string[],
    error: null as string | null
  };

  try {
    const categories = Object.keys(DEFAULT_WORD_CATEGORIES);
    let totalWords = 0;
    let successCount = 0;

    // Insert each category as a separate item
    for (const category of categories) {
      const words = DEFAULT_WORD_CATEGORIES[category as keyof typeof DEFAULT_WORD_CATEGORIES];
      
      try {
        await dynamoDb.send(new PutCommand({
          TableName: Resource.Words.name,
          Item: {
            category: category,
            words: words,
            createdAt: new Date().toISOString(),
            wordCount: words.length
          }
        }));
        
        totalWords += words.length;
        successCount++;
        console.log(`Seeded category '${category}' with ${words.length} words`);
        
      } catch (error) {
        console.error(`Failed to seed category '${category}':`, error);
      }
    }

    seedResults = {
      categoriesCreated: successCount,
      totalWords,
      categories: categories.slice(0, successCount),
      error: successCount === 0 ? "Failed to seed any categories" : null
    };

    console.log(`✅ Seeded ${successCount} categories with ${totalWords} total words`);

  } catch (error) {
    console.error("Error seeding word categories:", error);
    seedResults.error = error instanceof Error ? error.message : "Unknown seeding error";
  }

  // Step 2: Create a default game using dynamic game creation
  console.log("🎮 Creating default game with dynamic word selection...");
  
  let gameResults = {
    gameId: null as string | null,
    status: null as string | null,
    error: null as string | null,
    gridSize: "5x5" as const,
    categoriesUsed: [] as string[]
  };

  try {
    // Create a default 5x5 game using all available categories
    const newGameId = generateBuzzwordGameId();
    const availableCategories = Object.keys(DEFAULT_WORD_CATEGORIES);
    
    // Get all words from all categories for the game
    const allWords = Object.values(DEFAULT_WORD_CATEGORIES).flat();
    
         // Create new game with dynamic settings
     const newGameConfig = {
       gameId: newGameId,
       status: "playing", // Start in playing state for immediate use
      // Game Settings
      gridSize: "5x5",
      selectedCategories: availableCategories,
      gameMode: "normal",
      // Word Management  
      wordList: allWords.slice(0, 100), // Limit to reasonable number
      availableWordCount: allWords.length,
      requiredWordCount: 24, // 5x5 grid needs 24 words (25 - 1 free)
      // Metadata
      startTime: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      secretWords: [
        "System Reset", "Fresh Start", "Clean Slate", "New Beginning",
        "Tabula Rasa", "Ground Zero", "Factory Reset", "Blank Canvas"
      ],
             stateHistory: [{
         from: "created",
         to: "playing",
         timestamp: new Date().toISOString(),
         reason: "System initialization after purge - default 5x5 game ready to play"
       }]
    };

    await dynamoDb.send(new PutCommand({
      TableName: Resource.Games.name,
      Item: newGameConfig,
    }));

        // Publish initialization event
    await addEvent("system_initialized", {
      newGameId: newGameId,
      gridSize: "5x5",
      categoriesUsed: availableCategories,
      wordCount: allWords.length,
      status: "playing",
      message: "System initialized with playable game after purge"
    });

    // Broadcast system purge event to all connected clients
    await addEvent("system_purged", {
      timestamp: new Date().toISOString(),
      newGameId: newGameId,
      action: "clear_localStorage_and_redirect",
      message: "System has been purged - please rejoin the game"
    });

         gameResults = {
       gameId: newGameId,
       status: "playing",
       error: null,
       gridSize: "5x5",
       categoriesUsed: availableCategories
     };

    console.log(`✅ Created default game: ${newGameId} (5x5, ${availableCategories.length} categories, ${allWords.length} words)`);

  } catch (initError) {
    console.error("Failed to create default game after purge:", initError);
    gameResults.error = initError instanceof Error ? initError.message : "Unknown game creation error";
  }

  return JSON.stringify({
    success: true,
    message: "System purge completed with reseeding and game creation",
    timestamp: new Date().toISOString(),
    purge: {
      totalItemsDeleted,
      tableResults: purgeResults
    },
    seeding: seedResults,
    gameCreation: gameResults,
    warning: "ALL DATA HAS BEEN DELETED AND SYSTEM REINITIALIZED",
         nextSteps: [
       "Word categories have been seeded",
       "Default 5x5 game created in PLAYING state",
       "Game is immediately playable - no need to start",
       "Use Game Creator to create additional custom games"
     ]
  });
}

export const main = handler(systemPurge); 