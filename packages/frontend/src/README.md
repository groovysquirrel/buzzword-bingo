# Buzzword Bingo Frontend

A modern React application for playing Buzzword Bingo at conferences and events.

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── BingoGrid/      # Bingo card grid components
│   ├── Leaderboard/    # Leaderboard display components
│   ├── PlayerStatus/   # Player statistics components
│   └── ...             # Other shared components
├── hooks/              # Custom React hooks
├── pages/              # Page-level components (new architecture)
├── types/              # TypeScript type definitions
├── lib/                # Utility functions and helpers
└── containers/         # Refactored container components (current routes)
```

## ✅ Refactoring Complete

This frontend has been successfully refactored to follow React best practices while maintaining all existing functionality. The main improvements include:

### 🔧 What Was Refactored

1. **Type Definitions** (`types/game.ts`)
   - Comprehensive TypeScript interfaces with JSDoc documentation
   - Centralized type definitions for consistency across components

2. **Custom Hooks** (`hooks/`)
   - `useGameSession`: Session management and localStorage operations
   - `useBingoGame`: Bingo game logic and API interactions  
   - `useLeaderboard`: Leaderboard data management with auto-refresh

3. **Reusable Components** (`components/`)
   - `BingoGrid`: Interactive 5x5 bingo card with touch-friendly design
   - `LeaderboardTable`: Clean player rankings display
   - `PlayerStatus`: Progress and statistics display

4. **Refactored Containers** (`containers/`)
   - `BingoGame.tsx`: Now uses custom hooks and reusable components
   - `Leaderboard.tsx`: Simplified using LeaderboardTable component
   - `StatusScreen.tsx`: Updated with better documentation and shared types

### 🎯 Benefits Achieved

- **Maintainability**: Clear separation of concerns between logic and presentation
- **Reusability**: Components can be easily reused in different contexts
- **Type Safety**: Comprehensive TypeScript coverage with proper interfaces
- **Documentation**: Extensive JSDoc comments explaining functionality
- **Code Quality**: Consistent naming conventions and clean architecture
- **Student-Friendly**: Easy to understand codebase structure for learning

## 🧩 Components

### BingoGrid
Interactive 5x5 bingo card that players use to mark words they hear.

**Features:**
- Responsive design for mobile and desktop
- Touch-friendly cells with proper accessibility
- Visual feedback for marked words and loading states
- Special styling for the center "SYNERGY (FREE)" square

**Usage:**
```tsx
import { BingoGrid } from '../components/BingoGrid';

<BingoGrid
  bingoCard={bingoCard}
  markingWord={markingWord}
  onMarkWord={handleMarkWord}
/>
```

### LeaderboardTable
Displays player rankings with statistics and progress.

**Features:**
- Highlights current player with special styling
- Shows rank, points, progress, and word count
- Responsive layout that works on all screen sizes
- Empty state handling with helpful messages

**Usage:**
```tsx
import { LeaderboardTable } from '../components/Leaderboard';

<LeaderboardTable
  leaderboard={leaderboard}
  currentSession={session}
  showDetails={true}
/>
```

### PlayerStatus
Shows current player's game progress and statistics.

**Features:**
- Animated progress bar with percentage completion
- Points, rank, and progress display in responsive grid
- Loading states and error handling
- Beautiful visual design matching the app theme

**Usage:**
```tsx
import { PlayerStatus } from '../components/PlayerStatus';

<PlayerStatus
  bingoCard={bingoCard}
  rank={currentRank}
  showProgress={true}
/>
```

## 🎣 Custom Hooks

### useGameSession
Manages player session state and localStorage operations.

**Features:**
- Automatic session validation and restoration
- Clean error handling for corrupted session data
- Navigation management for invalid sessions

**Returns:**
- `session`: Current session data
- `loading`: Loading state
- `clearSession()`: Clear session data
- `updateSession()`: Update session data
- `refreshSession()`: Reload session from storage

### useBingoGame
Handles bingo game logic and API interactions.

**Features:**
- Automatic bingo card loading and refresh
- Word marking with optimistic updates
- BINGO detection and celebration handling
- Error handling with user-friendly messages

**Returns:**
- `bingoCard`: Player's bingo card
- `loading`: Loading state
- `markingWord`: Currently marking word
- `error`: Error message
- `markWord()`: Mark a word on the card
- `calculateProgress()`: Get completion percentage
- `calculatePoints()`: Get current points
- `refreshCard()`: Force refresh card data

### useLeaderboard
Manages leaderboard data with auto-refresh.

**Features:**
- Auto-refresh every 5 seconds for real-time updates
- Player ranking and statistics calculations
- Efficient data fetching and caching

**Returns:**
- `leaderboard`: Complete leaderboard data
- `loading`: Loading state
- `error`: Error message
- `getCurrentPlayerRank()`: Get current player's rank
- `getCurrentPlayerEntry()`: Get current player's data
- `getTopPlayers()`: Get top N players
- `refreshLeaderboard()`: Force refresh data

## 📄 Current Pages (Container Components)

### BingoGame (`/play`)
Main game interface where players interact with their bingo card.

**Refactored Features:**
- Uses `useGameSession`, `useBingoGame`, and `useLeaderboard` hooks
- Displays `BingoGrid` and `PlayerStatus` components
- Simplified BINGO celebration modal
- Much cleaner and more maintainable code

### Leaderboard (`/leaderboard`)
Displays player rankings and statistics.

**Refactored Features:**
- Uses `useGameSession` and `useLeaderboard` hooks
- Shows current player's rank prominently
- Displays `LeaderboardTable` component
- Cleaner error handling and loading states

### StatusScreen (`/status`)
Public status board for conference displays.

**Improvements:**
- Better documentation and code organization
- Uses shared types for consistency
- Enhanced visual design
- More maintainable code structure

## 🎨 Styling

### CSS Organization
- **BEM Methodology**: Block Element Modifier naming convention
- **Component-Scoped**: Each component has its own CSS file
- **Responsive Design**: Mobile-first approach with proper breakpoints
- **Accessibility**: High contrast and reduced motion support

### Color Palette
- **Primary**: `#F59E0B` (Amber)
- **Success**: `#10B981` (Emerald)
- **Background**: `#FEF3C7` (Light Amber)
- **Text**: `#1F2937` (Dark Gray)
- **Accent**: `#FCD34D` (Light Amber)

## 🔧 TypeScript Types

All game-related types are defined in `types/game.ts`:

- `SessionInfo`: Player session data
- `BingoCard`: Bingo card structure
- `MarkWordResponse`: API response for marking words
- `LeaderboardEntry`: Individual player data
- `LeaderboardResponse`: Complete leaderboard
- Component prop interfaces for type safety

## 🚀 Getting Started

### Development
```bash
npm run dev
```

### Building
```bash
npm run build
```

### Type Checking
```bash
npm run type-check
```

## 📚 Architecture Principles

### Separation of Concerns
- **Components**: Focus on rendering and user interaction
- **Hooks**: Handle business logic and state management
- **Types**: Provide type safety and documentation
- **Containers**: Orchestrate components and hooks for specific pages

### Reusability
- Components are designed to be reusable across different contexts
- Hooks encapsulate logic that can be shared between components
- Consistent prop interfaces for easy composition

### Maintainability
- Clear file organization with logical grouping
- Comprehensive TypeScript types for better developer experience
- Consistent naming conventions (BEM for CSS, camelCase for JS)
- Extensive documentation and comments

### Performance
- Auto-refresh intervals for real-time updates
- Optimistic updates for better user experience
- Proper loading states and error handling
- Responsive design for all device sizes

## 🎯 For Students

This codebase demonstrates several important React and frontend development concepts:

1. **Custom Hooks**: How to extract and reuse stateful logic
2. **Component Composition**: Building complex UIs from simple components
3. **TypeScript**: Using types for better code quality and developer experience
4. **CSS Organization**: Maintainable styling with BEM methodology
5. **State Management**: Managing complex application state with hooks
6. **API Integration**: Handling asynchronous operations and error states
7. **Responsive Design**: Creating interfaces that work on all devices
8. **Accessibility**: Building inclusive user interfaces
9. **Code Refactoring**: How to improve existing code while maintaining functionality

### Key Learning Points

- **Before**: Monolithic container components with mixed concerns
- **After**: Clean separation between logic (hooks) and presentation (components)
- **Result**: Much easier to understand, test, and modify code

Each component and hook is well-documented with JSDoc comments explaining its purpose, features, and usage patterns. The refactored code is now production-ready and suitable for a 2nd year computer science student to study and learn from.

## 🔄 Migration Strategy

The refactoring was completed in a way that maintains all existing functionality:

1. **Created new architecture** with components, hooks, and types
2. **Updated existing containers** to use the new components and hooks
3. **Maintained all routes** and user-facing functionality
4. **Added comprehensive documentation** for easy understanding
5. **Preserved backward compatibility** while improving code quality

This approach ensures that the application continues to work exactly as before, but with much better code organization and maintainability. 