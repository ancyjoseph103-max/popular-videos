/**
 * ============================================================================
 * VERSION 3 (STABLE) — Firebase Firestore Configuration & Data Service
 * Real-time Firestore & Local IndexedDB Video Storage (Zero external APIs)
 * ============================================================================
 */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD5hf9M0rYQ3976bsmGWiIigb4uKOstY4A",
  authDomain: "my-tiktok-ads.firebaseapp.com",
  projectId: "my-tiktok-ads",
  storageBucket: "my-tiktok-ads.firebasestorage.app",
  messagingSenderId: "526884220152",
  appId: "1:526884220152:web:2a6d8514716c858ec2df0d"
};

// Initial Sample Videos (Standard direct HTTPS CDN streams working across all browsers & devices)
const DEFAULT_VIDEOS = [
  {
    id: "sample-video-1",
    title: "Mesmerizing Ocean Waves at Sunset 🌊",
    author: "@jessica.official",
    authorName: "Jessica Miller",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    posterUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
    adLink: "https://www.google.com",
    createdAt: 1710000000000
  },
  {
    id: "sample-video-2",
    title: "High Speed Cyber Action Experience ⚡",
    author: "@jessica.official",
    authorName: "Jessica Miller",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    posterUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80",
    adLink: "https://www.google.com",
    createdAt: 1710000001000
  },
  {
    id: "sample-video-3",
    title: "Epic Wilderness and Forest Adventure 🌲",
    author: "@jessica.official",
    authorName: "Jessica Miller",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    posterUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80",
    adLink: "https://www.google.com",
    createdAt: 1710000002000
  }
];

const DEFAULT_BANNER = {
  html: "",
  popunder: ""
};

class FirebaseDataService {
  constructor() {
    this.isConfigured = FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY_HERE" && FIREBASE_CONFIG.projectId !== "YOUR_PROJECT_ID";
    this.db = null;
    this.videoListeners = [];
    this.bannerListeners = [];

    if (this.isConfigured && typeof firebase !== 'undefined') {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(FIREBASE_CONFIG);
        }
        this.db = firebase.firestore();
        console.log("%c[Firebase] Successfully connected to Cloud Firestore!", "color: #10b981; font-weight: bold;");
      } catch (err) {
        console.warn("[Firebase] Init error, falling back to LocalStorage demo mode:", err);
        this.isConfigured = false;
      }
    } else {
      console.log("%c[Firebase] Running in LocalStorage Demo Mode (Set your FIREBASE_CONFIG in firebase-config.js to enable live Firestore)", "color: #f59e0b; font-weight: bold;");
    }

    // Initialize local storage defaults if needed
    if (!localStorage.getItem("scrolling_website_videos")) {
      localStorage.setItem("scrolling_website_videos", JSON.stringify(DEFAULT_VIDEOS));
    }

    // Clear obsolete hardcoded default banner if present in localStorage
    const cachedBanner = localStorage.getItem("scrolling_website_banner");
    if (cachedBanner && cachedBanner.includes("Special Offer")) {
      localStorage.removeItem("scrolling_website_banner");
    }
  }

  // Subscribe to Videos (Real-time uniform sync across all browsers)
  subscribeVideos(callback) {
    if (this.isConfigured && this.db) {
      const unsubscribe = this.db.collection("videos")
        .onSnapshot((snapshot) => {
          const videos = [];
          snapshot.forEach((doc) => {
            videos.push({ id: doc.id, ...doc.data() });
          });

          // Sort uniformly in JavaScript by createdAt timestamp (handles numbers and ISO date strings)
          videos.sort((a, b) => {
            const timeA = typeof a.createdAt === 'number' ? a.createdAt : (new Date(a.createdAt || 0).getTime() || 0);
            const timeB = typeof b.createdAt === 'number' ? b.createdAt : (new Date(b.createdAt || 0).getTime() || 0);
            return timeB - timeA;
          });

          const activeList = videos.slice(0, 5);
          if (activeList.length > 0) {
            callback(activeList);
          } else {
            // If collection is empty, provide default CDN sample videos so no browser gets an empty screen
            callback(DEFAULT_VIDEOS);
          }
        }, (error) => {
          console.warn("[Firestore] Real-time sync error, falling back to standard CDN videos:", error);
          callback(DEFAULT_VIDEOS);
        });
      return unsubscribe;
    } else {
      // LocalStorage mode
      callback(this.getLocalVideos());
      const handler = () => callback(this.getLocalVideos());
      window.addEventListener('storage', handler);
      return () => window.removeEventListener('storage', handler);
    }
  }

  // Subscribe to Top Banner (Real-time)
  subscribeBanner(callback) {
    if (this.isConfigured && this.db) {
      const unsubscribe = this.db.collection("settings").doc("global_banner")
        .onSnapshot((doc) => {
          if (doc.exists) {
            callback(doc.data());
          } else {
            callback(DEFAULT_BANNER);
          }
        }, (error) => {
          console.error("[Firestore] Error fetching banner:", error);
          callback(this.getLocalBanner());
        });
      return unsubscribe;
    } else {
      callback(this.getLocalBanner());
      const handler = () => callback(this.getLocalBanner());
      window.addEventListener('storage', handler);
      return () => window.removeEventListener('storage', handler);
    }
  }

  // Add a video (Max 5 active videos validation)
  async addVideo(videoData) {
    const currentVideos = await this.getVideosOnce();
    if (currentVideos.length >= 5) {
      throw new Error("Maximum of 5 active videos reached! Please delete a video before adding a new one.");
    }

    const newVideo = {
      title: videoData.title || "Live Video",
      author: videoData.author || "@jessica.official",
      authorName: videoData.authorName || "Jessica Miller",
      videoUrl: videoData.videoUrl.trim(),
      posterUrl: (videoData.posterUrl || '').trim(),
      adLink: videoData.adLink.trim(),
      createdAt: new Date().toISOString()
    };

    if (this.isConfigured && this.db) {
      const docRef = await this.db.collection("videos").add(newVideo);
      return { id: docRef.id, ...newVideo };
    } else {
      const localVideos = this.getLocalVideos();
      newVideo.id = "local-" + Date.now();
      localVideos.unshift(newVideo);
      localStorage.setItem("scrolling_website_videos", JSON.stringify(localVideos));
      window.dispatchEvent(new Event('storage'));
      return newVideo;
    }
  }

  // Delete a video
  async deleteVideo(videoId) {
    // Also clean up any local IndexedDB blob if stored locally
    try {
      const currentVideos = await this.getVideosOnce();
      const target = currentVideos.find(v => v.id === videoId);
      if (target && target.videoUrl && target.videoUrl.startsWith('indexeddb://')) {
        const blobId = target.videoUrl.replace('indexeddb://', '');
        if (window.localVideoStorage) {
          await window.localVideoStorage.deleteVideo(blobId);
        }
      }
    } catch (e) {
      console.warn("Could not clean up local video blob:", e);
    }

    if (this.isConfigured && this.db) {
      await this.db.collection("videos").doc(videoId).delete();
    } else {
      let localVideos = this.getLocalVideos();
      localVideos = localVideos.filter(v => v.id !== videoId);
      localStorage.setItem("scrolling_website_videos", JSON.stringify(localVideos));
      window.dispatchEvent(new Event('storage'));
    }
    return true;
  }

  // Update Top Banner and Popunder
  async updateBanner(bannerHtmlOrObj, popunderScript = '') {
    let htmlVal = '';
    let popunderVal = '';

    if (typeof bannerHtmlOrObj === 'object' && bannerHtmlOrObj !== null) {
      htmlVal = bannerHtmlOrObj.html !== undefined ? bannerHtmlOrObj.html : '';
      popunderVal = bannerHtmlOrObj.popunder !== undefined ? bannerHtmlOrObj.popunder : '';
    } else {
      htmlVal = bannerHtmlOrObj || '';
      popunderVal = popunderScript || '';
    }

    const bannerData = {
      html: htmlVal.trim(),
      popunder: popunderVal.trim(),
      updatedAt: new Date().toISOString()
    };

    if (this.isConfigured && this.db) {
      await this.db.collection("settings").doc("global_banner").set(bannerData, { merge: true });
    } else {
      localStorage.setItem("scrolling_website_banner", JSON.stringify(bannerData));
      window.dispatchEvent(new Event('storage'));
    }
    return bannerData;
  }

  // Helper: Update Popunder script directly
  async updatePopunder(popunderScript) {
    const current = this.getLocalBanner();
    return this.updateBanner(current.html || '', popunderScript);
  }

  // Helper getters
  async getVideosOnce() {
    if (this.isConfigured && this.db) {
      try {
        const snapshot = await this.db.collection("videos").get();
        const list = [];
        snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        list.sort((a, b) => {
          const timeA = typeof a.createdAt === 'number' ? a.createdAt : (new Date(a.createdAt || 0).getTime() || 0);
          const timeB = typeof b.createdAt === 'number' ? b.createdAt : (new Date(b.createdAt || 0).getTime() || 0);
          return timeB - timeA;
        });
        return list;
      } catch (err) {
        console.warn("[Firestore] Error in getVideosOnce, returning defaults:", err);
        return DEFAULT_VIDEOS;
      }
    }
    return this.getLocalVideos();
  }

  getLocalVideos() {
    try {
      const raw = localStorage.getItem("scrolling_website_videos");
      return raw ? JSON.parse(raw) : DEFAULT_VIDEOS;
    } catch (e) {
      return DEFAULT_VIDEOS;
    }
  }

  getLocalBanner() {
    try {
      const raw = localStorage.getItem("scrolling_website_banner");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.html && parsed.html.includes("Special Offer")) {
          parsed.html = "";
          localStorage.setItem("scrolling_website_banner", JSON.stringify(parsed));
        }
        return {
          html: (parsed && parsed.html) ? parsed.html : "",
          popunder: (parsed && parsed.popunder) ? parsed.popunder : ""
        };
      }
      return DEFAULT_BANNER;
    } catch (e) {
      return DEFAULT_BANNER;
    }
  }
}

// Local Video IndexedDB Storage Helper (for direct file uploads without external APIs)
window.localVideoStorage = {
  dbName: 'ReelsHubVideoDB',
  storeName: 'videos',
  _db: null,

  async getDB() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => {
        this._db = req.result;
        resolve(this._db);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async saveVideo(id, blob) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).put({ id, blob });
      tx.oncomplete = () => resolve(id);
      tx.onerror = () => reject(tx.error);
    });
  },

  async getVideo(id) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const req = tx.objectStore(this.storeName).get(id);
      req.onsuccess = () => resolve(req.result ? req.result.blob : null);
      req.onerror = () => reject(req.error);
    });
  },

  async deleteVideo(id) {
    try {
      const db = await this.getDB();
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).delete(id);
    } catch (e) {
      console.warn("IndexedDB delete error:", e);
    }
  },

  async resolveVideoUrl(url) {
    if (url && url.startsWith('indexeddb://')) {
      const id = url.replace('indexeddb://', '');
      const blob = await this.getVideo(id);
      if (blob) {
        return URL.createObjectURL(blob);
      }
    }
    return url;
  }
};

// Global instance
window.dataService = new FirebaseDataService();

