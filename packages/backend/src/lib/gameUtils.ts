// Master buzzword pool - easily expandable for future database integration
export const MASTER_BUZZWORDS = [
  // Technology buzzwords
  "AI", "Machine Learning", "Cloud Native", "Microservices", "Kubernetes",
  "Serverless", "Edge Computing", "Big Data", "IoT", "Blockchain",
  "Digital Twin", "API-First", "DevOps", "GitOps", "Infrastructure as Code",
  "Containerization", "Orchestration", "Auto-scaling", "Load Balancing", "CDN",
  
  // Business buzzwords
  "Synergy", "Leverage", "Optimize", "Streamline", "Paradigm Shift",
  "Disruptive Innovation", "Game Changer", "Best Practice", "Core Competency", "Value Proposition",
  "Market Penetration", "Thought Leadership", "Customer Journey", "User Experience", "Growth Hacking",
  "Agile Transformation", "Digital Transformation", "Change Management", "Stakeholder Alignment", "ROI",
  
  // Strategy buzzwords
  "Strategic Initiative", "Roadmap", "Milestone", "KPI", "OKR",
  "North Star", "Vision", "Mission Critical", "Scalable", "Sustainable",
  "Future-Proof", "Innovation Lab", "Center of Excellence", "Tiger Team", "War Room",
  "Deep Dive", "Circle Back", "Touch Base", "Ideate", "Pivot",
  
  // Process buzzwords
  "Workflow", "Pipeline", "Framework", "Methodology", "Best-in-Class",
  "End-to-End", "Holistic Approach", "Cross-functional", "Collaborative", "Integrated",
  "Seamless", "Frictionless", "Omnichannel", "360-degree", "Full-stack",
  "Low-code", "No-code", "Self-service", "Automated", "Intelligent"
];

/**
 * Generate a random 5x5 bingo card from the master word list
 */
export function generateBingoCard(): string[][] {
  // Ensure we have enough words (need 24 unique words + 1 FREE space)
  if (MASTER_BUZZWORDS.length < 24) {
    throw new Error("Not enough buzzwords in master list");
  }
  
  // Shuffle and take first 24 words
  const shuffled = [...MASTER_BUZZWORDS].sort(() => Math.random() - 0.5);
  const selectedWords = shuffled.slice(0, 24);
  
  // Create 5x5 grid with FREE space in center
  const grid: string[][] = [];
  let wordIndex = 0;
  
  for (let row = 0; row < 5; row++) {
    grid[row] = [];
    for (let col = 0; col < 5; col++) {
      if (row === 2 && col === 2) {
        // Center square is FREE with corporate flair
        grid[row][col] = "SYNERGY (FREE)";
      } else {
        grid[row][col] = selectedWords[wordIndex];
        wordIndex++;
      }
    }
  }
  
  return grid;
}

/**
 * Check if a bingo card has a winning pattern
 */
export function checkForBingo(markedWords: Set<string>, cardWords: string[][]): boolean {
  // Add SYNERGY (FREE) space to marked words
  const allMarkedWords = new Set([...markedWords, "SYNERGY (FREE)"]);
  
  // Check rows
  for (let row = 0; row < 5; row++) {
    if (cardWords[row].every(word => allMarkedWords.has(word))) {
      return true;
    }
  }
  
  // Check columns
  for (let col = 0; col < 5; col++) {
    if (cardWords.every(row => allMarkedWords.has(row[col]))) {
      return true;
    }
  }
  
  // Check diagonal (top-left to bottom-right)
  if (cardWords.every((row, index) => allMarkedWords.has(row[index]))) {
    return true;
  }
  
  // Check diagonal (top-right to bottom-left)
  if (cardWords.every((row, index) => allMarkedWords.has(row[4 - index]))) {
    return true;
  }
  
  return false;
}

/**
 * Calculate progress percentage for a player
 */
export function calculateProgress(markedWords: Set<string>): number {
  // 24 total markable words (25 - 1 FREE space)
  const totalWords = 24;
  const markedCount = markedWords.size;
  return Math.round((markedCount / totalWords) * 100);
}

/**
 * Get current active game ID (synchronous fallback)
 */
export function getCurrentGameId(): string {
  return "game-001"; // Hardcoded fallback for sync operations
}

/**
 * Get current active game ID from database
 */
export async function getCurrentActiveGameId(): Promise<string> {
  const { Resource } = await import("sst");
  const { DynamoDBClient } = await import("@aws-sdk/client-dynamodb");
  const { ScanCommand, DynamoDBDocumentClient } = await import("@aws-sdk/lib-dynamodb");
  
  const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  
  try {
    // Get all active games
    const result = await dynamoDb.send(new ScanCommand({
      TableName: Resource.Games.name,
      FilterExpression: "#status IN (:started, :open, :paused, :bingo)",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":started": "started",
        ":open": "open", 
        ":paused": "paused",
        ":bingo": "bingo"
      },
    }));

    const activeGames = result.Items || [];

    if (activeGames.length === 0) {
      // No active games found, return fallback
      return "game-001";
    }

    // If multiple active games, return the most recent one
    const currentGame = activeGames.sort((a: any, b: any) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )[0];

    return currentGame.gameId;
  } catch (error) {
    console.error("Error getting current active game ID:", error);
    // Return fallback on error
    return "game-001";
  }
}

/**
 * Create a default game configuration
 */
export function createDefaultGame(): {
  gameId: string;
  status: "open";
  wordList: string[];
  startTime: string;
  secretWords: string[];
  updatedAt: string;
  stateHistory: Array<{from: string; to: string; timestamp: string; reason?: string}>;
} {
  return {
    gameId: getCurrentGameId(), // Use sync version for now
    status: "open", // Start games in "open" state by default
    wordList: MASTER_BUZZWORDS,
    startTime: new Date().toISOString(),
    secretWords: [
      "Agile Pipeline", "Digital Synergy", "Cloud Innovation", "AI Transformation",
      "Disruptive Framework", "Scalable Solution", "Strategic Paradigm", "Smart Ecosystem"
    ],
    updatedAt: new Date().toISOString(),
    stateHistory: [{
      from: "created",
      to: "open",
      timestamp: new Date().toISOString(),
      reason: "Game created"
    }]
  };
} 