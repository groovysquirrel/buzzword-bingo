// Players table - stores session-based player information
export const playersTable = new sst.aws.Dynamo("Players", {
  fields: {
    sessionId: "string",
    nickname: "string",
  },
  primaryIndex: { hashKey: "sessionId" },
  globalIndexes: {
    NicknameIndex: { hashKey: "nickname" }, // To check for duplicate nicknames
  },
});

// Games table - stores game configurations and status
export const gamesTable = new sst.aws.Dynamo("Games", {
  fields: {
    gameId: "string",
    status: "string", // "active", "scheduled", "complete"
  },
  primaryIndex: { hashKey: "gameId" },
  globalIndexes: {
    StatusIndex: { hashKey: "status" }, // To find active games
  },
});

// BingoProgress table - tracks which words each player has marked
export const bingoProgressTable = new sst.aws.Dynamo("BingoProgress", {
  fields: {
    sessionId: "string",
    word: "string",
    gameId: "string",
 
  },
  primaryIndex: { hashKey: "sessionId", rangeKey: "word" },
  globalIndexes: {
    GameProgressIndex: { hashKey: "gameId", rangeKey: "sessionId" }, // To get all progress for a game
  },
});

// BingoCards table - stores the persistent card layout for each player
export const bingoCardsTable = new sst.aws.Dynamo("BingoCards", {
  fields: {
    sessionId: "string",
    gameId: "string",
  },
  primaryIndex: { hashKey: "sessionId", rangeKey: "gameId" },
});

// CompletedBingo table - stores completed bingo records with prizes
export const completedBingoTable = new sst.aws.Dynamo("CompletedBingo", {
  fields: {
    sessionId: "string",
    gameId: "string",
    completedAt: "string",
  },
  primaryIndex: { hashKey: "sessionId", rangeKey: "gameId" },
  globalIndexes: {
    GameCompletionsIndex: { hashKey: "gameId", rangeKey: "completedAt" }, // To find winners by game
  },
});

// Events table - stores activity events for the real-time feed
export const eventsTable = new sst.aws.Dynamo("Events", {
  fields: {
    eventId: "string",
    timestamp: "string",
  },
  primaryIndex: { hashKey: "eventId" },
  globalIndexes: {
    TimestampIndex: { hashKey: "timestamp" },
  },
  ttl: "expiresAt", // Events expire after 24 hours
});

// Words table - stores word categories for dynamic game word selection
export const wordsTable = new sst.aws.Dynamo("Words", {
  fields: {
    category: "string",
  },
  primaryIndex: { hashKey: "category" },
});

// Export all tables for use in other files
export const tables = {
  players: playersTable,
  games: gamesTable,
  bingoProgress: bingoProgressTable,
  completedBingo: completedBingoTable,
  events: eventsTable,
  bingoCards: bingoCardsTable,
  words: wordsTable,
};

// Keep the old table export name for backwards compatibility during transition
export const table = playersTable;
