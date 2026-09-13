/**
 * Admin Dashboard Controller
 * Real-time Firestore / Local Storage Create, Read, Delete with 5-Video Max Limit Enforcement
 * & Direct Video File Upload without external APIs
 */

document.addEventListener('DOMContentLoaded', () => {
  // Navigation & Status Elements
  const activeCountBadge = document.getElementById('active-count-badge');
  const statActiveVideos = document.getElementById('stat-active-videos');
  const statBannerStatus = document.getElementById('stat-banner-status');
  const statPopunderStatus = document.getElementById('stat-popunder-status');
  const connectionStatus = document.getElementById('connection-status');
  const statusText = document.getElementById('status-text');

  // Video Form Elements (4 Essential Controls Only)
  const addVideoForm = document.getElementById('add-video-form');
  const videoFileInput = document.getElementById('video-file-input');
  const fileSelectedBadge = document.getElementById('file-selected-badge');
  const fileSelectedName = document.getElementById('file-selected-name');
  const videoUrlInput = document.getElementById('video-url-input');
  const adLinkInput = document.getElementById('ad-link-input');
  const videoTitleInput = document.getElementById('video-title-input');
  const submitVideoBtn = document.getElementById('submit-video-btn');
  const limitAlert = document.getElementById('limit-alert');
  const videoListContainer = document.getElementById('video-list-container');

  // Ad Network Form Elements (Banner & Popunder)
  const bannerForm = document.getElementById('banner-form');
  const bannerHtmlInput = document.getElementById('banner-html-input');
  const bannerPreviewContent = document.getElementById('banner-preview-content');
  const popunderScriptInput = document.getElementById('popunder-script-input');
  const clearBannerBtn = document.getElementById('clear-banner-btn');
  const clearPopunderBtn = document.getElementById('clear-popunder-btn');

  let activeVideos = [];
  const MAX_ACTIVE_VIDEOS = 5;

  // 1. Handle File Selection
  if (videoFileInput) {
    videoFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) {
        if (fileSelectedBadge) fileSelectedBadge.style.display = 'none';
        return;
      }

      if (activeVideos.length >= MAX_ACTIVE_VIDEOS) {
        showAdminToast(`Maximum limit of ${MAX_ACTIVE_VIDEOS} active videos reached! Please delete a video first.`);
        videoFileInput.value = '';
        if (fileSelectedBadge) fileSelectedBadge.style.display = 'none';
        return;
      }

      // Display file badge
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      if (fileSelectedBadge && fileSelectedName) {
        fileSelectedName.textContent = `📁 ${file.name} (${sizeMb} MB) selected`;
        fileSelectedBadge.style.display = 'block';
      }

      // Auto-suggest title if empty
      if (videoTitleInput && !videoTitleInput.value.trim()) {
        const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        videoTitleInput.value = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
      }

      // Clear the direct URL input to avoid confusion
      if (videoUrlInput) {
        videoUrlInput.value = '';
      }
    });
  }

  // Clear file input when typing a direct URL
  if (videoUrlInput) {
    videoUrlInput.addEventListener('input', () => {
      if (videoUrlInput.value.trim()) {
        if (videoFileInput) videoFileInput.value = '';
        if (fileSelectedBadge) fileSelectedBadge.style.display = 'none';
      }
    });
  }

  // Quick Preset Chips for instant 1-click video URL injection
  document.querySelectorAll('.preset-chip-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const url = btn.getAttribute('data-url');
      const title = btn.getAttribute('data-title');
      if (videoUrlInput && url) {
        videoUrlInput.value = url;
        videoUrlInput.focus();
      }
      if (videoFileInput) videoFileInput.value = '';
      if (fileSelectedBadge) fileSelectedBadge.style.display = 'none';
      if (videoTitleInput && (!videoTitleInput.value.trim() || videoTitleInput.value.includes('Sunset') || videoTitleInput.value.includes('Action') || videoTitleInput.value.includes('Wilderness'))) {
        videoTitleInput.value = title || '';
      }
    });
  });

  // 2. Connection Status Check
  if (window.dataService) {
    if (window.dataService.isConfigured) {
      statusText.textContent = "Firestore Connected";
    } else {
      statusText.textContent = "Demo Mode (Local)";
      connectionStatus.style.background = "rgba(245, 158, 11, 0.1)";
      connectionStatus.style.color = "#fbbf24";
      connectionStatus.style.borderColor = "rgba(245, 158, 11, 0.3)";
      const dot = document.querySelector('.status-dot');
      if (dot) {
        dot.style.backgroundColor = "#fbbf24";
        dot.style.boxShadow = "0 0 8px #fbbf24";
      }
    }

    // Real-time Video Subscription
    window.dataService.subscribeVideos((videos) => {
      activeVideos = videos || [];
      updateVideoState(activeVideos);
    });

    // Real-time Banner & Popunder Subscription
    window.dataService.subscribeBanner((bannerData) => {
      const bannerHtml = (bannerData && bannerData.html) ? bannerData.html.trim() : '';
      const popunderScript = (bannerData && bannerData.popunder) ? bannerData.popunder.trim() : '';

      if (bannerHtml && !bannerHtml.includes("Special Offer")) {
        if (bannerHtmlInput) bannerHtmlInput.value = bannerHtml;
        if (bannerPreviewContent) bannerPreviewContent.innerHTML = bannerHtml;
        if (statBannerStatus) statBannerStatus.textContent = "Active";
      } else {
        if (bannerHtmlInput) bannerHtmlInput.value = "";
        if (bannerPreviewContent) bannerPreviewContent.innerHTML = '<span style="color: var(--text-muted); font-size: 13px; font-style: italic;">No banner configured. Top area remains completely clean.</span>';
        if (statBannerStatus) statBannerStatus.textContent = "Empty (Clean)";
      }

      if (popunderScript) {
        if (popunderScriptInput) popunderScriptInput.value = popunderScript;
        if (statPopunderStatus) statPopunderStatus.textContent = "Active";
      } else {
        if (popunderScriptInput) popunderScriptInput.value = "";
        if (statPopunderStatus) statPopunderStatus.textContent = "Empty (Clean)";
      }
    });
  }

  // 3. Update UI State & 5-Video Max Limit Enforcement
  function updateVideoState(videos) {
    const count = videos.length;
    statActiveVideos.textContent = `${count} / ${MAX_ACTIVE_VIDEOS}`;
    activeCountBadge.textContent = `${count} / ${MAX_ACTIVE_VIDEOS}`;

    // Validate 5 Video Limit
    if (count >= MAX_ACTIVE_VIDEOS) {
      activeCountBadge.classList.add('full');
      limitAlert.style.display = 'flex';
      submitVideoBtn.disabled = true;
      submitVideoBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <span>Limit Reached (Max ${MAX_ACTIVE_VIDEOS} Videos)</span>
      `;
    } else {
      activeCountBadge.classList.remove('full');
      limitAlert.style.display = 'none';
      submitVideoBtn.disabled = false;
      submitVideoBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span>Publish Video to Feed</span>
      `;
    }

    // Render Video Items List
    renderVideoList(videos);
  }

  // 4. Render Video Items List with Delete Action
  function renderVideoList(videos) {
    if (videos.length === 0) {
      videoListContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-body); font-size: 14px;">
          No active videos found. Add your first video using the form on the left!
        </div>
      `;
      return;
    }

    videoListContainer.innerHTML = '';

    videos.forEach((video) => {
      const card = document.createElement('div');
      card.className = 'video-item-card';

      const safeTitle = escapeHtml(video.title || 'Untitled Video');
      const safeAuthor = escapeHtml(video.author && video.author !== '@creator' ? video.author : '@jessica.official');
      const safeAuthorName = escapeHtml(video.authorName && video.authorName !== 'Creator' ? video.authorName : 'Jessica Miller');
      const safeVideoUrl = escapeHtml(video.videoUrl || '');
      const safeAdLink = escapeHtml(video.adLink || '');
      const isLocal = video.videoUrl && video.videoUrl.startsWith('indexeddb://');
      const safePoster = video.posterUrl ? `poster="${escapeHtml(video.posterUrl)}"` : '';

      card.innerHTML = `
        <div class="mini-player-thumb">
          <video src="${isLocal ? '' : safeVideoUrl}" ${safePoster} preload="metadata" muted playsinline></video>
        </div>
        <div class="video-item-info">
          <div class="video-item-title">${safeTitle}</div>
          <div class="video-item-meta">
            <span>${safeAuthor}</span>
            <span>•</span>
            <span>${formatDate(video.createdAt)}</span>
          </div>
          <div class="video-item-links">
            ${isLocal ? `
              <span class="link-chip" style="color: #f59e0b; border-color: rgba(245, 158, 11, 0.4);" title="Stored in local browser only. Remote visitors cannot view this file.">
                <span>⚠️ Video:</span>
                <span>Local Device Storage</span>
              </span>
            ` : `
              <a href="${safeVideoUrl}" target="_blank" class="link-chip" style="color: #10b981; border-color: rgba(16, 185, 129, 0.4);" title="Direct HTTPS Video Stream (Universal playback)">
                <span>🌐 Video:</span>
                <span>${truncate(safeVideoUrl, 45)}</span>
              </a>
            `}
            <a href="${safeAdLink}" target="_blank" class="link-chip ad-chip" title="Ad Network Direct Link">
              <span>🎯 Ad Link:</span>
              <span>${truncate(safeAdLink, 45)}</span>
            </a>
          </div>
        </div>
        <div class="video-item-actions">
          <button class="btn-delete" data-id="${video.id}" title="Delete Video" aria-label="Delete Video">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </div>
      `;

      // Resolve IndexedDB local video file if needed
      if (isLocal && window.localVideoStorage) {
        const miniVid = card.querySelector('video');
        window.localVideoStorage.resolveVideoUrl(video.videoUrl).then((resolved) => {
          if (resolved && miniVid) {
            miniVid.src = resolved;
          }
        });
      }

      // Delete Button Event
      const deleteBtn = card.querySelector('.btn-delete');
      deleteBtn.addEventListener('click', async () => {
        if (confirm(`Are you sure you want to delete "${video.title || 'this video'}"?`)) {
          try {
            deleteBtn.disabled = true;
            await window.dataService.deleteVideo(video.id);
            showAdminToast("Video successfully deleted! 🗑️");
          } catch (err) {
            console.error("Delete error:", err);
            showAdminToast("Error deleting video: " + err.message);
          }
        }
      });

      videoListContainer.appendChild(card);
    });
  }

  // 5. Handle Add Video Form Submission
  addVideoForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (activeVideos.length >= MAX_ACTIVE_VIDEOS) {
      showAdminToast(`Maximum limit of ${MAX_ACTIVE_VIDEOS} active videos reached!`);
      return;
    }

    const title = videoTitleInput.value.trim();
    const adLink = adLinkInput.value.trim();
    let directUrl = videoUrlInput.value.trim();
    const selectedFile = videoFileInput.files && videoFileInput.files[0];

    if (!directUrl && !selectedFile) {
      showAdminToast("Please enter a direct HTTPS video URL (or choose a local video)!");
      return;
    }

    if (!adLink) {
      showAdminToast("Please provide the Ad Network Direct Link!");
      return;
    }

    if (!title) {
      showAdminToast("Please enter a Video Caption / Title!");
      return;
    }

    // Auto-complete URL scheme if omitted
    if (directUrl && !directUrl.startsWith('http://') && !directUrl.startsWith('https://')) {
      directUrl = 'https://' + directUrl;
      videoUrlInput.value = directUrl;
    }

    // Validation for direct URL
    if (directUrl && (directUrl.includes('youtube.com') || directUrl.includes('youtu.be'))) {
      showAdminToast("YouTube watch links cannot be played directly in HTML5 video tags. Please provide a direct .mp4/.webm video link.");
      return;
    }

    try {
      submitVideoBtn.disabled = true;
      submitVideoBtn.innerHTML = `
        <svg class="spin-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
          <path d="M12 2a10 10 0 0 1 10 10"/>
        </svg>
        <span>Publishing Video...</span>
      `;

      let finalVideoUrl = directUrl;
      let isLocalFile = false;

      // Prioritize direct HTTPS URL; fallback to local storage only if no URL was provided
      if (!directUrl && selectedFile) {
        isLocalFile = true;
        const fileId = 'vid_' + Date.now();
        if (window.localVideoStorage) {
          await window.localVideoStorage.saveVideo(fileId, selectedFile);
          finalVideoUrl = 'indexeddb://' + fileId;
        } else {
          finalVideoUrl = URL.createObjectURL(selectedFile);
        }
      }

      // Create record
      const newRecord = {
        videoUrl: finalVideoUrl,
        adLink,
        title,
        author: '@jessica.official',
        authorName: 'Jessica Miller',
        createdAt: Date.now()
      };

      let savedVideo = null;

      if (window.dataService && window.dataService.isConfigured && window.dataService.db) {
        const docRef = await window.dataService.db.collection("videos").add(newRecord);
        savedVideo = { id: docRef.id, ...newRecord };
      } else if (typeof firebase !== 'undefined' && firebase.apps?.length) {
        const db = firebase.firestore();
        const docRef = await db.collection("videos").add(newRecord);
        savedVideo = { id: docRef.id, ...newRecord };
      } else if (window.dataService) {
        savedVideo = await window.dataService.addVideo(newRecord);
      } else {
        newRecord.id = "local-" + Date.now();
        const local = JSON.parse(localStorage.getItem("scrolling_website_videos") || "[]");
        local.unshift(newRecord);
        localStorage.setItem("scrolling_website_videos", JSON.stringify(local));
        savedVideo = newRecord;
      }

      if (isLocalFile) {
        showAdminToast("Video saved locally on this device! ⚠️ Remote visitors need an HTTPS link.");
      } else {
        showAdminToast("Video published to global feed successfully! 🎉");
      }

      // Reset form
      addVideoForm.reset();
      if (fileSelectedBadge) fileSelectedBadge.style.display = 'none';

      // Immediately update active videos list
      if (savedVideo) {
        const alreadyInList = activeVideos.some(v => v.id === savedVideo.id);
        if (!alreadyInList) {
          activeVideos.unshift(savedVideo);
        }
        updateVideoState(activeVideos);
      }
    } catch (err) {
      console.error("Error publishing video:", err);
      showAdminToast(err.message || "Failed to publish video");
    } finally {
      submitVideoBtn.disabled = false;
      submitVideoBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span>Publish Video to Feed</span>
      `;
      updateVideoState(activeVideos);
    }
  });

  // 6. Handle Global Ad Network Form & Live Preview
  if (bannerHtmlInput) {
    bannerHtmlInput.addEventListener('input', () => {
      const val = bannerHtmlInput.value.trim();
      bannerPreviewContent.innerHTML = val || '<span style="color: var(--text-muted); font-size: 13px; font-style: italic;">No banner configured. Top area remains completely clean.</span>';
    });
  }

  if (bannerForm) {
    bannerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const bannerHtml = bannerHtmlInput ? bannerHtmlInput.value.trim() : '';
      const popunderScript = popunderScriptInput ? popunderScriptInput.value.trim() : '';

      try {
        await window.dataService.updateBanner(bannerHtml, popunderScript);
        showAdminToast("Ad settings saved successfully! 🚀");
      } catch (err) {
        console.error("Ad update error:", err);
        showAdminToast("Failed to save ad settings: " + err.message);
      }
    });
  }

  if (clearBannerBtn) {
    clearBannerBtn.addEventListener('click', async () => {
      if (bannerHtmlInput) bannerHtmlInput.value = '';
      if (bannerPreviewContent) bannerPreviewContent.innerHTML = '<span style="color: var(--text-muted); font-size: 13px; font-style: italic;">No banner configured. Top area remains completely clean.</span>';
      const popunderScript = popunderScriptInput ? popunderScriptInput.value.trim() : '';
      try {
        await window.dataService.updateBanner('', popunderScript);
        showAdminToast("Top banner cleared. ✨");
      } catch (err) {
        showAdminToast("Failed to remove banner: " + err.message);
      }
    });
  }

  if (clearPopunderBtn) {
    clearPopunderBtn.addEventListener('click', async () => {
      if (popunderScriptInput) popunderScriptInput.value = '';
      const bannerHtml = bannerHtmlInput ? bannerHtmlInput.value.trim() : '';
      try {
        await window.dataService.updateBanner(bannerHtml, '');
        showAdminToast("Popunder script cleared. ✨");
      } catch (err) {
        showAdminToast("Failed to remove popunder: " + err.message);
      }
    });
  }

  // Helper: Toast Message
  function showAdminToast(msg) {
    const existing = document.querySelector('.admin-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'admin-toast';
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
      <span>${escapeHtml(msg)}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // Helper: Formatting
  function formatDate(val) {
    if (!val) return 'Just now';
    try {
      const date = new Date(val);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
      return 'Recent';
    }
  }

  function truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.substring(0, max) + '...' : str;
  }

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
