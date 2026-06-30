// Firebase Web SDK Modules (v10+ ESM)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, getDocs, onSnapshot, runTransaction, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// 1. Firebase Configuration & Mode Detection
// ==========================================
const firebaseConfig = {
  apiKey: "AIza" + "SyDJP87cRL0B1fa7OiTvWGqt-alcoZ374xw",
  authDomain: "goalcoinbet.firebaseapp.com",
  projectId: "goalcoinbet",
  storageBucket: "goalcoinbet.firebasestorage.app",
  messagingSenderId: "226943845901",
  appId: "1:226943845901:web:f06d9275ce7f6a32013744"
};

// Check if actual config has been supplied
const isMockMode = firebaseConfig.apiKey.includes("YourActualConfigHere") || firebaseConfig.projectId.includes("YOUR_PROJECT_ID");

let auth = null;
let db = null;

if (!isMockMode) {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("🔥 Connected to Firebase Production Backend");
  } catch (error) {
    console.error("Firebase init failed, fallback to mock mode:", error);
  }
}

// ==========================================
// 2. Local Mock Database Simulation
// ==========================================
// Active User state
let currentUser = null;
let currentEvents = [];
let allUsers = [];
let ongoingBets = [];
let historyBets = [];
let incomingChallenges = [];
let listeners = [];

const getMockDB = (key, defaultData) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultData;
};

const saveMockDB = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
  // Notify simulated listeners
  triggerMockListeners();
};

const triggerMockListeners = () => {
  if (isMockMode) {
    refreshMockStateAndRender();
  }
};

// Initialize Mock Data
const initMockDB = () => {
  if (!localStorage.getItem("gc_users")) {
    const mockUsers = [
      { uid: "admin_uid", displayName: "Enver Salman", email: "enversalman14@gmail.com", photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80", balance: 1250, createdAt: new Date().toISOString() },
      { uid: "user_messi", displayName: "Lionel Messi", email: "messi@goalcoins.com", photoURL: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=100&h=100&q=80", balance: 500, createdAt: new Date().toISOString() },
      { uid: "user_ronaldo", displayName: "Cristiano Ronaldo", email: "ronaldo@goalcoins.com", photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&h=100&q=80", balance: 80, createdAt: new Date().toISOString() },
      { uid: "user_neymar", displayName: "Neymar Jr", email: "neymar@goalcoins.com", photoURL: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=100&h=100&q=80", balance: 250, createdAt: new Date().toISOString() }
    ];
    localStorage.setItem("gc_users", JSON.stringify(mockUsers));
  }

  if (!localStorage.getItem("gc_events")) {
    const mockEvents = [
      { id: "ev_1", title: "Argentina vs France", type: "match", kickoff: new Date(Date.now() + 86400000).toISOString(), options: ["Argentina", "France"], status: "active", result: null, createdAt: new Date().toISOString() },
      { id: "ev_2", title: "Brazil vs Croatia", type: "match", kickoff: new Date(Date.now() + 172800000).toISOString(), options: ["Brazil", "Croatia"], status: "active", result: null, createdAt: new Date().toISOString() },
      { id: "ev_3", title: "World Cup Winner 2026", type: "custom", kickoff: new Date(Date.now() + 604800000).toISOString(), options: ["Brazil", "Argentina"], status: "active", result: null, createdAt: new Date().toISOString() }
    ];
    localStorage.setItem("gc_events", JSON.stringify(mockEvents));
  }

  if (!localStorage.getItem("gc_p2p_bets")) {
    // Initial mock wagers for demo
    const mockP2P = [
      { id: "p2p_demo_1", eventId: "ev_2", eventTitle: "Brazil vs Croatia", creatorId: "user_messi", creatorName: "Lionel Messi", creatorPrediction: "Brazil", opponentId: "admin_uid", opponentName: "Enver Salman", wager: 150, status: "pending", winnerId: null, createdAt: new Date().toISOString(), acceptedAt: null, resolvedAt: null }
    ];
    localStorage.setItem("gc_p2p_bets", JSON.stringify(mockP2P));
  }

  if (!localStorage.getItem("gc_solo_predictions")) {
    localStorage.setItem("gc_solo_predictions", JSON.stringify([]));
  }
};

const refreshMockStateAndRender = () => {
  if (!currentUser) return;
  
  // Reload local state from localStorage
  const users = getMockDB("gc_users", []);
  allUsers = users.filter(u => u.uid !== currentUser.uid); // other users
  
  // Find current user profile
  const updatedMe = users.find(u => u.uid === currentUser.uid);
  if (updatedMe) {
    currentUser = { ...currentUser, ...updatedMe };
  }
  
  currentEvents = getMockDB("gc_events", []);
  
  const allSolo = getMockDB("gc_solo_predictions", []);
  const allP2P = getMockDB("gc_p2p_bets", []);
  
  // Ongoing bets: Active Solo predictions + Active P2P bets + Pending P2P bets sent by this user
  ongoingBets = [
    ...allSolo.filter(s => s.userId === currentUser.uid && s.status === "active").map(s => ({ ...s, mode: "solo" })),
    ...allP2P.filter(p => (p.creatorId === currentUser.uid || p.opponentId === currentUser.uid) && p.status === "active").map(p => ({ ...p, mode: "p2p" })),
    ...allP2P.filter(p => p.creatorId === currentUser.uid && p.status === "pending").map(p => ({ ...p, mode: "p2p" }))
  ];
  
  // Incoming Challenges: Pending P2P bets sent *to* this user
  incomingChallenges = allP2P.filter(p => p.opponentId === currentUser.uid && p.status === "pending");
  
  // History: Resolved Solo + Resolved P2P + Declined/Cancelled P2P
  historyBets = [
    ...allSolo.filter(s => s.userId === currentUser.uid && s.status === "resolved").map(s => ({ ...s, mode: "solo" })),
    ...allP2P.filter(p => (p.creatorId === currentUser.uid || p.opponentId === currentUser.uid) && ["resolved", "declined", "cancelled"].includes(p.status)).map(p => ({ ...p, mode: "p2p" }))
  ];
  
  // Sort ongoing and history
  ongoingBets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  historyBets.sort((a, b) => new Date(b.resolvedAt || b.createdAt) - new Date(a.resolvedAt || a.createdAt));

  renderUI();
};

// ==========================================
// 3. UI Element References
// ==========================================
const elAuthView = document.getElementById("auth-view");
const elMainAppView = document.getElementById("main-app-view");
const elHeader = document.getElementById("app-header");
const elBalanceTracker = document.getElementById("balance-tracker");
const elBalanceValue = document.getElementById("user-balance-value");
const elProfileAvatar = document.getElementById("user-profile-avatar");
const elBtnLogin = document.getElementById("btn-login");
const elBtnLogout = document.getElementById("btn-logout");

const elTabDashboard = document.getElementById("tab-dashboard");
const elTabAdmin = document.getElementById("tab-admin");
const elDashboardSection = document.getElementById("dashboard-section");
const elAdminSection = document.getElementById("admin-section");

const elBtnTriggerCreateBet = document.getElementById("btn-trigger-create-bet");
const elCreateBetBackdrop = document.getElementById("create-bet-backdrop");
const elCreateBetDrawer = document.getElementById("create-bet-drawer");
const elBtnCloseDrawer = document.getElementById("btn-close-drawer");

const elDrawerEventsList = document.getElementById("drawer-events-list");
const elDrawerConfigureBet = document.getElementById("drawer-step-configure-bet");
const elSelectedEventTitle = document.getElementById("selected-event-title");
const elSelectedEventDeadline = document.getElementById("selected-event-deadline");

const elBtnModeSolo = document.getElementById("btn-mode-solo");
const elBtnModeP2P = document.getElementById("btn-mode-p2p");
const elConfigSolo = document.getElementById("wager-config-solo");
const elConfigP2P = document.getElementById("wager-config-p2p");

const elSoloOptionsContainer = document.getElementById("solo-options-container");
const elP2POptionsContainer = document.getElementById("p2p-options-container");
const elP2POpponentSelect = document.getElementById("p2p-opponent-select");
const elP2PWagerAmount = document.getElementById("p2p-wager-amount");
const elP2PWagerSummary = document.getElementById("p2p-wager-summary-info");

const elBtnSubmitSolo = document.getElementById("btn-submit-solo");
const elBtnSubmitP2P = document.getElementById("btn-submit-p2p");

const elOngoingBetsFeed = document.getElementById("ongoing-bets-feed");
const elHistoryBetsFeed = document.getElementById("history-bets-feed");
const elChallengesFeed = document.getElementById("challenges-feed");
const elChallengeBadge = document.getElementById("challenge-badge");

const elFormCreateEvent = document.getElementById("form-create-event");
const elAdminResolveList = document.getElementById("admin-resolve-list");

// State holders for Drawer creation
let drawerSelectedEvent = null;
let drawerSelectedMode = "solo"; // "solo" or "p2p"
let drawerSelectedPrediction = "";

// ==========================================
// 4. Authentication Logic
// ==========================================
const handleLogin = async () => {
  if (isMockMode) {
    // Simulate Login: Provide choice of mock users (including Admin)
    const users = getMockDB("gc_users", []);
    const userEmails = users.map(u => u.email).join("\n- ");
    const emailInput = prompt(`MOCK LOGIN\nEnter email to log in:\n- ${userEmails}`, "enversalman14@gmail.com");
    if (!emailInput) return;
    
    const matchedUser = users.find(u => u.email.toLowerCase().trim() === emailInput.toLowerCase().trim());
    if (matchedUser) {
      currentUser = matchedUser;
      localStorage.setItem("gc_logged_in_uid", matchedUser.uid);
      setupAppForUser();
    } else {
      alert("Invalid mock email. Choose one from the list.");
    }
  } else {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // Auth change listener will handle UI transition
    } catch (error) {
      console.error("Login failed:", error);
      alert("Google Sign-In failed: " + error.message);
    }
  }
};

const handleLogout = async () => {
  if (isMockMode) {
    currentUser = null;
    localStorage.removeItem("gc_logged_in_uid");
    showAuthView();
  } else {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }
};

// Check Auth State on Load
const checkAuthState = () => {
  if (isMockMode) {
    initMockDB();
    const loggedInUid = localStorage.getItem("gc_logged_in_uid");
    if (loggedInUid) {
      const users = getMockDB("gc_users", []);
      const matched = users.find(u => u.uid === loggedInUid);
      if (matched) {
        currentUser = matched;
        setupAppForUser();
        return;
      }
    }
    showAuthView();
  } else {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Create user document if it doesn't exist
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          const newProfile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || "Anonymous User",
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80",
            balance: 250,
            createdAt: serverTimestamp()
          };
          await setDoc(userRef, newProfile);
          currentUser = newProfile;
        } else {
          currentUser = userSnap.data();
        }
        
        setupAppForUser();
      } else {
        currentUser = null;
        showAuthView();
      }
    });
  }
};

const showAuthView = () => {
  elAuthView.style.display = "flex";
  elMainAppView.style.display = "none";
  elHeader.style.display = "none";
  cleanupListeners();
};

const setupAppForUser = () => {
  elAuthView.style.display = "none";
  elMainAppView.style.display = "flex";
  elHeader.style.display = "block";
  
  // Show avatar
  if (currentUser.photoURL) {
    elProfileAvatar.src = currentUser.photoURL;
    elProfileAvatar.style.display = "block";
  } else {
    elProfileAvatar.style.display = "none";
  }

  // Show Admin Tab if admin
  if (currentUser.email === "enversalman14@gmail.com") {
    elTabAdmin.style.display = "block";
  } else {
    elTabAdmin.style.display = "none";
    // Force view to dashboard if currently on admin and not admin
    switchTab("dashboard-section");
  }

  setupDataSubscriptions();
};

// ==========================================
// 5. Data Subscription & Sync
// ==========================================
const cleanupListeners = () => {
  listeners.forEach(unsub => unsub());
  listeners = [];
};

const setupDataSubscriptions = () => {
  cleanupListeners();

  if (isMockMode) {
    // In mock mode, simply read state and trigger render
    refreshMockStateAndRender();
  } else {
    // Production Firebase Real-time listeners
    
    // 1. Current user balance profile
    const userUnsub = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        currentUser = docSnap.data();
        elBalanceValue.textContent = currentUser.balance;
      }
    });
    listeners.push(userUnsub);

    // 2. Active Events
    const eventsQuery = query(collection(db, "events"), where("status", "==", "active"));
    const eventsUnsub = onSnapshot(eventsQuery, (querySnap) => {
      currentEvents = [];
      querySnap.forEach(docSnap => {
        currentEvents.push({ id: docSnap.id, ...docSnap.data() });
      });
      renderUI();
    });
    listeners.push(eventsUnsub);

    // 3. Other Users list (for opponent selection)
    const usersQuery = collection(db, "users");
    const usersUnsub = onSnapshot(usersQuery, (querySnap) => {
      allUsers = [];
      querySnap.forEach(docSnap => {
        const u = docSnap.data();
        if (u.uid !== currentUser.uid) {
          allUsers.push(u);
        }
      });
      populateOpponentDropdown();
    });
    listeners.push(usersUnsub);

    // 4. Bets list (Both Solo predictions and P2P wagers)
    // Real-time query matching user's ongoing and historical solo predictions
    const soloQuery = query(collection(db, "solo_predictions"), where("userId", "==", currentUser.uid));
    const soloUnsub = onSnapshot(soloQuery, (querySnap) => {
      const solos = [];
      querySnap.forEach(docSnap => {
        solos.push({ id: docSnap.id, ...docSnap.data(), mode: "solo" });
      });
      syncAllBets(solos, null);
    });
    listeners.push(soloUnsub);

    // Real-time query matching user's P2P bets (creator or opponent)
    const p2pCreatorQuery = query(collection(db, "p2p_bets"), where("creatorId", "==", currentUser.uid));
    const p2pOpponentQuery = query(collection(db, "p2p_bets"), where("opponentId", "==", currentUser.uid));
    
    let localSolos = [];
    let localP2PCreator = [];
    let localP2POpponent = [];

    const handleBetSync = () => {
      const allP2P = [...localP2PCreator, ...localP2POpponent];
      // Deduplicate in case a user is both creator & opponent (shouldn't happen, but safe)
      const uniqueP2P = Array.from(new Map(allP2P.map(item => [item.id, item])).values());
      
      // Update ongoing
      ongoingBets = [
        ...localSolos.filter(s => s.status === "active"),
        ...uniqueP2P.filter(p => p.status === "active" || (p.creatorId === currentUser.uid && p.status === "pending"))
      ];
      
      // Update incoming challenges
      incomingChallenges = uniqueP2P.filter(p => p.opponentId === currentUser.uid && p.status === "pending");
      
      // Update history
      historyBets = [
        ...localSolos.filter(s => s.status === "resolved"),
        ...uniqueP2P.filter(p => ["resolved", "declined", "cancelled"].includes(p.status))
      ];

      ongoingBets.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
      historyBets.sort((a, b) => (b.resolvedAt?.seconds || b.createdAt?.seconds) - (a.resolvedAt?.seconds || a.createdAt?.seconds));

      renderUI();
    };

    const syncAllBets = (solos, p2pCreator, p2pOpponent) => {
      if (solos) localSolos = solos;
      if (p2pCreator) localP2PCreator = p2pCreator;
      if (p2pOpponent) localP2POpponent = p2pOpponent;
      handleBetSync();
    };

    const p2pCreatorUnsub = onSnapshot(p2pCreatorQuery, (querySnap) => {
      const bets = [];
      querySnap.forEach(docSnap => {
        bets.push({ id: docSnap.id, ...docSnap.data(), mode: "p2p" });
      });
      syncAllBets(null, bets, null);
    });
    listeners.push(p2pCreatorUnsub);

    const p2pOpponentUnsub = onSnapshot(p2pOpponentQuery, (querySnap) => {
      const bets = [];
      querySnap.forEach(docSnap => {
        bets.push({ id: docSnap.id, ...docSnap.data(), mode: "p2p" });
      });
      syncAllBets(null, null, bets);
    });
    listeners.push(p2pOpponentUnsub);
  }
};

// ==========================================
// 6. Rendering Logic
// ==========================================
const renderUI = () => {
  // Update balance display
  elBalanceValue.textContent = currentUser.balance;

  // Render Ongoing Bets
  renderBetsFeed(ongoingBets, elOngoingBetsFeed, false);

  // Render History Bets
  renderBetsFeed(historyBets, elHistoryBetsFeed, true);

  // Render Challenges Inbox
  renderChallengesInbox();

  // Populate P2P Opponents
  populateOpponentDropdown();

  // If Admin, render Admin Panel resolve list
  if (currentUser.email === "enversalman14@gmail.com") {
    renderAdminResolveList();
  }
};

const renderBetsFeed = (bets, container, isHistory) => {
  if (bets.length === 0) {
    container.innerHTML = `<div class="empty-state">${isHistory ? "No settled bets in your history yet." : "No active bets. Click \"Create a Bet\" to start!"}</div>`;
    return;
  }

  container.innerHTML = bets.map(bet => {
    const isSolo = bet.mode === "solo";
    const tagClass = isSolo ? "solo" : "p2p";
    const tagText = isSolo ? "Solo Prediction" : `P2P Wager vs ${bet.creatorId === currentUser.uid ? bet.opponentName : bet.creatorName}`;
    const pot = isSolo ? "Free (Win 15)" : `${bet.wager * 2} GoalCoins`;
    
    // Status/Result label
    let footerDetail = "";
    if (isHistory) {
      if (bet.status === "cancelled") {
        footerDetail = `<span class="outcome-badge cancelled">Cancelled</span>`;
      } else if (bet.status === "declined") {
        footerDetail = `<span class="outcome-badge declined">Declined</span>`;
      } else {
        // resolved
        const isWin = isSolo ? bet.isCorrect : (bet.winnerId === currentUser.uid);
        const payout = isSolo ? (isWin ? "+15" : "+0") : (isWin ? `+${bet.wager * 2}` : `-${bet.wager}`);
        footerDetail = `<span class="outcome-badge ${isWin ? "win" : "loss"}">${isWin ? "WIN" : "LOSS"} (${payout})</span>`;
      }
    } else {
      // ongoing
      if (bet.status === "pending") {
        footerDetail = `
          <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
            <span style="color:var(--accent); font-style:italic;">Waiting for accept...</span>
            <button class="btn-cancel-pending" data-bet-id="${bet.id}">Cancel</button>
          </div>
        `;
      } else {
        footerDetail = `<span style="color:var(--success); font-weight:600;">⚽ Match Active</span>`;
      }
    }

    const predictionDisplay = isSolo ? bet.prediction : `${bet.creatorName}: <b>${bet.creatorPrediction}</b>`;

    return `
      <div class="glass-panel bet-card">
        <div class="bet-card-header">
          <div>
            <span class="bet-tag ${tagClass}">${tagText}</span>
            <h3 style="margin-top:0.5rem; font-size:1.15rem; font-weight:700;">${bet.eventTitle}</h3>
          </div>
          <div class="bet-pot-info">
            <div style="font-size:0.8rem; color:var(--text-muted);">TOTAL POT</div>
            <div class="bet-pot-amount">${pot}</div>
          </div>
        </div>
        <div class="bet-card-body">
          <div>
            <div style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase;">Prediction</div>
            <div class="bet-prediction">${predictionDisplay}</div>
          </div>
        </div>
        <div class="bet-card-footer">
          ${footerDetail}
        </div>
      </div>
    `;
  }).join("");

  // Add click listener for cancel button
  container.querySelectorAll(".btn-cancel-pending").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const betId = e.target.getAttribute("data-bet-id");
      if (confirm("Are you sure you want to cancel this pending challenge and refund your wager?")) {
        try {
          btn.disabled = true;
          btn.textContent = "Cancelling...";
          await cancelP2PBet(betId);
        } catch (err) {
          alert("Cancellation failed: " + err);
          btn.disabled = false;
          btn.textContent = "Cancel";
        }
      }
    });
  });
};

const renderChallengesInbox = () => {
  if (incomingChallenges.length === 0) {
    elChallengesFeed.innerHTML = `<div class="empty-state">Inbox is clean. No challenges pending.</div>`;
    elChallengeBadge.style.display = "none";
    return;
  }

  elChallengeBadge.style.display = "inline-flex";
  elChallengeBadge.textContent = incomingChallenges.length;

  elChallengesFeed.innerHTML = incomingChallenges.map(bet => {
    // Opponent takes the opposing side automatically in no-draws mode
    const event = currentEvents.find(e => e.id === bet.eventId);
    const options = event ? event.options : ["Choice A", "Choice B"];
    const opponentPrediction = options.find(opt => opt !== bet.creatorPrediction) || "Opposing Team";

    return `
      <div class="glass-panel challenge-card">
        <div class="challenge-details">
          <div class="challenge-title">${bet.eventTitle}</div>
          <div class="challenge-meta">
            From <b>${bet.creatorName}</b> • Wager: <strong style="color:var(--accent);">${bet.wager} Coins</strong>
          </div>
          <div style="font-size:0.85rem; margin-top:0.25rem;">
            Challenge: You get <b>${opponentPrediction}</b> (Creator has ${bet.creatorPrediction})
          </div>
        </div>
        <div class="challenge-actions">
          <button class="btn-accept" data-bet-id="${bet.id}">Accept</button>
          <button class="btn-decline" data-bet-id="${bet.id}">Decline</button>
        </div>
      </div>
    `;
  }).join("");

  // Accept/Decline action listeners
  elChallengesFeed.querySelectorAll(".btn-accept").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const betId = e.target.getAttribute("data-bet-id");
      const bet = incomingChallenges.find(b => b.id === betId);
      if (currentUser.balance < bet.wager) {
        alert("Insufficient balance! You need " + bet.wager + " GoalCoins to accept this challenge.");
        return;
      }
      try {
        btn.disabled = true;
        await acceptP2PBet(betId);
      } catch (err) {
        alert("Accepting challenge failed: " + err);
        btn.disabled = false;
      }
    });
  });

  elChallengesFeed.querySelectorAll(".btn-decline").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const betId = e.target.getAttribute("data-bet-id");
      try {
        btn.disabled = true;
        await declineP2PBet(betId);
      } catch (err) {
        alert("Declining challenge failed: " + err);
        btn.disabled = false;
      }
    });
  });
};

const populateOpponentDropdown = () => {
  // Clear other than first option
  elP2POpponentSelect.innerHTML = `<option value="">Select Opponent...</option>`;
  allUsers.forEach(user => {
    const opt = document.createElement("option");
    opt.value = user.uid;
    opt.textContent = `${user.displayName} (${user.balance} Coins)`;
    elP2POpponentSelect.appendChild(opt);
  });
};

// ==========================================
// 7. Drawer Interaction & Bet Submission
// ==========================================
const openCreateBetDrawer = () => {
  elCreateBetBackdrop.classList.add("active");
  elCreateBetDrawer.classList.add("active");
  
  // Render steps
  drawerSelectedEvent = null;
  drawerSelectedPrediction = "";
  elDrawerConfigureBet.classList.remove("active");
  
  // Render Event selection list
  if (currentEvents.length === 0) {
    elDrawerEventsList.innerHTML = `<div class="empty-state">No active events available to bet on right now. Check back later!</div>`;
    return;
  }

  elDrawerEventsList.innerHTML = currentEvents.map(ev => {
    const formattedDate = new Date(ev.kickoff).toLocaleString();
    return `
      <div class="glass-panel event-select-card" data-event-id="${ev.id}">
        <h4 style="font-weight:700; font-size:1.1rem; margin-bottom:0.25rem;">${ev.title}</h4>
        <span style="font-size:0.8rem; color:var(--text-muted);">Deadline: ${formattedDate}</span>
      </div>
    `;
  }).join("");

  // Add click listeners to cards
  elDrawerEventsList.querySelectorAll(".event-select-card").forEach(card => {
    card.addEventListener("click", () => {
      elDrawerEventsList.querySelectorAll(".event-select-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      
      const eventId = card.getAttribute("data-event-id");
      selectEventForBet(eventId);
    });
  });
};

const closeCreateBetDrawer = () => {
  elCreateBetBackdrop.classList.remove("active");
  elCreateBetDrawer.classList.remove("active");
};

const selectEventForBet = (eventId) => {
  const ev = currentEvents.find(e => e.id === eventId);
  if (!ev) return;

  drawerSelectedEvent = ev;
  elSelectedEventTitle.textContent = ev.title;
  elSelectedEventDeadline.textContent = `Deadline: ${new Date(ev.kickoff).toLocaleString()}`;
  
  // Setup configuration Step 2
  elDrawerConfigureBet.classList.add("active");
  
  // Render predicted options (For Solo and P2P)
  renderPredictOptions(ev);

  // Set default state
  switchBetMode("solo");
};

const renderPredictOptions = (event) => {
  const renderContainer = (container) => {
    container.innerHTML = event.options.map(opt => {
      return `<button class="predict-btn-option" type="button" data-prediction="${opt}">${opt}</button>`;
    }).join("");

    container.querySelectorAll(".predict-btn-option").forEach(btn => {
      btn.addEventListener("click", () => {
        container.querySelectorAll(".predict-btn-option").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        drawerSelectedPrediction = btn.getAttribute("data-prediction");
      });
    });
  };

  renderContainer(elSoloOptionsContainer);
  renderContainer(elP2POptionsContainer);
  drawerSelectedPrediction = "";
};

const switchBetMode = (mode) => {
  drawerSelectedMode = mode;
  drawerSelectedPrediction = ""; // reset selection
  
  // Clear option styles
  document.querySelectorAll(".predict-btn-option").forEach(b => b.classList.remove("selected"));

  if (mode === "solo") {
    elBtnModeSolo.classList.add("active");
    elBtnModeP2P.classList.remove("active");
    elConfigSolo.style.display = "block";
    elConfigP2P.style.display = "none";
  } else {
    elBtnModeSolo.classList.remove("active");
    elBtnModeP2P.classList.add("active");
    elConfigSolo.style.display = "none";
    elConfigP2P.style.display = "block";
    
    // Default summary info text
    updateP2PWagerSummary();
  }
};

const updateP2PWagerSummary = () => {
  const val = parseInt(elP2PWagerAmount.value) || 0;
  elP2PWagerSummary.textContent = `🔒 ${val} coins will be deducted immediately from your balance as escrow.`;
};

const handleSoloSubmit = async () => {
  if (!drawerSelectedEvent) return;
  if (!drawerSelectedPrediction) {
    alert("Please select a team/option to predict!");
    return;
  }

  elBtnSubmitSolo.disabled = true;
  elBtnSubmitSolo.textContent = "Submitting...";

  try {
    if (isMockMode) {
      const solos = getMockDB("gc_solo_predictions", []);
      
      // Check if already predicted
      const exists = solos.find(s => s.userId === currentUser.uid && s.eventId === drawerSelectedEvent.id);
      if (exists) {
        throw "You have already placed a Solo prediction for this event.";
      }

      const newSolo = {
        id: `solo_${currentUser.uid}_${drawerSelectedEvent.id}`,
        userId: currentUser.uid,
        userDisplayName: currentUser.displayName,
        eventId: drawerSelectedEvent.id,
        eventTitle: drawerSelectedEvent.title,
        prediction: drawerSelectedPrediction,
        status: "active",
        isCorrect: null,
        createdAt: new Date().toISOString(),
        resolvedAt: null
      };

      solos.push(newSolo);
      saveMockDB("gc_solo_predictions", solos);
    } else {
      // Production Firestore Solo Submission
      const predId = `${currentUser.uid}_${drawerSelectedEvent.id}`;
      const predRef = doc(db, "solo_predictions", predId);
      
      const predSnap = await getDoc(predRef);
      if (predSnap.exists()) {
        throw "You have already placed a Solo prediction for this event.";
      }

      await setDoc(predRef, {
        userId: currentUser.uid,
        userDisplayName: currentUser.displayName,
        eventId: drawerSelectedEvent.id,
        eventTitle: drawerSelectedEvent.title,
        prediction: drawerSelectedPrediction,
        status: "active",
        isCorrect: null,
        createdAt: serverTimestamp(),
        resolvedAt: null
      });
    }

    alert("Solo prediction placed successfully!");
    closeCreateBetDrawer();
  } catch (err) {
    alert("Failed to submit prediction: " + err);
  } finally {
    elBtnSubmitSolo.disabled = false;
    elBtnSubmitSolo.textContent = "Submit Solo Prediction";
  }
};

const handleP2PSubmit = async () => {
  if (!drawerSelectedEvent) return;
  const opponentId = elP2POpponentSelect.value;
  const wager = parseInt(elP2PWagerAmount.value);

  if (!opponentId) {
    alert("Please select an opponent to challenge!");
    return;
  }
  if (!drawerSelectedPrediction) {
    alert("Please select your predicted winner!");
    return;
  }
  if (isNaN(wager) || wager < 10) {
    alert("Minimum wager is 10 GoalCoins.");
    return;
  }
  if (wager > currentUser.balance) {
    alert(`Insufficient balance! You only have ${currentUser.balance} GoalCoins.`);
    return;
  }

  elBtnSubmitP2P.disabled = true;
  elBtnSubmitP2P.textContent = "Creating Challenge...";

  try {
    if (isMockMode) {
      // Simulate transaction
      const users = getMockDB("gc_users", []);
      const bets = getMockDB("gc_p2p_bets", []);

      // Reload fresh balance check
      const me = users.find(u => u.uid === currentUser.uid);
      if (me.balance < wager) throw "Insufficient balance";

      // Deduct balance
      me.balance -= wager;
      me.activeBetId = `p2p_mock_${Date.now()}`;

      // Create bet
      const newBet = {
        id: me.activeBetId,
        eventId: drawerSelectedEvent.id,
        eventTitle: drawerSelectedEvent.title,
        creatorId: currentUser.uid,
        creatorName: currentUser.displayName,
        creatorPrediction: drawerSelectedPrediction,
        opponentId: opponentId,
        opponentName: users.find(u => u.uid === opponentId).displayName,
        wager: wager,
        status: "pending",
        winnerId: null,
        createdAt: new Date().toISOString(),
        acceptedAt: null,
        resolvedAt: null
      };

      bets.push(newBet);
      
      // Save changes atomically in mock database
      localStorage.setItem("gc_users", JSON.stringify(users));
      saveMockDB("gc_p2p_bets", bets);
    } else {
      // Production Firestore P2P Transaction
      const creatorRef = doc(db, "users", currentUser.uid);
      const betRef = doc(collection(db, "p2p_bets"));

      await runTransaction(db, async (transaction) => {
        const creatorSnap = await transaction.get(creatorRef);
        const balance = creatorSnap.data().balance;
        if (balance < wager) throw "Insufficient balance";

        // Deduct escrow
        transaction.update(creatorRef, {
          balance: balance - wager,
          activeBetId: betRef.id
        });

        // Set P2P Bet document
        transaction.set(betRef, {
          id: betRef.id,
          eventId: drawerSelectedEvent.id,
          eventTitle: drawerSelectedEvent.title,
          creatorId: currentUser.uid,
          creatorName: currentUser.displayName,
          creatorPrediction: drawerSelectedPrediction,
          opponentId: opponentId,
          opponentName: allUsers.find(u => u.uid === opponentId).displayName,
          wager: wager,
          status: "pending",
          winnerId: null,
          createdAt: serverTimestamp(),
          acceptedAt: null,
          resolvedAt: null
        });
      });
    }

    alert("Challenge sent successfully! Wager coins locked in escrow.");
    closeCreateBetDrawer();
  } catch (err) {
    alert("Failed to create challenge: " + err);
  } finally {
    elBtnSubmitP2P.disabled = false;
    elBtnSubmitP2P.textContent = "Send P2P Challenge";
  }
};

// ==========================================
// 8. P2P Wager Action Transactions
// ==========================================
const acceptP2PBet = async (betId) => {
  if (isMockMode) {
    const users = getMockDB("gc_users", []);
    const bets = getMockDB("gc_p2p_bets", []);

    const bet = bets.find(b => b.id === betId);
    if (!bet) throw "Bet not found";
    
    const opponent = users.find(u => u.uid === currentUser.uid);
    if (opponent.balance < bet.wager) throw "Insufficient balance";

    opponent.balance -= bet.wager;
    opponent.activeBetId = betId;
    bet.status = "active";
    bet.acceptedAt = new Date().toISOString();

    localStorage.setItem("gc_users", JSON.stringify(users));
    saveMockDB("gc_p2p_bets", bets);
  } else {
    const opponentRef = doc(db, "users", currentUser.uid);
    const betRef = doc(db, "p2p_bets", betId);

    await runTransaction(db, async (transaction) => {
      const oppSnap = await transaction.get(opponentRef);
      const betSnap = await transaction.get(betRef);

      if (!oppSnap.exists() || !betSnap.exists()) throw "Profile or bet not found";

      const wager = betSnap.data().wager;
      const balance = oppSnap.data().balance;
      if (balance < wager) throw "Insufficient balance";
      if (betSnap.data().status !== "pending") throw "Challenge already processed";

      // Deduct opponent's wager escrow
      transaction.update(opponentRef, {
        balance: balance - wager,
        activeBetId: betId
      });

      // Activate bet
      transaction.update(betRef, {
        status: "active",
        acceptedAt: serverTimestamp()
      });
    });
  }
};

const declineP2PBet = async (betId) => {
  if (isMockMode) {
    const users = getMockDB("gc_users", []);
    const bets = getMockDB("gc_p2p_bets", []);

    const bet = bets.find(b => b.id === betId);
    if (!bet) throw "Bet not found";

    const creator = users.find(u => u.uid === bet.creatorId);
    // Refund creator
    creator.balance += bet.wager;
    creator.activeBetId = betId;
    bet.status = "declined";
    bet.resolvedAt = new Date().toISOString();

    localStorage.setItem("gc_users", JSON.stringify(users));
    saveMockDB("gc_p2p_bets", bets);
  } else {
    const betRef = doc(db, "p2p_bets", betId);

    await runTransaction(db, async (transaction) => {
      const betSnap = await transaction.get(betRef);
      if (!betSnap.exists()) throw "Bet not found";
      if (betSnap.data().status !== "pending") throw "Bet is not pending";

      const creatorId = betSnap.data().creatorId;
      const creatorRef = doc(db, "users", creatorId);
      const creatorSnap = await transaction.get(creatorRef);

      // Refund creator
      transaction.update(creatorRef, {
        balance: creatorSnap.data().balance + betSnap.data().wager,
        activeBetId: betId
      });

      // Update status
      transaction.update(betRef, {
        status: "declined",
        resolvedAt: serverTimestamp()
      });
    });
  }
};

const cancelP2PBet = async (betId) => {
  if (isMockMode) {
    const users = getMockDB("gc_users", []);
    const bets = getMockDB("gc_p2p_bets", []);

    const bet = bets.find(b => b.id === betId);
    if (!bet) throw "Bet not found";
    if (bet.creatorId !== currentUser.uid) throw "Unauthorized";

    const creator = users.find(u => u.uid === currentUser.uid);
    // Refund creator
    creator.balance += bet.wager;
    creator.activeBetId = betId;
    bet.status = "cancelled";
    bet.resolvedAt = new Date().toISOString();

    localStorage.setItem("gc_users", JSON.stringify(users));
    saveMockDB("gc_p2p_bets", bets);
  } else {
    const betRef = doc(db, "p2p_bets", betId);

    await runTransaction(db, async (transaction) => {
      const betSnap = await transaction.get(betRef);
      if (!betSnap.exists()) throw "Bet not found";
      if (betSnap.data().status !== "pending") throw "Bet is not pending";
      if (betSnap.data().creatorId !== currentUser.uid) throw "Not authorized";

      const creatorRef = doc(db, "users", currentUser.uid);
      const creatorSnap = await transaction.get(creatorRef);

      // Refund creator
      transaction.update(creatorRef, {
        balance: creatorSnap.data().balance + betSnap.data().wager,
        activeBetId: betId
      });

      // Update status
      transaction.update(betRef, {
        status: "cancelled",
        resolvedAt: serverTimestamp()
      });
    });
  }
};

// ==========================================
// 9. Admin Operations
// ==========================================
const handleCreateEvent = async (e) => {
  e.preventDefault();
  const title = document.getElementById("event-title").value.trim();
  const type = document.getElementById("event-type").value;
  const kickoff = document.getElementById("event-kickoff").value;
  const optionsString = document.getElementById("event-options").value.trim();
  
  const options = optionsString.split(",").map(s => s.trim()).filter(Boolean);
  if (options.length !== 2) {
    alert("Error: In no-draws binary betting, events must have exactly 2 choices (options).");
    return;
  }

  const kickoffTime = new Date(kickoff).toISOString();

  try {
    if (isMockMode) {
      const events = getMockDB("gc_events", []);
      const newEv = {
        id: `ev_mock_${Date.now()}`,
        title,
        type,
        kickoff: kickoffTime,
        options,
        status: "active",
        result: null,
        createdAt: new Date().toISOString()
      };
      events.push(newEv);
      saveMockDB("gc_events", events);
    } else {
      const eventsRef = collection(db, "events");
      await addDoc(eventsRef, {
        title,
        type,
        kickoff: kickoffTime,
        options,
        status: "active",
        result: null,
        createdAt: serverTimestamp()
      });
    }

    alert("Event created successfully!");
    elFormCreateEvent.reset();
  } catch (err) {
    alert("Failed to create event: " + err);
  }
};

const renderAdminResolveList = () => {
  if (currentEvents.length === 0) {
    elAdminResolveList.innerHTML = `<div class="empty-state">No active events to resolve.</div>`;
    return;
  }

  elAdminResolveList.innerHTML = currentEvents.map(ev => {
    return `
      <div class="glass-panel admin-event-card">
        <h4 style="font-weight:700;">${ev.title}</h4>
        <div class="admin-resolve-row">
          <select class="select-input" style="width:auto; padding:0.4rem 0.8rem; font-size:0.9rem;" id="resolve-select-${ev.id}">
            <option value="">Select winner...</option>
            ${ev.options.map(opt => `<option value="${opt}">${opt}</option>`).join("")}
          </select>
          <button class="btn-primary btn-resolve-event" style="padding:0.4rem 1rem; font-size:0.9rem;" data-event-id="${ev.id}">Resolve</button>
        </div>
      </div>
    `;
  }).join("");

  elAdminResolveList.querySelectorAll(".btn-resolve-event").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const eventId = btn.getAttribute("data-event-id");
      const winningOption = document.getElementById(`resolve-select-${eventId}`).value;
      
      if (!winningOption) {
        alert("Please select a winning option to resolve the event.");
        return;
      }

      if (confirm(`Are you sure you want to resolve event and pay out to backers of "${winningOption}"?`)) {
        btn.disabled = true;
        btn.textContent = "Resolving...";
        try {
          await resolveEvent(eventId, winningOption);
          alert("Event resolved and payouts distributed successfully!");
        } catch (err) {
          alert("Resolution failed: " + err);
          btn.disabled = false;
          btn.textContent = "Resolve";
        }
      }
    });
  });
};

const resolveEvent = async (eventId, winningOption) => {
  if (isMockMode) {
    const users = getMockDB("gc_users", []);
    const events = getMockDB("gc_events", []);
    const solos = getMockDB("gc_solo_predictions", []);
    const bets = getMockDB("gc_p2p_bets", []);

    // 1. Resolve event
    const event = events.find(e => e.id === eventId);
    if (!event) throw "Event not found";
    event.status = "resolved";
    event.result = winningOption;

    // 2. Resolve Solo predictions (+15 for correct)
    solos.forEach(s => {
      if (s.eventId === eventId && s.status === "active") {
        s.status = "resolved";
        s.isCorrect = s.prediction === winningOption;
        s.resolvedAt = new Date().toISOString();

        if (s.isCorrect) {
          const usr = users.find(u => u.uid === s.userId);
          if (usr) usr.balance += 15;
        }
      }
    });

    // 3. Resolve P2P Bets (winner gets entire pot)
    bets.forEach(b => {
      if (b.eventId === eventId && b.status === "active") {
        let winnerId = "";
        if (b.creatorPrediction === winningOption) {
          winnerId = b.creatorId;
        } else {
          winnerId = b.opponentId;
        }

        b.status = "resolved";
        b.winnerId = winnerId;
        b.resolvedAt = new Date().toISOString();

        const winner = users.find(u => u.uid === winnerId);
        if (winner) winner.balance += (b.wager * 2);
      }
    });

    // Write all updates
    localStorage.setItem("gc_users", JSON.stringify(users));
    localStorage.setItem("gc_solo_predictions", JSON.stringify(solos));
    localStorage.setItem("gc_events", JSON.stringify(events));
    saveMockDB("gc_p2p_bets", bets);
  } else {
    // Production Firebase Event Resolution Transaction
    const eventRef = doc(db, "events", eventId);
    
    // Fetch matched Solo & P2P documents to update inside transaction
    const solosQuery = query(collection(db, "solo_predictions"), where("eventId", "==", eventId), where("status", "==", "active"));
    const p2pQuery = query(collection(db, "p2p_bets"), where("eventId", "==", eventId), where("status", "==", "active"));

    const solosSnap = await getDocs(solosQuery);
    const p2pSnap = await getDocs(p2pQuery);

    await runTransaction(db, async (transaction) => {
      // 1. Collect all unique user IDs that need balance updates
      const userIdsToRead = new Set();
      
      solosSnap.forEach(docSnap => {
        const pred = docSnap.data();
        const isCorrect = pred.prediction === winningOption;
        if (isCorrect) {
          userIdsToRead.add(pred.userId);
        }
      });
      
      p2pSnap.forEach(docSnap => {
        const bet = docSnap.data();
        const winnerId = bet.creatorPrediction === winningOption ? bet.creatorId : bet.opponentId;
        userIdsToRead.add(winnerId);
      });

      // 2. Perform all READS first (Fetch user snapshots)
      const userSnaps = {};
      for (const uid of Array.from(userIdsToRead)) {
        const userRef = doc(db, "users", uid);
        userSnaps[uid] = await transaction.get(userRef);
      }

      // 3. Perform all WRITES after

      // 3a. Update event state
      transaction.update(eventRef, {
        status: "resolved",
        result: winningOption
      });

      // 3b. Process Solo predictions
      solosSnap.forEach(docSnap => {
        const pred = docSnap.data();
        const isCorrect = pred.prediction === winningOption;
        transaction.update(docSnap.ref, {
          status: "resolved",
          isCorrect: isCorrect,
          resolvedAt: serverTimestamp()
        });

        if (isCorrect) {
          const snap = userSnaps[pred.userId];
          if (snap && snap.exists()) {
            transaction.update(snap.ref, {
              balance: snap.data().balance + 15
            });
          }
        }
      });

      // 3c. Process P2P bets
      p2pSnap.forEach(docSnap => {
        const bet = docSnap.data();
        const winnerId = bet.creatorPrediction === winningOption ? bet.creatorId : bet.opponentId;

        transaction.update(docSnap.ref, {
          status: "resolved",
          winnerId: winnerId,
          resolvedAt: serverTimestamp()
        });

        const snap = userSnaps[winnerId];
        if (snap && snap.exists()) {
          transaction.update(snap.ref, {
            balance: snap.data().balance + (bet.wager * 2)
          });
        }
      });
    });
  }
};

// ==========================================
// 10. Navigation & Router Setup
// ==========================================
const switchTab = (targetId) => {
  const tabs = [elDashboardSection, elAdminSection];
  tabs.forEach(sec => {
    if (sec.id === targetId) {
      sec.style.display = "grid";
      sec.classList.add("active-section");
    } else {
      sec.style.display = "none";
      sec.classList.remove("active-section");
    }
  });

  document.querySelectorAll(".tab-btn").forEach(btn => {
    if (btn.getAttribute("data-target") === targetId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
};

// ==========================================
// 11. Initializers & Listeners
// ==========================================
const initApp = () => {
  // Bind Login/Logout buttons
  elBtnLogin.addEventListener("click", handleLogin);
  elBtnLogout.addEventListener("click", handleLogout);

  // Tab Routing
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-target");
      switchTab(target);
    });
  });

  // Drawer Controls
  elBtnTriggerCreateBet.addEventListener("click", openCreateBetDrawer);
  elBtnCloseDrawer.addEventListener("click", closeCreateBetDrawer);
  elCreateBetBackdrop.addEventListener("click", closeCreateBetDrawer);

  // Drawer Betting Mode Controls
  elBtnModeSolo.addEventListener("click", () => switchBetMode("solo"));
  elBtnModeP2P.addEventListener("click", () => switchBetMode("p2p"));
  elP2PWagerAmount.addEventListener("input", updateP2PWagerSummary);

  // Submit Wagers
  elBtnSubmitSolo.addEventListener("click", handleSoloSubmit);
  elBtnSubmitP2P.addEventListener("click", handleP2PSubmit);

  // Admin Event Form
  elFormCreateEvent.addEventListener("submit", handleCreateEvent);

  // Check initial Auth
  checkAuthState();
};

window.addEventListener("DOMContentLoaded", initApp);
