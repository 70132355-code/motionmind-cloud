"""
MediaPipe Compatibility Shim for 0.10.x
This module provides backward compatibility for code using the deprecated mp.solutions API
"""
import mediapipe as mp
import numpy as np


class NormalizedLandmark:
    """Simple landmark class"""
    def __init__(self, x=0, y=0, z=0):
        self.x = x
        self.y = y
        self.z = z


class NormalizedLandmarkList:
    """Simple landmark list class"""
    def __init__(self):
        self.landmark = []


class DrawingUtils:
    """Compatibility wrapper for mp.solutions.drawing_utils"""
    
    @staticmethod
    def draw_landmarks(image, landmark_list, connections=None, 
                      landmark_drawing_spec=None, connection_drawing_spec=None):
        """Draw landmarks on image - minimal implementation for hand tracking"""
        if landmark_list is None or not hasattr(landmark_list, 'landmark'):
            return
        
        import cv2
        h, w, _ = image.shape
        
        # Draw landmarks
        for landmark in landmark_list.landmark:
            x = int(landmark.x * w)
            y = int(landmark.y * h)
            cv2.circle(image, (x, y), 5, (0, 255, 0), -1)
        
        # Draw connections if provided
        if connections:
            for connection in connections:
                start_idx = connection[0]
                end_idx = connection[1]
                start = landmark_list.landmark[start_idx]
                end = landmark_list.landmark[end_idx]
                
                start_point = (int(start.x * w), int(start.y * h))
                end_point = (int(end.x * w), int(end.y * h))
                cv2.line(image, start_point, end_point, (255, 255, 255), 2)


class HandsConnections:
    """Hand landmark connections for drawing"""
    HAND_CONNECTIONS = frozenset([
        (0, 1), (1, 2), (2, 3), (3, 4),  # Thumb
        (0, 5), (5, 6), (6, 7), (7, 8),  # Index
        (5, 9), (9, 10), (10, 11), (11, 12),  # Middle
        (9, 13), (13, 14), (14, 15), (15, 16),  # Ring
        (13, 17), (17, 18), (18, 19), (19, 20),  # Pinky
        (0, 17)  # Palm
    ])


class HandLandmark:
    """Hand landmark indices enum for backward compatibility"""
    WRIST = 0
    THUMB_CMC = 1
    THUMB_MCP = 2
    THUMB_IP = 3
    THUMB_TIP = 4
    INDEX_FINGER_MCP = 5
    INDEX_FINGER_PIP = 6
    INDEX_FINGER_DIP = 7
    INDEX_FINGER_TIP = 8
    MIDDLE_FINGER_MCP = 9
    MIDDLE_FINGER_PIP = 10
    MIDDLE_FINGER_DIP = 11
    MIDDLE_FINGER_TIP = 12
    RING_FINGER_MCP = 13
    RING_FINGER_PIP = 14
    RING_FINGER_DIP = 15
    RING_FINGER_TIP = 16
    PINKY_MCP = 17
    PINKY_PIP = 18
    PINKY_DIP = 19
    PINKY_TIP = 20


class Hands:
    """Compatibility wrapper for mp.solutions.hands.Hands"""
    
    def __init__(self, static_image_mode=False, max_num_hands=2, 
                 min_detection_confidence=0.5, min_tracking_confidence=0.5):
        """Initialize hands detector with legacy API parameters"""
        # Import here to avoid circular imports
        import cv2
        import mediapipe as mp
        from mediapipe.tasks import python
        from mediapipe.tasks.python import vision
        
        self.mp_hands = vision.HandLandmarker
        self.mp_hands_model_path = None
        
        # Download model if needed
        import os
        import urllib.request
        
        model_path = os.path.join(os.path.dirname(__file__), 'hand_landmarker.task')
        
        if not os.path.exists(model_path):
            print("Downloading hand landmarker model...")
            model_url = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task"
            try:
                urllib.request.urlretrieve(model_url, model_path)
                print("Model downloaded successfully!")
            except Exception as e:
                print(f"Failed to download model: {e}")
                # Use a backup approach - create a simpler detector
                self.detector = None
                return
        
        # Configure detector
        from mediapipe.tasks.python import vision
        from mediapipe.tasks.python import BaseOptions
        
        options = vision.HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=model_path),
            running_mode=vision.RunningMode.IMAGE,  # Use IMAGE mode for simpler processing
            num_hands=max_num_hands,
            min_hand_detection_confidence=min_detection_confidence,
            min_hand_presence_confidence=min_tracking_confidence,
            min_tracking_confidence=min_tracking_confidence
        )
        
        try:
            self.detector = self.mp_hands.create_from_options(options)
        except Exception as e:
            print(f"Failed to create detector: {e}")
            self.detector = None
    
    def process(self, image):
        """Process image and return results in legacy format"""
        if self.detector is None:
            print("[DEBUG] Detector is None!")
            # Return empty result
            class EmptyResult:
                multi_hand_landmarks = None
                multi_handedness = None
            return EmptyResult()
        
        # Convert BGR to RGB
        import cv2
        from mediapipe import Image, ImageFormat
        from mediapipe.tasks.python import vision
        
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=ImageFormat.SRGB, data=rgb_image)
        
        # Use IMAGE mode detection (no timestamp needed)
        try:
            detection_result = self.detector.detect(mp_image)
            
            # Debug: Check what we got (silent when no hands detected)
            if detection_result:
                if hasattr(detection_result, 'hand_landmarks') and detection_result.hand_landmarks:
                    pass  # Hand detected - silent
                else:
                    pass  # No hands - silent (normal state)
            else:
                pass  # No detection - silent
                
        except Exception as e:
            print(f"[DEBUG] ❌ Detection error: {e}")
            import traceback
            traceback.print_exc()
            class EmptyResult:
                multi_hand_landmarks = None
                multi_handedness = None
            return EmptyResult()
        
        # Convert to legacy format
        class LegacyResults:
            def __init__(self, new_results):
                if new_results and new_results.hand_landmarks:
                    self.multi_hand_landmarks = []
                    for hand_landmarks in new_results.hand_landmarks:
                        # Create landmark list in old format
                        landmark_list = NormalizedLandmarkList()
                        for landmark in hand_landmarks:
                            l = NormalizedLandmark(landmark.x, landmark.y, landmark.z)
                            landmark_list.landmark.append(l)
                        self.multi_hand_landmarks.append(landmark_list)
                    self.multi_handedness = new_results.handedness
                else:
                    self.multi_hand_landmarks = None
                    self.multi_handedness = None
        
        return LegacyResults(detection_result)
    
    def close(self):
        """Close the detector"""
        if self.detector:
            self.detector.close()


# Create a solutions-like module structure
class SolutionsMock:
    """Mock mp.solutions module"""
    def __init__(self):
        self.hands = type('hands', (), {
            'Hands': Hands,
            'HAND_CONNECTIONS': HandsConnections.HAND_CONNECTIONS,
            'HandLandmark': HandLandmark
        })()
        self.drawing_utils = DrawingUtils()


# Inject solutions into mediapipe if it doesn't exist
if not hasattr(mp, 'solutions'):
    mp.solutions = SolutionsMock()
