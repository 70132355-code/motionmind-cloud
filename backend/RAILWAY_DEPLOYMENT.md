# MotionMind Backend - Railway Deployment Guide

## ✅ Production-Ready Configuration

### Files Created:
1. **Procfile** - Railway start command
2. **railway.json** - Railway deploy configuration  
3. **runtime.txt** - Python version specification
4. **Updated app.py** - Uses PORT environment variable

---

## 🚀 Railway Deployment Steps

### 1. Push to GitHub
```bash
cd backend
git add .
git commit -m "Production-ready Railway deployment"
git push origin main
```

### 2. Railway Setup
1. Go to [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. **Important:** Set root directory to `backend` in settings

### 3. Environment Variables (Optional)
Railway auto-detects the PORT, but you can set:
- `FLASK_ENV=production` (recommended)
- `PORT=8080` (Railway auto-sets this)

### 4. Deploy
Railway will automatically:
- Detect `Procfile` and use: `gunicorn app:app`
- Or use `railway.json` start command
- Install from `requirements.txt`
- Use Python version from `runtime.txt`

---

## 🧪 Local Testing

### Test with gunicorn (same as Railway):
```bash
cd backend
gunicorn app:app --bind 0.0.0.0:10000 --workers 2
```

### Test with Flask directly:
```bash
cd backend
python app.py
```

---

## 📦 Start Commands (Railway will use one of these):

**Option 1: Procfile** (Recommended)
```
web: gunicorn app:app
```

**Option 2: Manual start command in Railway dashboard**
```
gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
```

**Option 3: railway.json** (Auto-detected)
```json
{
  "deploy": {
    "startCommand": "gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120"
  }
}
```

---

## ✅ Verification Checklist

- [x] `requirements.txt` includes `flask` and `gunicorn`
- [x] `app.py` uses `os.environ.get("PORT")`
- [x] `app.py` has `host="0.0.0.0"`
- [x] `Procfile` exists with `web: gunicorn app:app`
- [x] `railway.json` has proper start command
- [x] `runtime.txt` specifies Python version
- [x] Works locally with: `gunicorn app:app`

---

## 🔧 Troubleshooting

### "No start command found"
- Ensure `Procfile` is in the backend folder
- OR set manual start command in Railway settings
- OR ensure `railway.json` is properly formatted

### "Module not found"
- Check `requirements.txt` is complete
- Ensure Railway root directory points to `backend`

### "Port already in use"
- Railway auto-assigns PORT - don't hardcode it!
- Use: `port = int(os.environ.get("PORT", 10000))`

---

## 📝 Production Settings

The app is configured with:
- **Host**: 0.0.0.0 (accepts external connections)
- **Port**: Dynamic from Railway ($PORT)
- **Workers**: 2 gunicorn workers
- **Timeout**: 120 seconds (for MediaPipe processing)
- **Debug**: Disabled in production (FLASK_ENV=production)
- **CORS**: Enabled for frontend

---

## 🎯 Expected Railway Logs

```
🚀 Starting Flask app on port 8080 (debug=False)
[INFO] Starting gunicorn 23.0.0
[INFO] Listening at: http://0.0.0.0:8080 (1)
[INFO] Using worker: sync
[INFO] Booting worker with pid: 7
```

✅ **Deployment Status**: Ready for Railway!
