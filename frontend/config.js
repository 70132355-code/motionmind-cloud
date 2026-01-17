// Backend API Configuration
// 🔥 SINGLE SOURCE OF TRUTH FOR BACKEND URL
// For local testing: Use 'http://localhost:10000'
// For production: Use 'https://motionmind-cloud.onrender.com'
export const BACKEND_URL = 'https://motionmind-cloud.onrender.com';

// API Endpoints
export const API_ENDPOINTS = {
  processFrame: `${BACKEND_URL}/process-frame`,
  cameraStatus: `${BACKEND_URL}/camera_status`,
  startCamera: `${BACKEND_URL}/start_camera`,
  stopCamera: `${BACKEND_URL}/stop_camera`,
  getGesture: `${BACKEND_URL}/get_gesture`,
  getHandPosition: `${BACKEND_URL}/get_hand_position`,
  snakeState: `${BACKEND_URL}/snake_state`,
  fruitState: `${BACKEND_URL}/fruit_state`,
  dinoState: `${BACKEND_URL}/dino_state`,
  dinoReset: `${BACKEND_URL}/dino_reset`,
  pongState: `${BACKEND_URL}/pong_state`,
  pongReset: `${BACKEND_URL}/pong_reset`,
  health: `${BACKEND_URL}/health`
};
