# 🔧 VERCEL DEPLOYMENT FIX

## ❌ Error: "No flask entrypoint found"

### 🔍 Root Cause:
Vercel is looking for `app.py` in the **project root**, but your Flask app is in `backend/app.py`

---

## ✅ Solution: Set Root Directory to `backend`

### **Step-by-Step Fix:**

1. **Go to your Vercel project:**
   - [https://vercel.com/dashboard](https://vercel.com/dashboard)
   - Open: `motionmind-cloud-j1q7`

2. **Settings → General:**
   - Scroll to **"Root Directory"**
   - Click **"Edit"**
   - Enter: `backend`
   - Click **"Save"**

3. **Redeploy:**
   - Go to **"Deployments"** tab
   - Click **"Redeploy"** on the latest deployment
   - OR push a new commit to trigger auto-deploy

---

## 🎯 Alternative: Create api/app.py (Vercel-specific)

If you want to keep project root, create an API wrapper:

### **Create: api/app.py**
```python
# Vercel-specific entrypoint
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Import Flask app from backend
from backend.app import app

# Vercel will find this
if __name__ == "__main__":
    app.run()
```

This won't work because of relative imports in backend/app.py.

---

## 🚀 RECOMMENDED FIX: Set Root Directory

**In Vercel Dashboard:**

```
Project Settings
└── General
    └── Root Directory
        └── backend  ← Set this!
```

Then Vercel will run from `backend/` folder and find `app.py` correctly.

---

## 🧪 Verify After Fix

After setting root directory, check build logs should show:

```
✅ Found Flask app in app.py
✅ Installing from requirements.txt
✅ Deploying...
```

---

## ⚠️ Important: Vercel Limitations for MotionMind

**Even after fixing, consider these issues:**

| Issue | Impact |
|-------|--------|
| **Timeout** | 10s (Hobby), 60s (Pro) |
| **MediaPipe** | May timeout on video processing |
| **Serverless** | Cold starts = slower first request |

**Recommendation: Use Railway instead**
- ✅ No timeouts
- ✅ Better for real-time video
- ✅ Already configured (Procfile ready)
- ✅ Deploy at: railway.app

---

## 📋 Quick Fix Summary

1. Vercel Dashboard → Project Settings
2. General → Root Directory → `backend`
3. Save
4. Redeploy

**OR**

Use Railway (recommended for MediaPipe):
- railway.app → New Project
- Import GitHub repo
- Set root directory: `backend`
- Auto-deploys with Procfile

✅ **Problem solved!**
