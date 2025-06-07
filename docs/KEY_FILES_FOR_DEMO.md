# Key Files for Live Demo Modifications

This document lists the most important files to modify during live coding demonstrations, organized by common audience requests.

## 🛡️ Content Moderation & User Management

### `packages/backend/src/lib/userValidation.ts`
**Purpose:** Nickname validation, profanity filtering, business rules  
**Common Modifications:**
- Add/remove words from profanity filter
- Change nickname length limits
- Add custom validation rules (e.g., require certain patterns)
- Implement real-time moderation features

### `packages/backend/src/game/joinGame.ts`
**Purpose:** Player onboarding and session creation  
**Common Modifications:**
- Add welcome messages
- Implement player limits
- Add custom player metadata
- Change join flow logic

## 🎯 Game Content & Mechanics

### `packages/backend/src/lib/gameUtils.ts`
**Purpose:** Buzzword lists, bingo card generation, game rules, **GameID generation**  
**Common Modifications:**
- Add conference-specific buzzwords (lines 1-32: `MASTER_BUZZWORDS`)
- **Modify GameID buzzwords (lines 34-44: `GAMEID_BUZZWORDS`)**
- **Adjust GameID format in `generateBuzzwordGameId()` function**
- Change bingo win conditions (function `checkForBingo`)
- Modify card generation logic
- Add special game modes

### `packages/backend/src/game/markWord.ts`
**Purpose:** Word marking logic and scoring  
**Common Modifications:**
- Change point values per word
- Add bonus scoring mechanisms
- Implement word marking restrictions
- Add special effects for certain words

### `packages/backend/src/game/callBingo.ts`
**Purpose:** BINGO validation and winner handling  
**Common Modifications:**
- Change winning patterns (diagonal, corners, etc.)
- Add celebration effects
- Modify winner verification process
- Add multiple winner handling

## 🎨 User Interface & Experience

### `packages/frontend/src/containers/BingoGame.tsx`
**Purpose:** Main game interface and player experience  
**Common Modifications:**
- Add animations and visual effects
- Change card layout and styling
- Add interactive features (sound effects, etc.)
- Implement accessibility improvements

### `packages/frontend/src/components/Leaderboard/LeaderboardTable.tsx`
**Purpose:** Real-time leaderboard display  
**Common Modifications:**
- Change ranking algorithms
- Add player statistics
- Modify visual presentation
- Add competitive features

### `packages/frontend/src/containers/Settings.tsx`
**Purpose:** User preferences and controls  
**Common Modifications:**
- Add new user settings
- Implement theme switching
- Add profile customization
- Add data export/import features

## 📡 Real-time Features & Events

### `packages/frontend/src/utils/eventFormatter.ts`
**Purpose:** Activity feed messages and event handling  
**Common Modifications:**
- Add new event types (lines 65-77: `EVENT_TYPES`)
- Customize message formatting (function `formatEventMessage`)
- Add event icons and colors
- Implement event filtering

### `packages/backend/src/lib/gameEvents.ts`
**Purpose:** Event publishing and broadcasting  
**Common Modifications:**
- Add new event types
- Change event data structure
- Modify broadcasting logic
- Add event analytics

## ⚙️ Admin Controls & Management

### `packages/frontend/src/containers/Admin.tsx`
**Purpose:** Administrative dashboard and game management  
**Common Modifications:**
- Add new admin controls
- Implement bulk operations
- Add analytics dashboards
- Create moderation tools

### `packages/backend/src/admin/gameState.ts`
**Purpose:** Game lifecycle management  
**Common Modifications:**
- Add new game states
- Implement automated game progression
- Add scheduling features
- Create tournament modes

### `packages/frontend/src/components/GameController/GameController.tsx`
**Purpose:** Real-time game control interface  
**Common Modifications:**
- Add quick action buttons
- Implement game automation
- Add emergency controls
- Create preset configurations

## 🎭 Visual Theming & Branding

### `packages/frontend/src/App.css`
**Purpose:** Global styling and theming  
**Common Modifications:**
- Change color schemes
- Add conference branding
- Implement dark/light modes
- Add animated backgrounds

### `packages/frontend/src/containers/Join.tsx`
**Purpose:** Landing page and first impression  
**Common Modifications:**
- Customize welcome messaging
- Add conference-specific branding
- Implement onboarding flows
- Add promotional content

## 🔧 Configuration & Infrastructure

### `packages/backend/src/lib/gameUtils.ts` (lines 1-32)
**Purpose:** Master buzzword configuration  
**Common Modifications:**
- Add conference-specific terminology
- Remove outdated buzzwords
- Add industry-specific terms
- Implement dynamic word loading

### `infra/api.ts`
**Purpose:** API endpoint configuration  
**Common Modifications:**
- Add new endpoints
- Change rate limiting
- Add feature flags
- Implement A/B testing endpoints

## 📱 Mobile & Responsive Features

### `packages/frontend/src/containers/StatusScreen.tsx`
**Purpose:** Public display board for projectors  
**Common Modifications:**
- Optimize for large displays
- Add presentation modes
- Implement auto-refresh
- Add QR codes for easy joining

---

## 🚀 Quick Demo Scenarios

### "Make it More Fun" 
- Modify `gameUtils.ts` to add silly buzzwords
- Update `BingoGame.tsx` to add celebration animations
- Change `eventFormatter.ts` to add emoji reactions

### "Add Moderation"
- Update `userValidation.ts` profanity filter
- Modify `Admin.tsx` to add player management
- Add event logging in `gameEvents.ts`

### "Conference Customization"
- Update `MASTER_BUZZWORDS` in `gameUtils.ts`
- Customize branding in `App.css` and `Join.tsx`
- Add conference-specific welcome message

### "Competitive Features"
- Modify scoring in `markWord.ts`
- Add tournaments in `gameState.ts`
- Enhanced leaderboard in `LeaderboardTable.tsx`

### "Hilarious GameIDs" ⭐ NEW!
- Modify `GAMEID_BUZZWORDS` in `gameUtils.ts` (lines 34-44)
- Add conference-specific buzzwords like "Meta", "Web3", "NFT"
- Examples: "AI-X9K", "Pivot-Z2M", "Synergy-B7F"
- Perfect for getting laughs when announcing "Join game Meta-420!"
