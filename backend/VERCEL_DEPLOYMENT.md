# 🚀 Vercel Deployment Guide for MotionMind Backend

## ✅ Your Flask app is already Vercel-ready!

### **Prerequisites Met:**
- ✅ File named `app.py` (Vercel auto-detects)
- ✅ Flask variable named `app`
- ✅ `requirements.txt` includes Flask + gunicorn
- ✅ `vercel.json` configuration added
- ✅ `pyproject.toml` for Poetry support

---

## 📦 Deployment Steps

### **1. Push to GitHub**
```bash
cd backend
git add .
git commit -m "Add Vercel deployment config"
git push origin main
```

### **2. Deploy on Vercel**

#### **Option A: Web Interface**
1. Go to [vercel.com](https://vercel.com)
2. Click **"New Project"**
3. **Import** your GitHub repo
4. **Important Settings:**
   - **Root Directory:** `backend` ⚠️
   - **Framework Preset:** Other (auto-detects Python)
   - **Build Command:** (leave empty)
   - **Output Directory:** (leave empty)

5. Click **"Deploy"**

#### **Option B: Vercel CLI**
```bash
npm i -g vercel
cd backend
vercel --prod
```

---

## 🔧 Configuration Files

### **vercel.json** (Already Created)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "app.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "app.py"
    }
  ]
}
```

### **pyproject.toml** (Optional - Already Created)
Helps Vercel detect Python dependencies and entrypoint.

---

## 🎯 Environment Variables (Optional)

Add in Vercel Dashboard → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `FLASK_ENV` | `production` |
| `SECRET_KEY` | `your-secret-key-here` |
| `PORT` | (auto-set by Vercel) |

---

## ✅ Verification Checklist

After deployment, test these endpoints:

- ✅ `https://your-app.vercel.app/` → API status or frontend
- ✅ `https://your-app.vercel.app/health` → Health check
- ✅ `https://your-app.vercel.app/process-frame` → Gesture API

---

## ⚠️ Known Limitations on Vercel

### **Serverless Functions Have Limits:**
- **Max Duration:** 10s (Hobby), 60s (Pro)
- **MediaPipe Processing:** May timeout on large videos
- **Memory:** 1024 MB (Hobby), 3008 MB (Pro)

### **Recommendation:**
For compute-heavy MediaPipe processing, use **Railway** instead:
- ✅ No timeout limits
- ✅ Persistent processes
- ✅ Better for real-time video

**Vercel is best for:**
- API-only backends
- Lightweight processing
- Quick deployments

**Railway is best for:**
- Real-time video processing
- Long-running tasks
- MediaPipe gesture detection ✅ **Recommended**

---

## 🔄 Comparison: Vercel vs Railway

| Feature | Vercel | Railway |
|---------|--------|---------|
| **Deployment** | Instant | ~2-3 min |
| **Timeout** | 10-60s | Unlimited |
| **WebSockets** | Limited | ✅ Full support |
| **Video Processing** | ⚠️ Timeouts | ✅ Excellent |
| **Cost (Free)** | More generous | Limited hours |
| **Best For** | Static + APIs | Heavy compute |

---

## 🎯 Deployment Decision

### **For MotionMind Backend:**

**Use Railway** ✅ **Recommended**
- Real-time gesture detection
- MediaPipe processing
- No timeout issues
- Already configured (see `Procfile`)

**Use Vercel** 
- If you only need API endpoints
- No heavy video processing
- Quick prototyping

---

## 🚀 Quick Deploy (Railway - Recommended)

Since your backend does heavy MediaPipe processing:

```bash
# Railway is already configured!
# Just connect your repo at railway.app

# Files ready:
# ✅ Procfile
# ✅ railway.json
# ✅ requirements.txt
# ✅ runtime.txt
```

**Railway URL will be:** `https://motionmind-cloud.up.railway.app`

Update `frontend/config.js`:
```javascript
export const BACKEND_URL = 'https://motionmind-cloud.up.railway.app';
```

Then redeploy frontend:
```bash
cd frontend
firebase deploy
```

---

## ✅ Summary

**Vercel files created:** ✅ Ready (vercel.json, pyproject.toml)  
**Railway files existing:** ✅ Ready (Procfile, railway.json)

**Choose deployment:**
- **Light API work?** → Vercel
- **Heavy MediaPipe?** → Railway ✅ **Recommended for your project**

Both are production-ready! 🎉
