// === FIREBASE AUTHENTICATION ===
let currentUser = null;
let userIdToken = null;
let tokenRefreshInterval = null;
let sessionStartTime = null;
let sessionTimerInterval = null;

// === PROFILE TRACKING ===
let sessionCount = 0;
let whiteboardUsageCount = 0;
let gamesPlayedCount = 0;
let presentationsLoadedCount = 0;

// === RPS GAME STATE ===
const RPS_GAME_STATES = {
  IDLE: 'idle',
  WAITING_FOR_GESTURE: 'waiting_for_gesture',
  ROUND_RESULT: 'round_result',
  MATCH_OVER: 'match_over'
};

let rpsGameState = {
  state: RPS_GAME_STATES.IDLE,
  currentRound: 0,
  totalRounds: 5,
  playerScore: 0,
  computerScore: 0,
  lastGestureProcessed: null,
  roundLocked: false
};

// Session timer update function
function updateSessionTimer() {
  if (!sessionStartTime) return;
  
  const now = Date.now();
  const elapsed = Math.floor((now - sessionStartTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  
  const dashSessionTime = document.getElementById('dashboard-session-time');
  if (dashSessionTime) {
    dashSessionTime.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
}

// Function to update profile screen with current stats
function updateProfileScreen() {
  // Update usage counts
  const sessionsEl = document.getElementById('profile-sessions-count');
  const whiteboardEl = document.getElementById('profile-whiteboard-count');
  const gamesEl = document.getElementById('profile-games-count');
  const presentationsEl = document.getElementById('profile-presentations-count');
  
  if (sessionsEl) sessionsEl.textContent = sessionCount;
  if (whiteboardEl) whiteboardEl.textContent = whiteboardUsageCount;
  if (gamesEl) gamesEl.textContent = gamesPlayedCount;
  if (presentationsEl) presentationsEl.textContent = presentationsLoadedCount;
  
  // Update system status
  const cameraStatusEl = document.getElementById('profile-camera-status');
  const gestureStatusEl = document.getElementById('profile-gesture-status');
  
  if (cameraStatusEl) {
    if (cameraActive) {
      cameraStatusEl.textContent = 'ACTIVE';
      cameraStatusEl.style.color = '#34d399';
    } else {
      cameraStatusEl.textContent = 'OFF';
      cameraStatusEl.style.color = '#94a3b8';
    }
  }
  
  if (gestureStatusEl) {
    if (cameraActive && gestureActive) {
      gestureStatusEl.textContent = 'ACTIVE';
      gestureStatusEl.style.color = '#34d399';
    } else {
      gestureStatusEl.textContent = 'Inactive';
      gestureStatusEl.style.color = '#94a3b8';
    }
  }
}

// Function to get user-friendly error messages
function getAuthErrorMessage(error) {
  const errorCode = error.code;
  
  const errorMessages = {
    'auth/invalid-credential': 'Invalid email or password. Please check your credentials and try again.',
    'auth/user-not-found': 'No account found with this email address. Please check your email or create a new account.',
    'auth/wrong-password': 'Incorrect password. Please try again or reset your password.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled. Please contact support.',
    'auth/too-many-requests': 'Too many unsuccessful login attempts. Please try again later or reset your password.',
    'auth/network-request-failed': 'Network error. Please check your internet connection and try again.',
    'auth/operation-not-allowed': 'Email/password authentication is not enabled. Please contact support.',
    'auth/weak-password': 'Password is too weak. Please use at least 6 characters.',
    'auth/email-already-in-use': 'An account with this email already exists. Please login or use a different email.',
    'auth/requires-recent-login': 'This operation requires recent authentication. Please logout and login again.',
    'auth/account-exists-with-different-credential': 'An account already exists with this email but different sign-in credentials.',
  };
  
  // Return user-friendly message or generic fallback
  return errorMessages[errorCode] || 'Authentication failed. Please try again or contact support if the problem persists.';
}

// Function to refresh Firebase token
async function refreshFirebaseToken() {
  const user = firebase.auth().currentUser;
  if (user) {
    try {
      userIdToken = await user.getIdToken(true); // Force refresh
      console.log('[Firebase] Token refreshed successfully');
      return userIdToken;
    } catch (error) {
      console.error('[Firebase] Token refresh failed:', error);
      return null;
    }
  }
  return null;
}

// Check Firebase auth state on page load
firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user.email;
    userIdToken = await user.getIdToken();
    console.log('[Firebase] User authenticated:', currentUser);
    
    // Track session
    sessionCount++;
    
    // Start session timer
    sessionStartTime = Date.now();
    if (sessionTimerInterval) clearInterval(sessionTimerInterval);
    sessionTimerInterval = setInterval(updateSessionTimer, 1000);
    
    // Set up automatic token refresh every 50 minutes (tokens expire in 60 minutes)
    if (tokenRefreshInterval) {
      clearInterval(tokenRefreshInterval);
    }
    tokenRefreshInterval = setInterval(async () => {
      console.log('[Firebase] Auto-refreshing token...');
      await refreshFirebaseToken();
    }, 50 * 60 * 1000); // 50 minutes
    
    // Show navbar when authenticated
    const navbar = document.getElementById('navbar');
    if (navbar) navbar.style.display = 'flex';
    
    showScreen('dashboard');
    
    // Auto-check camera status after authentication
    setTimeout(() => {
      if (currentUser && userIdToken) {
        console.log('[Camera] Checking camera status after auth...');
        checkCameraStatus();
      }
    }, 500);
  } else {
    currentUser = null;
    userIdToken = null;
    
    // Clear token refresh interval
    if (tokenRefreshInterval) {
      clearInterval(tokenRefreshInterval);
      tokenRefreshInterval = null;
    }
    
    // Hide navbar when not authenticated
    const navbar = document.getElementById('navbar');
    if (navbar) navbar.style.display = 'none';
    
    showScreen('login');
  }
});

// Add Firebase ID token to all fetch requests with auto-refresh on 401
const originalFetch = window.fetch;
window.fetch = async function(url, options = {}) {
  if (userIdToken && !url.startsWith('http')) {
    options.headers = options.headers || {};
    options.headers['Authorization'] = `Bearer ${userIdToken}`;
    options.credentials = options.credentials || 'same-origin';
  }
  
  const response = await originalFetch(url, options);
  
  // If token expired (401), refresh and retry once
  if (response.status === 401 && !url.startsWith('http')) {
    console.log('[Firebase] Token expired, refreshing...');
    const newToken = await refreshFirebaseToken();
    if (newToken) {
      options.headers['Authorization'] = `Bearer ${newToken}`;
      return originalFetch(url, options);
    }
  }
  
  return response;
};

// === DINO RUN (SAFE ADDITION) ===
const dinoStreamImg = document.getElementById('dino-stream');
const dinoScoreEl = document.getElementById('dino-score');
const dinoResetBtn = document.getElementById('dino-reset-btn');
let dinoStateInterval = null;

function initDinoGame() {
  const gameContainer = document.getElementById('dino-game');
  if (!dinoStreamImg || !gameContainer) return;

  // Remove any existing camera notice
  const existingNotice = gameContainer.querySelector('.camera-notice');
  if (existingNotice) existingNotice.remove();

  if (!cameraActive) {
    const message = document.createElement('div');
    message.className = 'camera-notice';
    message.innerHTML = '<i class="fas fa-video-slash"></i> Please start the camera to play this game';
    message.style.padding = '1rem';
    message.style.background = 'rgba(239, 68, 68, 0.2)';
    message.style.borderRadius = '8px';
    message.style.marginBottom = '1rem';
    message.style.textAlign = 'center';
    gameContainer.insertBefore(message, gameContainer.firstChild);
    dinoStreamImg.src = '';
    return;
  }

  // Start or keep the MJPEG stream
  if (!dinoStreamImg.src || dinoStreamImg.src.endsWith('/')) {
    dinoStreamImg.src = '/dino_feed';
  }

  // Clear existing dino interval if any
  if (screenStates.games.dinoInterval) {
    clearAppInterval(screenStates.games.dinoInterval);
    screenStates.games.dinoInterval = null;
  }

  // Start polling dino state (score)
  screenStates.games.dinoInterval = setAppInterval(() => {
    fetch('/dino_state', { credentials: 'same-origin' })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then(state => {
        if (dinoScoreEl) dinoScoreEl.textContent = state.score;
      })
      .catch(error => {
        console.error('Dino state error:', error);
      });
  }, 500, 'games');
}

if (dinoResetBtn) {
  dinoResetBtn.addEventListener('click', () => {
    fetch('/dino_reset', {
      method: 'POST',
      credentials: 'same-origin'
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (!data.success) {
          alert('Failed to reset Dino Run game');
        } else if (dinoScoreEl) {
          dinoScoreEl.textContent = '0';
        }
      })
      .catch(error => {
        console.error('Dino reset error:', error);
        alert('An error occurred while resetting the Dino Run game');
      });
  });
}

// === PONG GAME (ALONE FOREVER PONG) ===
const pongStreamImg = document.getElementById('pong-stream');
const pongScoreEl = document.getElementById('pong-score');
const pongResetBtn = document.getElementById('pong-reset-btn');
let pongStateInterval = null;

function initPongGame() {
  const gameContainer = document.getElementById('pong-game');
  if (!pongStreamImg || !gameContainer) return;

  // Remove any existing camera notice
  const existingNotice = gameContainer.querySelector('.camera-notice');
  if (existingNotice) existingNotice.remove();

  if (!cameraActive) {
    const message = document.createElement('div');
    message.className = 'camera-notice';
    message.innerHTML = '<i class="fas fa-video-slash"></i> Please start the camera to play this game';
    message.style.padding = '1rem';
    message.style.background = 'rgba(239, 68, 68, 0.2)';
    message.style.borderRadius = '8px';
    message.style.marginBottom = '1rem';
    message.style.textAlign = 'center';
    gameContainer.insertBefore(message, gameContainer.firstChild);
    pongStreamImg.src = '';
    return;
  }

  // Start or keep the MJPEG stream
  if (!pongStreamImg.src || pongStreamImg.src.endsWith('/')) {
    pongStreamImg.src = '/pong_feed';
  }

  // Clear existing pong interval if any
  if (screenStates.games.pongInterval) {
    clearAppInterval(screenStates.games.pongInterval);
    screenStates.games.pongInterval = null;
  }

  // Start polling pong state (score)
  screenStates.games.pongInterval = setAppInterval(() => {
    fetch('/pong_state', { credentials: 'same-origin' })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then(state => {
        if (pongScoreEl) {
          const statusText = state.gameOver ? ' (Game Over)' : '';
          pongScoreEl.textContent = `Score: ${state.score}${statusText}`;
        }
      })
      .catch(error => {
        console.error('Pong state error:', error);
      });
  }, 500, 'games');
}

if (pongResetBtn) {
  pongResetBtn.addEventListener('click', () => {
    fetch('/pong_reset', {
      method: 'POST',
      credentials: 'same-origin'
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (!data.success) {
          alert('Failed to reset Pong game');
        } else if (pongScoreEl) {
          pongScoreEl.textContent = '0';
        }
      })
      .catch(error => {
        console.error('Pong reset error:', error);
        alert('An error occurred while resetting the Pong game');
      });
  });
}

// Add Dino Run to game card click handler
document.querySelectorAll('.game-card').forEach(c => {
  c.addEventListener('click', e => {
    const game = e.currentTarget.dataset.game;
    
    // Track game play
    gamesPlayedCount++;
    
    if (game === 'dino') {
      // Hide all other games, show dino
      document.querySelectorAll('.game-container').forEach(c2 => c2.classList.add('hidden'));
      document.getElementById('dino-game').classList.remove('hidden');
      currentGame = 'dino';

      // Scroll to top of main content area
      const mainContent = document.querySelector('#games-screen .main-content');
      if (mainContent) {
        mainContent.scrollTop = 0;
        mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // Stop other game streams/intervals
      if (typeof snakeStreamImg !== 'undefined' && snakeStreamImg) snakeStreamImg.src = '';
      if (typeof fruitStreamImg !== 'undefined' && fruitStreamImg) fruitStreamImg.src = '';
      if (typeof fruitStateInterval !== 'undefined' && fruitStateInterval) { clearInterval(fruitStateInterval); fruitStateInterval = null; }
      if (typeof screenStates !== 'undefined' && screenStates.games && screenStates.games.gameInterval) { clearAppInterval(screenStates.games.gameInterval); screenStates.games.gameInterval = null; }

      // Start gesture detection if camera is active
      if (cameraActive) {
        startGestureDetection('games');
        initDinoGame();
      } else {
        // Show message to start camera
        const gameContainer = document.getElementById('dino-game');
        if (gameContainer) {
          const message = document.createElement('div');
          message.className = 'camera-notice';
          message.innerHTML = '<i class="fas fa-video-slash"></i> Please start the camera to play this game';
          message.style.padding = '1rem';
          message.style.background = 'rgba(239, 68, 68, 0.2)';
          message.style.borderRadius = '8px';
          message.style.marginBottom = '1rem';
          message.style.textAlign = 'center';
          // Remove any existing notice
          const existingNotice = gameContainer.querySelector('.camera-notice');
          if (existingNotice) existingNotice.remove();
          gameContainer.insertBefore(message, gameContainer.firstChild);
        }
      }
    } else if (game === 'pong') {
      // Hide all other games, show pong
      document.querySelectorAll('.game-container').forEach(c2 => c2.classList.add('hidden'));
      document.getElementById('pong-game').classList.remove('hidden');
      currentGame = 'pong';

      // Scroll to top of main content area
      const mainContent = document.querySelector('#games-screen .main-content');
      if (mainContent) {
        mainContent.scrollTop = 0;
        mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // Stop other game streams/intervals
      if (typeof snakeStreamImg !== 'undefined' && snakeStreamImg) snakeStreamImg.src = '';
      if (typeof fruitStreamImg !== 'undefined' && fruitStreamImg) fruitStreamImg.src = '';
      if (typeof dinoStreamImg !== 'undefined' && dinoStreamImg) dinoStreamImg.src = '';
      if (typeof fruitStateInterval !== 'undefined' && fruitStateInterval) { clearInterval(fruitStateInterval); fruitStateInterval = null; }
      if (typeof dinoStateInterval !== 'undefined' && dinoStateInterval) { clearInterval(dinoStateInterval); dinoStateInterval = null; }
      if (typeof screenStates !== 'undefined' && screenStates.games && screenStates.games.gameInterval) { clearAppInterval(screenStates.games.gameInterval); screenStates.games.gameInterval = null; }

      // Start gesture detection if camera is active
      if (cameraActive) {
        startGestureDetection('games');
        initPongGame();
      } else {
        // Show message to start camera
        const gameContainer = document.getElementById('pong-game');
        if (gameContainer) {
          const message = document.createElement('div');
          message.className = 'camera-notice';
          message.innerHTML = '<i class="fas fa-video-slash"></i> Please start the camera to play this game';
          message.style.padding = '1rem';
          message.style.background = 'rgba(239, 68, 68, 0.2)';
          message.style.borderRadius = '8px';
          message.style.marginBottom = '1rem';
          message.style.textAlign = 'center';
          // Remove any existing notice
          const existingNotice = gameContainer.querySelector('.camera-notice');
          if (existingNotice) existingNotice.remove();
          gameContainer.insertBefore(message, gameContainer.firstChild);
        }
      }
    }
  });
});

// Hide Dino and Pong streams and clear intervals when leaving games screen
const origShowScreen = showScreen;
window.showScreen = function(screenId) {
  if (screenId !== 'games') {
    if (dinoStreamImg) dinoStreamImg.src = '';
    if (dinoStateInterval) { clearInterval(dinoStateInterval); dinoStateInterval = null; }
    if (pongStreamImg) pongStreamImg.src = '';
    if (pongStateInterval) { clearInterval(pongStateInterval); pongStateInterval = null; }
  }
  origShowScreen.apply(this, arguments);
};

// script.js – COMPLETE UPDATED VERSION WITH ENGLISH GESTURES
// Fixed camera-gesture linking, independent detection, and status updates

const screens = {
  login: document.getElementById('login-screen'),
  register: document.getElementById('register-screen'),
  dashboard: document.getElementById('dashboard-screen'),
  whiteboard: document.getElementById('whiteboard-screen'),
  games: document.getElementById('games-screen'),
  presentation: document.getElementById('presentation-screen'),
  profile: document.getElementById('profile-screen'),
  help: document.getElementById('help-screen')
};

const navLinks = document.querySelectorAll('.nav-link');
const logoutBtn = document.getElementById('logoutBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const toRegisterLink = document.getElementById('toRegister');
const toLoginLink = document.getElementById('toLogin');
const profileEmailSpan = document.getElementById('profileEmail');
const profileEmailDisplay = document.getElementById('profileEmailDisplay');
const backButtons = document.querySelectorAll('.back-btn');

// Camera control buttons
const startCameraBtn = document.getElementById('start-camera-btn');
const stopCameraBtn = document.getElementById('stop-camera-btn');
const restartCameraBtn = document.getElementById('restart-camera-btn');
const startMiniCameraBtn = document.getElementById('start-mini-camera-btn');
const stopMiniCameraBtn = document.getElementById('stop-mini-camera-btn');
const startGamesCameraBtn = document.getElementById('start-games-camera-btn');
const stopGamesCameraBtn = document.getElementById('stop-games-camera-btn');
const startPresentationCameraBtn = document.getElementById('start-presentation-camera-btn');
const stopPresentationCameraBtn = document.getElementById('stop-presentation-camera-btn');

// Snake game elements
const snakeStreamImg = document.getElementById('snake-stream');
const snakeScoreEl = document.getElementById('snake-score');
const snakeResetBtn = document.getElementById('snake-reset-btn');

// Fruit Ninja elements
const fruitStreamImg = document.getElementById('fruit-stream');
const fruitScoreEl = document.getElementById('fruit-score');
const fruitLivesEl = document.getElementById('fruit-lives');
const fruitLevelEl = document.getElementById('fruit-level');
const fruitResetBtn = document.getElementById('fruit-reset-btn');

let fruitStateInterval = null;

// Camera status message
const cameraStatusMessage = document.getElementById('camera-status-message');

// currentUser is already declared at the top with Firebase auth
let currentGame = null;
let playerScore = 0, computerScore = 0, basketballScore = 0, spellsCast = 0;

let basketballMoveEnabled = false;
let basketballShotInProgress = false;
let lastBasketballShotAt = 0;
const BASKETBALL_SHOT_COOLDOWN = 900; // ms
let isDrawing = false, lastX = 0, lastY = 0;
let strokes = []; // For undo
const drawingGesture = 'one_finger_up';
const eraseGesture = 'two_fingers_up';
const colorChangeGesture = 'three_fingers_up';
const selectGesture = 'thumbs_up';
const backGesture = 'fist';
const clearGesture = 'open_palm';

// Screen-specific intervals and states
const screenStates = {
  dashboard: {
    gestureInterval: null,
    statusInterval: null,
    gestureUpdateActive: false
  },
  whiteboard: {
    gestureInterval: null,
    statusInterval: null,
    drawingInterval: null,
    gestureUpdateActive: false
  },
  games: {
    gestureInterval: null,
    statusInterval: null,
    snakeInterval: null,      // Separate interval for snake game
    fruitInterval: null,       // Separate interval for fruit game
    dinoInterval: null,        // Separate interval for dino game
    pongInterval: null,        // Separate interval for pong game
    gestureUpdateActive: false
  },
  presentation: {
    gestureInterval: null,
    statusInterval: null,
    presentationInterval: null,
    gestureUpdateActive: false
  }
};

let appIntervals = new Set(); // Use Set for better tracking
let lastGestureUpdate = 0;
// MEDIUM SENSITIVITY - Changed from 150ms to 350ms
const GESTURE_UPDATE_INTERVAL = 350; // ms - Medium sensitivity

// Camera state
let cameraActive = false;
let cameraRequested = false;
let cameraError = null;
let cameraInitializing = false;
let gestureActive = false;

// Apply theme to the application
function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light-theme');
    document.body.classList.remove('dark-theme');
  } else {
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');
  }
}

// Interval manager
function setAppInterval(fn, delay, screenId = null) {
  const id = setInterval(fn, delay);
  appIntervals.add(id);
  
  // Track screen-specific intervals
  if (screenId && screenStates[screenId]) {
    // Find which type of interval this is
    if (fn.toString().includes('get_gesture')) {
      screenStates[screenId].gestureInterval = id;
    } else if (fn.toString().includes('camera_status')) {
      screenStates[screenId].statusInterval = id;
    } else if (fn.toString().includes('game_action')) {
      screenStates[screenId].gameInterval = id;
    } else if (fn.toString().includes('get_hand_position')) {
      screenStates[screenId].drawingInterval = id;
    } else if (fn.toString().includes('presentation')) {
      screenStates[screenId].presentationInterval = id;
    }
  }
  
  return id;
}

function clearAppInterval(id) {
  clearInterval(id);
  appIntervals.delete(id);
}

function clearAllIntervals() {
  appIntervals.forEach(id => clearInterval(id));
  appIntervals.clear();
  
  // Clear screen-specific intervals
  Object.keys(screenStates).forEach(screenId => {
    screenStates[screenId].gestureInterval = null;
    screenStates[screenId].statusInterval = null;
    screenStates[screenId].drawingInterval = null;
    screenStates[screenId].gameInterval = null;
    screenStates[screenId].presentationInterval = null;
    screenStates[screenId].gestureUpdateActive = false;
  });
}

// === SCREEN NAVIGATION ===
function showScreen(screenId) {
  clearAllIntervals();
  
  // Show/hide navbar based on screen
  const navbar = document.getElementById('navbar');
  if (screenId === 'login' || screenId === 'register') {
    navbar.style.display = 'none';
  } else {
    navbar.style.display = 'flex';
  }
  
  // Always clear snake stream when switching screens
  if (snakeStreamImg) {
    snakeStreamImg.src = '';
  }
  // Always clear fruit stream when switching screens
  if (fruitStreamImg) {
    fruitStreamImg.src = '';
  }
  if (fruitStateInterval) {
    clearInterval(fruitStateInterval);
    fruitStateInterval = null;
  }
  Object.values(screens).forEach(s => s.classList.remove('active'));
  if (screens[screenId]) {
    screens[screenId].classList.add('active');

    // DASHBOARD
    if (screenId === 'dashboard') {
      if (currentUser) {
        profileEmailSpan.textContent = currentUser;
        profileEmailDisplay.textContent = currentUser;
        
        // Start camera status polling only when authenticated
        screenStates.dashboard.statusInterval = setAppInterval(() => checkCameraStatus(), 1000, 'dashboard');
        
        // Start gesture updates if camera is active
        if (cameraActive) {
          startWebcam();
          startGestureDetection('dashboard');
        }
      }
    } 
    // WHITEBOARD
    else if (screenId === 'whiteboard') {
      // Track whiteboard usage
      whiteboardUsageCount++;
      
      // Start camera status polling only when authenticated
      if (currentUser) {
        screenStates.whiteboard.statusInterval = setAppInterval(() => checkCameraStatus(), 1000, 'whiteboard');
      }
      
      // Start gesture detection and drawing if camera is active
      if (cameraActive) {
        startMiniWebcam();
        startGestureDetection('whiteboard');
        startGestureDrawing();
      }
    } 
    // GAMES
    else if (screenId === 'games') {
      // Track games usage (increment when they actually play a game)
      
      // Start camera status polling only when authenticated
      if (currentUser) {
        screenStates.games.statusInterval = setAppInterval(() => checkCameraStatus(), 1000, 'games');
      }
      
      // Start gesture detection if camera is active
      if (cameraActive) {
        startMiniWebcam();
        startGestureDetection('games');
        
        // Initialize current game if one is selected
        if (currentGame) {
          if (currentGame === 'basketball') {
            initBasketball();
          } else if (currentGame === 'spells') {
            initSpells();
          } else if (currentGame === 'rps') {
            initRockPaperScissors();
          } else if (currentGame === 'snake') {
            initSnakeGame();
          } else if (currentGame === 'fruit') {
            initFruitGame();
          }
        }
      }
    } 
    // PRESENTATION
    else if (screenId === 'presentation') {
      // Initialize presentation UI state
      const uploadSection = document.getElementById('presentation-upload-section');
      const viewerSection = document.getElementById('presentation-viewer-section');
      
      // Only show upload section if no presentation is loaded
      if (!presentationSessionId) {
        if (uploadSection) uploadSection.style.display = 'block';
        if (viewerSection) viewerSection.style.display = 'none';
      } else {
        // If presentation is loaded, show viewer
        if (uploadSection) uploadSection.style.display = 'none';
        if (viewerSection) viewerSection.style.display = 'block';
      }
      
      // Start camera status polling only when authenticated
      if (currentUser) {
        screenStates.presentation.statusInterval = setAppInterval(() => checkCameraStatus(), 1000, 'presentation');
      }
      
      // Start gesture detection and presentation control if camera is active
      if (cameraActive) {
        startMiniWebcam();
        startGestureDetection('presentation');
        startPresentationControl();
      }
    }
    // PROFILE
    else if (screenId === 'profile') {
      // Update profile data
      updateProfileScreen();
    }
    // HELP
    else if (screenId === 'help') {
      // Initialize FAQ accordion
      initFAQAccordion();
    }
  }
}

// === AUTH ===
console.log('[Auth] Setting up authentication listeners...');
console.log('[Auth] toRegisterLink:', toRegisterLink);
console.log('[Auth] toLoginLink:', toLoginLink);
console.log('[Auth] loginForm:', loginForm);
console.log('[Auth] registerForm:', registerForm);

if (toRegisterLink) {
  toRegisterLink.addEventListener('click', e => { 
    e.preventDefault(); 
    e.stopPropagation();
    console.log('Register link clicked');
    showScreen('register'); 
  });
}

if (toLoginLink) {
  toLoginLink.addEventListener('click', e => { 
    e.preventDefault(); 
    e.stopPropagation();
    console.log('Login link clicked');
    showScreen('login'); 
  });
}

if (loginForm) {
  console.log('[Auth] Login form found, adding submit listener');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('[Auth] Login form submitted');
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    console.log('[Auth] Login attempt for:', email);
    
    if (!email || !password) {
      alert('Please enter email and password');
      return;
    }
    
    // Show loading state
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    
    try {
      console.log('[Auth] Calling Firebase signInWithEmailAndPassword...');
      await firebase.auth().signInWithEmailAndPassword(email, password);
      alert('Login successful!');
      // onAuthStateChanged will handle navigation
    } catch (error) {
      console.error('Login error:', error);
      const friendlyMessage = getAuthErrorMessage(error);
      alert(friendlyMessage);
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
} else {
  console.error('[Auth] Login form not found!');
}

if (registerForm) {
  console.log('[Auth] Register form found, adding submit listener');
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('[Auth] Register form submitted');
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirmPassword').value;
    
    console.log('[Auth] Registration attempt for:', email);
    
    if (!email) return alert('Enter email');
    if (password !== confirm) return alert('Passwords do not match');
    if (password.length < 6) return alert('Password must be at least 6 characters');
    
    // Show loading state
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
    
    try {
      console.log('[Auth] Calling Firebase createUserWithEmailAndPassword...');
      await firebase.auth().createUserWithEmailAndPassword(email, password);
      alert('Registered & logged in!');
      // onAuthStateChanged will handle navigation
    } catch (error) {
      console.error('Registration error:', error);
      const friendlyMessage = getAuthErrorMessage(error);
      alert(friendlyMessage);
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
} else {
  console.error('[Auth] Register form not found!');
}

navLinks.forEach(l => l.addEventListener('click', e => {
  e.preventDefault();
  const t = e.currentTarget.dataset.screen;
  
  // Allow login/register screen access without authentication
  if (t === 'login' || t === 'register') {
    showScreen(t);
    return;
  }
  
  // Only allow access to authenticated screens if logged in
  if (!currentUser) { 
    alert('Please login first to access this feature'); 
    showScreen('login'); 
    return; 
  }
  
  showScreen(t);
}));

document.querySelectorAll('.dashboard-buttons .btn').forEach(b => {
  b.addEventListener('click', e => {
    if (!currentUser) {
      alert('Please login first');
      showScreen('login');
      return;
    }
    showScreen(e.currentTarget.dataset.screen);
  });
});

// Profile screen navigation buttons
document.querySelectorAll('#profile-screen .btn[data-screen]').forEach(b => {
  b.addEventListener('click', e => {
    const targetScreen = e.currentTarget.dataset.screen;
    if (targetScreen) {
      showScreen(targetScreen);
    }
  });
});

backButtons.forEach(b => b.addEventListener('click', () => {
  const t = b.dataset.screen || 'dashboard';
  showScreen(t);
}));

logoutBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  try {
    // Clear token refresh interval
    if (tokenRefreshInterval) {
      clearInterval(tokenRefreshInterval);
      tokenRefreshInterval = null;
    }
    
    await firebase.auth().signOut();
    currentUser = null;
    userIdToken = null;
    stopWebcam();
    alert('Logged out.');
    // onAuthStateChanged will handle navigation to login
  } catch (error) {
    console.error('Logout error:', error);
    alert('An error occurred during logout');
  }
});

// === CAMERA CONTROL ===
function checkCameraStatus() {
  // Don't check camera status if not authenticated
  if (!currentUser || !userIdToken) {
    console.log('[Camera] Skipping status check - not authenticated');
    return;
  }
  
  fetch('/camera_status', {
    credentials: 'same-origin'  // Include cookies for session
  })
    .then(response => {
      if (!response.ok) {
        if (response.status === 401) {
          console.log('[Camera] Not authenticated - skipping camera status');
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (!data) return;
      
      // Only log camera status on changes, not every poll
      const wasActive = cameraActive;
      const statusChanged = wasActive !== data.active || cameraError !== data.error;
      if (statusChanged) {
        console.log('[Camera] Status changed:', data);
      }
      
      cameraActive = data.active;
      cameraRequested = data.requested;
      cameraError = data.error;
      cameraInitializing = data.initializing;
      
      // If camera just turned on, start gesture detection on current screen
      if (!wasActive && cameraActive) {
        const currentScreen = Object.keys(screens).find(screenId => 
          screens[screenId] && screens[screenId].classList.contains('active')
        );
        
        if (currentScreen && currentScreen !== 'login' && currentScreen !== 'register' && 
            currentScreen !== 'profile' && currentScreen !== 'help') {
          
          // Start mini webcam first
          startMiniWebcam();
          
          // Then start gesture detection
          startGestureDetection(currentScreen);
          
          // Start screen-specific features
          if (currentScreen === 'whiteboard') {
            startGestureDrawing();
          } else if (currentScreen === 'presentation') {
            startPresentationControl();
          } else if (currentScreen === 'games' && currentGame) {
            if (currentGame === 'basketball') {
              initBasketball();
            } else if (currentGame === 'spells') {
              initSpells();
            } else if (currentGame === 'rps') {
              initRockPaperScissors();
            } else if (currentGame === 'snake') {
              initSnakeGame();
            } else if (currentGame === 'fruit') {
              initFruitGame();
            }
          }
        }
      }
      // If camera just turned off, stop everything
      else if (wasActive && !cameraActive) {
        stopMiniWebcam();
        stopGestureDetection();
        stopGestureDrawing();
      }
      
      updateCameraUI();
      
      // If camera is initializing, check again after a short delay
      if (cameraInitializing) {
        setTimeout(checkCameraStatus, 1000);
      }
    })
    .catch(error => {
      console.error('Camera status check error:', error);
      cameraActive = false;
      cameraError = "Failed to check camera status";
      updateCameraUI();
    });
}

function updateCameraUI() {
  // Update dashboard status indicators
  const dashCameraStatus = document.getElementById('dashboard-camera-status');
  const dashGestureStatus = document.getElementById('dashboard-gesture-status');
  const dashModeStatus = document.getElementById('dashboard-mode-status');
  const dashDetectionStatus = document.getElementById('dashboard-detection-status');
  
  if (dashCameraStatus) {
    dashCameraStatus.textContent = cameraActive ? 'ON' : 'OFF';
    dashCameraStatus.style.color = cameraActive ? '#10b981' : '#ef4444';
  }
  
  if (dashGestureStatus) {
    dashGestureStatus.textContent = cameraActive ? 'Active' : 'Inactive';
    dashGestureStatus.style.color = cameraActive ? '#10b981' : '#94a3b8';
  }
  
  if (dashModeStatus) {
    dashModeStatus.textContent = cameraActive ? 'Active' : 'Idle';
    dashModeStatus.style.color = cameraActive ? '#10b981' : '#94a3b8';
  }
  
  if (dashDetectionStatus) {
    dashDetectionStatus.textContent = cameraActive ? 'Running' : 'Standby';
    dashDetectionStatus.style.color = cameraActive ? '#10b981' : '#94a3b8';
  }
  
  // Dashboard camera controls
  if (startCameraBtn && stopCameraBtn && restartCameraBtn) {
    if (cameraActive) {
      startCameraBtn.style.display = 'none';
      stopCameraBtn.style.display = 'inline-block';
      restartCameraBtn.style.display = 'inline-block';
    } else {
      startCameraBtn.style.display = 'inline-block';
      stopCameraBtn.style.display = 'none';
      restartCameraBtn.style.display = 'none';
    }
  }
  
  // Update webcam visibility - ALWAYS SHOW CONTAINER
  const webcamContainer = document.querySelector('.webcam-container');
  const webcamImg = document.getElementById('webcam');
  
  if (webcamContainer && webcamImg) {
    webcamContainer.style.display = 'block'; // Always show container
    if (cameraActive) {
      if (!webcamImg.src || webcamImg.src.endsWith('/')) {
        webcamImg.src = '/video_feed';
      }
    } else {
      webcamImg.src = '';
    }
  }
  
  // Update mini webcam visibility - FIX FOR ALL SCREENS
  const miniWebcamContainers = document.querySelectorAll('.mini-webcam-container');
  miniWebcamContainers.forEach(container => {
    const wrapper = container.querySelector('.webcam-wrapper');
    const miniWebcamImg = container.querySelector('#mini-webcam');
    const startBtn = container.querySelector('[id*="start"][id*="camera-btn"]');
    const stopBtn = container.querySelector('[id*="stop"][id*="camera-btn"]');
    
    if (wrapper && miniWebcamImg) {
      if (cameraActive) {
        wrapper.style.display = 'block';
        if (!miniWebcamImg.src || miniWebcamImg.src.endsWith('/')) {
          miniWebcamImg.src = '/video_feed';
        }
      } else {
        wrapper.style.display = 'none';
        miniWebcamImg.src = '';
      }
    }
    
    // Update button visibility
    if (startBtn && stopBtn) {
      if (cameraActive) {
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
      } else {
        startBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
      }
    }
  });
  
  // Update loading indicators
  const loadingIndicators = document.querySelectorAll('.webcam-loading');
  loadingIndicators.forEach(indicator => {
    if (cameraActive) {
      indicator.style.display = 'none';
    } else {
      indicator.innerHTML = '<i class="fas fa-video-slash"></i> Camera is off';
      indicator.style.display = 'flex';
    }
  });
}

// Dashboard camera controls
if (startCameraBtn) {
  startCameraBtn.addEventListener('click', async () => {
    console.log('[Camera] Start camera button clicked');
    const video = document.getElementById('video');
    const statusText = document.getElementById('camera-status-text');
    const loadingDiv = document.getElementById('webcam-loading');
    
    // Show loading state
    startCameraBtn.disabled = true;
    startCameraBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
    if (statusText) statusText.innerText = 'Requesting camera permission...';
    if (loadingDiv) loadingDiv.style.display = 'flex';
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      
      // Update UI
      cameraActive = true;
      cameraRequested = true;
      cameraError = null;
      cameraInitializing = false;
      
      if (statusText) statusText.innerText = 'Camera started ✅';
      if (loadingDiv) loadingDiv.style.display = 'none';
      
      startCameraBtn.style.display = 'none';
      stopCameraBtn.style.display = 'inline-block';
      
      // Update dashboard status
      const dashCameraStatus = document.getElementById('dashboard-camera-status');
      if (dashCameraStatus) {
        dashCameraStatus.textContent = 'ACTIVE';
        dashCameraStatus.style.color = '#34d399';
      }
      
      const dashGestureStatus = document.getElementById('dashboard-gesture-status');
      if (dashGestureStatus) {
        dashGestureStatus.textContent = 'Active';
        dashGestureStatus.style.color = '#34d399';
      }
      
      // Start sending frames to backend
      startFrameProcessing();
      
      console.log('[Camera] Browser camera started successfully');
      
    } catch (err) {
      console.error('[Camera] Permission denied:', err);
      cameraError = 'Camera permission denied';
      if (statusText) statusText.innerText = 'Camera permission denied ❌';
      if (loadingDiv) {
        loadingDiv.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Camera permission denied';
        loadingDiv.style.display = 'flex';
      }
      alert('Camera permission denied. Please allow camera access and try again.');
    } finally {
      startCameraBtn.disabled = false;
      startCameraBtn.innerHTML = '<i class="fas fa-video"></i> Start Camera';
    }
  });
}

if (stopCameraBtn) {
  stopCameraBtn.addEventListener('click', () => {
    const video = document.getElementById('video');
    const statusText = document.getElementById('camera-status-text');
    const loadingDiv = document.getElementById('webcam-loading');
    
    // Stop video stream
    if (video.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }
    
    // Stop frame processing
    if (window.frameProcessingInterval) {
      clearInterval(window.frameProcessingInterval);
      window.frameProcessingInterval = null;
    }
    
    cameraActive = false;
    cameraRequested = false;
    cameraError = null;
    
    if (statusText) statusText.innerText = 'Camera stopped';
    if (loadingDiv) {
      loadingDiv.innerHTML = '<i class="fas fa-video-slash"></i> Camera is off';
      loadingDiv.style.display = 'flex';
    }
    
    stopCameraBtn.style.display = 'none';
    startCameraBtn.style.display = 'inline-block';
    
    // Update dashboard status
    const dashCameraStatus = document.getElementById('dashboard-camera-status');
    if (dashCameraStatus) {
      dashCameraStatus.textContent = 'OFF';
      dashCameraStatus.style.color = '#ef4444';
    }
    
    const dashGestureStatus = document.getElementById('dashboard-gesture-status');
    if (dashGestureStatus) {
      dashGestureStatus.textContent = 'Inactive';
      dashGestureStatus.style.color = '#94a3b8';
    }
    
    console.log('[Camera] Browser camera stopped');
  });
}

// Frame processing function
let lastGesture = 'none';

function startFrameProcessing() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  
  if (!video || !canvas) {
    console.error('[Frame Processing] Video or canvas element not found');
    return;
  }
  
  // Clear any existing interval
  if (window.frameProcessingInterval) {
    clearInterval(window.frameProcessingInterval);
  }
  
  window.frameProcessingInterval = setInterval(async () => {
    if (!video.videoWidth || !cameraActive) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    const image = canvas.toDataURL('image/jpeg', 0.7);
    
    // Use backend URL from config (fallback to relative path for local dev)
    const backendUrl = typeof BACKEND_URL !== 'undefined' ? BACKEND_URL : '';
    
    try {
      const res = await fetch(`${backendUrl}/process-frame`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': userIdToken ? `Bearer ${userIdToken}` : ''
        },
        body: JSON.stringify({ image })
      });
      
      if (!res.ok) {
        console.error('[Frame Processing] Server error:', res.status);
        return;
      }
      
      const data = await res.json();
      
      // Update gesture display
      if (data.gesture !== lastGesture) {
        lastGesture = data.gesture;
        console.log('[Gesture]', data.gesture);
        
        // Update dashboard
        const dashLastGesture = document.getElementById('dashboard-last-gesture');
        if (dashLastGesture) {
          dashLastGesture.textContent = data.gesture || 'None';
        }
        
        const dashDetectionStatus = document.getElementById('dashboard-detection-status');
        if (dashDetectionStatus) {
          if (data.gesture && data.gesture !== 'none' && data.gesture !== 'unknown') {
            dashDetectionStatus.textContent = 'Detecting';
            dashDetectionStatus.style.color = '#34d399';
          } else {
            dashDetectionStatus.textContent = 'Standby';
            dashDetectionStatus.style.color = '#94a3b8';
          }
        }
      }
      
    } catch (error) {
      console.error('[Frame Processing] Error:', error);
    }
  }, 150); // ~6 FPS
}


// Whiteboard camera controls (reuse browser camera)
if (startMiniCameraBtn) {
  startMiniCameraBtn.addEventListener('click', () => {
    fetch('/start_camera', { 
      method: 'POST',
      credentials: 'same-origin'  // Include cookies for session
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          console.log(data.message || 'Camera initialization started');
          
          // Start mini webcam immediately
          startMiniWebcam();
          
          // Start gesture detection
          startGestureDetection('whiteboard');
          
          // Start drawing
          startGestureDrawing();
        } else {
          cameraError = data.error || 'Failed to start camera';
          updateCameraUI();
          alert(cameraError);
        }
      })
      .catch(error => {
        console.error('Camera start error:', error);
        cameraError = 'An error occurred while starting the camera';
        updateCameraUI();
        alert(cameraError);
      });
  });
}

if (stopMiniCameraBtn) {
  stopMiniCameraBtn.addEventListener('click', () => {
    fetch('/stop_camera', { 
      method: 'POST',
      credentials: 'same-origin'  // Include cookies for session
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          cameraActive = false;
          cameraRequested = false;
          cameraError = null;
          updateCameraUI();
          stopMiniWebcam();
          stopGestureDetection();
          stopGestureDrawing();
        } else {
          alert('Failed to stop camera');
        }
      })
      .catch(error => {
        console.error('Camera stop error:', error);
        alert('An error occurred while stopping the camera');
      });
  });
}

// Games camera controls
if (startGamesCameraBtn) {
  startGamesCameraBtn.addEventListener('click', () => {
    // Show loading state
    startGamesCameraBtn.disabled = true;
    startGamesCameraBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
    
    fetch('/start_camera', { 
      method: 'POST',
      credentials: 'same-origin'
    })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then(data => {
        if (data.success) {
          console.log(data.message || 'Camera initialization started');
          
          // Start mini webcam immediately
          startMiniWebcam();
          
          // Start gesture detection
          startGestureDetection('games');
          
          // Initialize current game if one is selected
          if (currentGame) {
            if (currentGame === 'basketball') {
              initBasketball();
            } else if (currentGame === 'spells') {
              initSpells();
            } else if (currentGame === 'rps') {
              initRockPaperScissors();
            } else if (currentGame === 'snake') {
              initSnakeGame();
            }
          }
          
          // Remove any camera notice
          const gameContainer = document.getElementById(`${currentGame}-game`);
          if (gameContainer) {
            const notice = gameContainer.querySelector('.camera-notice');
            if (notice) notice.remove();
          }
        } else {
          cameraError = data.error || 'Failed to start camera';
          updateCameraUI();
          alert(cameraError);
        }
        
        // Reset button state
        startGamesCameraBtn.disabled = false;
        startGamesCameraBtn.innerHTML = '<i class="fas fa-video"></i> Start Camera';
      })
      .catch(error => {
        console.error('Camera start error:', error);
        cameraError = 'An error occurred while starting the camera';
        updateCameraUI();
        alert(cameraError);
        
        // Reset button state
        startGamesCameraBtn.disabled = false;
        startGamesCameraBtn.innerHTML = '<i class="fas fa-video"></i> Start Camera';
      });
  });
}

if (stopGamesCameraBtn) {
  stopGamesCameraBtn.addEventListener('click', () => {
    fetch('/stop_camera', { 
      method: 'POST',
      credentials: 'same-origin'
    })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then(data => {
        if (data.success) {
          cameraActive = false;
          cameraRequested = false;
          cameraError = null;
          updateCameraUI();
          stopMiniWebcam();
          stopGestureDetection();
          
          // Clear game-specific intervals
          if (screenStates.games.drawingInterval) {
            clearAppInterval(screenStates.games.drawingInterval);
            screenStates.games.drawingInterval = null;
          }
          if (screenStates.games.gameInterval) {
            clearAppInterval(screenStates.games.gameInterval);
            screenStates.games.gameInterval = null;
          }

          // Stop game-specific MJPEG streams
          if (snakeStreamImg) {
            snakeStreamImg.src = '';
          }
          if (fruitStreamImg) {
            fruitStreamImg.src = '';
          }
          if (fruitStateInterval) {
            clearInterval(fruitStateInterval);
            fruitStateInterval = null;
          }
          if (screenStates.games.gameInterval) {
            clearAppInterval(screenStates.games.gameInterval);
            screenStates.games.gameInterval = null;
          }

          // Stop snake stream if active
          if (snakeStreamImg) {
            snakeStreamImg.src = '';
          }
        } else {
          alert('Failed to stop camera');
        }
      })
      .catch(error => {
        console.error('Camera stop error:', error);
        alert('An error occurred while stopping the camera');
      });
  });
}

// Presentation camera controls
if (startPresentationCameraBtn) {
  startPresentationCameraBtn.addEventListener('click', () => {
    fetch('/start_camera', { 
      method: 'POST',
      credentials: 'same-origin'  // Include cookies for session
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          console.log(data.message || 'Camera initialization started');
          
          // Start mini webcam immediately
          startMiniWebcam();
          
          // Start gesture detection
          startGestureDetection('presentation');
          
          // Start presentation control
          startPresentationControl();
        } else {
          cameraError = data.error || 'Failed to start camera';
          updateCameraUI();
          alert(cameraError);
        }
      })
      .catch(error => {
        console.error('Camera start error:', error);
        cameraError = 'An error occurred while starting the camera';
        updateCameraUI();
        alert(cameraError);
      });
  });
}

if (stopPresentationCameraBtn) {
  stopPresentationCameraBtn.addEventListener('click', () => {
    fetch('/stop_camera', { 
      method: 'POST',
      credentials: 'same-origin'  // Include cookies for session
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          cameraActive = false;
          cameraRequested = false;
          cameraError = null;
          updateCameraUI();
          stopMiniWebcam();
          stopGestureDetection();
        } else {
          alert('Failed to stop camera');
        }
      })
      .catch(error => {
        console.error('Camera stop error:', error);
        alert('An error occurred while stopping the camera');
      });
  });
}

// === WEBCAM ===
const video = document.getElementById('webcam');
const miniVideo = document.getElementById('mini-webcam');

function startWebcam() {
  if (!video) {
    console.log('[Webcam] Cannot start - video element not found');
    return;
  }
  
  console.log('[Webcam] Starting video feed... (cameraActive:', cameraActive, ')');
  // Show loading indicator
  const loadingIndicator = document.querySelector('#dashboard-screen .webcam-loading');
  if (loadingIndicator) {
    loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading camera...';
    loadingIndicator.style.display = 'flex';
  }
  
  video.src = '/video_feed';
  // MJPEG streams don't fire onload events, hide loading after setting source
  setTimeout(() => {
    if (loadingIndicator && cameraActive) {
      loadingIndicator.style.display = 'none';
    }
  }, 500);
}

function stopWebcam() { 
  if (video) video.src = ''; 
}

function startMiniWebcam() {
  if (!miniVideo || !cameraActive) return;
  
  // Show loading indicator
  const loadingIndicators = document.querySelectorAll('.side-panel .webcam-loading');
  loadingIndicators.forEach(indicator => {
    if (indicator) {
      indicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading camera...';
      indicator.style.display = 'flex';
    }
  });
  
  miniVideo.src = '/video_feed';
  // MJPEG streams don't fire onload events, hide loading after setting source
  setTimeout(() => {
    loadingIndicators.forEach(indicator => {
      if (indicator && cameraActive) {
        indicator.style.display = 'none';
      }
    });
  }, 500);
}

function stopMiniWebcam() {
  if (miniVideo) miniVideo.src = '';
  const loadingIndicators = document.querySelectorAll('.side-panel .webcam-loading');
  loadingIndicators.forEach(indicator => {
    if (indicator) { 
      indicator.innerHTML = '<i class="fas fa-video-slash"></i> Camera is off'; 
      indicator.style.display = 'flex'; 
    }
  });
}

// === GESTURE DETECTION ===
function startGestureDetection(screenId) {
  if (!cameraActive || !screenStates[screenId] || screenStates[screenId].gestureUpdateActive) return;
  
  // Stop any existing gesture detection for this screen
  if (screenStates[screenId].gestureInterval) {
    clearAppInterval(screenStates[screenId].gestureInterval);
  }
  
  screenStates[screenId].gestureUpdateActive = true;
  gestureActive = true;
  
  // Start gesture polling for this screen
  screenStates[screenId].gestureInterval = setAppInterval(() => {
    const now = Date.now();
    if (now - lastGestureUpdate < GESTURE_UPDATE_INTERVAL) return;
    
    lastGestureUpdate = now;
    fetch('/get_gesture', {
      credentials: 'same-origin'  // Include cookies for session
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Update gesture UI for this screen
        updateGestureUIForScreen(screenId, data.gesture);
        
        // Screen-specific gesture handling
        if (screenId === 'games' && data.gesture && data.gesture !== 'unknown') {
          handleGameGesture(data.gesture);
        } else if (screenId === 'presentation' && data.gesture && data.gesture !== 'unknown') {
          handlePresentationGesture(data.gesture);
        }
      })
      .catch(error => {
        console.error('Error fetching gesture:', error);
        updateGestureUIForScreen(screenId, null);
      });
  }, 200, screenId); // Balanced polling for stable gesture detection
}

function stopGestureDetection() {
  // Stop gesture detection for all screens
  gestureActive = false;
  Object.keys(screenStates).forEach(screenId => {
    if (screenStates[screenId].gestureInterval) {
      clearAppInterval(screenStates[screenId].gestureInterval);
      screenStates[screenId].gestureInterval = null;
    }
    screenStates[screenId].gestureUpdateActive = false;
  });
  
  // Reset gesture UI
  updateGestureUIForScreen('dashboard', null);
  updateGestureUIForScreen('whiteboard', null);
  updateGestureUIForScreen('games', null);
  updateGestureUIForScreen('presentation', null);
}

function updateGestureUIForScreen(screenId, gesture) {
  // Find the gesture status elements for this screen
  const screen = screens[screenId];
  if (!screen) return;
  
  // Get all possible gesture status elements in this screen
  const currentGestureEls = screen.querySelectorAll('#current-gesture');
  const gestureDotEls = screen.querySelectorAll('#gesture-dot');
  const gestureFeedbackEls = screen.querySelectorAll('#gesture-feedback');
  
  const names = {
    "one_finger_up": "One Finger Up",
    "two_fingers_up": "Two Fingers Up",
    "three_fingers_up": "Three Fingers Up",
    "thumbs_up": "Thumbs Up",
    "fist": "Fist",
    "open_palm": "Open Palm",
    "unknown": "None"
  };
  
  const name = names[gesture] || "None";
  
  // Update dashboard last gesture indicator
  if (gesture && gesture !== 'unknown') {
    const dashLastGesture = document.getElementById('dashboard-last-gesture');
    if (dashLastGesture) {
      dashLastGesture.textContent = name;
    }
  }
  
  // Update all gesture status elements in this screen
  currentGestureEls.forEach(el => {
    if (el) el.textContent = name;
  });
  
  gestureDotEls.forEach(el => {
    if (el) el.classList.toggle('active', gesture && gesture !== 'unknown');
  });
  
  gestureFeedbackEls.forEach(el => {
    if (el) el.textContent = gesture && gesture !== 'unknown' ? `Detected: ${name}` : "Waiting for gesture...";
  });
}

// === GAMES ===
function initGame(name) {
  clearAllIntervals();
  document.querySelectorAll('.game-container').forEach(c => c.classList.add('hidden'));
  document.getElementById(`${name}-game`).classList.remove('hidden');
  currentGame = name;

  // Scroll to top of main content area
  const mainContent = document.querySelector('#games-screen .main-content');
  if (mainContent) {
    mainContent.scrollTop = 0;
    // Also ensure the window scrolls to top
    mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

   // If switching away from snake, stop its stream
   if (name !== 'snake' && snakeStreamImg) {
     snakeStreamImg.src = '';
   }

   // If switching away from fruit, stop its stream and polling
   if (name !== 'fruit') {
     if (fruitStreamImg) {
       fruitStreamImg.src = '';
     }
     if (fruitStateInterval) {
       clearInterval(fruitStateInterval);
       fruitStateInterval = null;
     }
   }

  // Start gesture detection if camera is active
  if (cameraActive) {
    startGestureDetection('games');
    
    // Initialize the specific game
    if (name === 'rps') {
      initRockPaperScissors();
    } else if (name === 'basketball') {
      initBasketball();
    } else if (name === 'spells') {
      initSpells();
    } else if (name === 'snake') {
      initSnakeGame();
    } else if (name === 'fruit') {
      initFruitGame();
    }
  } else {
    // Show message to start camera
    const gameContainer = document.getElementById(`${name}-game`);
    if (gameContainer) {
      const message = document.createElement('div');
      message.className = 'camera-notice';
      message.innerHTML = '<i class="fas fa-video-slash"></i> Please start the camera to play this game';
      message.style.padding = '1rem';
      message.style.background = 'rgba(239, 68, 68, 0.2)';
      message.style.borderRadius = '8px';
      message.style.marginBottom = '1rem';
      message.style.textAlign = 'center';
      
      // Remove any existing notice
      const existingNotice = gameContainer.querySelector('.camera-notice');
      if (existingNotice) existingNotice.remove();
      
      // Insert at the beginning of the game container
      gameContainer.insertBefore(message, gameContainer.firstChild);
    }
  }
}

function initSnakeGame() {
  const gameContainer = document.getElementById('snake-game');
  if (!snakeStreamImg || !gameContainer) return;

  // Remove any existing camera notice
  const existingNotice = gameContainer.querySelector('.camera-notice');
  if (existingNotice) existingNotice.remove();

  if (cameraActive) {
    // Start or keep the MJPEG stream
    if (!snakeStreamImg.src || snakeStreamImg.src.endsWith('/')) {
      snakeStreamImg.src = '/snake_feed';
    }

    // Clear existing snake interval if any
    if (screenStates.games.snakeInterval) {
      clearAppInterval(screenStates.games.snakeInterval);
      screenStates.games.snakeInterval = null;
    }

    // Start polling snake state (score, gameOver)
    screenStates.games.snakeInterval = setAppInterval(() => {
      fetch('/snake_state', {
        credentials: 'same-origin'
      })
        .then(response => {
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          return response.json();
        })
        .then(data => {
          if (snakeScoreEl) {
            const statusText = data.game_over ? ' (Game Over)' : '';
            snakeScoreEl.textContent = `Score: ${data.score}${statusText}`;
          }
        })
        .catch(error => {
          console.error('Snake state error:', error);
        });
    }, 500, 'games');
  } else {
    // No camera: show notice
    const message = document.createElement('div');
    message.className = 'camera-notice';
    message.innerHTML = '<i class="fas fa-video-slash"></i> Please start the camera to play this game';
    message.style.padding = '1rem';
    message.style.background = 'rgba(239, 68, 68, 0.2)';
    message.style.borderRadius = '8px';
    message.style.marginBottom = '1rem';
    message.style.textAlign = 'center';

    gameContainer.insertBefore(message, gameContainer.firstChild);

    snakeStreamImg.src = '';
  }
}

function initFruitGame() {
  const gameContainer = document.getElementById('fruit-game');
  if (!fruitStreamImg || !gameContainer) return;

  // Remove any existing camera notice
  const existingNotice = gameContainer.querySelector('.camera-notice');
  if (existingNotice) existingNotice.remove();

  if (!cameraActive) {
    const message = document.createElement('div');
    message.className = 'camera-notice';
    message.innerHTML = '<i class="fas fa-video-slash"></i> Please start the camera to play this game';
    message.style.padding = '1rem';
    message.style.background = 'rgba(239, 68, 68, 0.2)';
    message.style.borderRadius = '8px';
    message.style.marginBottom = '1rem';
    message.style.textAlign = 'center';

    gameContainer.insertBefore(message, gameContainer.firstChild);

    fruitStreamImg.src = '';
    return;
  }

  // Start or keep the MJPEG stream
  if (!fruitStreamImg.src || fruitStreamImg.src.endsWith('/')) {
    fruitStreamImg.src = '/fruit_feed';
  }

  // Clear existing fruit interval if any
  if (screenStates.games.fruitInterval) {
    clearAppInterval(screenStates.games.fruitInterval);
    screenStates.games.fruitInterval = null;
  }

  // Start polling fruit state
  screenStates.games.fruitInterval = setAppInterval(() => {
    fetch('/fruit_state', { credentials: 'same-origin' })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then(state => {
        if (fruitScoreEl) fruitScoreEl.textContent = state.score;
        if (fruitLivesEl) fruitLivesEl.textContent = state.lives;
        if (fruitLevelEl) fruitLevelEl.textContent = state.level;
      })
      .catch(error => {
        console.error('Fruit state error:', error);
      });
  }, 400, 'games');
}

function handleGameGesture(gesture) {
  if (!currentGame) return;
  
  if (currentGame === 'rps') {
    playRPS(gesture);
  } else if (currentGame === 'basketball') {
    handleBasketballGesture(gesture);
  } else if (currentGame === 'spells') {
    castSpell(gesture);
  }
}

function initRockPaperScissors() {
  // Reset game state to IDLE (waiting for first gesture to start)
  rpsGameState = {
    state: RPS_GAME_STATES.IDLE,
    currentRound: 0,
    totalRounds: 5,
    playerScore: 0,
    computerScore: 0,
    lastGestureProcessed: null,
    roundLocked: false
  };
  
  // Update UI
  updateRPSScore();
  updateRPSRoundDisplay();
  
  const playerGestureEl = document.getElementById('player-gesture');
  const computerGestureEl = document.getElementById('computer-gesture');
  const gameResultEl = document.getElementById('game-result');
  const restartBtn = document.getElementById('rps-restart-btn');
  
  if (playerGestureEl) {
    playerGestureEl.style.transition = 'all 0.3s ease';
    playerGestureEl.textContent = '?';
    playerGestureEl.style.transform = 'scale(1)';
  }
  
  if (computerGestureEl) {
    computerGestureEl.textContent = '?';
    computerGestureEl.style.transform = 'scale(1)';
  }
  
  if (gameResultEl) {
    gameResultEl.textContent = 'Make a gesture to start!';
    gameResultEl.style.color = '';
  }
  
  if (restartBtn) {
    restartBtn.style.display = 'none';
  }
}

function playRPS(g) {
  // Ignore if game is over or in result delay
  if (rpsGameState.state === RPS_GAME_STATES.MATCH_OVER || 
      rpsGameState.state === RPS_GAME_STATES.ROUND_RESULT ||
      rpsGameState.roundLocked) {
    return;
  }
  
  // Map gestures to choices
  const map = { 'fist': 'rock', 'open_palm': 'paper', 'two_fingers_up': 'scissors' };
  const playerChoice = map[g];
  
  if (!playerChoice) return;
  
  // Prevent same gesture from triggering multiple times
  if (rpsGameState.lastGestureProcessed === g) {
    return;
  }
  
  // Lock this round to prevent multiple triggers
  rpsGameState.roundLocked = true;
  rpsGameState.lastGestureProcessed = g;
  
  // Move to next round or start first round
  if (rpsGameState.state === RPS_GAME_STATES.IDLE) {
    rpsGameState.currentRound = 1;
    rpsGameState.state = RPS_GAME_STATES.WAITING_FOR_GESTURE;
  } else if (rpsGameState.state === RPS_GAME_STATES.WAITING_FOR_GESTURE) {
    // Continue current round
  } else {
    return; // Invalid state
  }
  
  const playerGestureEl = document.getElementById('player-gesture');
  const computerGestureEl = document.getElementById('computer-gesture');
  const gameResultEl = document.getElementById('game-result');
  
  if (!playerGestureEl || !computerGestureEl || !gameResultEl) {
    rpsGameState.roundLocked = false;
    return;
  }
  
  // Show player choice with animation
  playerGestureEl.style.transform = 'scale(1.2)';
  playerGestureEl.textContent = playerChoice;
  
  // Generate computer choice after delay
  setTimeout(() => {
    const choices = ['rock', 'paper', 'scissors'];
    const computerChoice = choices[Math.floor(Math.random() * 3)];
    computerGestureEl.style.transform = 'scale(1.2)';
    computerGestureEl.textContent = computerChoice;
    
    // Determine round winner
    let roundResult = '';
    let resultColor = '';
    
    if (playerChoice === computerChoice) {
      roundResult = "It's a Tie!";
      resultColor = '#fbbf24'; // Yellow
    } else if (
      (playerChoice === 'rock' && computerChoice === 'scissors') || 
      (playerChoice === 'paper' && computerChoice === 'rock') || 
      (playerChoice === 'scissors' && computerChoice === 'paper')
    ) {
      rpsGameState.playerScore++;
      roundResult = "You Win This Round!";
      resultColor = '#34d399'; // Green
    } else {
      rpsGameState.computerScore++;
      roundResult = "Computer Wins This Round!";
      resultColor = '#f87171'; // Red
    }
    
    gameResultEl.textContent = roundResult;
    gameResultEl.style.color = resultColor;
    
    rpsGameState.state = RPS_GAME_STATES.ROUND_RESULT;
    updateRPSScore();
    updateRPSRoundDisplay();
    
    // Reset animations
    setTimeout(() => {
      playerGestureEl.style.transform = 'scale(1)';
      computerGestureEl.style.transform = 'scale(1)';
      
      // Check if match is over
      if (rpsGameState.currentRound >= rpsGameState.totalRounds) {
        endRPSMatch();
      } else {
        // Prepare for next round
        rpsGameState.currentRound++;
        rpsGameState.state = RPS_GAME_STATES.WAITING_FOR_GESTURE;
        rpsGameState.lastGestureProcessed = null;
        rpsGameState.roundLocked = false;
        
        playerGestureEl.textContent = '?';
        computerGestureEl.textContent = '?';
        gameResultEl.textContent = `Round ${rpsGameState.currentRound} - Make your move!`;
        gameResultEl.style.color = '';
        
        updateRPSRoundDisplay();
      }
    }, 1500); // 1.5 second delay before next round
  }, 800); // 0.8 second delay for computer choice
}

function endRPSMatch() {
  rpsGameState.state = RPS_GAME_STATES.MATCH_OVER;
  
  const gameResultEl = document.getElementById('game-result');
  const restartBtn = document.getElementById('rps-restart-btn');
  
  let finalResult = '';
  let resultColor = '';
  
  if (rpsGameState.playerScore > rpsGameState.computerScore) {
    finalResult = `🎉 YOU WIN THE MATCH! ${rpsGameState.playerScore} - ${rpsGameState.computerScore}`;
    resultColor = '#34d399';
  } else if (rpsGameState.computerScore > rpsGameState.playerScore) {
    finalResult = `😞 COMPUTER WINS! ${rpsGameState.playerScore} - ${rpsGameState.computerScore}`;
    resultColor = '#f87171';
  } else {
    finalResult = `🤝 IT'S A DRAW! ${rpsGameState.playerScore} - ${rpsGameState.computerScore}`;
    resultColor = '#fbbf24';
  }
  
  if (gameResultEl) {
    gameResultEl.textContent = finalResult;
    gameResultEl.style.color = resultColor;
    gameResultEl.style.fontSize = '1.2em';
    gameResultEl.style.fontWeight = 'bold';
  }
  
  if (restartBtn) {
    restartBtn.style.display = 'inline-block';
  }
}

function updateRPSScore() {
  const playerScoreEl = document.getElementById('player-score');
  const computerScoreEl = document.getElementById('computer-score');
  
  if (playerScoreEl) playerScoreEl.textContent = rpsGameState.playerScore;
  if (computerScoreEl) computerScoreEl.textContent = rpsGameState.computerScore;
}

function updateRPSRoundDisplay() {
  const roundDisplayEl = document.getElementById('rps-round-display');
  
  if (roundDisplayEl) {
    if (rpsGameState.state === RPS_GAME_STATES.IDLE) {
      roundDisplayEl.textContent = 'Ready to Start';
    } else if (rpsGameState.state === RPS_GAME_STATES.MATCH_OVER) {
      roundDisplayEl.textContent = 'Match Complete';
    } else {
      roundDisplayEl.textContent = `Round ${rpsGameState.currentRound} / ${rpsGameState.totalRounds}`;
    }
  }
}

function initBasketball() {
  basketballScore = 0;
  const scoreEl = document.getElementById('score');
  if (scoreEl) scoreEl.textContent = `Score: ${basketballScore}`;

  basketballMoveEnabled = false;
  basketballShotInProgress = false;
  lastBasketballShotAt = 0;
  
  const ball = document.getElementById('ball');
  if (ball) {
    ball.style.left = '50%'; 
    ball.style.bottom = '10%';
    ball.style.transition = 'all 0.3s ease';
  }
  
  // Start hand position tracking for aiming
  if (screenStates.games.drawingInterval) {
    clearAppInterval(screenStates.games.drawingInterval);
  }
  
  screenStates.games.drawingInterval = setAppInterval(() => {
    fetch('/get_hand_position', {
      credentials: 'same-origin'
    })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then(pos => {
        if (!pos.visible || !ball) return;
        if (!basketballMoveEnabled) return;
        const aimX = pos.x * 100;
        ball.style.left = `${aimX}%`;
      })
      .catch(error => {
        console.error('Hand position error:', error);
      });
  }, 100, 'games');
}

function handleBasketballGesture(gesture) {
  // Open Palm = move (enable live hand-position control)
  basketballMoveEnabled = gesture === clearGesture;

  // One Finger Up = shoot
  if (gesture === drawingGesture) {
    const now = Date.now();
    if (basketballShotInProgress) return;
    if (now - lastBasketballShotAt < BASKETBALL_SHOT_COOLDOWN) return;
    lastBasketballShotAt = now;
    shootBall();
  }
}

function shootBall() {
  const ball = document.getElementById('ball');
  const hoop = document.getElementById('hoop');
  const scoreEl = document.getElementById('score');
  
  if (!ball || !hoop || !scoreEl) return;

  if (basketballShotInProgress) return;
  basketballShotInProgress = true;
  
  const ballRect = ball.getBoundingClientRect();
  const hoopRect = hoop.getBoundingClientRect();
  
  // Calculate if ball is aligned with hoop
  const isAligned = Math.abs(ballRect.left + ballRect.width/2 - (hoopRect.left + hoopRect.width/2)) < 50;
  
  // Animate the shot
  ball.style.transition = 'bottom 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  ball.style.bottom = '70%';
  
  setTimeout(() => {
    // Check if shot was successful
    if (isAligned) {
      basketballScore++;
      scoreEl.textContent = `Score: ${basketballScore}`;
      scoreEl.classList.add('success');
      setTimeout(() => scoreEl.classList.remove('success'), 1000);
      
      // Show success animation
      const successMsg = document.createElement('div');
      successMsg.textContent = 'SCORE!';
      successMsg.style.position = 'absolute';
      successMsg.style.top = '30%';
      successMsg.style.left = '50%';
      successMsg.style.transform = 'translateX(-50%)';
      successMsg.style.fontSize = '2rem';
      successMsg.style.fontWeight = 'bold';
      successMsg.style.color = '#10b981';
      successMsg.style.textShadow = '0 0 10px rgba(16, 185, 129, 0.8)';
      successMsg.style.animation = 'successFade 1s ease-out';
      
      const court = document.querySelector('.basketball-court');
      if (court) {
        court.appendChild(successMsg);
        setTimeout(() => successMsg.remove(), 1000);
      }
    }
    
    // Reset ball position
    setTimeout(() => { 
      ball.style.transition = 'none'; 
      ball.style.left = '50%'; 
      ball.style.bottom = '10%'; 
      basketballShotInProgress = false;
    }, 500);
  }, 1000);
}

function initSpells() {
  spellsCast = 0;
  const spellScoreEl = document.getElementById('spell-score');
  if (spellScoreEl) spellScoreEl.textContent = `Spells Cast: ${spellsCast}`;
  
  // Clear any existing spell effects
  const spellTarget = document.getElementById('spell-target');
  if (spellTarget) {
    spellTarget.innerHTML = '';
  }
}

function castSpell(g) {
  const display = document.getElementById('spell-cast');
  const target = document.getElementById('spell-target');
  
  if (!display || !target) return;
  
  let type, color, emoji;
  if (g === colorChangeGesture) { 
    type = 'Fire'; 
    color = '#ff4500'; 
    emoji = '🔥'; 
  }
  else if (g === clearGesture) { 
    type = 'Ice'; 
    color = '#00bfff'; 
    emoji = '❄️'; 
  }
  else if (g === drawingGesture) { 
    type = 'Lightning'; 
    color = '#ffff00'; 
    emoji = '⚡'; 
  }
  else return;
  
  // Update spell display with animation
  display.textContent = `${type} Spell!`; 
  display.style.color = color;
  display.style.transform = 'scale(1.2)';
  
  // Create spell effect
  const ef = document.createElement('div');
  ef.className = 'spell-effect'; 
  ef.textContent = emoji; 
  ef.style.color = color;
  ef.style.left = `${Math.random() * 80 + 10}%`; 
  ef.style.top = `${Math.random() * 80 + 10}%`;
  ef.style.fontSize = '5rem';
  ef.style.filter = `drop-shadow(0 0 20px ${color})`;
  ef.style.animation = 'spellFloat 2s ease-in-out';
  
  target.appendChild(ef);
  
  // Animate spell effect
  setTimeout(() => { 
    ef.style.transform = 'scale(2)'; 
    ef.style.opacity = '0'; 
  }, 100);
  
  // Remove effect after animation
  setTimeout(() => ef.remove(), 1100);
  
  // Update score
  spellsCast++;
  const spellScoreEl = document.getElementById('spell-score');
  if (spellScoreEl) spellScoreEl.textContent = `Spells Cast: ${spellsCast}`;
  
  // Reset display animation
  setTimeout(() => {
    display.style.transform = 'scale(1)';
  }, 500);
}

// Update game card click handlers
document.querySelectorAll('.game-card').forEach(c => {
  c.addEventListener('click', e => {
    const game = e.currentTarget.dataset.game;
    if (game) initGame(game);
  });
});

// Fruit Ninja reset button
if (fruitResetBtn) {
  fruitResetBtn.addEventListener('click', () => {
    fetch('/fruit_reset', {
      method: 'POST',
      credentials: 'same-origin'
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .catch(error => {
        console.error('Fruit reset error:', error);
      });
  });
}

// Snake reset button
if (snakeResetBtn) {
  snakeResetBtn.addEventListener('click', () => {
    fetch('/snake_reset', {
      method: 'POST',
      credentials: 'same-origin'
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (!data.success) {
          alert('Failed to reset snake game');
        } else if (snakeScoreEl) {
          snakeScoreEl.textContent = 'Score: 0';
        }
      })
      .catch(error => {
        console.error('Snake reset error:', error);
        alert('An error occurred while resetting the snake game');
      });
  });
}

// RPS restart button
const rpsRestartBtn = document.getElementById('rps-restart-btn');
if (rpsRestartBtn) {
  rpsRestartBtn.addEventListener('click', () => {
    initRockPaperScissors();
  });
}

// === WHITEBOARD ===
function setupCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  
  return ctx;
}

// Global whiteboard state variables
let userSelectedStrokeSize = 3; // Track user's manual stroke size selection
let isClearing = false; // Track if canvas is being cleared

function startGestureDrawing() {
  if (!cameraActive) return;
  
  const canvas = document.getElementById('whiteboard-canvas');
  if (!canvas) return;
  
  const ctx = setupCanvas(canvas);
  ctx.lineCap = 'round'; 
  ctx.lineJoin = 'round'; 
  ctx.lineWidth = 3;
  ctx.strokeStyle = document.getElementById('colorPicker').value;
  strokes = [];

  // Track color cycling state
  let currentColorIndex = 0;
  const colorPalette = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'];
  let lastColorChange = 0;

  // Hand position tracking for drawing (using new whiteboard state)
  screenStates.whiteboard.drawingInterval = setAppInterval(() => {
    // Get complete whiteboard state from backend
    fetch('/get_whiteboard_state', {
      credentials: 'same-origin'
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(wbState => {
        // wbState contains: {action, stroke_size, pen, hand_position}
        const pen = wbState.pen;
        const action = wbState.action;
        
        // Use user-selected stroke size, not backend size
        const strokeSize = userSelectedStrokeSize;
        
        const x = pen.x * canvas.offsetWidth;
        const y = pen.y * canvas.offsetHeight;
        
        // PRIORITY: Clear canvas (pinky finger) - stop all other actions
        if (action === 'clear_canvas') {
          console.log('[Whiteboard] Received clear_canvas action, isClearing:', isClearing);
          if (!isClearing) {
            isClearing = true;
            console.log('[Whiteboard] 🖐️ PINKY FINGER - Clearing canvas NOW');
            console.log('[Whiteboard] Canvas size:', canvas.width, 'x', canvas.height);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            strokes = [];
            isDrawing = false;
            console.log('[Whiteboard] ✅ Canvas cleared successfully, strokes array length:', strokes.length);
            // Reset clearing flag after a short delay
            setTimeout(() => { 
              isClearing = false; 
              console.log('[Whiteboard] Clearing flag reset');
            }, 200);
          } else {
            console.log('[Whiteboard] Already clearing, skipping duplicate clear');
          }
          return; // Skip all other actions
        }
        
        // Skip other actions if clearing
        if (isClearing) {
          return;
        }
        
        // Action: draw (one finger up)
        if (action === 'draw' && pen.pen_down) {
          if (!isDrawing) { 
            isDrawing = true; 
            lastX = x; 
            lastY = y;
            console.log('[Whiteboard] Started drawing with stroke size:', strokeSize, 'px');
            return; 
          }
          ctx.globalCompositeOperation = 'source-over';
          
          // Use dynamic stroke size
          ctx.lineWidth = strokeSize;
          ctx.strokeStyle = document.getElementById('colorPicker').value;
          ctx.beginPath(); 
          ctx.moveTo(lastX, lastY); 
          ctx.lineTo(x, y); 
          ctx.stroke();
          strokes.push({ 
            type: 'draw', 
            from: {x: lastX, y: lastY}, 
            to: {x, y}, 
            color: ctx.strokeStyle, 
            width: strokeSize
          });
          lastX = x; 
          lastY = y;
        }
        // Action: erase (two fingers up) - local brush erase
        else if (action === 'erase') {
          const handPos = wbState.hand_position;
          if (!handPos.visible) { 
            isDrawing = false; 
            return; 
          }
          
          const ex = handPos.x * canvas.offsetWidth;
          const ey = handPos.y * canvas.offsetHeight;
          
          if (!isDrawing) { 
            isDrawing = true; 
            lastX = ex; 
            lastY = ey; 
            return; 
          }
          
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineWidth = 20;  // Fixed eraser size
          ctx.beginPath(); 
          ctx.moveTo(lastX, lastY); 
          ctx.lineTo(ex, ey); 
          ctx.stroke();
          strokes.push({ 
            type: 'erase', 
            from: {x: lastX, y: lastY}, 
            to: {x: ex, y: ey}, 
            width: 20 
          });
          lastX = ex; 
          lastY = ey;
        }
        // Action: color_change (three fingers up) - cycle colors with debounce
        else if (action === 'color_change') {
          const now = Date.now();
          if (now - lastColorChange > 500) {  // 500ms debounce
            currentColorIndex = (currentColorIndex + 1) % colorPalette.length;
            const newColor = colorPalette[currentColorIndex];
            ctx.strokeStyle = newColor;
            document.getElementById('colorPicker').value = newColor;
            lastColorChange = now;
            console.log('[Whiteboard] Color changed to:', newColor);
          }
          isDrawing = false;
        }
        // No action: stop drawing
        else {
          isDrawing = false;
          ctx.globalCompositeOperation = 'source-over';
          ctx.lineWidth = strokeSize;
        }
      })
      .catch(error => {
        console.error('Whiteboard state error:', error);
      });
  }, 80, 'whiteboard');  // 80ms interval for smooth drawing
}

function stopGestureDrawing() {
  // Clear the drawing interval
  if (screenStates.whiteboard.drawingInterval) {
    clearAppInterval(screenStates.whiteboard.drawingInterval);
    screenStates.whiteboard.drawingInterval = null;
  }
}

document.getElementById('undoBtn').addEventListener('click', () => {
  strokes.pop();
  redrawCanvas();
});

function redrawCanvas() {
  const canvas = document.getElementById('whiteboard-canvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  strokes.forEach(s => {
    ctx.globalCompositeOperation = s.type === 'erase' ? 'destination-out' : 'source-over';
    ctx.lineWidth = s.width;
    if (s.type !== 'erase') ctx.strokeStyle = s.color;
    ctx.beginPath(); 
    ctx.moveTo(s.from.x, s.from.y); 
    ctx.lineTo(s.to.x, s.to.y); 
    ctx.stroke();
  });
}

document.getElementById('clearBtn')?.addEventListener('click', () => {
  const canvas = document.getElementById('whiteboard-canvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  strokes = [];
});

document.getElementById('colorPicker')?.addEventListener('change', e => {
  const canvas = document.getElementById('whiteboard-canvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = e.target.value;
});

// Stroke size selector
document.getElementById('strokeSizeSelector')?.addEventListener('change', e => {
  const size = parseInt(e.target.value);
  
  // Update immediately in frontend (this is all we need)
  userSelectedStrokeSize = size;
  const strokeSizeDisplay = document.getElementById('strokeSizeValue');
  if (strokeSizeDisplay) {
    strokeSizeDisplay.textContent = size;
  }
  console.log('[Whiteboard] Stroke size set to:', size, 'px');
});

function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// === PRESENTATION ===
let currentSlide = 1, totalSlides = 0, presentationActive = false;

let presentationSessionId = null;
let slideUrls = [];
let lastPresentationGesture = null;
let lastPresentationGestureTime = 0;
const PRESENTATION_GESTURE_COOLDOWN = 1200; // 1200ms (1.2 seconds) to prevent rapid slide advancement

// Custom file picker
document.getElementById('selectFileBtn')?.addEventListener('click', () => {
  document.getElementById('presentationFile')?.click();
});

document.getElementById('presentationFile')?.addEventListener('change', (e) => {
  const fileInput = e.target;
  const fileNameDisplay = document.getElementById('fileNameDisplay');
  
  if (fileInput.files && fileInput.files[0]) {
    fileNameDisplay.textContent = fileInput.files[0].name;
    fileNameDisplay.classList.add('file-selected');
  } else {
    fileNameDisplay.textContent = 'No file selected';
    fileNameDisplay.classList.remove('file-selected');
  }
});

// Upload form handler
document.getElementById('presentationUploadForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById('presentationFile');
  const statusDiv = document.getElementById('upload-status');
  
  // Check if user is authenticated
  if (!userIdToken) {
    statusDiv.textContent = 'Error: Please log in to upload presentations';
    statusDiv.style.color = 'red';
    console.error('[Presentation] User not authenticated');
    return;
  }
  
  if (!fileInput.files || !fileInput.files[0]) {
    statusDiv.textContent = 'Please select a file';
    statusDiv.style.color = 'red';
    return;
  }
  
  const formData = new FormData();
  formData.append('presentation', fileInput.files[0]);
  
  statusDiv.textContent = 'Uploading and converting...';
  statusDiv.style.color = 'blue';
  
  try {
    const headers = {};
    if (userIdToken) {
      headers['Authorization'] = `Bearer ${userIdToken}`;
    }
    
    const response = await fetch('/upload_presentation', {
      method: 'POST',
      headers: headers,
      body: formData,
      credentials: 'same-origin'
    });

    // Try to parse JSON even on non-2xx so we can show a useful error.
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const msg = (data && (data.error || (data.details && (data.details.solution || data.details.libreoffice_error || data.details.powerpoint_error))))
        ? `${data.error || 'Upload failed'}${data.details ? `\n${JSON.stringify(data.details)}` : ''}`
        : `HTTP error! status: ${response.status}`;
      throw new Error(msg);
    }

    if (data.success) {
      presentationSessionId = data.session_id;
      totalSlides = data.total_slides;
      slideUrls = Array.isArray(data.slide_urls) ? data.slide_urls : [];
      currentSlide = 1;
      // Enable gesture navigation by default once a presentation is loaded.
      presentationActive = true;
      
      // Track presentation loaded
      presentationsLoadedCount++;

      if (data.warning) {
        console.warn('[Presentation] Warning:', data.warning, data.details || '');
      }

      console.log('[Presentation] Upload successful:', {
        session_id: presentationSessionId,
        total_slides: totalSlides,
        slide_urls: slideUrls
      });

      // Hide upload, show viewer
      document.getElementById('presentation-upload-section').style.display = 'none';
      document.getElementById('presentation-viewer-section').style.display = 'block';
      document.getElementById('total-slides').textContent = totalSlides;

      // Load first slide
      loadSlide(1);

      statusDiv.textContent = data.warning
        ? `Upload successful (placeholder preview). ${data.warning}`
        : 'Upload successful! Presentation ready.';
      statusDiv.style.color = data.warning ? 'orange' : 'green';
      setTimeout(() => { statusDiv.textContent = ''; }, 3000);
      updatePresentationStatus('Started', 'Play/Pause');
    } else {
      console.error('[Presentation] Upload failed:', data.error);
      statusDiv.textContent = 'Error: ' + (data.error || 'Upload failed');
      statusDiv.style.color = 'red';
    }
  } catch (error) {
    console.error('[Presentation] Upload error:', error);
    statusDiv.textContent = 'Error: ' + error.message;
    statusDiv.style.color = 'red';
  }
});

// Load and display a slide
function loadSlide(slideNum) {
  if (!presentationSessionId || slideNum < 1 || slideNum > totalSlides) {
    console.warn('[Presentation] Cannot load slide:', { presentationSessionId, slideNum, totalSlides });
    return;
  }

  const slideImg = document.getElementById('presentation-slide-img');
  if (!slideImg) {
    console.error('[Presentation] Slide image element not found!');
    return;
  }
  
  // Add cache-busting parameter to force reload
  const timestamp = new Date().getTime();
  const url = `/presentation_slide_url/${presentationSessionId}/slide_${slideNum}.png?t=${timestamp}`;
  
  console.log("[Presentation] Loading slide:", {
    slideNum,
    sessionId: presentationSessionId,
    url: url
  });
  
  // Add error handling for image loading
  slideImg.onerror = function() {
    console.error('[Presentation] Failed to load slide image:', url);
    console.error('[Presentation] Check if file exists at:', `/static/presentation_slides/${presentationSessionId}/slide_${slideNum}.png`);
    slideImg.alt = `Failed to load slide ${slideNum}`;
  };
  
  slideImg.onload = function() {
    console.log('[Presentation] Successfully loaded slide:', slideNum);
    slideImg.alt = `Slide ${slideNum}`;
  };
  
  slideImg.src = url;
  slideImg.style.display = 'block';
  slideImg.style.opacity = '1';
  document.getElementById('current-slide').textContent = slideNum;
  currentSlide = slideNum;
}

// Navigation functions
function nextSlideAlternative() { 
  // Manual buttons should work regardless of gesture pause state.
  if (currentSlide < totalSlides) { 
    loadSlide(currentSlide + 1); 
    updatePresentationStatus('Next Slide', 'Next'); 
  } 
}

function previousSlideAlternative() { 
  // Manual buttons should work regardless of gesture pause state.
  if (currentSlide > 1) { 
    loadSlide(currentSlide - 1); 
    updatePresentationStatus('Previous Slide', 'Previous'); 
  } 
}

function togglePresentationAlternative() { 
  presentationActive = !presentationActive;
  
  // Send toggle action to backend
  fetch('/presentation_action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'toggle' }),
    credentials: 'same-origin'
  }).catch(err => console.error('Toggle error:', err));
  
  updatePresentationStatus(presentationActive ? 'Started' : 'Paused', 'Play/Pause'); 
}

function updatePresentationStatus(action, icon) {
  const statusEl = document.getElementById('presentation-status');
  const lastActionEl = document.getElementById('last-action');
  
  if (statusEl) {
    statusEl.textContent = presentationActive ? 'Running' : 'Paused';
  }
  
  if (lastActionEl) {
    lastActionEl.textContent = `${icon} ${action}`;
  }
}

// Edge-triggered gesture handler with debounce
function handlePresentationGesture(gesture) {
  const now = Date.now();

  // When paused, only allow Open Palm to resume.
  if (!presentationActive && gesture !== clearGesture) {
    if (gesture === 'unknown' || gesture === null) lastPresentationGesture = null;
    return;
  }
  
  // For navigation gestures (one/two fingers), require gesture to change before retriggering
  // This prevents continuous sliding when holding the same gesture
  const isNavigationGesture = (gesture === drawingGesture || gesture === eraseGesture);
  
  if (isNavigationGesture) {
    // Only trigger if gesture changed AND cooldown passed
    if (gesture !== lastPresentationGesture && (now - lastPresentationGestureTime) > PRESENTATION_GESTURE_COOLDOWN) {
      if (gesture === drawingGesture) {
        // One finger up = Next
        nextSlideAlternative();
        lastPresentationGesture = gesture;
        lastPresentationGestureTime = now;
      } else if (gesture === eraseGesture) {
        // Two fingers up = Previous
        previousSlideAlternative();
        lastPresentationGesture = gesture;
        lastPresentationGestureTime = now;
      }
    }
  } else if (gesture === clearGesture) {
    // Open palm = Toggle
    // Allow toggle if gesture changed OR enough time has passed (to enable pause → resume)
    if (gesture !== lastPresentationGesture || (now - lastPresentationGestureTime) > PRESENTATION_GESTURE_COOLDOWN) {
      togglePresentationAlternative();
      lastPresentationGesture = gesture;
      lastPresentationGestureTime = now;
    }
  }
  
  // Reset tracking when gesture returns to unknown/none
  if (gesture === 'unknown' || gesture === null) {
    lastPresentationGesture = null;
  }
}

// Button event listeners
document.getElementById('prev-slide-btn')?.addEventListener('click', previousSlideAlternative);
document.getElementById('next-slide-btn')?.addEventListener('click', nextSlideAlternative);

// Fullscreen toggle
document.getElementById('fullscreen-btn')?.addEventListener('click', () => {
  const viewerSection = document.getElementById('presentation-viewer-section');
  
  if (!document.fullscreenElement) {
    viewerSection.requestFullscreen().catch(err => {
      console.error('Fullscreen error:', err);
    });
  } else {
    document.exitFullscreen();
  }
});

// Close presentation
document.getElementById('close-presentation-btn')?.addEventListener('click', () => {
  // Reset state
  presentationSessionId = null;
  slideUrls = [];
  totalSlides = 0;
  currentSlide = 1;
  presentationActive = false;
  lastPresentationGesture = null;

  // Show upload, hide viewer
  document.getElementById('presentation-upload-section').style.display = 'block';
  document.getElementById('presentation-viewer-section').style.display = 'none';

  // Reset file input
  document.getElementById('presentationFile').value = '';
  document.getElementById('upload-status').textContent = '';
});

function startPresentationControl() {
  if (!cameraActive) return;
  
  // Presentation gesture handling is done via handlePresentationGesture
  // No initialization needed for demo slides anymore
}

document.getElementById('themeSelect')?.addEventListener('change', e => {
  currentTheme = e.target.value;
  applyTheme(currentTheme);
});

// === INIT ===
// Firebase auth state is checked in initFirebase()
// No need for legacy session-based auth check

// === FAQ ACCORDION FUNCTIONALITY ===
function initFAQAccordion() {
  const faqQuestions = document.querySelectorAll('.faq-question');
  
  // Remove existing listeners by cloning and replacing
  faqQuestions.forEach(question => {
    const newQuestion = question.cloneNode(true);
    question.parentNode.replaceChild(newQuestion, question);
  });
  
  // Add fresh listeners
  document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
      const faqItem = question.parentElement;
      const answer = faqItem.querySelector('.faq-answer');
      const isExpanded = question.getAttribute('aria-expanded') === 'true';
      
      // Close all other FAQ items (one-at-a-time behavior)
      document.querySelectorAll('.faq-question').forEach(otherQuestion => {
        if (otherQuestion !== question) {
          otherQuestion.setAttribute('aria-expanded', 'false');
          const otherAnswer = otherQuestion.parentElement.querySelector('.faq-answer');
          if (otherAnswer) {
            otherAnswer.classList.remove('active');
          }
        }
      });
      
      // Toggle current FAQ item
      if (isExpanded) {
        question.setAttribute('aria-expanded', 'false');
        answer.classList.remove('active');
      } else {
        question.setAttribute('aria-expanded', 'true');
        answer.classList.add('active');
      }
    });
  });
}