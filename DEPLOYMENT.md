# 🚀 DEPLOYMENT GUIDE - MotionMind Cloud

## ✅ PROJECT STRUCTURE (EXAM-SAFE)

```
motionmind cloud/
├── frontend/                 ✅ Firebase Hosting
│   ├── index.html
│   ├── script.js
│   ├── config.js            # Backend URL config
│   ├── firebase.json
│   └── .firebaserc
│
└── backend/                  ✅ Render
    ├── app.py
    ├── mediapipe_compat.py
    ├── games/
    └── requirements.txt
```

---

## 📋 STEP 1: Deploy Backend to Render

### 1.1 Create Render Web Service

1. Go to https://render.com
2. Click **New +** → **Web Service**
3. Connect your GitHub repository: `70132355-code/motionmind-cloud`

### 1.2 Configure Render Service

**Basic Settings:**
- **Name**: `motionmind-cloud`
- **Region**: Singapore (or closest)
- **Branch**: `main`
- **Root Directory**: `backend`

**Build & Deploy:**
- **Runtime**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn app:app --bind 0.0.0.0:10000`

**Instance Type:**
- Free tier is fine for testing

### 1.3 Deploy Backend

Click **Create Web Service**

Wait for deployment (5-10 minutes)

Your backend URL will be:
```
https://motionmind-cloud.onrender.com
```

### 1.4 Test Backend

```bash
curl https://motionmind-cloud.onrender.com/health
# Should return: {"status":"ok"}
```

---

## 📋 STEP 2: Update Frontend Configuration

### 2.1 Update Backend URL

Edit `frontend/config.js`:

```javascript
const BACKEND_URL = 'https://motionmind-cloud.onrender.com';
```

### 2.2 Commit Changes

```bash
cd "d:\FURQAN FYP\motionmind cloud"
git add frontend/config.js
git commit -m "Update backend URL for Render deployment"
git push origin main
```

---

## 📋 STEP 3: Deploy Frontend to Firebase

### 3.1 Install Firebase CLI (if not installed)

```bash
npm install -g firebase-tools
```

### 3.2 Login to Firebase

```bash
firebase login
```

### 3.3 Navigate to Frontend Folder

```bash
cd "d:\FURQAN FYP\motionmind cloud\frontend"
```

### 3.4 Deploy to Firebase

```bash
firebase deploy
```

**Expected Output:**
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/motionmind-1d875
Hosting URL: https://motionmind-1d875.web.app
```

---

## 🎉 STEP 4: Test Complete System

### 4.1 Open Frontend

```
https://motionmind-1d875.web.app
```

### 4.2 Test Camera

1. Click "Start Camera"
2. Allow camera permission
3. Camera should start in browser
4. Frames sent to Render backend
5. Gesture detection should work

### 4.3 Verify Console

**Browser Console:**
```javascript
[Camera] Browser camera started successfully
[Gesture] one_finger_up
[Gesture] fist
```

**Network Tab:**
```
POST https://motionmind-cloud.onrender.com/process-frame
Status: 200 OK
Response: {"gesture":"one_finger_up","hand_position":{...}}
```

---

## ✅ DEPLOYMENT CHECKLIST

- [x] Backend deployed on Render
- [x] Backend health endpoint responding
- [x] Frontend config updated with Render URL
- [x] Frontend deployed on Firebase
- [x] Camera starts in browser
- [x] Frames sent to backend
- [x] Gesture detection works

---

## 🔧 TROUBLESHOOTING

### Backend Not Responding

Check Render logs:
```
Dashboard → motionmind-cloud → Logs
```

### CORS Errors

Backend already has CORS enabled in `app.py`:
```python
from flask_cors import CORS
CORS(app)
```

### Camera Permission Denied

- Frontend must be served via HTTPS (Firebase does this automatically)
- User must click "Allow" on camera permission prompt

### Gestures Not Detected

Check browser console for errors:
```javascript
[Frame Processing] Server error: 500
```

This means backend MediaPipe processing failed. Check Render logs.

---

## 📝 NOTES

### Firebase Project Details
- Project ID: `motionmind-1d875`
- Hosting URL: https://motionmind-1d875.web.app
- Authentication: Enabled (Email/Password)

### Render Service Details
- Service Name: `motionmind-cloud`
- URL: https://motionmind-cloud.onrender.com
- Python Version: 3.13
- Root Directory: `backend`

### Architecture
```
Browser (Frontend)
    ↓ getUserMedia()
Camera Frames
    ↓ POST /process-frame
Render Backend (Flask)
    ↓ MediaPipe
Gesture Detection
    ↓ JSON Response
Browser Updates UI
```

---

## 🎓 EXAM DEMO TIPS

1. **Open Firebase Console first** to show hosting setup
2. **Open Render Dashboard** to show backend logs
3. **Open Browser DevTools** to show network requests
4. **Start camera** and show real-time gesture detection
5. **Point out separation**: Frontend (Firebase) vs Backend (Render)

This demonstrates:
- ✅ Cloud deployment (Firebase + Render)
- ✅ Microservices architecture (separated frontend/backend)
- ✅ Real-time processing (camera → API → response)
- ✅ Modern web tech (MediaPipe, Flask, Firebase)

---

**DEPLOYMENT COMPLETE! 🚀**
