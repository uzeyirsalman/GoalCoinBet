# ⚽ GoalCoins — World Cup Betting Web App

GoalCoins is a premium, mobile-responsive web application designed for friends to place friendly wagers on World Cup matches and custom predictions. Users predict match outcomes individually or challenge each other directly in peer-to-peer (P2P) bets using a virtual currency called **GoalCoins**.

The application is built on a modern, serverless architecture using **Vanilla HTML5/CSS3/JS** and **Firebase** (Authentication & Firestore). It features a high-end dark glassmorphism user interface with fluid micro-animations.

---

## 🚀 Key Features

*   **Google Sign-In Authentication:** Seamless login via Google. New profiles start with a virtual balance of **250 GoalCoins**.
*   **Solo Predictions:** Risk-free predictions on active matches. Correct predictions yield a reward of **15 GoalCoins**.
*   **P2P Wagers with Immediate Escrow:** Challenge friends directly on any match outcome. Wagers are instantly locked in escrow to prevent double-spending, and fully refunded if declined or cancelled.
*   **Challenges Inbox:** Real-time notification badge and list of incoming wagers where users can accept or decline challenges.
*   **Admin Dashboard:** Exclusive access for `enversalman14@gmail.com` to create events (World Cup matches or custom predictions) and resolve outcomes (paying out winners atomically).
*   **Real-time Synced Feeds:** Live tracking of ongoing bets, challenge requests, and resolved bet history.

---

## 🛠️ Tech Stack & Architecture

*   **Frontend:** HTML5, Vanilla ES6 JavaScript (importing Firebase SDK v10+ via ESM), and Custom CSS3 (Glassmorphism, custom properties, and keyframe animations).
*   **Backend:** Firebase Authentication (Google OAuth provider) & Cloud Firestore (NoSQL Document Store).
*   **Deployment:** Firebase Hosting.

---

## 🔒 Transaction Security (Firestore Rules)

Because the application runs entirely client-side without a custom backend server or Cloud Functions, business logic integrity is strictly enforced at the database layer.

Our custom `firestore.rules` ensures:
1.  **Anti-Cheating Balance Validation:** Standard users cannot arbitrarily update their profile `balance`. The rules verify that a balance change (addition or subtraction) only occurs during a transaction that creates or updates a corresponding `p2p_bets` document matching the exact wager.
2.  **State-Locked P2P Transitions:** Bets cannot be modified out-of-order. A bet can only transition from `"pending"` to `"active"` (deducting the opponent's balance), `"declined"` (refunding the creator), or `"cancelled"` (refunding the creator).
3.  **Role Enforcement:** Only `enversalman14@gmail.com` can create/resolve events and modify arbitrary balances.

---

## 💻 Dual-Mode SDK (Simulator Fallback)

To make offline development and local design testing frictionless, the app features a **Dual-Mode SDK**:
*   **Mock Mode (Local Simulator):** If the Firebase configuration inside `app.js` is set to placeholders, the app automatically runs in Mock Mode. It stores data in `localStorage` and simulates Auth state, real-time Firestore listeners, and multi-user transaction balances.
*   **Firebase Mode (Production):** Once valid Firebase credentials are added, the app connects directly to the live Google Auth and Cloud Firestore instances.

---

## 🛠️ Local Setup & Running

1.  Clone the repository:
    ```bash
    git clone https://github.com/uzeyirsalman/GoalCoinBet.git
    cd GoalCoinBet
    ```
2.  Run a local development server (e.g., using `http-server` or `lite-server`):
    ```bash
    npx http-server -p 8080
    ```
3.  Open `http://localhost:8080` in your web browser.

---

## 🌐 Live Deployment

To deploy this project to Firebase:

1.  Install the Firebase CLI and login:
    ```bash
    npm install -g firebase-tools
    firebase login
    ```
2.  Select your active project:
    ```bash
    firebase use goalcoinbet
    ```
3.  Deploy Hosting configurations and Firestore Security Rules:
    ```bash
    firebase deploy --only hosting,firestore
    ```
