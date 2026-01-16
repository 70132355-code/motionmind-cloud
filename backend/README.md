# MotionMind Backend

This folder contains the Flask backend deployed on Render.

## Structure
- `app.py` - Main Flask application
- `mediapipe_compat.py` - MediaPipe compatibility layer
- `games/` - Game logic modules
- `hand_landmarker.task` - MediaPipe model
- `requirements.txt` - Python dependencies

## Deployment

Deploy to Render:

1. Push to GitHub
2. Connect Render to your repository
3. Configure:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app --bind 0.0.0.0:10000`
   - Root Directory: `backend`

## Environment Variables

Set on Render:
- No server-side camera needed
- Firebase credentials optional (for auth)

## API Endpoints

- `POST /process-frame` - Process camera frame and return gesture
- `GET /health` - Health check

## Note

This backend does NOT use server-side camera. All camera capture happens in the browser (frontend), and frames are sent to `/process-frame` for MediaPipe processing.
