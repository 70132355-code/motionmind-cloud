# MotionMind Cloud - Gesture Control Platform

AI-powered gesture control system with hand tracking using MediaPipe.

## 📁 Project Structure

```
motionmind cloud/
├── frontend/           # Firebase Hosting (HTML, CSS, JS)
│   ├── index.html
│   ├── script.js
│   ├── config.js      # Backend URL configuration
│   └── firebase.json
│
├── backend/            # Render (Flask + MediaPipe)
│   ├── app.py
│   ├── mediapipe_compat.py
│   ├── games/
│   └── requirements.txt
│
└── frontend_v6_firebase/  # (Old structure - ignore)
```

## 🚀 Deployment

### Frontend (Firebase)

```bash
cd frontend
firebase deploy
```

**Live URL**: https://motionmind-1d875.web.app

### Backend (Render)

1. Push to GitHub
2. Connect Render to repository
3. Set root directory: `backend`
4. Build: `pip install -r requirements.txt`
5. Start: `gunicorn app:app --bind 0.0.0.0:10000`

**API URL**: https://motionmind-cloud.onrender.com

## 🔧 Configuration

After deploying backend, update frontend config:

**frontend/config.js**:
```javascript
const BACKEND_URL = 'https://motionmind-cloud.onrender.com';
```

Then redeploy frontend.

## 🎥 How It Works

1. Browser captures camera frames via getUserMedia()
2. Frames sent to backend `/process-frame` endpoint
3. Backend processes with MediaPipe and returns gesture
4. Frontend updates UI based on detected gesture

**No server-side camera needed!**

## 📝 Features

- ✅ Hand gesture detection
- ✅ Whiteboard drawing
- ✅ Gesture-controlled games
- ✅ Presentation control
- ✅ Firebase authentication

## 🔑 Firebase Project

- Project ID: `motionmind-1d875`
- Authentication: Email/Password enabled

## 📦 Tech Stack

**Frontend**: HTML, CSS, JavaScript, Firebase Hosting  
**Backend**: Flask, MediaPipe, OpenCV, Gunicorn  
**Deployment**: Firebase + Render
