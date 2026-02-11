# 🚀 MotionMind Deployment Options

## Choose Your Architecture

### **Option 1: Monolithic (Railway Only)** 🏗️
Deploy frontend + backend together on Railway

### **Option 2: Separate (Firebase + Railway)** 🔀  
Deploy frontend on Firebase, backend on Railway

---

## 📦 Option 1: Monolithic Deployment (Railway)

### **Advantages:**
- ✅ Single deployment
- ✅ No CORS issues
- ✅ Simpler configuration
- ✅ One domain

### **Setup:**

1. **Copy frontend files to backend:**
```bash
# From project root
cp -r frontend/* backend/frontend/
```

2. **Deploy to Railway:**
- Connect GitHub repo
- Set root directory: `backend`
- Railway will serve both frontend & backend

3. **Access:**
- Frontend: `https://your-app.up.railway.app/`
- API: `https://your-app.up.railway.app/health`

### **How it works:**
- Root `/` → serves `frontend/index.html`
- `/script.js`, `/style.css` → serves from `frontend/`
- `/process-frame`, `/health` → API endpoints

---

## 🔀 Option 2: Separate Deployment (Current)

### **Advantages:**
- ✅ Independent scaling
- ✅ Static hosting (faster frontend)
- ✅ Firebase features (auth, analytics)
- ✅ Better for production

### **Setup:**

**Frontend (Firebase):**
```bash
cd frontend
firebase deploy
```
URL: `https://motionmind-1d875.web.app`

**Backend (Railway):**
- Connect GitHub repo
- Set root directory: `backend`
- Railway auto-deploys

URL: `https://your-backend.up.railway.app`

**Update config.js:**
```javascript
export const BACKEND_URL = 'https://your-backend.up.railway.app';
```

### **How it works:**
- Frontend on Firebase (static files)
- Backend on Railway (API only)
- CORS enabled for cross-origin requests

---

## 🎯 Recommended: Option 2 (Separate)

**Why?**
- Faster frontend (CDN)
- Better scalability
- Production-ready
- Already configured

**Current Status:**
- ✅ Frontend deployed: `https://motionmind-1d875.web.app`
- ⏳ Backend: Ready for Railway deployment

---

## 🔧 Backend is Already Configured for BOTH Options!

### **app.py automatically detects deployment mode:**

```python
# If frontend/ exists → Monolithic mode (serve static files)
# If frontend/ doesn't exist → API-only mode (CORS enabled)

@app.route('/')
def root():
    # Monolithic: serves index.html
    # API-only: returns JSON status
```

### **No code changes needed!**
- Deploy `backend/` only → API mode
- Copy `frontend/` files → Monolithic mode

---

## 📋 Quick Deploy Commands

### **Monolithic (Railway Only):**
```bash
# 1. Merge frontend into backend
mkdir -p backend/frontend
cp -r frontend/* backend/frontend/

# 2. Push to GitHub
git add backend/frontend
git commit -m "Monolithic deployment"
git push

# 3. Deploy on Railway (auto-detects)
```

### **Separate (Firebase + Railway):**
```bash
# 1. Deploy frontend
cd frontend
firebase deploy

# 2. Deploy backend
# - Go to railway.app
# - Connect repo
# - Set root: backend
# - Auto-deploys

# 3. Update frontend config
# Edit frontend/config.js with Railway URL
firebase deploy
```

---

## ✅ Your Choice

Both options are production-ready. Choose based on your needs:

- **Want simplicity?** → Monolithic
- **Want scalability?** → Separate (Recommended)

Currently configured for: **Separate (Option 2)** ✨
