
from flask import Flask, Response, render_template_string, jsonify, send_from_directory, request, session, make_response
import cv2
# Import compatibility shim first to add mp.solutions to MediaPipe 0.10.x
try:
    from . import mediapipe_compat
except ImportError:
    import mediapipe_compat
import mediapipe as mp
import numpy as np
import math
import time
import os
import threading
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
try:
    from .games.snake_game import SnakeGame
    from .games.fruit_ninja import FruitNinjaGame
    from .games.dino_run import DinoRunGame
    from .games.pong_game import PongGame
except ImportError:
    from games.snake_game import SnakeGame
    from games.fruit_ninja import FruitNinjaGame
    from games.dino_run import DinoRunGame
    from games.pong_game import PongGame
# --- PRESENTATION MODULE IMPORTS ---
import uuid
from werkzeug.utils import secure_filename
from pptx import Presentation
from PIL import Image
import shutil
# --- FIREBASE ADMIN SDK ---
import firebase_admin
from firebase_admin import credentials, auth
from functools import wraps

app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = 'motion-mind-secret-key-change-in-production'  # Change this in production!
CORS(app)  # Enable CORS for all routes

# Initialize Firebase Admin SDK (ONLY if credentials exist)
if os.path.exists(os.path.join(os.path.dirname(__file__), "firebase-service-account.json")):
    try:
        firebase_json_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            'firebase-service-account.json'
        )
        cred = credentials.Certificate(firebase_json_path)
        firebase_admin.initialize_app(cred)
        print("✅ Firebase Admin initialized successfully")
    except Exception as e:
        print("⚠️ Firebase Admin init skipped:", e)
else:
    print("ℹ️ Firebase Admin not initialized (no service account on Render)")

# Authentication decorator
def firebase_auth_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Unauthorized - No token provided'}), 401
        
        id_token = auth_header.split('Bearer ')[1]
        try:
            decoded_token = auth.verify_id_token(id_token)
            request.user = decoded_token
            return f(*args, **kwargs)
        except Exception as e:
            print(f"❌ Token verification failed: {e}")
            return jsonify({'error': 'Invalid or expired token'}), 401
    
    return decorated_function

# --- SLIDE SERVE ROUTE (must be after app is created) ---
@app.route('/presentation_slide_url/<session_id>/<filename>')
def serve_presentation_slide_url(session_id, filename):
    # Use absolute path to ensure Flask finds the files
    # Note: No @firebase_auth_required because <img> tags can't send auth headers
    # Security: UUID session_id provides sufficient protection
    static_dir = os.path.join(os.getcwd(), 'static', 'presentation_slides', session_id)
    print(f"[Presentation] Serving slide: {filename} from {static_dir}")
    
    # Validate filename to prevent directory traversal
    if '..' in filename or '/' in filename or '\\' in filename:
        return "Invalid filename", 400
    
    # Check if file exists
    if not os.path.exists(os.path.join(static_dir, filename)):
        print(f"[Presentation] Slide not found: {filename}")
        return "Slide not found", 404
    
    return send_from_directory(static_dir, filename)


# --- MEDIAPIPE INITIALIZATION ---
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils


def _hands_is_compat_impl() -> bool:
    """True when mp.solutions.hands.Hands comes from mediapipe_compat."""
    try:
        return "mediapipe_compat" in (getattr(mp_hands.Hands, "__module__", "") or "")
    except Exception:
        return False

# Get confidence values from environment variables or use defaults
# Balanced values for stable gesture detection (0.5 = good balance of speed and accuracy)
MIN_DETECTION_CONFIDENCE = float(os.environ.get('MIN_DETECTION_CONFIDENCE', 0.5))
MIN_TRACKING_CONFIDENCE = float(os.environ.get('MIN_TRACKING_CONFIDENCE', 0.5))

# ✅ GLOBAL MEDIAPIPE HANDS INSTANCE (initialized once, reused for all frames)
hands = mp_hands.Hands(
    static_image_mode=False,  # Video mode for better tracking
    max_num_hands=1,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7
)
print("✅ MediaPipe Hands initialized globally")

# --- CAMERA STREAM CLASS (DISABLED FOR RENDER - NO SERVER-SIDE WEBCAM) ---
# NOTE: For local development, uncomment this class. For Render, use HTTP frame processing endpoints instead.
# class CameraStream:
#     # Dedicated thread for reading camera frames - prevents buffering lag
#     def __init__(self):
#         self.frame = None
#         self.lock = threading.Lock()
#         self.camera = None
#         self.active = False
#         self.requested = False
#         self.error = None
#         self.initializing = False
#         self.thread = None
#         
#     def start(self, max_retries=3):
#         # Initialize camera in background thread
#         if self.initializing or self.active:
#             return True
#             
#         self.initializing = True
#         self.requested = True
#         self.error = None
#         
#         def init_camera():
#             methods_to_try = [
#                 # ("DirectShow, Index 0", lambda: cv2.VideoCapture(0, cv2.CAP_DSHOW)),  # Disabled for Render deployment
#                 # ("Default, Index 0", lambda: cv2.VideoCapture(0)),  # Disabled for Render deployment
#                 # ("MSMF, Index 0", lambda: cv2.VideoCapture(0, cv2.CAP_MSMF)),  # Disabled for Render deployment
#                 # ("Default, Index 1", lambda: cv2.VideoCapture(1)),  # Disabled for Render deployment
#             ]
#             
#             for attempt in range(max_retries):
#                 for name, cap_factory in methods_to_try:
#                     cap = None
#                     try:
#                         cap = cap_factory()
#                         if cap.isOpened():
#                             # Set camera properties for better performance
#                             cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
#                             cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
#                             cap.set(cv2.CAP_PROP_FPS, 30)
#                             cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Reduce buffer lag
#                             
#                             ret, test_frame = cap.read()
#                             if ret:
#                                 print(f"✅ Camera initialized: {name}")
#                                 with self.lock:
#                                     self.camera = cap
#                                     self.active = True
#                                     self.error = None
#                                     self.initializing = False
#                                 # Start capture thread
#                                 self.thread = threading.Thread(target=self._capture_loop, daemon=True)
#                                 self.thread.start()
#                                 return
#                             else:
#                                 cap.release()
#                         else:
#                             cap.release()
#                     except Exception as e:
#                         print(f"Camera init error with {name}: {e}")
#                         if cap:
#                             try:
#                                 cap.release()
#                             except:
#                                 pass
#                 time.sleep(1)
#             
#             print("❌ Camera initialization failed")
#             self.active = False
#             self.error = "Camera initialization failed"
#             self.initializing = False
#         
#         threading.Thread(target=init_camera, daemon=True).start()
#         return True
#     
#     def _capture_loop(self):
#         # Continuously read frames (drops old frames to prevent lag)
#         print("[CameraStream] Capture loop started")
#         while self.active:
#             if self.camera and self.camera.isOpened():
#                 ret, frame = self.camera.read()
#                 if ret:
#                     with self.lock:
#                         self.frame = frame
#                 else:
#                     print("[CameraStream] Frame read failed")
#                     time.sleep(0.01)
#             else:
#                 time.sleep(0.1)
#     
#     def read(self):
#         # Get latest frame (non-blocking)
#         with self.lock:
#             if self.frame is not None:
#                 return True, self.frame.copy()
#             return False, None
#     
#     def stop(self):
#         # Release camera resources
#         print("[CameraStream] Stopping...")
#         self.active = False
#         self.requested = False
#         if self.thread:
#             self.thread.join(timeout=2)
#         with self.lock:
#             if self.camera:
#                 try:
#                     self.camera.release()
#                 except Exception as e:
#                     print(f"Camera release error: {e}")
#             self.camera = None
#             self.frame = None
#         print("✅ CameraStream stopped")

# Stub class for Render deployment (no server-side camera)
class CameraStream:
    """Stub for deployment - camera frames come via HTTP, not server-side capture."""
    def __init__(self):
        self.active = False
        self.error = "Server-side camera disabled for cloud deployment"
    
    def start(self, max_retries=3):
        return False
    
    def read(self):
        return False, None
    
    def stop(self):
        pass

# --- MEDIAPIPE WORKER THREAD (Runs at target FPS) ---
class MediaPipeWorker:
    """Dedicated thread for MediaPipe inference - prevents blocking."""
    def __init__(self, camera_stream):
        self.camera_stream = camera_stream
        self.hands = self._create_hands()
        self.results = None
        self.processed_frame = None
        self.lock = threading.Lock()
        self.active = False
        self.thread = None

    def _create_hands(self):
        """Create a new Hands instance.

        Important: after stop/start cycles, the previous instance may be closed and unusable.
        """
        return mp_hands.Hands(
            static_image_mode=False,
            min_detection_confidence=MIN_DETECTION_CONFIDENCE,
            min_tracking_confidence=MIN_TRACKING_CONFIDENCE,
            max_num_hands=1,
        )
        
    def start(self):
        """Start MediaPipe processing thread."""
        if self.active:
            return

        # If the worker was previously stopped, self.hands may have been closed.
        # Recreate it so detection works after a camera restart.
        if self.hands is None:
            self.hands = self._create_hands()

        self.active = True
        self.thread = threading.Thread(target=self._process_loop, daemon=True)
        self.thread.start()
        print("✅ MediaPipe worker started")
    
    def _process_loop(self):
        """Process frames at 20 FPS max (balanced performance)."""
        print("[MediaPipe] Processing loop started")
        target_interval = 1.0 / 20.0  # 20 FPS - balanced speed and stability
        
        while self.active:
            start_time = time.time()
            
            success, frame = self.camera_stream.read()
            if success and frame is not None:
                # Resize for faster processing
                h, w = frame.shape[:2]
                if w > 640:
                    scale = 640.0 / w
                    frame = cv2.resize(frame, (640, int(h * scale)))
                
                # Flip for natural interaction
                frame = cv2.flip(frame, 1)
                
                # MediaPipe inference
                # mediapipe_compat.Hands expects a BGR OpenCV frame and converts internally.
                # Real mp.solutions.hands.Hands expects RGB.
                if _hands_is_compat_impl():
                    results = self.hands.process(frame)
                else:
                    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    results = self.hands.process(rgb_frame)
                
                with self.lock:
                    self.results = results
                    self.processed_frame = frame

                # Update gesture + hand state continuously so /get_gesture works
                # even if the MJPEG video feed isn't being viewed.
                update_shared_state_from_results(results)
            
            # Maintain target FPS
            elapsed = time.time() - start_time
            sleep_time = max(0, target_interval - elapsed)
            time.sleep(sleep_time)
    
    def get_results(self):
        """Get latest MediaPipe results and frame."""
        with self.lock:
            return self.results, self.processed_frame
    
    def stop(self):
        """Stop MediaPipe processing."""
        print("[MediaPipe] Stopping...")
        self.active = False
        if self.thread:
            self.thread.join(timeout=2)
        if self.hands:
            try:
                self.hands.close()
            except:
                pass  # Ignore close errors
            # Ensure we don't reuse a closed instance on the next start.
            self.hands = None
        print("✅ MediaPipe stopped")

# --- GESTURE DEBOUNCING (Prevents flickering) ---
class GestureDebouncer:
    """Stabilize gestures - require 150ms stability before changing."""
    def __init__(self, stability_time=0.15):
        self.stability_time = stability_time
        self.candidate_gesture = None
        self.candidate_start_time = None
        self.stable_gesture = None
        self.last_update_time = 0
    
    def update(self, raw_gesture):
        """Update with new gesture detection."""
        current_time = time.time()
        
        if raw_gesture == self.candidate_gesture:
            # Same candidate - check if stable enough
            if self.candidate_start_time:
                elapsed = current_time - self.candidate_start_time
                if elapsed >= self.stability_time:
                    self.stable_gesture = raw_gesture
                    self.last_update_time = current_time
        else:
            # New candidate gesture
            self.candidate_gesture = raw_gesture
            self.candidate_start_time = current_time
        
        # Clear gesture if no hand detected for 1 second (faster reset)
        if raw_gesture is None and (current_time - self.last_update_time) > 1.0:
            self.stable_gesture = None
        
        return self.stable_gesture

# --- GESTURE TRANSITION DETECTOR (For Dino Run Jump) ---
class GestureTransitionDetector:
    """Detects specific gesture transitions (e.g., fist→open_palm for jump)."""
    def __init__(self, cooldown_time=0.4):
        self.previous_gesture = None
        self.cooldown_time = cooldown_time
        self.last_trigger_time = 0
    
    def detect_jump(self, current_gesture):
        """Detect fist→open_palm transition for jump (with cooldown)."""
        current_time = time.time()
        jump_triggered = False
        
        # Check for fist→open_palm transition
        if (self.previous_gesture == "fist" and 
            current_gesture == "open_palm" and
            (current_time - self.last_trigger_time) > self.cooldown_time):
            jump_triggered = True
            self.last_trigger_time = current_time
        
        self.previous_gesture = current_gesture
        return jump_triggered

# --- WHITEBOARD MODE MANAGER ---
class WhiteboardMode:
    """Manages stroke size for the whiteboard (manual control only)."""
    def __init__(self):
        self.stroke_sizes = [3, 8, 15]  # Three stroke sizes
        self.current_size_index = 0
    
    def set_stroke_size(self, size):
        """Set stroke size directly (from dropdown)."""
        if size in self.stroke_sizes:
            self.current_size_index = self.stroke_sizes.index(size)
            print(f"[Whiteboard] Stroke size set to: {size}")
            return True
        return False
    
    def get_stroke_size(self):
        """Get current stroke size."""
        return self.stroke_sizes[self.current_size_index]
    
    def reset(self):
        """Reset to default stroke size."""
        self.current_size_index = 0

# --- MODE GESTURE FILTER ---
class ModeGestureFilter:
    """Filters gestures for whiteboard actions with debouncing."""
    def __init__(self, debounce_time=0.3):
        self.last_color_change = 0
        self.last_clear = 0
        self.debounce_time = debounce_time
    
    def filter(self, gesture):
        """Filter gesture and return action."""
        current_time = time.time()
        
        # Ignore open palm and fist completely
        if gesture in ["open_palm", "fist"]:
            return None
        
        if gesture == "one_finger_up":
            return "draw"
        elif gesture == "two_fingers_up":
            return "erase"
        elif gesture == "three_fingers_up":
            # Debounce color change
            if (current_time - self.last_color_change) > self.debounce_time:
                self.last_color_change = current_time
                return "color_change"
        elif gesture == "pinky_finger_up":
            # Pinky finger = clear canvas (with short debounce)
            if (current_time - self.last_clear) > 0.3:  # 0.3 second cooldown
                self.last_clear = current_time
                print("[Whiteboard] PINKY FINGER DETECTED - Clearing canvas")
                return "clear_canvas"
            else:
                print(f"[Whiteboard] Pinky finger on cooldown ({current_time - self.last_clear:.2f}s since last clear)")
                return None
        
        return None

# --- PINCH DETECTOR (For Dino Run Jump) ---
class PinchDetector:
    """Detects pinch gesture between thumb and index finger."""
    def __init__(self, pinch_threshold=0.05, cooldown_time=0.3):
        self.pinch_threshold = pinch_threshold  # Distance threshold for pinch
        self.cooldown_time = cooldown_time
        self.last_pinch_time = 0
        self.was_pinched = False
    
    def detect_pinch(self, hand_landmarks):
        """Detect if thumb and index finger are pinched together."""
        if not hand_landmarks:
            self.was_pinched = False
            return False
        
        # Get thumb tip and index finger tip positions
        thumb_tip = hand_landmarks.landmark[mp_hands.HandLandmark.THUMB_TIP]
        index_tip = hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_TIP]
        
        # Calculate Euclidean distance between thumb and index finger tips
        distance = math.sqrt(
            (thumb_tip.x - index_tip.x)**2 +
            (thumb_tip.y - index_tip.y)**2 +
            (thumb_tip.z - index_tip.z)**2
        )
        
        current_time = time.time()
        is_pinched = distance < self.pinch_threshold
        
        # Detect pinch trigger (transition from not pinched to pinched)
        pinch_triggered = False
        if is_pinched and not self.was_pinched:
            if (current_time - self.last_pinch_time) > self.cooldown_time:
                pinch_triggered = True
                self.last_pinch_time = current_time
                print(f"[Pinch] JUMP! Distance: {distance:.4f}")
        
        self.was_pinched = is_pinched
        return pinch_triggered

# --- PEN STABILIZER (For Whiteboard) ---
class PenStabilizer:
    """Smooth pen coordinates using EMA and velocity limiting."""
    def __init__(self, alpha=0.3, min_movement=0.002, max_velocity=0.15):
        self.alpha = alpha  # EMA smoothing factor (lower = smoother)
        self.min_movement = min_movement  # Minimum movement threshold (normalized)
        self.max_velocity = max_velocity  # Maximum velocity (normalized)
        self.smoothed_x = None
        self.smoothed_y = None
        self.last_x = None
        self.last_y = None
        self.pen_down = False
    
    def update(self, x, y, action):
        """Update pen position with smoothing and filtering.
        
        Args:
            x, y: Normalized coordinates (0-1)
            action: Filtered action from ModeGestureFilter ('draw', 'erase', etc.)
        """
        # Determine pen state based on action
        self.pen_down = (action == "draw")
        
        if not self.pen_down:
            # Pen up - reset smoothing
            self.smoothed_x = None
            self.smoothed_y = None
            self.last_x = None
            self.last_y = None
            return None, None, False
        
        # Initialize on first pen-down
        if self.smoothed_x is None:
            self.smoothed_x = x
            self.smoothed_y = y
            self.last_x = x
            self.last_y = y
            return x, y, True
        
        # Apply EMA smoothing
        self.smoothed_x = self.alpha * x + (1 - self.alpha) * self.smoothed_x
        self.smoothed_y = self.alpha * y + (1 - self.alpha) * self.smoothed_y
        
        # Calculate movement
        dx = abs(self.smoothed_x - self.last_x)
        dy = abs(self.smoothed_y - self.last_y)
        distance = (dx**2 + dy**2)**0.5
        
        # Ignore tiny tremors (minimum movement threshold)
        if distance < self.min_movement:
            return self.last_x, self.last_y, True
        
        # Velocity limiting (reject sudden jumps)
        if distance > self.max_velocity:
            # Interpolate to max velocity
            scale = self.max_velocity / distance
            self.smoothed_x = self.last_x + (self.smoothed_x - self.last_x) * scale
            self.smoothed_y = self.last_y + (self.smoothed_y - self.last_y) * scale
        
        # Update last position
        self.last_x = self.smoothed_x
        self.last_y = self.smoothed_y
        
        return self.smoothed_x, self.smoothed_y, True

# --- GLOBAL INSTANCES ---
camera_stream = CameraStream()
mediapipe_worker = MediaPipeWorker(camera_stream)
gesture_debouncer = GestureDebouncer(stability_time=0.15)  # Stable gesture response (150ms)
gesture_transition_detector = GestureTransitionDetector(cooldown_time=0.4)
pinch_detector = PinchDetector(pinch_threshold=0.05, cooldown_time=0.5)  # For Dino Run jump
# Improved pen stabilizer: lower alpha = smoother, higher min_movement = less jitter, lower max_velocity = more controlled
pen_stabilizer = PenStabilizer(alpha=0.3, min_movement=0.005, max_velocity=0.08)
# Whiteboard mode management
whiteboard_mode = WhiteboardMode()
mode_gesture_filter = ModeGestureFilter(debounce_time=0.3)

# --- SHARED STATE (Thread-safe) ---
state_lock = threading.Lock()
shared_state = {
    "gesture": None,
    "gesture_time": 0,
    "hand_position": {"x": 0, "y": 0, "z": 0, "visible": False},
    "smoothed_pen": {"x": 0, "y": 0, "pen_down": False},  # For whiteboard
    "jump_trigger": False,  # For Dino Run
    "landmarks": None,
    "results": None,
    "whiteboard": {  # Whiteboard state
        "action": None,
        "stroke_size": 3
    }
}

# --- LEGACY COMPATIBILITY ---
camera_lock = threading.Lock()
camera = None
camera_active = False
camera_requested = False
camera_error = None
camera_initializing = False

# --- SNAKE GAME STATE ---
snake_game = SnakeGame()  # No food image (uses default circle)
snake_lock = threading.Lock()

# --- FRUIT NINJA GAME STATE ---
fruit_game = FruitNinjaGame()
fruit_lock = threading.Lock()

# --- DINO RUN GAME STATE ---
dino_game = DinoRunGame()
dino_lock = threading.Lock()

# --- PONG GAME STATE ---
pong_game = PongGame()
pong_lock = threading.Lock()

# --- PRESENTATION STATE ---
presentation_state = {
    "active": False,
    "total_slides": 0,
    "session_id": None
}



def release_camera():
    """Release camera resources safely."""
    global camera_active, camera_requested, camera_initializing
    print("[Camera] Releasing camera resources...")
    mediapipe_worker.stop()
    camera_stream.stop()
    camera_active = False
    camera_requested = False
    camera_initializing = False
    print("✅ Camera released successfully")

def initialize_camera(max_retries=3):
    """Initialize camera and MediaPipe worker."""
    global camera_active, camera_requested, camera_error, camera_initializing
    
    print("[Camera] Initializing camera stream...")
    camera_initializing = True
    
    try:
        camera_stream.start(max_retries)
        
        # Wait for camera to initialize (with timeout)
        max_wait = 3  # 3 seconds max to prevent blocking
        wait_time = 0
        while wait_time < max_wait and camera_stream.initializing and not camera_stream.active:
            time.sleep(0.1)
            wait_time += 0.1
        
        # Start MediaPipe worker if camera is active
        if camera_stream.active:
            print("[Camera] Camera is active, starting MediaPipe worker...")
            mediapipe_worker.start()
            time.sleep(0.2)  # Give MediaPipe a moment to start
        else:
            print(f"[Camera] Camera failed to activate within timeout. Initializing: {camera_stream.initializing}, Error: {camera_stream.error}")
    except Exception as e:
        print(f"[Camera] Exception during initialization: {e}")
        camera_stream.error = str(e)
    
    # Update legacy flags
    camera_requested = camera_stream.requested
    camera_initializing = camera_stream.initializing
    camera_active = camera_stream.active
    camera_error = camera_stream.error
    
    if camera_active:
        print("✅ Camera initialized successfully")
    else:
        print(f"❌ Camera initialization failed: {camera_error}")
    
    return camera_stream.camera
# In production, use a real database
users = {
    "user@example.com": {
        "password": generate_password_hash("password"),
        "id": "1"
    }
}

# --- LEGACY STATE (for compatibility) ---
gesture_state = {"last_gesture": None, "last_gesture_time": 0}
hand_position = {"x": 0, "y": 0, "z": 0, "visible": False}

# --- STATE UPDATE FROM MEDIAPIPE ---
def update_shared_state_from_results(results):
    """Update shared_state + legacy gesture_state/hand_position from MediaPipe results.

    This is called from the MediaPipe worker thread so gesture polling is reliable.
    """
    if results and results.multi_hand_landmarks:
        hand_landmarks = results.multi_hand_landmarks[0]

        index_tip = hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_TIP]

        raw_gesture = detect_gesture(hand_landmarks)
        # Reduce flicker: treat "unknown" as no-gesture
        if raw_gesture == "unknown":
            raw_gesture = None

        stable_gesture = gesture_debouncer.update(raw_gesture)
        
        # Filter gesture for whiteboard action
        filtered_action = mode_gesture_filter.filter(stable_gesture)
        
        # Get current stroke size (controlled only by dropdown now)
        current_stroke_size = whiteboard_mode.get_stroke_size()

        smoothed_x, smoothed_y, pen_is_down = pen_stabilizer.update(
            index_tip.x, index_tip.y, filtered_action
        )

        # Detect jump triggers for Dino Run (pinch gesture)
        pinch_triggered = pinch_detector.detect_pinch(hand_landmarks)
        jump_triggered = pinch_triggered  # Use pinch for jump instead of gesture transition

        with state_lock:
            shared_state["hand_position"] = {
                "x": index_tip.x,
                "y": index_tip.y,
                "z": index_tip.z,
                "visible": True
            }
            shared_state["smoothed_pen"] = {
                "x": smoothed_x if smoothed_x is not None else index_tip.x,
                "y": smoothed_y if smoothed_y is not None else index_tip.y,
                "pen_down": pen_is_down
            }
            shared_state["jump_trigger"] = jump_triggered
            shared_state["gesture"] = stable_gesture
            shared_state["gesture_time"] = time.time()
            shared_state["landmarks"] = hand_landmarks
            shared_state["results"] = results
            
            # Update whiteboard state
            shared_state["whiteboard"] = {
                "action": filtered_action,
                "stroke_size": current_stroke_size
            }
            
            # Debug logging for clear action
            if filtered_action == "clear_canvas":
                print(f"[Whiteboard State] Clear canvas action sent to frontend")

            hand_position["x"] = index_tip.x
            hand_position["y"] = index_tip.y
            hand_position["z"] = index_tip.z
            hand_position["visible"] = True
            gesture_state["last_gesture"] = stable_gesture
            gesture_state["last_gesture_time"] = time.time()
    else:
        gesture_debouncer.update(None)
        pen_stabilizer.update(0, 0, None)

        with state_lock:
            shared_state["hand_position"]["visible"] = False
            shared_state["smoothed_pen"]["pen_down"] = False
            shared_state["jump_trigger"] = False
            shared_state["whiteboard"]["action"] = None
            hand_position["visible"] = False

            if time.time() - shared_state["gesture_time"] > 1.0:
                shared_state["gesture"] = None
                gesture_state["last_gesture"] = None

def update_shared_state():
    """Update shared state from MediaPipe worker results."""
    results, _ = mediapipe_worker.get_results()

    update_shared_state_from_results(results)

def detect_gesture(hand_landmarks):
    """Detect hand gestures with improved reliability using margins and wrist reference."""
    # Get landmark positions
    wrist = hand_landmarks.landmark[mp_hands.HandLandmark.WRIST]
    thumb_tip = hand_landmarks.landmark[mp_hands.HandLandmark.THUMB_TIP]
    thumb_ip = hand_landmarks.landmark[mp_hands.HandLandmark.THUMB_IP]
    index_finger_tip = hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_TIP]
    index_finger_pip = hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_PIP]
    index_finger_mcp = hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_MCP]
    middle_finger_tip = hand_landmarks.landmark[mp_hands.HandLandmark.MIDDLE_FINGER_TIP]
    middle_finger_pip = hand_landmarks.landmark[mp_hands.HandLandmark.MIDDLE_FINGER_PIP]
    middle_finger_mcp = hand_landmarks.landmark[mp_hands.HandLandmark.MIDDLE_FINGER_MCP]
    ring_finger_tip = hand_landmarks.landmark[mp_hands.HandLandmark.RING_FINGER_TIP]
    ring_finger_pip = hand_landmarks.landmark[mp_hands.HandLandmark.RING_FINGER_PIP]
    pinky_tip = hand_landmarks.landmark[mp_hands.HandLandmark.PINKY_TIP]
    pinky_pip = hand_landmarks.landmark[mp_hands.HandLandmark.PINKY_PIP]
    
    # Add margin for more reliable detection (finger must be clearly extended/folded)
    margin = 0.02
    
    # Helper function to check if finger is extended
    def is_finger_extended(tip, pip, margin=0.02):
        return tip.y < (pip.y - margin)
    
    # Helper function to check if finger is folded
    def is_finger_folded(tip, pip, margin=0.02):
        return tip.y > (pip.y + margin)
    
    # Count extended fingers for better classification
    index_extended = is_finger_extended(index_finger_tip, index_finger_pip, margin)
    middle_extended = is_finger_extended(middle_finger_tip, middle_finger_pip, margin)
    ring_extended = is_finger_extended(ring_finger_tip, ring_finger_pip, margin)
    pinky_extended = is_finger_extended(pinky_tip, pinky_pip, margin)
    
    index_folded = is_finger_folded(index_finger_tip, index_finger_pip, margin)
    middle_folded = is_finger_folded(middle_finger_tip, middle_finger_pip, margin)
    ring_folded = is_finger_folded(ring_finger_tip, ring_finger_pip, margin)
    pinky_folded = is_finger_folded(pinky_tip, pinky_pip, margin)
    
    # 1. One Finger Up (Index finger only) - Drawing / Next Slide
    if index_extended and middle_folded and ring_folded and pinky_folded:
        return "one_finger_up"
    
    # 2. Two Fingers Up (Index and Middle) - Erase / Previous Slide
    if index_extended and middle_extended and ring_folded and pinky_folded:
        return "two_fingers_up"
    
    # 3. Three Fingers Up (Index, Middle, Ring) - Color change
    if index_extended and middle_extended and ring_extended and pinky_folded:
        return "three_fingers_up"
    
    # 4. Pinky Finger Only - Clear canvas (must check with folded, not just "not extended")
    if index_folded and middle_folded and ring_folded and pinky_extended:
        return "pinky_finger_up"
    
    # 5. Thumbs Up - Keep for other uses (check BEFORE fist to avoid confusion)
    thumb_up = thumb_tip.y < index_finger_mcp.y and thumb_tip.y < middle_finger_mcp.y
    if thumb_up and index_folded and middle_folded and ring_folded and pinky_folded:
        return "thumbs_up"
    
    # 6. Fist - Ignored (no action)
    if index_folded and middle_folded and ring_folded and pinky_folded:
        return "fist"
    
    # 7. Open Palm - Ignored (all fingers extended)
    thumb_extended = thumb_tip.y < thumb_ip.y
    if index_extended and middle_extended and ring_extended and pinky_extended and thumb_extended:
        return "open_palm"
    
    # Default to unknown
    return "unknown"

def update_hand_position(hand_landmarks):
    if hand_landmarks:
        # Use the index finger tip for game control
        index_tip = hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_TIP]
        hand_position["x"] = index_tip.x
        hand_position["y"] = index_tip.y
        hand_position["z"] = index_tip.z
        hand_position["visible"] = True
    else:
        hand_position["visible"] = False

# --- FRAME GENERATION ---
frame_skip = 0  # Skip every other frame to reduce processing

# --- PRESENTATION UTILS ---

def allowed_presentation_file(filename):
    """Check if the uploaded file has an allowed extension."""
    ALLOWED_EXTENSIONS = {'ppt', 'pptx'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def convert_pptx_to_images(pptx_path, output_dir):
    # Last-resort fallback: use python-pptx to count slides and generate placeholder PNGs.
    # NOTE: python-pptx does not render slide contents.
    from pptx import Presentation
    from PIL import ImageDraw
    prs = Presentation(pptx_path)
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    slide_imgs = []
    for idx, slide in enumerate(prs.slides, 1):
        # Render slide to image using PIL (blank white background)
        width = prs.slide_width // 9525  # EMU to px
        height = prs.slide_height // 9525
        img = Image.new("RGB", (width, height), "white")
        draw = ImageDraw.Draw(img)
        msg1 = f"Slide {idx}"
        msg2 = "(Preview placeholder - install PowerPoint or LibreOffice to render slide content)"
        draw.text((40, 40), msg1, fill=(0, 0, 0))
        draw.text((40, 90), msg2, fill=(0, 0, 0))
        img_path = os.path.join(output_dir, f"slide_{idx}.png")
        img.save(img_path)
        slide_imgs.append(img_path)
    return len(slide_imgs)

def find_libreoffice():
    """Find LibreOffice executable path."""
    # Common LibreOffice paths on Windows
    possible_paths = [
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        r"C:\Program Files\LibreOffice 7\program\soffice.exe",
        r"C:\Program Files\LibreOffice 6\program\soffice.exe",
        r"C:\Program Files\LibreOffice 24\program\soffice.exe",
        r"C:\Program Files\LibreOffice 25\program\soffice.exe",
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            return path
    
    # Try to find via PATH
    import shutil as sh
    lo_path = sh.which("soffice")
    if lo_path:
        return lo_path
    
    return None

def convert_ppt_to_images_powerpoint(ppt_path, output_dir):
    """Use PowerPoint COM automation to convert PPT/PPTX to PNG images (Windows only)."""
    try:
        import comtypes.client
    except ImportError as e:
        import sys
        raise ImportError(
            "comtypes is not available in the Python environment running the server. "
            f"Python executable: {sys.executable}. "
            "Install with: pip install comtypes (in that same environment)."
        ) from e
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    print(f"[Presentation] Using PowerPoint COM automation")
    
    # Convert to absolute path
    ppt_path = os.path.abspath(ppt_path)
    output_dir = os.path.abspath(output_dir)
    
    try:
        powerpoint = comtypes.client.CreateObject("PowerPoint.Application")
    except Exception as e:
        # Common root cause: Microsoft PowerPoint is not installed (or COM registration is broken).
        raise RuntimeError(
            "Failed to start PowerPoint COM automation. Make sure Microsoft PowerPoint (desktop) is installed. "
            f"Original error: {e}"
        ) from e
    powerpoint.Visible = 1
    
    try:
        presentation = powerpoint.Presentations.Open(ppt_path, WithWindow=False)
        
        # Export each slide as PNG
        slide_count = presentation.Slides.Count
        print(f"[Presentation] Found {slide_count} slides")
        
        for i in range(1, slide_count + 1):
            slide = presentation.Slides(i)
            output_path = os.path.join(output_dir, f"slide_{i}.png")
            slide.Export(output_path, "PNG", 1920, 1080)  # Export at HD resolution
            print(f"[Presentation] Exported slide {i}")
        
        presentation.Close()
        return slide_count
        
    finally:
        powerpoint.Quit()

def convert_ppt_to_images_libreoffice(ppt_path, output_dir):
    """Use LibreOffice headless to convert PPT/PPTX to PNG images."""
    import subprocess
    
    # Find LibreOffice
    libreoffice_path = find_libreoffice()
    if not libreoffice_path:
        raise FileNotFoundError("LibreOffice not found. Please install LibreOffice.")
    
    print(f"[Presentation] Using LibreOffice: {libreoffice_path}")
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Convert PPTX to PDF first (more reliable)
    pdf_output = os.path.join(output_dir, "temp.pdf")
    cmd_pdf = [
        libreoffice_path,
        "--headless",
        "--convert-to", "pdf",
        "--outdir", output_dir,
        ppt_path
    ]
    
    print(f"[Presentation] Converting to PDF: {' '.join(cmd_pdf)}")
    result = subprocess.run(cmd_pdf, capture_output=True, text=True, timeout=60)
    
    if result.returncode != 0:
        print(f"[Presentation] PDF conversion failed: {result.stderr}")
        raise RuntimeError(f"LibreOffice conversion failed: {result.stderr}")
    
    # Find generated PDF
    pdf_files = [f for f in os.listdir(output_dir) if f.endswith(".pdf")]
    if not pdf_files:
        raise RuntimeError("No PDF generated by LibreOffice")
    
    pdf_path = os.path.join(output_dir, pdf_files[0])
    
    # Convert PDF to PNG using LibreOffice or ImageMagick
    try:
        # Try using pdf2image (if available)
        from pdf2image import convert_from_path
        images = convert_from_path(pdf_path, dpi=150)
        
        for idx, image in enumerate(images, 1):
            img_path = os.path.join(output_dir, f"slide_{idx}.png")
            image.save(img_path, "PNG")
        
        # Cleanup PDF
        os.remove(pdf_path)
        
        print(f"[Presentation] Generated {len(images)} slides")
        return len(images)
    except ImportError:
        print("[Presentation] pdf2image not available, using alternative method")
        # Fallback: use PIL to convert PDF pages
        # This is a simplified fallback - for production, install pdf2image
        os.remove(pdf_path)
        raise ImportError("pdf2image required for PDF conversion. Install: pip install pdf2image")

def generate_frames():
    """MJPEG stream with MediaPipe visualization (reads from shared state)."""
    while True:
        try:
            # Update shared state from MediaPipe worker
            update_shared_state()
            
            # Get processed frame from MediaPipe worker
            results, frame = mediapipe_worker.get_results()
            
            if frame is None or not camera_stream.active:
                frame = np.zeros((480, 640, 3), dtype=np.uint8)
                if camera_stream.initializing:
                    cv2.putText(frame, "INITIALIZING CAMERA...", (120, 200), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
                    cv2.putText(frame, "Please wait...", (200, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                elif camera_stream.error:
                    cv2.putText(frame, "CAMERA ERROR", (180, 200), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                    cv2.putText(frame, str(camera_stream.error)[:50], (50, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
                else:
                    cv2.putText(frame, "CAMERA IS OFF", (150, 200), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                    cv2.putText(frame, "Click 'Start Camera' to begin", (100, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            else:
                # Draw hand landmarks from shared results
                if results and results.multi_hand_landmarks:
                    for hand_landmarks in results.multi_hand_landmarks:
                        mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
                    
                    # Display gesture
                    with state_lock:
                        current_gesture = shared_state["gesture"]
                    
                    gesture_names = {
                        "one_finger_up": "One Finger Up",
                        "two_fingers_up": "Two Fingers Up",
                        "three_fingers_up": "Three Fingers Up",
                        "pinky_finger_up": "Pinky Finger Up",
                        "thumbs_up": "Thumbs Up",
                        "fist": "Fist",
                        "open_palm": "Open Palm",
                        "unknown": "Unknown"
                    }
                    
                    display_text = gesture_names.get(current_gesture, "Unknown") if current_gesture else "Unknown"
                    cv2.putText(frame, f"Gesture: {display_text}", (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                    cv2.putText(frame, "MediaPipe: HAND DETECTED", (10, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                else:
                    cv2.putText(frame, "No Hands Detected", (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                    cv2.putText(frame, "MediaPipe: NO HANDS", (10, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        except Exception as e:
            print(f"[generate_frames] Error: {e}")
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(frame, "STREAM ERROR", (180, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        
        # Add timestamp
        cv2.putText(frame, f"Time: {time.strftime('%H:%M:%S')}", (10, 460), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        # Encode and yield
        try:
            ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
            if ret:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
        except Exception as e:
            print(f"Encoding error: {e}")
        
        time.sleep(0.033)  # 30 FPS


def generate_snake_frames():
    """MJPEG stream for Snake game (uses shared camera and MediaPipe state)."""
    while True:
        success, frame = camera_stream.read()
        
        if not success or frame is None or not camera_stream.active:
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(frame, "CAMERA IS OFF", (150, 220), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            cv2.putText(frame, "Start camera to play Snake", (80, 260), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        else:
            frame = cv2.flip(frame, 1)
            
            # Get hand position from shared state
            index_tip_pixel = None
            with state_lock:
                if shared_state["hand_position"]["visible"]:
                    h, w, _ = frame.shape
                    cx = int(shared_state["hand_position"]["x"] * w)
                    cy = int(shared_state["hand_position"]["y"] * h)
                    index_tip_pixel = (cx, cy)
            
            # Update snake game
            with snake_lock:
                frame = snake_game.update(frame, index_tip_pixel)
        
        cv2.putText(frame, "Snake Game", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
        
        try:
            ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            if ret:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
        except Exception as e:
            print(f"Snake encoding error: {e}")
        
        time.sleep(0.033)  # 30 FPS


def generate_fruit_frames():
    """MJPEG stream for Fruit Ninja (uses shared camera and MediaPipe state)."""
    while True:
        success, frame = camera_stream.read()
        
        if not success or frame is None or not camera_stream.active:
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(frame, "CAMERA IS OFF", (150, 220), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            cv2.putText(frame, "Start camera to play Fruit Ninja", (40, 260), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        else:
            frame = cv2.flip(frame, 1)
            
            # Get hand position from shared state
            index_tip_pixel = None
            with state_lock:
                if shared_state["hand_position"]["visible"]:
                    h, w, _ = frame.shape
                    cx = int(shared_state["hand_position"]["x"] * w)
                    cy = int(shared_state["hand_position"]["y"] * h)
                    index_tip_pixel = (cx, cy)
            
            # Update fruit game
            with fruit_lock:
                frame = fruit_game.update(frame, index_tip_pixel, time.time())
        
        cv2.putText(frame, "Fruit Ninja", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
        
        try:
            ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            if ret:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
        except Exception as e:
            print(f"Fruit encoding error: {e}")
        
        time.sleep(0.033)  # 30 FPS

def generate_dino_frames():
    """MJPEG stream for Dino Run (uses shared camera and MediaPipe state)."""
    while True:
        success, frame = camera_stream.read()
        
        if not success or frame is None or not camera_stream.active:
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(frame, "CAMERA IS OFF", (150, 220), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            cv2.putText(frame, "Start camera to play Dino Run", (60, 260), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        else:
            frame = cv2.flip(frame, 1)
            
            # Get jump from open_palm gesture
            jump_trigger = False
            with state_lock:
                jump_trigger = (shared_state["gesture"] == "open_palm")
            
            # Update dino game
            with dino_lock:
                frame = dino_game.update(frame, jump_trigger, time.time())
        
        cv2.putText(frame, "Dino Run - Open Palm to Jump", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        try:
            ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            if ret:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
        except Exception as e:
            print(f"Dino encoding error: {e}")
        
        time.sleep(0.033)  # 30 FPS

def generate_pong_frames():
    """MJPEG stream for Pong Game (uses shared camera and MediaPipe state)."""
    while True:
        success, frame = camera_stream.read()
        
        if not success or frame is None or not camera_stream.active:
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(frame, "CAMERA IS OFF", (150, 220), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            cv2.putText(frame, "Start camera to play Pong", (80, 260), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        else:
            frame = cv2.flip(frame, 1)
            
            # Get hand Y position for paddle control
            hand_y_normalized = None
            with state_lock:
                if shared_state["hand_position"]["visible"]:
                    hand_y_normalized = shared_state["hand_position"]["y"]
            
            # Update Pong game
            with pong_lock:
                frame = pong_game.update(frame, hand_y_normalized)
        
        cv2.putText(frame, "Alone Forever Pong", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        try:
            ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            if ret:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
        except Exception as e:
            print(f"Pong encoding error: {e}")
        
        time.sleep(0.033)  # 30 FPS

# ============================================================================
# FLASK ROUTES - AUTHENTICATION ARCHITECTURE
# ============================================================================
# 🔓 PUBLIC ROUTES (No auth required - low latency, no sensitive data):
#    - /health
#    - /process-frame (gesture detection)
#    - /camera_status
#    - /video_feed, /snake_feed, /fruit_feed, /dino_feed, /pong_feed (MJPEG streams)
#
# 🔒 PROTECTED ROUTES (Firebase auth required - user data, sensitive operations):
#    - /upload_presentation
#    - /get_gesture, /get_hand_position, /get_whiteboard_state
#    - All game state/reset routes
#    - All presentation actions
# ============================================================================

# --- PRESENTATION UPLOAD & STATE (PROTECTED) ---
@app.route('/upload_presentation', methods=['POST'])
@firebase_auth_required
def upload_presentation():
    if 'presentation' not in request.files:
        return jsonify(success=False, error="No file part"), 400
    file = request.files['presentation']
    if file.filename == '':
        return jsonify(success=False, error="No selected file"), 400
    if not allowed_presentation_file(file.filename):
        return jsonify(success=False, error="Invalid file type"), 400

    session_id = str(uuid.uuid4())
    upload_dir = os.path.join('uploads', 'presentations')
    static_dir = os.path.join('static', 'presentation_slides', session_id)
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
    if not os.path.exists(static_dir):
        os.makedirs(static_dir)

    filename = secure_filename(file.filename)
    upload_path = os.path.join(upload_dir, f"{session_id}_{filename}")
    file.save(upload_path)

    # Try PowerPoint COM automation first (Windows), then LibreOffice
    conversion_error = None
    total_slides = 0
    
    # Method 1: Try PowerPoint COM (best quality, Windows only)
    try:
        print("[Presentation] Attempting PowerPoint COM conversion...")
        total_slides = convert_ppt_to_images_powerpoint(upload_path, static_dir)
        
        # Validate that slides were actually generated
        slide_files = [f for f in os.listdir(static_dir) if f.startswith("slide_") and f.endswith(".png")]
        if len(slide_files) > 0:
            print(f"✅ [Presentation] PowerPoint COM: Successfully converted {total_slides} slides")
            conversion_method = "powerpoint_com"
        else:
            raise RuntimeError("No slides generated by PowerPoint COM")
            
    except Exception as e:
        print(f"⚠ PowerPoint COM failed: {e}")
        conversion_error = str(e)
        
        # Method 2: Try LibreOffice conversion
        try:
            print("[Presentation] Attempting LibreOffice conversion...")
            total_slides = convert_ppt_to_images_libreoffice(upload_path, static_dir)
            
            # Validate that slides were actually generated
            slide_files = [f for f in os.listdir(static_dir) if f.startswith("slide_") and f.endswith(".png")]
            if len(slide_files) == 0:
                raise RuntimeError("No slides generated by LibreOffice")
            
            print(f"✅ [Presentation] LibreOffice: Successfully converted {total_slides} slides")
            conversion_method = "libreoffice"
            
        except Exception as e2:
            print(f"❌ LibreOffice conversion also failed: {e2}")
            print("📌 To fix: Install one of the following:")
            print("   Option 1 - PowerPoint (Windows): Install Microsoft PowerPoint and run: pip install comtypes")
            print("   Option 2 - LibreOffice: https://www.libreoffice.org/download/ + pip install pdf2image")
            print("   - Poppler (for pdf2image): Download from https://github.com/oschwartz10612/poppler-windows/releases/")

            # Last resort (PPTX only): generate placeholder slides so the app can still run a demo.
            ext = os.path.splitext(upload_path)[1].lower()
            if ext == ".pptx":
                try:
                    print("[Presentation] Falling back to PPTX placeholder preview...")
                    total_slides = convert_pptx_to_images(upload_path, static_dir)
                    if total_slides <= 0:
                        raise RuntimeError("Placeholder conversion produced no slides")
                    slide_urls = [f"/presentation_slide_url/{session_id}/slide_{i}.png" for i in range(1, total_slides + 1)]
                    return jsonify(
                        success=True,
                        total_slides=total_slides,
                        session_id=session_id,
                        slide_urls=slide_urls,
                        warning="Using placeholder slide previews because no converter is installed. Install PowerPoint or LibreOffice for real slide rendering.",
                        details={
                            "powerpoint_error": conversion_error,
                            "libreoffice_error": str(e2),
                        },
                    )
                except Exception as e3:
                    print(f"❌ Placeholder PPTX fallback failed: {e3}")
            
            # Return error with both failure reasons
            return jsonify(
                success=False, 
                error="Presentation conversion failed. No compatible converter found.",
                details={
                    "powerpoint_error": conversion_error,
                    "libreoffice_error": str(e2),
                    "solution": "Install Microsoft PowerPoint OR LibreOffice with pdf2image and Poppler"
                }
            ), 500

    # Build slide URLs using the new route
    slide_urls = [f"/presentation_slide_url/{session_id}/slide_{i}.png" for i in range(1, total_slides + 1)]

    # Clean up old session if any
    if presentation_state.get("session_id"):
        old_dir = os.path.join('static', 'presentation_slides', presentation_state["session_id"])
        if os.path.exists(old_dir):
            shutil.rmtree(old_dir)

    presentation_state["active"] = False
    presentation_state["current_slide"] = 1
    presentation_state["total_slides"] = total_slides
    presentation_state["session_id"] = session_id

    return jsonify(success=True, total_slides=total_slides, session_id=session_id, slide_urls=slide_urls)

@app.route('/presentation_state')
@firebase_auth_required
def get_presentation_state():
    return jsonify(presentation_state)

@app.route('/presentation_slide/<session_id>/<int:slide_num>')
def get_presentation_slide(session_id, slide_num):
    # No auth required - <img> tags can't send headers, UUID provides security
    static_dir = os.path.join('static', 'presentation_slides', session_id)
    img_path = os.path.join(static_dir, f"slide_{slide_num}.png")
    if not os.path.exists(img_path):
        print(f"[Presentation] Slide {slide_num} not found in {static_dir}")
        return "Not found", 404
    return send_from_directory(static_dir, f"slide_{slide_num}.png")

@app.route('/presentation_action', methods=['POST'])
@firebase_auth_required
def presentation_action():
    data = request.get_json(force=True)
    action = data.get('action')
    if not presentation_state["session_id"]:
        return jsonify(success=False, error="No presentation loaded")
    if action == "toggle":
        presentation_state["active"] = not presentation_state["active"]
    elif action == "next" and presentation_state["active"]:
        presentation_state["current_slide"] = min(presentation_state["current_slide"] + 1, presentation_state["total_slides"])
    elif action == "prev" and presentation_state["active"]:
        presentation_state["current_slide"] = max(1, presentation_state["current_slide"] - 1)
    # Clamp slide
    presentation_state["current_slide"] = max(1, min(presentation_state["current_slide"], presentation_state["total_slides"]))
    return jsonify(success=True, state=presentation_state)

# --- PUBLIC API ENDPOINTS (NO AUTH REQUIRED) ---
# These endpoints are intentionally public for low-latency gesture processing.
# Firebase auth already protects the UI, so sensitive data never reaches these endpoints.
# ✅ CORRECT ARCHITECTURE for FYP: Public camera/gesture APIs, protected user data APIs

@app.route('/health')
def health():
    """Simple health check endpoint for Render"""
    return jsonify(status="ok"), 200

@app.route('/process-frame', methods=['POST'])
def process_frame():
    """🔓 PUBLIC API - No auth required for low-latency gesture detection"""
    import base64
    
    try:
        data = request.json
        if not data or 'frame' not in data:
            print("❌ No frame in request data")
            return jsonify(error="No frame received"), 400
        
        # ✅ STEP 2 — CORRECT FRAME DECODING
        frame_data = data['frame'].split(',')[1]
        image_bytes = base64.b64decode(frame_data)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if frame is None:
            print("❌ Failed to decode frame")
            return jsonify(error="Failed to decode image"), 400
        
        # 🔥 FIX 7 — DEBUG LOGGING (VERIFY ENDPOINT IS HIT)
        print(f"📸 Frame received: {frame.shape}")
        
        # ✅ STEP 4 — RUN MEDIAPIPE ON FRAME
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = hands.process(rgb)
        
        gesture = "none"
        hand_detected = False
        
        if result.multi_hand_landmarks:
            hand_detected = True
            hand_landmarks = result.multi_hand_landmarks[0]
            gesture = detect_gesture(hand_landmarks)
            print(f"👋 Gesture detected: {gesture}")
        
        return jsonify({
            "gesture": gesture,
            "hand_detected": hand_detected
        })
        
    except Exception as e:
        print(f"❌ [Process Frame] Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify(error=str(e)), 500

@app.route('/')
def root():
    """Root endpoint - API status check"""
    return jsonify({
        "status": "MotionMind backend running",
        "version": "1.0",
        "endpoints": {
            "health": "/health",
            "camera_status": "/camera_status",
            "process_frame": "/process-frame"
        }
    }), 200

@app.route('/index')
def index():
    """Legacy HTML index route"""
    try:
        index_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html')
        with open(index_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "index.html not found", 404

@app.route('/video_feed')
def video_feed():
    """MJPEG video stream - no auth required as img tags can't send headers."""
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/snake_feed')
def snake_feed():
    """MJPEG stream of camera frames with snake overlay - no auth required."""
    return Response(generate_snake_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/fruit_feed')
def fruit_feed():
    """MJPEG stream of camera frames with Fruit Ninja overlay - no auth required."""
    return Response(generate_fruit_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/dino_feed')
def dino_feed():
    """MJPEG stream of camera frames with Dino Run overlay - no auth required."""
    return Response(generate_dino_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/pong_feed')
def pong_feed():
    """MJPEG stream of camera frames with Pong Game overlay - no auth required."""
    return Response(generate_pong_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')


@firebase_auth_required
def dino_state():
    try:
        with dino_lock:
            state = dino_game.get_state()
        return jsonify(state)
    except Exception as e:
        print(f"Dino state error: {str(e)}")
        return jsonify(score=0, gameOver=False), 500

@app.route('/get_gesture')
@firebase_auth_required
def get_gesture():
    return jsonify(gesture=gesture_state["last_gesture"])

@app.route('/gesture_debug')
@firebase_auth_required
def gesture_debug():
    """Debug endpoint to check camera and gesture detection status."""
    with state_lock:
        debug_info = {
            "camera_active": camera_stream.active,
            "mediapipe_active": mediapipe_worker.active,
            "last_gesture": gesture_state["last_gesture"],
            "hand_visible": hand_position["visible"],
            "gesture_time_ago": time.time() - gesture_state.get("last_gesture_time", 0),
            "camera_error": camera_stream.error,
            "results_available": mediapipe_worker.results is not None
        }
    return jsonify(debug_info)

@app.route('/get_hand_position')
@firebase_auth_required
def get_hand_position():
    return jsonify(hand_position)

@app.route('/get_pen_position')
@firebase_auth_required
def get_pen_position():
    """Get stabilized pen position for whiteboard."""
    with state_lock:
        return jsonify(shared_state["smoothed_pen"])

@app.route('/get_whiteboard_state')
@firebase_auth_required
def get_whiteboard_state():
    """Get complete whiteboard state including action, stroke size, and pen position."""
    with state_lock:
        return jsonify({
            "action": shared_state["whiteboard"]["action"],
            "stroke_size": shared_state["whiteboard"]["stroke_size"],
            "pen": shared_state["smoothed_pen"],
            "hand_position": shared_state["hand_position"]
        })

@app.route('/set_stroke_size/<int:size>', methods=['POST'])
@firebase_auth_required
def set_stroke_size(size):
    """Set stroke size manually."""
    if whiteboard_mode.set_stroke_size(size):
        with state_lock:
            shared_state["whiteboard"]["stroke_size"] = size
        return jsonify({"success": True, "stroke_size": size})
    return jsonify({"success": False, "error": "Invalid stroke size"}), 400

@app.route('/game_action/<game_name>')
@firebase_auth_required
def game_action(game_name):
    gesture = gesture_state["last_gesture"]
    return jsonify(game=game_name, gesture=gesture, position=hand_position)

@app.route('/login', methods=['POST'])
def login():
    try:
        # Get JSON data if sent as JSON
        if request.is_json:
            data = request.get_json()
            email = data.get('email')
            password = data.get('password')
        else:
            # Get form data
            email = request.form.get('email')
            password = request.form.get('password')
        
        if not email or not password:
            return jsonify(success=False, message="Email and password are required"), 400
        
        # Find user by email
        user = users.get(email)
        
        if user and check_password_hash(user['password'], password):
            session['user_id'] = user['id']
            session['email'] = email
            # Make session permanent
            session.permanent = True
            return jsonify(success=True, message="Login successful")
        else:
            return jsonify(success=False, message="Invalid credentials"), 401
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify(success=False, message="An error occurred during login"), 500

@app.route('/register', methods=['POST'])
def register():
    try:
        # Get JSON data if sent as JSON
        if request.is_json:
            data = request.get_json()
            email = data.get('email')
            password = data.get('password')
        else:
            # Get form data
            email = request.form.get('email')
            password = request.form.get('password')
        
        if not email or not password:
            return jsonify(success=False, message="Email and password are required"), 400
        
        if email in users:
            return jsonify(success=False, message="Email already exists"), 400
        
        if len(password) < 6:
            return jsonify(success=False, message="Password must be at least 6 characters"), 400
        
        # Create new user
        users[email] = {
            "password": generate_password_hash(password),
            "id": str(len(users) + 1)
        }
        
        session['user_id'] = users[email]['id']
        session['email'] = email
        # Make session permanent
        session.permanent = True
        return jsonify(success=True, message="Registration successful")
    except Exception as e:
        print(f"Registration error: {str(e)}")
        return jsonify(success=False, message="An error occurred during registration"), 500

@app.route('/logout', methods=['POST'])
def logout():
    try:
        session.clear()
        return jsonify(success=True, message="Logged out successfully")
    except Exception as e:
        print(f"Logout error: {str(e)}")
        return jsonify(success=False, message="An error occurred during logout"), 500

@app.route('/check_auth')
def check_auth():
    try:
        if 'user_id' in session:
            return jsonify(authenticated=True, email=session.get('email'))
        return jsonify(authenticated=False)
    except Exception as e:
        print(f"Auth check error: {str(e)}")
        return jsonify(authenticated=False)

# --- GAME RESTART ROUTES ---
@app.route('/restart_game/<game_name>', methods=['POST'])
@firebase_auth_required
def restart_game(game_name):
    """Restart a game by name."""
    try:
        if game_name == 'snake':
            with snake_lock:
                snake_game.reset()
            return jsonify(success=True, message="Snake game restarted")
        elif game_name == 'fruit':
            with fruit_lock:
                fruit_game.reset()
            return jsonify(success=True, message="Fruit Ninja restarted")
        elif game_name == 'dino':
            with dino_lock:
                dino_game.reset()
            return jsonify(success=True, message="Dino Run restarted")
        else:
            return jsonify(success=False, error="Unknown game"), 400
    except Exception as e:
        print(f"Game restart error: {e}")
        return jsonify(success=False, error=str(e)), 500

# Legacy endpoints for backward compatibility
@app.route('/snake_reset', methods=['POST'])
@firebase_auth_required
def snake_reset():
    """Reset Snake game (legacy endpoint)."""
    try:
        with snake_lock:
            snake_game.reset()
        return jsonify(success=True, message="Snake game reset")
    except Exception as e:
        print(f"Snake reset error: {e}")
        return jsonify(success=False, error=str(e)), 500

@app.route('/snake_state')
@firebase_auth_required
def snake_state():
    """Get current Snake game state."""
    try:
        with snake_lock:
            state = {
                'score': snake_game.score,
                'game_over': snake_game.game_over,
                'snake_length': len(snake_game.snake)
            }
        return jsonify(state)
    except Exception as e:
        print(f"Snake state error: {e}")
        return jsonify(success=False, error=str(e)), 500

@app.route('/dino_state')
@firebase_auth_required
def dino_state():
    """Get current Dino Run game state."""
    try:
        with dino_lock:
            state = {
                'score': dino_game.score,
                'game_over': dino_game.game_over
            }
        return jsonify(state)
    except Exception as e:
        print(f"Dino state error: {e}")
        return jsonify(success=False, error=str(e)), 500

@app.route('/fruit_state')
@firebase_auth_required
def fruit_state():
    """Get current Fruit Ninja game state."""
    try:
        with fruit_lock:
            state = {
                'score': fruit_game.score,
                'game_over': fruit_game.game_over,
                'lives': fruit_game.lives
            }
        return jsonify(state)
    except Exception as e:
        print(f"Fruit state error: {e}")
        return jsonify(success=False, error=str(e)), 500

@app.route('/fruit_reset', methods=['POST'])
@firebase_auth_required
def fruit_reset():
    """Reset Fruit Ninja game (legacy endpoint)."""
    try:
        with fruit_lock:
            fruit_game.reset()
        return jsonify(success=True, message="Fruit Ninja reset")
    except Exception as e:
        print(f"Fruit reset error: {e}")
        return jsonify(success=False, error=str(e)), 500

@app.route('/dino_reset', methods=['POST'])
@firebase_auth_required
def dino_reset():
    """Reset Dino Run game (legacy endpoint)."""
    try:
        with dino_lock:
            dino_game.reset()
        return jsonify(success=True, message="Dino Run reset")
    except Exception as e:
        print(f"Dino reset error: {e}")
        return jsonify(success=False, error=str(e)), 500

@app.route('/pong_reset', methods=['POST'])
@firebase_auth_required
def pong_reset():
    """Reset Pong game."""
    try:
        with pong_lock:
            pong_game.reset()
        return jsonify(success=True, message="Pong game reset")
    except Exception as e:
        print(f"Pong reset error: {e}")
        return jsonify(success=False, error=str(e)), 500

@app.route('/pong_state')
@firebase_auth_required
def pong_state():
    """Get current Pong game state."""
    try:
        with pong_lock:
            state = pong_game.get_state()
        return jsonify(state)
    except Exception as e:
        print(f"Pong state error: {str(e)}")
        return jsonify(score=0, gameOver=False), 500

# --- DEPRECATED CAMERA CONTROL ROUTES (LEGACY - USE BROWSER CAMERA INSTEAD) ---
# 🔓 PUBLIC API - No auth required (camera is client-side now)

@app.route('/camera_status', methods=['GET'])
def camera_status():
    """🔓 PUBLIC API - Simple status endpoint, no auth required"""
    return jsonify({
        "camera": "browser",
        "status": "ready",
        "backend": "connected"
    })

@app.route('/start_camera', methods=['POST'])
def start_camera():
    """Deprecated: Camera is now browser-controlled via getUserMedia()"""
    return jsonify(
        success=False, 
        error="This endpoint is deprecated. Camera is now started in the browser using navigator.mediaDevices.getUserMedia()",
        deprecated=True
    ), 410  # 410 Gone

@app.route('/stop_camera', methods=['POST'])
def stop_camera():
    """Deprecated: Camera is now browser-controlled"""
    return jsonify(
        success=False, 
        error="This endpoint is deprecated. Stop the camera in the browser by stopping the MediaStream.",
        deprecated=True
    ), 410  # 410 Gone

@app.route('/restart_camera', methods=['POST'])
def restart_camera():
    """Deprecated: Camera is now browser-controlled"""
    return jsonify(
        success=False, 
        error="This endpoint is deprecated. Restart camera by stopping and starting the browser MediaStream.",
        deprecated=True
    ), 410  # 410 Gone

# --- CLEANUP ON APP SHUTDOWN ---
@app.teardown_appcontext
def cleanup(error):
    if error:
        app.logger.error(f"Error: {error}")

# Don't initialize camera on startup
# initialize_camera()  # REMOVED

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000, debug=True)