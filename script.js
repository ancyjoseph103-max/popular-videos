/**
 * ============================================================================
 * VERSION 3 (STABLE) - TikTok / Reels Vertical Video Feed Controller
 * Upgraded TikTok-Style Interface with Profile Avatar, Action Sidebar,
 * Dynamic Aspect Ratio (9:16 & 16:9), 10-Second Ad Verification Gate,
 * Snap Scrolling, and Middle Up/Down Arrows
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  const feedContainer = document.getElementById('feed-container');
  const topBannerContainer = document.getElementById('top-banner-container');
  const topBannerInner = document.getElementById('top-banner-inner');
  const soundToggleBtn = document.getElementById('sound-toggle-btn');
  const soundIcon = document.getElementById('sound-icon');
  const adminShortcutBtn = document.getElementById('admin-shortcut-btn');
  const topBrandHeader = document.querySelector('.top-brand-header');

  let currentVideos = [];
  let isGlobalMuted = false;
  let activeCardObserver = null;
  let countdownTimers = new Map(); // cardId -> intervalId

  // Secret Admin Access (Hidden from ordinary visitors by default)
  function revealAdminAccess(showToast = true) {
    if (adminShortcutBtn) {
      adminShortcutBtn.style.display = 'flex';
      adminShortcutBtn.classList.add('show-admin');
    }
    sessionStorage.setItem('admin_access', 'true');
    if (showToast) {
      showFloatingToast("Admin Settings Access Unlocked ⚙️");
    }
  }

  // 1. Secret URL Parameter (e.g., ?admin=true, ?admin=1, ?secret=123)
  const urlParams = new URLSearchParams(window.location.search);
  if (
    urlParams.get('admin') === 'true' ||
    urlParams.get('admin') === '1' ||
    urlParams.get('secret') === '123' ||
    sessionStorage.getItem('admin_access') === 'true'
  ) {
    revealAdminAccess(false);
  }

  // 2. Keyboard shortcut: Ctrl+Shift+A (or Cmd+Shift+A)
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      revealAdminAccess(true);
    }
  });

  // 3. Mobile shortcut: Triple-tap on top brand header ("Popular Live Videos")
  if (topBrandHeader) {
    let tapCount = 0;
    let tapTimer = null;
    topBrandHeader.addEventListener('click', () => {
      tapCount++;
      clearTimeout(tapTimer);
      if (tapCount >= 3) {
        revealAdminAccess(true);
        tapCount = 0;
      } else {
        tapTimer = setTimeout(() => {
          tapCount = 0;
        }, 500);
      }
    });
  }

  // ==========================================================================
  // AD INJECTION ENGINE (Dynamic Script Execution & Popunder Support)
  // ==========================================================================

  /**
   * Dynamically execute <script> elements sequentially to guarantee proper evaluation order
   * (e.g., Adsterra atOptions config object MUST execute before invoke.js loads)
   */
  function executeScriptsSequentially(scripts, targetContainer) {
    if (!scripts || scripts.length === 0) return;

    let chain = Promise.resolve();

    scripts.forEach((oldScript) => {
      chain = chain.then(() => {
        return new Promise((resolve) => {
          const newScript = document.createElement('script');
          newScript.dataset.adInjected = 'banner';

          // Copy all attributes (src, type, async, id, class, data-*, etc.)
          for (let i = 0; i < oldScript.attributes.length; i++) {
            const attr = oldScript.attributes[i];
            newScript.setAttribute(attr.name, attr.value);
          }

          // Safe polyfill for document.write during ad evaluation to prevent wiping the page
          const origWrite = document.write;
          const origWriteln = document.writeln;
          document.write = function(html) {
            const temp = document.createElement('div');
            temp.innerHTML = html;
            while (temp.firstChild) {
              targetContainer.appendChild(temp.firstChild);
            }
          };
          document.writeln = function(html) {
            document.write(html + '\n');
          };

          const restoreDocWrite = () => {
            document.write = origWrite;
            document.writeln = origWriteln;
          };

          if (oldScript.src) {
            newScript.async = false; // Preserve execution order for external scripts
            newScript.onload = () => {
              restoreDocWrite();
              resolve();
            };
            newScript.onerror = (err) => {
              console.warn('[Ad Engine] External banner script failed to load:', oldScript.src, err);
              restoreDocWrite();
              resolve(); // Continue chain on error
            };
            targetContainer.appendChild(newScript);
          } else {
            // Inline script (e.g., atOptions = { ... })
            newScript.textContent = oldScript.textContent || oldScript.innerText || '';
            targetContainer.appendChild(newScript);
            restoreDocWrite();
            resolve();
          }
        });
      });
    });
  }

  /**
   * Injects Top Banner Advertisement with Dynamic Script Execution & Responsive Container
   */
  function injectBannerAd(rawBannerCode) {
    if (!topBannerInner || !topBannerContainer) return;

    // Clean up previous banner injected scripts & content
    document.querySelectorAll('script[data-ad-injected="banner"]').forEach(el => el.remove());
    topBannerInner.innerHTML = '';

    if (!rawBannerCode || typeof rawBannerCode !== 'string') {
      topBannerContainer.style.display = 'none';
      return;
    }

    const trimmed = rawBannerCode.trim();
    if (!trimmed || trimmed.includes("Special Offer")) {
      topBannerContainer.style.display = 'none';
      return;
    }

    // Parse snippet safely with DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmed, 'text/html');

    // Detect if this is purely a popunder snippet mistakenly placed in the banner input
    const visualNodes = doc.body.querySelectorAll('div, a, img, p, span, iframe, table, section, form, header');
    const scripts = Array.from(doc.querySelectorAll('script'));
    const isOnlyScripts = scripts.length > 0 && visualNodes.length === 0 && !doc.body.textContent.trim();
    const isLikelyPopunder = isOnlyScripts && (
      trimmed.includes('profitablegatecpm.com') ||
      trimmed.includes('popunder') ||
      trimmed.includes('pl1')
    );

    if (isLikelyPopunder) {
      injectPopunderScript(trimmed);
      topBannerContainer.style.display = 'none';
      return;
    }

    // 1. Inject non-script HTML elements into a responsive centered wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'banner-ad-content';

    Array.from(doc.body.childNodes).forEach(node => {
      if (node.nodeName.toLowerCase() !== 'script') {
        contentWrapper.appendChild(node.cloneNode(true));
      }
    });

    if (contentWrapper.childNodes.length > 0 && contentWrapper.innerHTML.trim()) {
      topBannerInner.appendChild(contentWrapper);
    }

    // Make container visible so scripts can measure layout dimensions
    topBannerContainer.style.display = 'flex';

    // 2. Execute script tags dynamically inside topBannerInner
    // (So document.currentScript.parentNode points inside topBannerInner for iframes)
    if (scripts.length > 0) {
      executeScriptsSequentially(scripts, topBannerInner);
    }
  }

  /**
   * Injects Global Popunder / Popup Scripts directly into document.body / document.head
   * so on-click full-page popunders fire reliably across the entire application
   */
  function injectPopunderScript(rawPopunderCode) {
    if (!rawPopunderCode || typeof rawPopunderCode !== 'string') return;
    const trimmed = rawPopunderCode.trim();
    if (!trimmed) return;

    // Clean up previous popunder scripts to prevent duplicate triggers
    document.querySelectorAll('script[data-ad-injected="popunder"]').forEach(el => el.remove());

    const targetParent = document.body || document.head;

    // Check if it contains <script> tags or is raw JS / URL
    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmed, 'text/html');
    const scripts = Array.from(doc.querySelectorAll('script'));

    if (scripts.length > 0) {
      scripts.forEach((s) => {
        const scriptEl = document.createElement('script');
        scriptEl.dataset.adInjected = 'popunder';

        for (let i = 0; i < s.attributes.length; i++) {
          const attr = s.attributes[i];
          scriptEl.setAttribute(attr.name, attr.value);
        }

        if (s.src) {
          scriptEl.async = true;
        } else {
          scriptEl.textContent = s.textContent || s.innerText || '';
        }

        targetParent.appendChild(scriptEl);
      });
    } else {
      // Direct JS or URL snippet
      const scriptEl = document.createElement('script');
      scriptEl.dataset.adInjected = 'popunder';
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//')) {
        scriptEl.src = trimmed;
        scriptEl.type = 'text/javascript';
        scriptEl.async = true;
      } else {
        scriptEl.textContent = trimmed;
      }
      targetParent.appendChild(scriptEl);
    }
  }

  // 1. Initialize Real-Time Top Banner Ad & Global Popunder (Dynamic Execution)
  if (window.dataService) {
    window.dataService.subscribeBanner((bannerData) => {
      const bannerHtml = (bannerData && bannerData.html) ? bannerData.html : '';
      const popunderScript = (bannerData && bannerData.popunder) ? bannerData.popunder : '';

      injectBannerAd(bannerHtml);
      injectPopunderScript(popunderScript);
    });

    // 2. Initialize Real-Time Video List
    window.dataService.subscribeVideos((videos) => {
      currentVideos = videos || [];
      renderFeed(currentVideos);
    });
  }

  // 3. Render Video Feed Cards
  function renderFeed(videos) {
    // Clear any running timers before re-rendering
    countdownTimers.forEach((timerId) => clearInterval(timerId));
    countdownTimers.clear();

    if (videos.length === 0) {
      feedContainer.innerHTML = `
        <div class="feed-empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#fe2c55" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
          <h3>No Videos Added Yet</h3>
          <p>Head to the Admin Dashboard to add your first vertical video and ad links!</p>
          <a href="rifat.html" class="btn-primary">
            <span>Go to Admin Dashboard</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      `;
      return;
    }

    feedContainer.innerHTML = '';

    videos.forEach((video, index) => {
      const card = createVideoCard(video, index);
      feedContainer.appendChild(card);
    });

    setupIntersectionObserver();
  }

  // 4. Create Individual Video Snap Card (TikTok UI Redesign)
  function createVideoCard(video, index) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.id = `video-card-${video.id || index}`;
    card.dataset.videoId = video.id;
    card.dataset.adLink = video.adLink || 'https://google.com';

    // Handle realistic female profile identity: Jessica Miller / @jessica.official
    const authorHandle = (video.author && video.author !== '@creator') ? video.author : '@jessica.official';
    const authorName = (video.authorName && video.authorName !== 'Creator') ? video.authorName : 'Jessica Miller';
    const safeAuthor = escapeHtml(authorHandle);
    const safeAuthorName = escapeHtml(authorName);

    // Reliable high-quality USA female profile photo
    const avatarPhotoUrl = video.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&crop=faces&q=80';

    // Display only clean title/caption text entered from admin form (strip any hardcoded tags #fyp #viral #trending #reels)
    const cleanTitle = (video.title || 'Exclusive Live Video')
      .replace(/#(fyp|viral|trending|reels)\b/gi, '')
      .trim();
    const safeTitle = escapeHtml(cleanTitle);

    // Vibrant gradients for spinning disc center
    const gradients = [
      ['fe2c55', 'ff6b81'],
      ['25f4ee', '00b4d8'],
      ['6366f1', 'a855f7'],
      ['ec4899', 'f43f5e'],
      ['10b981', '059669'],
      ['f59e0b', 'd97706']
    ];
    const [c1, c2] = gradients[index % gradients.length];

    const likeVal = formatTikTokCount((18 + (index * 13)) * 1420);
    const commentVal = formatTikTokCount((4 + (index * 3)) * 410 + 95);
    const shareVal = formatTikTokCount((2 + (index * 2)) * 185 + 40);

    // First frame preview nudge
    let videoSrc = video.videoUrl || '';
    if (videoSrc && !videoSrc.includes('#') && !videoSrc.startsWith('indexeddb://')) {
      videoSrc += '#t=0.001';
    }
    const posterUrl = video.posterUrl || video.coverUrl || '';
    const posterAttr = posterUrl ? `poster="${escapeHtml(posterUrl)}"` : '';

    card.innerHTML = `
      <!-- Centered Video Wrapper with Dynamic Aspect Ratio Support (9:16 & 16:9) -->
      <div class="video-wrapper">
        <video 
          class="video-player" 
          src="${escapeHtml(videoSrc)}"
          ${posterAttr}
          playsinline 
          loop
          preload="auto"
        ></video>
      </div>

      <!-- Bottom Gradient Scrim for Enhanced Text Contrast -->
      <div class="video-scrim-bottom"></div>

      <!-- Video Progress Bar -->
      <div class="video-progress-bar">
        <div class="progress-fill"></div>
      </div>

      <!-- TikTok Bottom Metadata Overlay (Username, Caption, Sound Ticker) -->
      <div class="video-meta-overlay">
        <div class="video-author">
          <span class="author-name">${safeAuthorName}</span>
          <span class="author-handle">${safeAuthor}</span>
          <svg class="verified-badge" viewBox="0 0 24 24" title="Verified Creator"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          <button class="follow-pill-btn" type="button" aria-label="Follow Creator">Follow</button>
        </div>
        <div class="video-caption">
          <span>${safeTitle}</span>
        </div>
        <div class="video-soundtrack">
          <svg class="sound-note-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
          <div class="soundtrack-marquee">
            <span>Original Sound — ${safeAuthorName} • Popular Live Audio • Original Sound — ${safeAuthorName} • </span>
          </div>
        </div>
      </div>

      <!-- TikTok Right-Side Action Bar (Vertical Overlay) -->
      <div class="video-actions-sidebar">
        <!-- 1. Profile Avatar with "+" Follow Badge -->
        <div class="action-item avatar-action-item">
          <div class="profile-avatar-wrapper">
            <div class="profile-avatar-img">
              <img 
                src="${avatarPhotoUrl}" 
                alt="${safeAuthorName}" 
                class="avatar-photo" 
                loading="lazy" 
                onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&crop=faces&q=80';"
              />
            </div>
            <button class="avatar-follow-badge" aria-label="Follow Creator">
              <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            </button>
          </div>
        </div>

        <!-- 2. Like Button (Heart + Count) -->
        <div class="action-item">
          <button class="action-btn like-btn" aria-label="Like Video">
            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </button>
          <span class="action-count like-count">${likeVal}</span>
        </div>

        <!-- 3. Comment Button (Speech Bubble + Count) -->
        <div class="action-item">
          <button class="action-btn comment-btn" aria-label="View Comments">
            <svg viewBox="0 0 24 24"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
          </button>
          <span class="action-count comment-count">${commentVal}</span>
        </div>

        <!-- 4. Share Button (Forward Arrow + Count) -->
        <div class="action-item">
          <button class="action-btn share-btn" aria-label="Share Video">
            <svg viewBox="0 0 24 24">
              <path d="M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z"/>
            </svg>
          </button>
          <span class="action-count share-count">${shareVal}</span>
        </div>

        <!-- 5. Spinning Vinyl Disc -->
        <div class="vinyl-disc" title="Original Sound Track">
          <div class="vinyl-center-art" style="background: linear-gradient(135deg, #${c1}, #${c2});">
            <span>♫</span>
          </div>
          <div class="music-note-float note-1">♪</div>
          <div class="music-note-float note-2">♫</div>
        </div>
      </div>

      <!-- Lock & 10-Second Ad Countdown Overlay -->
      <div class="video-overlay" id="overlay-${card.id}">
        <!-- Initial Locked View with Play Button -->
        <div class="overlay-locked-view">
          <div class="play-glow-ring" title="Click to unlock video">
            <div class="play-btn-circle">
              <svg class="play-icon-svg" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
          <h2 class="overlay-title">${safeTitle}</h2>
          <p class="overlay-subtitle">Click Play to unlock this video and open the sponsor link in a new tab.</p>
          <div class="overlay-ad-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            <span>Sponsor Supported</span>
          </div>
        </div>

        <!-- 10-Second Verification Countdown View -->
        <div class="overlay-countdown-view">
          <div class="countdown-timer-circle">
            <svg class="timer-svg" viewBox="0 0 120 120">
              <defs>
                <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#fe2c55"/>
                  <stop offset="50%" stop-color="#a855f7"/>
                  <stop offset="100%" stop-color="#25f4ee"/>
                </linearGradient>
              </defs>
              <circle class="timer-bg-stroke" cx="60" cy="60" r="54"></circle>
              <circle class="timer-active-stroke" cx="60" cy="60" r="54"></circle>
            </svg>
            <span class="countdown-number">10</span>
          </div>
          <div class="countdown-msg">Verifying sponsor visit... Video unlocks in 10s</div>
          <div class="countdown-warning-badge" style="display: none;">
            ⚠️ Please wait full 10 seconds on the sponsor page to unlock.
          </div>
          <p class="countdown-desc">Your video will automatically unlock and play as soon as the sponsor verification timer completes.</p>
          <button class="reopen-ad-btn" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            <span>Re-open Sponsor Link</span>
          </button>
        </div>
      </div>
    `;

    // If videoUrl is indexeddb://, resolve the blob to an Object URL
    const videoPlayerEl = card.querySelector('.video-player');
    if (video.videoUrl && video.videoUrl.startsWith('indexeddb://') && window.localVideoStorage) {
      window.localVideoStorage.resolveVideoUrl(video.videoUrl).then((resolved) => {
        if (resolved && videoPlayerEl) {
          videoPlayerEl.src = resolved;
          videoPlayerEl.load();
        }
      });
    }

    // Wire up events for this card
    attachCardEventListeners(card, video);

    return card;
  }

  // 5. Card Event Listeners (Play, Ad Open, 15s Countdown, Double-tap Like, Follow, Comments, Share)
  function attachCardEventListeners(card, video) {
    const videoElem = card.querySelector('.video-player');
    const overlay = card.querySelector('.video-overlay');
    const lockedView = card.querySelector('.overlay-locked-view');
    const countdownView = card.querySelector('.overlay-countdown-view');
    const playRing = card.querySelector('.play-glow-ring');
    const countdownNum = card.querySelector('.countdown-number');
    const countdownMsg = card.querySelector('.countdown-msg');
    const warningBadge = card.querySelector('.countdown-warning-badge');
    const activeStroke = card.querySelector('.timer-active-stroke');
    const reopenAdBtn = card.querySelector('.reopen-ad-btn');
    const progressFill = card.querySelector('.progress-fill');
    const likeBtn = card.querySelector('.like-btn');
    const likeCount = card.querySelector('.like-count');
    const commentBtn = card.querySelector('.comment-btn');
    const shareBtn = card.querySelector('.share-btn');
    const vinylDisc = card.querySelector('.vinyl-disc');
    const followBadge = card.querySelector('.avatar-follow-badge');
    const followPill = card.querySelector('.follow-pill-btn');

    const circumference = 2 * Math.PI * 54; // r=54 -> ~339.29
    const authorHandle = (video.author && video.author !== '@creator') ? video.author : '@jessica.official';
    const authorName = (video.authorName && video.authorName !== 'Creator') ? video.authorName : 'Jessica Miller';
    const safeAuthor = escapeHtml(authorHandle);
    const safeAuthorName = escapeHtml(authorName);

    // Track state on card element
    card.isUnlocked = false;

    // Force browser to decode and paint first frame immediately
    videoElem.addEventListener('loadedmetadata', () => {
      if (videoElem.currentTime === 0) {
        try {
          videoElem.currentTime = 0.001;
        } catch (e) {}
      }
    }, { once: true });

    // Helper: Open the specific ad link in a new tab
    function triggerAdLink() {
      const targetUrl = video.adLink || 'https://google.com';
      try {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      } catch (e) {
        console.warn('Popup blocked or error opening ad link:', e);
      }
    }

    // Play Button Click Handler:
    // 1. Immediately open ad link in new tab
    // 2. Start strict 10-second background verification timer on main tab
    // 3. Strict Early-Return Prevention: if user returns before 10s, keep video locked
    // 4. Auto play video ONLY when full 10-second timer hits 0
    playRing.addEventListener('click', (e) => {
      e.stopPropagation();

      // Step 1: Immediately open Ad Link in new tab
      triggerAdLink();

      // Step 2: Switch overlay to active 10s countdown view
      overlay.classList.add('countdown-active');
      lockedView.style.display = 'none';
      countdownView.style.display = 'flex';
      if (warningBadge) warningBadge.style.display = 'none';

      const TOTAL_SECONDS = 10;
      const startTime = Date.now();
      const targetEndTime = startTime + (TOTAL_SECONDS * 1000);

      countdownNum.textContent = TOTAL_SECONDS;
      countdownMsg.textContent = `Verifying sponsor visit... Video unlocks in ${TOTAL_SECONDS}s`;
      activeStroke.style.strokeDasharray = `${circumference}`;
      activeStroke.style.strokeDashoffset = '0';

      // Clear existing timer on this card if any
      if (countdownTimers.has(card.id)) {
        clearInterval(countdownTimers.get(card.id));
      }

      let cleanupTabListeners = null;

      function unlockVideo() {
        if (card.isUnlocked) return;
        card.isUnlocked = true;

        if (cleanupTabListeners) cleanupTabListeners();

        // Step 3: Completely remove/hide overlay and guarantee autoplay
        overlay.classList.remove('countdown-active');
        overlay.classList.add('unlocked');
        overlay.style.display = 'none';

        // Guaranteed playback with audio handling
        videoElem.muted = isGlobalMuted;
        const playPromise = videoElem.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            vinylDisc.classList.add('playing');
          }).catch((err) => {
            console.warn("Autoplay with audio blocked by browser policy, falling back to muted play:", err);
            videoElem.muted = true;
            videoElem.play().then(() => {
              vinylDisc.classList.add('playing');
              showFloatingToast("Playing muted. Tap sound icon 🔇 to unmute 🔊");
            }).catch((finalErr) => {
              console.error("Playback failed completely:", finalErr);
            });
          });
        }
      }

      function updateCountdown() {
        if (card.isUnlocked) return;
        const now = Date.now();
        const remainingMs = targetEndTime - now;
        const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

        if (remainingSec > 0) {
          countdownNum.textContent = remainingSec;
          countdownMsg.textContent = `Verifying sponsor visit... Video unlocks in ${remainingSec}s`;
          const elapsedFraction = (TOTAL_SECONDS - (remainingMs / 1000)) / TOTAL_SECONDS;
          activeStroke.style.strokeDashoffset = `${circumference * Math.min(1, Math.max(0, elapsedFraction))}`;
        } else {
          // Full 10 seconds have elapsed: Unlock video!
          clearInterval(timerId);
          countdownTimers.delete(card.id);
          countdownNum.textContent = '0';
          activeStroke.style.strokeDashoffset = `${circumference}`;
          unlockVideo();
        }
      }

      // High-precision interval checking every 250ms
      const timerId = setInterval(updateCountdown, 250);
      countdownTimers.set(card.id, timerId);

      // Strict Early-Return Prevention:
      // If user switches back to this tab before the full 10 seconds, keep video locked
      const handleTabReturn = () => {
        if (card.isUnlocked) return;
        const now = Date.now();
        const remainingMs = targetEndTime - now;
        const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

        if (remainingSec > 0) {
          // User returned early: keep locked and show alert badge
          if (warningBadge) {
            warningBadge.style.display = 'inline-flex';
            warningBadge.textContent = `⚠️ Please wait full 10 seconds on the sponsor page to unlock (${remainingSec}s remaining).`;
          }
          updateCountdown();
        } else {
          // Time completed while in background tab: unlock now
          clearInterval(timerId);
          countdownTimers.delete(card.id);
          unlockVideo();
        }
      };

      document.addEventListener('visibilitychange', handleTabReturn);
      window.addEventListener('focus', handleTabReturn);

      cleanupTabListeners = () => {
        document.removeEventListener('visibilitychange', handleTabReturn);
        window.removeEventListener('focus', handleTabReturn);
      };
    });

    // Reopen Ad button in countdown view
    reopenAdBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerAdLink();
    });

    // Video progress update
    videoElem.addEventListener('timeupdate', () => {
      if (videoElem.duration) {
        const pct = (videoElem.currentTime / videoElem.duration) * 100;
        progressFill.style.width = `${pct}%`;
      }
    });

    // Video click to pause/play when unlocked
    videoElem.addEventListener('click', () => {
      if (!card.isUnlocked) return;
      if (videoElem.paused) {
        videoElem.play();
        vinylDisc.classList.add('playing');
      } else {
        videoElem.pause();
        vinylDisc.classList.remove('playing');
      }
    });

    // Avatar Follow button toggle
    const handleFollowToggle = (e) => {
      e.stopPropagation();
      const isFollowed = followBadge.classList.toggle('followed');
      if (isFollowed) {
        followBadge.innerHTML = `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
        if (followPill) {
          followPill.textContent = 'Following';
          followPill.classList.add('active');
        }
        showFloatingToast(`Following ${safeAuthorName} (${safeAuthor})! 🎉`);
      } else {
        followBadge.innerHTML = `<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`;
        if (followPill) {
          followPill.textContent = 'Follow';
          followPill.classList.remove('active');
        }
      }
    };
    if (followBadge) followBadge.addEventListener('click', handleFollowToggle);
    if (followPill) followPill.addEventListener('click', handleFollowToggle);

    // Like button toggle
    likeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      likeBtn.classList.toggle('liked');
      if (likeBtn.classList.contains('liked')) {
        showFloatingToast("Added to Liked Videos ❤️");
      }
    });

    // Comment button click
    if (commentBtn) {
      commentBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showFloatingToast(`💬 Comments: "Obsessed with this short! 🔥"`);
      });
    }

    // Share button
    shareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentUrl = window.location.href;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(currentUrl).then(() => {
          showFloatingToast("Link copied to clipboard! 📋");
        }).catch(() => {
          showFloatingToast("Share this video with friends!");
        });
      } else {
        showFloatingToast("Share this video with friends!");
      }
    });

    // Double tap to like on video
    let lastTap = 0;
    card.addEventListener('touchend', (e) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;
      if (tapLength < 300 && tapLength > 0) {
        spawnFloatingHeart(e.changedTouches[0].clientX, e.changedTouches[0].clientY, card);
        if (!likeBtn.classList.contains('liked')) {
          likeBtn.classList.add('liked');
        }
      }
      lastTap = currentTime;
    });

    card.addEventListener('dblclick', (e) => {
      spawnFloatingHeart(e.clientX, e.clientY, card);
      if (!likeBtn.classList.contains('liked')) {
        likeBtn.classList.add('liked');
      }
    });
  }

  // 6. Setup Intersection Observer for Vertical Snap Scrolling
  // When user scrolls away from a video: pauses video
  // When user lands on a video: checks if unlocked, if not, requires play/countdown/ad
  function setupIntersectionObserver() {
    if (activeCardObserver) {
      activeCardObserver.disconnect();
    }

    const cards = document.querySelectorAll('.video-card');

    activeCardObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const card = entry.target;
        const video = card.querySelector('.video-player');
        const vinylDisc = card.querySelector('.vinyl-disc');

        if (entry.isIntersecting && entry.intersectionRatio >= 0.75) {
          // Card has entered the viewport
          if (card.isUnlocked) {
            video.muted = isGlobalMuted;
            video.play().then(() => {
              vinylDisc.classList.add('playing');
            }).catch(() => {});
          } else {
            // Video is still locked, ensure it remains paused
            video.pause();
            vinylDisc.classList.remove('playing');
          }
        } else {
          // Card left the viewport: immediately pause
          video.pause();
          vinylDisc.classList.remove('playing');

          // Reset lock & countdown cycle if not yet fully unlocked
          if (!card.isUnlocked) {
            if (countdownTimers.has(card.id)) {
              clearInterval(countdownTimers.get(card.id));
              countdownTimers.delete(card.id);
            }
            const overlay = card.querySelector('.video-overlay');
            const lockedView = card.querySelector('.overlay-locked-view');
            const countdownView = card.querySelector('.overlay-countdown-view');
            const countdownNum = card.querySelector('.countdown-number');
            const activeStroke = card.querySelector('.timer-active-stroke');

            if (overlay && lockedView && countdownView) {
              overlay.classList.remove('countdown-active');
              overlay.classList.remove('unlocked');
              overlay.style.display = 'flex';
              lockedView.style.display = 'flex';
              countdownView.style.display = 'none';
              if (countdownNum) countdownNum.textContent = '15';
              if (activeStroke) activeStroke.style.strokeDashoffset = '0';
            }
          }
        }
      });
    }, {
      root: feedContainer,
      threshold: [0.2, 0.75]
    });

    cards.forEach((card) => activeCardObserver.observe(card));
  }

  // 7. Global Sound Toggle Controller
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      isGlobalMuted = !isGlobalMuted;
      document.querySelectorAll('.video-player').forEach((v) => {
        v.muted = isGlobalMuted;
      });

      if (isGlobalMuted) {
        soundIcon.innerHTML = `
          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
        `;
        showFloatingToast("Sound Muted 🔇");
      } else {
        soundIcon.innerHTML = `
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        `;
        showFloatingToast("Sound Unmuted 🔊");
      }
    });
  }

  // Helper: Double Tap Floating Heart
  function spawnFloatingHeart(clientX, clientY, container) {
    const heart = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    heart.setAttribute("viewBox", "0 0 24 24");
    heart.classList.add("floating-heart");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z");
    heart.appendChild(path);

    const rect = container.getBoundingClientRect();
    heart.style.left = `${clientX - rect.left}px`;
    heart.style.top = `${clientY - rect.top}px`;

    container.appendChild(heart);
    setTimeout(() => heart.remove(), 800);
  }

  // Helper: Toast Message
  function showFloatingToast(msg) {
    const existing = document.querySelector('.floating-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'floating-toast';
    toast.textContent = msg;
    toast.style.cssText = `
      position: fixed;
      bottom: 60px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.9);
      color: #fff;
      padding: 8px 18px;
      border-radius: 9999px;
      border: 1px solid rgba(255,255,255,0.2);
      font-size: 13px;
      font-weight: 600;
      z-index: 200;
      backdrop-filter: blur(10px);
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      animation: fadeIn 0.25s ease;
      pointer-events: none;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // 4. Middle Up/Down Video Navigation Arrows Support
  const navArrowUp = document.getElementById('nav-arrow-up');
  const navArrowDown = document.getElementById('nav-arrow-down');

  function getCardHeight() {
    const firstCard = feedContainer.querySelector('.video-card');
    return firstCard ? firstCard.clientHeight : (feedContainer.clientHeight || window.innerHeight);
  }

  function scrollToPrevVideo() {
    const cards = Array.from(feedContainer.querySelectorAll('.video-card'));
    if (!cards.length) return;
    const cardHeight = getCardHeight();
    const currentIndex = Math.round(feedContainer.scrollTop / cardHeight);
    const prevIndex = Math.max(0, currentIndex - 1);

    if (cards[prevIndex]) {
      cards[prevIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      feedContainer.scrollBy({ top: -cardHeight, behavior: 'smooth' });
    }
  }

  function scrollToNextVideo() {
    const cards = Array.from(feedContainer.querySelectorAll('.video-card'));
    if (!cards.length) return;
    const cardHeight = getCardHeight();
    const currentIndex = Math.round(feedContainer.scrollTop / cardHeight);
    const nextIndex = Math.min(cards.length - 1, currentIndex + 1);

    if (cards[nextIndex]) {
      cards[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      feedContainer.scrollBy({ top: cardHeight, behavior: 'smooth' });
    }
  }

  if (navArrowUp) {
    navArrowUp.addEventListener('click', (e) => {
      e.stopPropagation();
      scrollToPrevVideo();
    });
  }

  if (navArrowDown) {
    navArrowDown.addEventListener('click', (e) => {
      e.stopPropagation();
      scrollToNextVideo();
    });
  }

  // Keyboard navigation support
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      scrollToNextVideo();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      scrollToPrevVideo();
    }
  });

  // Helper: Format numbers to TikTok format (e.g. 24.5K, 1.2M)
  function formatTikTokCount(num) {
    if (!num || isNaN(num)) return '1.2K';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  }

  // Helper: Escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
