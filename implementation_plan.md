# Goal: World Cup Betting Web App (GoalCoins)

Build a premium, mobile-responsive web application for friends to place friendly bets on the World Cup. Users can predict match outcomes individually (Solo) or challenge other users directly (P2P) using a virtual currency called **GoalCoins**.

## User Review Required

> [!IMPORTANT]
> **Admin Account:** The account `enversalman14@gmail.com` will have administrative privileges to create events (matches or custom wagers) and resolve them by selecting the winning option.
>
> **P2P Betting Logic:** 
> All bets are strictly binary win/lose wagers. When User A challenges User B on a specific team/outcome (e.g., "Argentina" to win), User B automatically takes the opposing team/outcome (e.g., "France" to win). In the World Cup matches and all custom bets, there are no draws—a winner is always determined (such as via extra time or penalties in elimination rounds). The winner of the event gets the entire pot ($2 \times \text{wager}$).
>
> **Financial Security & Transactions:** 
> To prevent race conditions or double-spending, all coin deductions and payouts will be executed via Firestore Transactions. Coins for P2P bets are only locked when the opponent accepts the challenge.

## Proposed Architecture & Tech Stack

- **Frontend:** Vanilla HTML5, modern CSS3 (Glassmorphism, premium dark theme, micro-animations), and Vanilla ES6 JavaScript (using Firebase JS SDK v10+ via ESM).
- **Backend:** Firebase Authentication (Google Gmail Sign-In) and Cloud Firestore (NoSQL database).
- **Hosting:** Firebase Hosting.

## Database Schema (Firestore)

### 1. `users` Collection
Tracks user profiles and balances.
```typescript
{
  uid: string;            // Document ID (Firebase Auth UID)
  displayName: string;    // Display name from Google
  email: string;          // User email
  photoURL: string;       // Profile picture URL
  balance: number;        // GoalCoins balance (starts at 250)
  createdAt: Timestamp;
}
```

### 2. `events` Collection
Created by the Admin. Matches or custom predictions (e.g., Top Scorer, World Cup Winner).
```typescript
{
  id: string;             // Document ID
  title: string;          // e.g., "Argentina vs France" or "World Cup Winner"
  type: "match" | "custom";
  kickoff: Timestamp;     // Kickoff / Deadline time
  options: string[];      // e.g., ["Argentina", "France", "Draw"] or ["Messi", "Mbappe", "Neymar"]
  status: "active" | "resolved";
  result: string | null;  // The winning option (null if unresolved)
  createdAt: Timestamp;
}
```

### 3. `solo_predictions` Collection
User predictions without opponents. One prediction per user per event.
```typescript
{
  id: string;             // Document ID: `${userId}_${eventId}`
  userId: string;
  userDisplayName: string;
  eventId: string;
  eventTitle: string;
  prediction: string;     // Chosen option
  status: "active" | "resolved";
  isCorrect: boolean | null; // true if prediction === event.result
  createdAt: Timestamp;
  resolvedAt: Timestamp | null;
}
```

### 4. `p2p_bets` Collection
Wagers between two users.
```typescript
{
  id: string;             // Document ID
  eventId: string;
  eventTitle: string;
  creatorId: string;
  creatorName: string;
  creatorPrediction: string; // The outcome User A is betting on
  opponentId: string;     // User B
  opponentName: string;
  wager: number;          // GoalCoin amount set by creator
  status: "pending" | "active" | "resolved" | "declined" | "cancelled";
  winnerId: string | null; // UID of the winner
  createdAt: Timestamp;
  acceptedAt: Timestamp | null;
  resolvedAt: Timestamp | null;
}
```

---

## User Interface Design (Premium Dark Mode)

We will build a high-fidelity dashboard using a modern dark aesthetic:
- **Palette:** Dark indigo background (`#0b0d19`), translucent card backgrounds with border-blurs (Glassmorphism), emerald neon (`#10b981`) for profits/wins, crimson (`#f43f5e`) for losses, and amber/gold (`#f59e0b`) for GoalCoins.
- **Responsive Navigation:** Single Page App layout styled with Vanilla CSS using CSS Grid/Flexbox.
- **Transitions:** Hover scale effects, glowing box shadows for active wagers, and sliding/fading tabs.

### Pages / Views
1. **Login Page (`index.html` - Unauthenticated state):**
   - Sleek header with a pulsing World Cup football logo.
   - Large Google Sign-In button with a premium ripple effect.
   - Live/mock dashboard preview to excite users.

2. **Dashboard (`index.html` - Authenticated state):**
   - **Header:** Profile photo, display name, and a highlighted **GoalCoin Balance Tracker** with a spinning coin animation.
   - **Main CTA:** A prominent, glowing "Create Bet" button leading to `create-bet.html`.
   - **Challenges Inbox:** Lists incoming P2P requests with "Accept" or "Decline" buttons.
   - **Ongoing Bets Section:** Shows user's active Solo and accepted P2P bets.
   - **History Section:** A chronological feed of resolved bets indicating $+15$ (Solo), $+Wager$ (P2P Win), or $-Wager$ (P2P Loss).

3. **Create Bet Page (`create-bet.html`):**
   - Lists active World Cup matchups and custom questions.
   - Selecting a card opens an interactive slide-up drawer:
     - **Option 1: Solo Prediction** (zero risk, win 15 coins if correct).
     - **Option 2: P2P Challenge** (select opponent from registered users, enter wager, choose prediction).
   - Validation checks: users cannot wager more coins than their current balance.

4. **Admin Panel (`admin.html`):**
   - Accessible only by `enversalman14@gmail.com`.
   - **Create Event Form:** Set title, type, kickoff time, and choice options.
   - **Resolve Event List:** List of active matches. Admin selects the winner and clicks "Resolve", which triggers:
     - Updating all Solo predictions (correct = credit +15 coins).
     - Updating all P2P bets (correct prediction = creator wins total pot, incorrect = opponent wins total pot).
     - Changing event status to `resolved`.

---

## Verification Plan

### Automated/Unit Checks
- Test Cloud Firestore security rules to ensure:
  - Users can only read/write their own profiles (except balance, which can only be modified via server/transactions).
  - Users can only modify their own bets.
  - Only `enversalman14@gmail.com` can create/update events.
- Deploy Firestore rules to a emulator or direct project and run mock queries.

### Manual Verification
1. Log in with admin Gmail and create multiple test events (e.g., "Germany vs Spain").
2. Log in with User A (incognito browser) and submit a Solo prediction.
3. Create a P2P challenge from User A to User B. Verify that balances are **not** deducted yet.
4. Log in with User B. Decline the challenge. Verify it appears as "declined" and balances remain unchanged.
5. Create another challenge from User A to User B. Accept it. Verify both balances are immediately deducted by the wager amount.
6. Log in as admin, resolve the match. Verify:
   - User A and B balances update correctly based on who won.
   - Bets move to the resolved history tab.
   - Solo predictions credit 15 GoalCoins if correct.
