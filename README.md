# Popular Live Videos — VERSION 3 (STABLE)
### TikTok / Reels Vertical Video Feed & Admin Panel

A production-ready, mobile-first vertical scrolling video platform built with Vanilla HTML5, Modern CSS, Vanilla JavaScript, and Google Firebase Firestore (via CDN, requiring **no build step or Node.js**). Easily hostable on **GitHub Pages** or any static host.

> **TAGGED RELEASE**: `VERSION 3 (STABLE)`  
> **Backup Location**: [`v3_stable_backup/`](v3_stable_backup/) (Allows instant 1-click restore to original stable state).  
> **Previous Backup**: [`v2_stable_backup/`](v2_stable_backup/)

---

## 🌟 Key Features in Version 3

### 1. Authentic TikTok / Reels Interface (`index.html`)
- **Dynamic Aspect Ratio Support (9:16 & 16:9)**:
  * Full-bleed centered black background wrapper (`.video-wrapper`).
  * `object-fit: contain; width: 100%; height: 100%;` prevents any distortion, stretching, or cropping.
  * Portrait videos fill the vertical layout natively; landscape videos maintain crisp 16:9 aspect ratio with black letterbox padding.
- **Floating Middle Up/Down Navigation Arrows**:
  * Circular glassmorphic buttons (🔼 `#nav-arrow-up` & 🔽 `#nav-arrow-down`) for smooth video card transitions.
  * Desktop keyboard navigation (<kbd>↑</kbd> and <kbd>↓</kbd>) and touch/swipe navigation work concurrently.
- **Branding & LIVE Header**: Centered glassmorphic badge with glowing pulsating red `● LIVE` dot and "Popular Live Videos" brand title.
- **Creator Profile & Clean Overlay**:
  * Professional creator profile: Jessica Miller (`@jessica.official`) with blue verified checkmark.
  * Clean titles with all hardcoded hashtags removed.
  * Audio marquee soundtrack: `Original Sound — Jessica Miller • Popular Live Audio`.
- **Secret Admin Access**: Settings (gear) icon is completely hidden from public visitors; accessible via `?admin=true`, <kbd>Ctrl+Shift+A</kbd>, or triple-tapping the top LIVE badge.
- **10-Second Ad Verification Gate with Early-Return Prevention**:
  1. Video starts paused under a frosted glass overlay.
  2. Tapping **Play** immediately opens the sponsor/ad link in a new tab.
  3. Transitions to an active 10-second verification countdown timer on the main tab.
  4. **Strict Early-Return Prevention**: If the visitor switches back to the tab before the full 10 seconds elapse, the video stays strictly locked, displaying: *"⚠️ Please wait full 10 seconds on the sponsor page to unlock."*
  5. The video automatically unlocks and plays only when the full 10-second timer hits zero.

### 2. Streamlined Admin Dashboard (`admin.html`)
- **4 Essential Fields**:
  1. Video Input (Direct File Upload for local/IndexedDB storage OR direct video URL).
  2. Ad Network Direct Link (Required).
  3. Video Caption / Title (Required).
  4. Publish Video to Feed (Save Button).
- **Max 5 Active Videos Restriction**: Live capacity counter (`X / 5`) and client/DB validation.
- **Top Banner Ad Manager**: Add custom dynamic banner ads or remove to keep the top area completely clean.

---

## 🚀 Setup & Firebase Firestore Configuration

This project works **out-of-the-box in Demo Mode** with preloaded royalty-free vertical videos. To connect your live Firebase Firestore database:

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Create a project** (or select an existing one).
3. In the sidebar, navigate to **Firestore Database** -> click **Create database** -> Choose **Start in test mode**.
4. In **Project Settings** (gear icon) -> **General** -> **Your apps**, click the **Web icon (`</>`)** to register a web app.
5. Copy your `firebaseConfig` object and paste it into [`firebase-config.js`](firebase-config.js):

```javascript
const FIREBASE_CONFIG = {
  apiKey: "AIzaSy...",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};
```

### Firestore Security Rules
In your Firebase Console -> Firestore Database -> **Rules** tab, ensure read/write access is enabled:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /videos/{videoId} {
      allow read, write: if true;
    }
    match /settings/{settingId} {
      allow read, write: if true;
    }
  }
}
```

### 📹 Video Upload & Source Options (Zero External APIs Required)
You can provide videos to your feed in two clean ways without any external API keys or billing cards:

1. **Direct Video File Upload**: Select any `.mp4` or `.webm` video from your computer. The video is securely stored directly in your browser's persistent IndexedDB storage with zero external dependencies, zero API errors, and instant playback.
2. **Direct Video URL / Embed Link**: Paste any direct `.mp4` or `.webm` video link (e.g. from any CDN, S3, or direct media hosting).

---

## 🌐 Deploying to GitHub Pages

1. Create a new GitHub repository.
2. Push the files from this directory to the `main` branch.
3. In your GitHub repository:
   - Go to **Settings** -> **Pages**.
   - Under **Build and deployment** -> **Source**, select `Deploy from a branch`.
   - Select `main` branch and `/ (root)` folder.
   - Click **Save**.
4. Your site will be live at `https://<username>.github.io/<repo-name>/`!
