# MotionMind Frontend

This folder contains the Firebase-hosted frontend application.

## Structure
- `index.html` - Main application page
- `script.js` - Application logic
- `style.css` - Main styles
- `gesture-controls.css` - Gesture control styles  
- `config.js` - Backend API configuration
- `images/` - Static assets

## Deployment

Deploy to Firebase Hosting:

```bash
cd frontend
firebase deploy
```

## Configuration

Update `config.js` with your Render backend URL:

```javascript
const BACKEND_URL = 'https://your-app.onrender.com';
```

## Firebase Project
- Project ID: `motionmind-1d875`
- Hosting URL: https://motionmind-1d875.web.app
