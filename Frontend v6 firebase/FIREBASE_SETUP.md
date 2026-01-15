# Firebase Authentication Setup Guide

## Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click "Add project" or select an existing project
3. Follow the setup wizard

## Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** authentication
3. Click "Save"

## Step 3: Get Web App Configuration

1. Go to **Project Settings** (gear icon) → **General**
2. Scroll to "Your apps" section
3. Click the **Web** icon (</>) to add a web app
4. Register your app with a nickname (e.g., "MotionMind")
5. Copy the `firebaseConfig` object

## Step 4: Update Frontend Configuration

Open `index.html` and replace the Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Step 5: Get Service Account Key (Backend)

1. In Firebase Console, go to **Project Settings** → **Service accounts**
2. Click **"Generate new private key"**
3. Download the JSON file
4. **IMPORTANT:** Rename it to `firebase-service-account.json`
5. Place it in your project root folder (same directory as `app.py`)

**WARNING:** Never commit this file to Git! Add it to `.gitignore`

## Step 6: Install Python Dependencies

```bash
pip install -r requirmements.txt
```

This will install:
- `firebase-admin==6.3.0`
- `flask-cors==4.0.0`

## Step 7: Security Rules

### .gitignore
Add this line to `.gitignore`:

```
firebase-service-account.json
```

### Firebase Security
- The service account key gives full admin access
- Keep it secret and secure
- Never expose it in client-side code

## Step 8: Test Authentication

1. Start the Flask server:
   ```bash
   python app.py
   ```

2. Open http://127.0.0.1:5000 in your browser

3. Try to register a new account:
   - Enter email and password
   - Click "Register"

4. If successful, you'll be logged in and redirected to Dashboard

## Troubleshooting

### "Firebase Admin initialization failed"
- Check that `firebase-service-account.json` exists in the project root
- Verify the file is valid JSON
- Ensure the file name is exactly `firebase-service-account.json`

### "Invalid token" errors
- Check that Firebase configuration in `index.html` matches your project
- Ensure you've enabled Email/Password authentication in Firebase Console
- Check browser console for errors

### CORS errors
- Ensure `flask-cors` is installed
- Check that CORS is enabled in `app.py`

## Current Status

✅ Frontend: Firebase SDK loaded in index.html
✅ Backend: Firebase Admin SDK integrated in app.py
✅ Routes: All protected routes require authentication
✅ Login/Register: Using Firebase Authentication
✅ Logout: Firebase sign out implemented

## Next Steps

1. Add `firebase-service-account.json` to your project
2. Update Firebase config in `index.html`
3. Test login and registration
4. Deploy to production with proper security rules
