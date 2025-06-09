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
 * Buzzwords that are 6 characters or less - perfect for GameIDs!
 * These will create hilariously corporate GameIDs like "AI-X3K" or "Pivot-9Z2"
 */
export const GAMEID_BUZZWORDS = [
  // Tech (≤6 chars)
  "AI", "IoT", "Cloud", "DevOps", "GitOps", "API", "CDN",
  
  // Business (≤6 chars) 
  "Synergy", "ROI", "KPI", "OKR", "Vision", "Pivot", "Growth",
  
  // Strategy (≤6 chars)
  "North", "Scale", "Agile", "Lean", "Sprint", "Scrum",
  
  // Process (≤6 chars)
  "Flow", "Stack", "Code", "Auto", "Smart", "Core", "End2E",
  
  // Corporate Favorites (≤6 chars)
  "Buzz", "Hack", "Shift", "Loop", "Sync", "Edge", "Deep",
  "Touch", "Circle", "Tiger", "War", "Lab", "360", "Low", "No"
];

/**
 * Grid size to dimensions mapping
 */
const GRID_DIMENSIONS = {
  "3x3": { rows: 3, cols: 3, markable: 8 }, // 8 markable + 1 FREE
  "4x4": { rows: 4, cols: 4, markable: 15 }, // 15 markable + 1 FREE
  "5x5": { rows: 5, cols: 5, markable: 24 } // 24 markable + 1 FREE
};

/**
 * Generate a 3-character alphanumeric code (like X3K, 9Z2, etc.)
 */
function generateAlphanumericCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a hilarious buzzword-based GameID
 * Format: {buzzword}-{3-char alphanumeric}
 * Examples: "AI-X3K", "Pivot-9Z2", "Synergy-B7M"
 */
export function generateBuzzwordGameId(): string {
  const randomBuzzword = GAMEID_BUZZWORDS[Math.floor(Math.random() * GAMEID_BUZZWORDS.length)];
  const alphanumericCode = generateAlphanumericCode();
  return `${randomBuzzword}-${alphanumericCode}`;
}

/**
 * Generate a dynamic bingo card based on game settings
 */
export function generateDynamicBingoCard(
  wordList: string[], 
  gridSize: "3x3" | "4x4" | "5x5" = "5x5"
): string[][] {
  const dimensions = GRID_DIMENSIONS[gridSize];
  
  // Ensure we have enough words
  if (wordList.length < dimensions.markable) {
    throw new Error(`Not enough words for ${gridSize} grid. Need ${dimensions.markable}, have ${wordList.length}`);
  }
  
  // Shuffle and take required number of words
  const shuffled = [...wordList].sort(() => Math.random() - 0.5);
  const selectedWords = shuffled.slice(0, dimensions.markable);
  
  // Create grid with FREE space in center
  const grid: string[][] = [];
  let wordIndex = 0;
  
  const centerRow = Math.floor(dimensions.rows / 2);
  const centerCol = Math.floor(dimensions.cols / 2);
  
  for (let row = 0; row < dimensions.rows; row++) {
    grid[row] = [];
    for (let col = 0; col < dimensions.cols; col++) {
      if (row === centerRow && col === centerCol) {
        // Center square is FREE (only if grid has odd dimensions)
        grid[row][col] = dimensions.rows % 2 === 1 ? "SYNERGY (FREE)" : selectedWords[wordIndex++];
      } else {
        grid[row][col] = selectedWords[wordIndex];
        wordIndex++;
      }
    }
  }
  
  return grid;
}

/**
 * Generate a random 5x5 bingo card from the master word list (legacy compatibility)
 */
export function generateBingoCard(): string[][] {
  return generateDynamicBingoCard(MASTER_BUZZWORDS, "5x5");
}

/**
 * Check if a bingo card has a winning pattern (supports multiple grid sizes)
 */
export function checkForDynamicBingo(
  markedWords: Set<string>, 
  cardWords: string[][], 
  gridSize: "3x3" | "4x4" | "5x5" = "5x5"
): { hasBingo: boolean; bingoType?: string; winningWords?: string[] } {
  const dimensions = GRID_DIMENSIONS[gridSize];
  
  // Add FREE space to marked words if it exists
  const allMarkedWords = new Set([...markedWords]);
  if (dimensions.rows % 2 === 1) {
    allMarkedWords.add("SYNERGY (FREE)");
  }
  
  // Check rows
  for (let row = 0; row < dimensions.rows; row++) {
    if (cardWords[row].every(word => allMarkedWords.has(word))) {
      return {
        hasBingo: true,
        bingoType: `Row ${row + 1}`,
        winningWords: cardWords[row]
      };
    }
  }
  
  // Check columns
  for (let col = 0; col < dimensions.cols; col++) {
    const columnWords = cardWords.map(row => row[col]);
    if (columnWords.every(word => allMarkedWords.has(word))) {
      return {
        hasBingo: true,
        bingoType: `Column ${col + 1}`,
        winningWords: columnWords
      };
    }
  }
  
  // Check diagonals (only for square grids)
  if (dimensions.rows === dimensions.cols) {
    // Main diagonal (top-left to bottom-right)
    const mainDiagonalWords = cardWords.map((row, index) => row[index]);
    if (mainDiagonalWords.every(word => allMarkedWords.has(word))) {
      return {
        hasBingo: true,
        bingoType: "Main Diagonal",
        winningWords: mainDiagonalWords
      };
    }
    
    // Anti-diagonal (top-right to bottom-left)
    const antiDiagonalWords = cardWords.map((row, index) => row[dimensions.cols - 1 - index]);
    if (antiDiagonalWords.every(word => allMarkedWords.has(word))) {
      return {
        hasBingo: true,
        bingoType: "Anti Diagonal",
        winningWords: antiDiagonalWords
      };
    }
  }
  
  return { hasBingo: false };
}

/**
 * Check if a bingo card has a winning pattern (legacy 5x5 compatibility)
 */
export function checkForBingo(markedWords: Set<string>, cardWords: string[][]): boolean {
  const result = checkForDynamicBingo(markedWords, cardWords, "5x5");
  return result.hasBingo;
}

/**
 * Calculate progress percentage for a player (supports multiple grid sizes)
 */
export function calculateDynamicProgress(markedWords: Set<string>, gridSize: "3x3" | "4x4" | "5x5" = "5x5"): number {
  const dimensions = GRID_DIMENSIONS[gridSize];
  const totalWords = dimensions.markable;
  const markedCount = markedWords.size;
  return Math.round((markedCount / totalWords) * 100);
}

/**
 * Calculate progress percentage for a player (legacy compatibility)
 */
export function calculateProgress(markedWords: Set<string>): number {
  return calculateDynamicProgress(markedWords, "5x5");
}

/**
 * Get current active game ID from database
 * Returns null if no active games are found
 */
export async function getCurrentActiveGameId(): Promise<string | null> {
  const { Resource } = await import("sst");
  const { DynamoDBClient } = await import("@aws-sdk/client-dynamodb");
  const { ScanCommand, DynamoDBDocumentClient } = await import("@aws-sdk/lib-dynamodb");
  
  const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  
  try {
    // Get all active games
    const result = await dynamoDb.send(new ScanCommand({
      TableName: Resource.Games.name,
      FilterExpression: "#status IN (:playing, :open, :paused, :bingo)",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":playing": "playing",
        ":open": "open", 
        ":paused": "paused",
        ":bingo": "bingo"
      },
    }));

    const activeGames = result.Items || [];

    if (activeGames.length === 0) {
      // No active games found
      return null;
    }

    // If multiple active games, return the most recent one
    const currentGame = activeGames.sort((a: any, b: any) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )[0];

    return currentGame.gameId;
  } catch (error) {
    console.error("Error getting current active game ID:", error);
    throw new Error("Failed to get current active game ID");
  }
}

/**
 * Create a default game configuration
 * Note: gameId should be set by the caller using generateBuzzwordGameId()
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
    gameId: "", // Will be set by caller
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