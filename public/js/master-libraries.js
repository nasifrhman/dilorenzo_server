/**
 * Di Lorenzo Soccer - Master Libraries Frontend Logic
 * Supports 4 Master Pillars:
 * 1. Master Habits (Figma node #33302:24339 & Modal #33302:25759)
 * 2. Video Drill Bank (Figma node #33304:673 & Modal #33304:569) - with Video & Image file uploads!
 * 3. Reflection Forms (Figma node #33304:1357 & Modal #33304:2141)
 * 4. 90-Day Curriculums (Figma node #33304:2397 & Modal #33304:3116)
 */

document.addEventListener('DOMContentLoaded', () => {
  // State
  let activeTabType = 'habit'; // 'habit' | 'video-drill' | 'reflection' | 'curriculum'
  let modalActiveType = 'habit';
  let searchQuery = '';
  let searchDebounceTimer = null;

  // DOM Elements - Tabs
  const tabHabits = document.getElementById('tabHabits');
  const tabVideos = document.getElementById('tabVideos');
  const tabReflections = document.getElementById('tabReflections');
  const tabCurriculums = document.getElementById('tabCurriculums');
  const allTabs = [tabHabits, tabVideos, tabReflections, tabCurriculums];

  // DOM Elements - Subbar & Grid
  const subbarCountLabel = document.getElementById('subbarCountLabel');
  const subbarActionBtn = document.getElementById('subbarActionBtn');
  const librarySearchInput = document.getElementById('librarySearchInput');
  const libraryGrid = document.getElementById('libraryGrid');

  // DOM Elements - Modal
  const libraryModal = document.getElementById('libraryModal');
  const openMainModalBtn = document.getElementById('openMainModalBtn');
  const topQuickAddBtn = document.getElementById('topQuickAddBtn');
  const closeLibraryModalBtn = document.getElementById('closeLibraryModalBtn');
  const cancelLibraryModalBtn = document.getElementById('cancelLibraryModalBtn');
  const libraryContentForm = document.getElementById('libraryContentForm');
  const modalTypeBadge = document.getElementById('modalTypeBadge');
  const submitLibraryModalBtn = document.getElementById('submitLibraryModalBtn');

  // Modal switcher buttons
  const modalSwitchHabit = document.getElementById('modalSwitchHabit');
  const modalSwitchVideo = document.getElementById('modalSwitchVideo');
  const modalSwitchReflection = document.getElementById('modalSwitchReflection');
  const modalSwitchCurriculum = document.getElementById('modalSwitchCurriculum');
  const allModalSwitches = [modalSwitchHabit, modalSwitchVideo, modalSwitchReflection, modalSwitchCurriculum];

  // Modal form sections
  const formSectionHabit = document.getElementById('formSectionHabit');
  const formSectionVideo = document.getElementById('formSectionVideo');
  const formSectionReflection = document.getElementById('formSectionReflection');
  const formSectionCurriculum = document.getElementById('formSectionCurriculum');

  // File Upload Elements
  const videoFileInput = document.getElementById('videoFileInput');
  const imageFileInput = document.getElementById('imageFileInput');
  const videoFileTitle = document.getElementById('videoFileTitle');
  const videoFileSub = document.getElementById('videoFileSub');
  const videoUploadIcon = document.getElementById('videoUploadIcon');
  const imageFileTitle = document.getElementById('imageFileTitle');
  const imageFileSub = document.getElementById('imageFileSub');
  const imageUploadIcon = document.getElementById('imageUploadIcon');
  const imagePreviewThumb = document.getElementById('imagePreviewThumb');

  // Video Lightbox Elements
  const videoLightbox = document.getElementById('videoLightbox');
  const lightboxVideoPlayer = document.getElementById('lightboxVideoPlayer');
  const closeVideoLightboxBtn = document.getElementById('closeVideoLightboxBtn');

  // Toast
  const toastNotification = document.getElementById('toastNotification');
  const toastIcon = document.getElementById('toastIcon');
  const toastMsg = document.getElementById('toastMsg');

  function showToast(message, isError = false) {
    if (!toastNotification) return;
    toastIcon.textContent = isError ? '⚠️' : '✅';
    toastMsg.textContent = message;
    toastNotification.style.display = 'flex';
    toastNotification.style.background = isError ? '#991B1B' : '#101828';
    setTimeout(() => {
      toastNotification.style.display = 'none';
    }, 3500);
  }

  // File Upload Listeners
  if (videoFileInput) {
    videoFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (videoFileTitle) videoFileTitle.textContent = file.name;
        if (videoFileSub) {
          const mb = (file.size / (1024 * 1024)).toFixed(1);
          videoFileSub.textContent = `${mb} MB • Ready to upload`;
        }
        if (videoUploadIcon) videoUploadIcon.textContent = '✅';
      }
    });
  }

  if (imageFileInput) {
    imageFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (imageFileTitle) imageFileTitle.textContent = file.name;
        if (imageFileSub) {
          const kb = (file.size / 1024).toFixed(1);
          imageFileSub.textContent = `${kb} KB • Thumbnail selected`;
        }
        if (imageUploadIcon) imageUploadIcon.style.display = 'none';
        if (imagePreviewThumb) {
          imagePreviewThumb.src = URL.createObjectURL(file);
          imagePreviewThumb.style.display = 'block';
        }
      }
    });
  }

  function resetUploadInputs() {
    if (videoFileInput) videoFileInput.value = '';
    if (imageFileInput) imageFileInput.value = '';
    if (videoFileTitle) videoFileTitle.textContent = 'Choose Video';
    if (videoFileSub) videoFileSub.textContent = 'MP4, WEBM, MOV (Max 500MB)';
    if (videoUploadIcon) videoUploadIcon.textContent = '📹';
    if (imageFileTitle) imageFileTitle.textContent = 'Upload Image';
    if (imageFileSub) imageFileSub.textContent = 'PNG, JPG, WEBP';
    if (imageUploadIcon) imageUploadIcon.style.display = 'inline';
    if (imagePreviewThumb) {
      imagePreviewThumb.src = '';
      imagePreviewThumb.style.display = 'none';
    }
  }

  // Set Modal Section View
  function setModalType(type) {
    modalActiveType = type;

    // Switch active state on buttons
    allModalSwitches.forEach((btn) => {
      if (!btn) return;
      if (btn.dataset.type === type) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Hide all sections
    if (formSectionHabit) formSectionHabit.style.display = 'none';
    if (formSectionVideo) formSectionVideo.style.display = 'none';
    if (formSectionReflection) formSectionReflection.style.display = 'none';
    if (formSectionCurriculum) formSectionCurriculum.style.display = 'none';

    // Show selected section & update button labels
    if (type === 'habit') {
      if (formSectionHabit) formSectionHabit.style.display = 'block';
      if (modalTypeBadge) modalTypeBadge.textContent = 'HABIT';
      if (submitLibraryModalBtn) submitLibraryModalBtn.textContent = 'Save to Master HABITS';
    } else if (type === 'video-drill') {
      if (formSectionVideo) formSectionVideo.style.display = 'block';
      if (modalTypeBadge) modalTypeBadge.textContent = 'VIDEO DRILL';
      if (submitLibraryModalBtn) submitLibraryModalBtn.textContent = 'Save to Master Video Drill';
    } else if (type === 'reflection') {
      if (formSectionReflection) formSectionReflection.style.display = 'block';
      if (modalTypeBadge) modalTypeBadge.textContent = 'REFLECTION';
      if (submitLibraryModalBtn) submitLibraryModalBtn.textContent = 'Save to Master REFLECTIONS';
    } else if (type === 'curriculum') {
      if (formSectionCurriculum) formSectionCurriculum.style.display = 'block';
      if (modalTypeBadge) modalTypeBadge.textContent = 'CURRICULUM';
      if (submitLibraryModalBtn) submitLibraryModalBtn.textContent = 'Save to Master CURRICULUMS';
    }
  }

  function openModal(preselectedType = null) {
    const typeToOpen = preselectedType || activeTabType;
    setModalType(typeToOpen);
    if (libraryModal) libraryModal.classList.add('open');
  }

  function closeModal() {
    if (libraryModal) libraryModal.classList.remove('open');
    resetUploadInputs();
  }

  // Video Lightbox Handlers
  window.playVideoDrill = (url) => {
    if (!url) {
      showToast('No video file or URL attached to this drill.', true);
      return;
    }

    if (videoLightbox && lightboxVideoPlayer) {
      lightboxVideoPlayer.src = url;
      videoLightbox.classList.add('open');
      lightboxVideoPlayer.play().catch(() => {});
    } else {
      window.open(url, '_blank');
    }
  };

  if (closeVideoLightboxBtn) {
    closeVideoLightboxBtn.addEventListener('click', () => {
      if (videoLightbox && lightboxVideoPlayer) {
        lightboxVideoPlayer.pause();
        lightboxVideoPlayer.src = '';
        videoLightbox.classList.remove('open');
      }
    });
  }

  if (videoLightbox) {
    videoLightbox.addEventListener('click', (e) => {
      if (e.target === videoLightbox) {
        if (lightboxVideoPlayer) {
          lightboxVideoPlayer.pause();
          lightboxVideoPlayer.src = '';
        }
        videoLightbox.classList.remove('open');
      }
    });
  }

  // Update UI Subbar based on tab
  function updateSubbarUI(itemCount) {
    if (activeTabType === 'habit') {
      subbarCountLabel.textContent = `Showing standard performance habits (${itemCount} active)`;
      subbarActionBtn.textContent = '+ Add New Habit Template';
    } else if (activeTabType === 'video-drill') {
      subbarCountLabel.textContent = `Showing drill & technical video bank (${itemCount} videos)`;
      subbarActionBtn.textContent = '+ Add Video Drill';
    } else if (activeTabType === 'reflection') {
      subbarCountLabel.textContent = `Showing reflection & assessment audit forms (${itemCount} templates)`;
      subbarActionBtn.textContent = '+ Create Reflection Form';
    } else if (activeTabType === 'curriculum') {
      subbarCountLabel.textContent = `Showing 90-day elite progression architectures (${itemCount} curriculums)`;
      subbarActionBtn.textContent = '+ New 90-Day Architecture';
    }
  }

  // Load Library Overview
  async function fetchLibraryData() {
    try {
      libraryGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: #fff; border-radius: 14px; border: 1px dashed #D1D5DC;">
          <span style="font-size: 32px;">⏳</span>
          <p style="font-size: 13.5px; color: #6A7282; margin: 8px 0 0;">Loading master library content...</p>
        </div>
      `;

      const params = new URLSearchParams({
        type: activeTabType,
      });
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const res = await fetch(`/api/v1/library/overview?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || json.status !== 'success') {
        throw new Error(json.message || 'Failed to retrieve library data');
      }

      const payloadData = json.data?.attributes || json.data || {};
      const filterCounts = payloadData.filterCounts || {};
      const items = payloadData.items || [];

      // Update Tab Badges live from MongoDB counts
      if (tabHabits) tabHabits.textContent = `Master Habits (${filterCounts.habits || 0})`;
      if (tabVideos) tabVideos.textContent = `Video Drill Bank (${filterCounts.videoDrills || 0})`;
      if (tabReflections) tabReflections.textContent = `Reflection Forms (${filterCounts.reflections || 0})`;
      if (tabCurriculums) tabCurriculums.textContent = `90-Day Curriculums (${filterCounts.curriculums || 0})`;

      // Update Subbar
      updateSubbarUI(items.length);

      // Render items
      renderLibraryGrid(items);
    } catch (err) {
      console.error('Error fetching library overview:', err);
      libraryGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: #FFF5F5; border-radius: 14px; border: 1px solid #FED7D7;">
          <span style="font-size: 32px;">⚠️</span>
          <p style="font-size: 14px; color: #C53030; font-weight: 600; margin: 8px 0 0;">${escapeHtml(err.message)}</p>
          <button type="button" class="btn-secondary-action" onclick="window.reloadLibraryData()" style="margin-top: 12px;">Retry</button>
        </div>
      `;
    }
  }

  // Render cards based on content type
  function renderLibraryGrid(items) {
    if (!items || items.length === 0) {
      const typeLabel =
        activeTabType === 'habit'
          ? 'Master Habits'
          : activeTabType === 'video-drill'
          ? 'Video Drills'
          : activeTabType === 'reflection'
          ? 'Reflection Forms'
          : '90-Day Curriculums';

      libraryGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 24px; background: #FFFFFF; border-radius: 14px; border: 1px dashed #D1D5DC;">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: #FFF9E6; color: #E8A820; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 14px;">
            📚
          </div>
          <h3 style="font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 700; color: #101828; margin: 0 0 6px;">
            No ${typeLabel} Found
          </h3>
          <p style="font-family: 'Inter', sans-serif; font-size: 13px; color: #6A7282; max-width: 420px; margin: 0 auto 18px;">
            ${searchQuery ? `No library items match "${escapeHtml(searchQuery)}".` : `Start by creating your first standardized ${typeLabel.toLowerCase()} template.`}
          </p>
          <button type="button" class="btn-gold-primary" onclick="window.triggerOpenModal()">
            + Add New ${typeLabel.slice(0, -1)}
          </button>
        </div>
      `;
      return;
    }

    if (activeTabType === 'habit') {
      libraryGrid.innerHTML = items.map(renderHabitCard).join('');
    } else if (activeTabType === 'video-drill') {
      libraryGrid.innerHTML = items.map(renderVideoDrillCard).join('');
    } else if (activeTabType === 'reflection') {
      libraryGrid.innerHTML = items.map(renderReflectionCard).join('');
    } else if (activeTabType === 'curriculum') {
      libraryGrid.innerHTML = items.map(renderCurriculumCard).join('');
    }
  }

  // 1. Habit Card Renderer (#33302:24339)
  function renderHabitCard(item) {
    const categoryBadgeClass =
      item.category === 'Recovery'
        ? 'badge-category-recovery'
        : item.category === 'Technical'
        ? 'badge-category-technical'
        : item.category === 'Physical'
        ? 'badge-category-physical'
        : 'badge-category-mindset';

    return `
      <article class="lib-card" data-id="${item._id}">
        <div>
          <div class="lib-card-header">
            <span class="lib-badge ${categoryBadgeClass}">${escapeHtml(item.category || 'Mindset')}</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              ${item.xpReward > 0 ? `<span class="lib-badge badge-xp">+${item.xpReward} XP</span>` : ''}
              <button type="button" class="btn-del-item" onclick="window.handleDeleteLibraryItem('${item._id}')" title="Delete Template" style="background: none; border: none; cursor: pointer; color: #9CA3AF; padding: 4px; font-size: 14px;">
                🗑️
              </button>
            </div>
          </div>

          <h3 class="lib-card-title">${escapeHtml(item.title)}</h3>

          <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px;">
            <div style="font-family: 'Inter', sans-serif; font-size: 11.5px; color: #4A5565; display: flex; align-items: center; gap: 6px;">
              <span>📅</span> <strong>Frequency:</strong> ${escapeHtml(item.frequency || 'Daily')}
            </div>
            <div style="font-family: 'Inter', sans-serif; font-size: 11.5px; color: #4A5565; display: flex; align-items: center; gap: 6px;">
              <span>⏰</span> <strong>Window:</strong> ${escapeHtml(item.checkInWindow || 'Morning')}
            </div>
          </div>

          ${
            item.instructions
              ? `<p class="lib-card-desc">${escapeHtml(item.instructions)}</p>`
              : `<p class="lib-card-desc" style="font-style: italic; color: #9CA3AF;">Standard athlete execution cue assigned upon program enrollment.</p>`
          }
        </div>

        <div class="lib-card-footer">
          <span style="display: inline-flex; align-items: center; gap: 4px; color: #027A48; font-weight: 600; font-size: 11px;">
            ● Standardized Active
          </span>
          <span style="margin-left: auto; font-size: 11px; color: #9CA3AF;">
            Added ${formatRelativeDate(item.createdAt)}
          </span>
        </div>
      </article>
    `;
  }

  // 2. Video Drill Card Renderer (#33304:673) - with uploaded video & image cover support!
  function renderVideoDrillCard(item) {
    const teachingPointsList = (item.teachingPoints || [])
      .map((tp) => `<li>${escapeHtml(tp)}</li>`)
      .join('');

    const coverStyle = item.image
      ? `background: linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url('${escapeHtml(item.image)}') center / cover no-repeat;`
      : `background: linear-gradient(135deg, #1A2F1A 0%, #2D4A1E 100%);`;

    const videoSource = item.video || item.videoUrl || '';

    return `
      <article class="lib-card" data-id="${item._id}">
        <div>
          <!-- VIDEO THUMBNAIL PREVIEW -->
          <div class="video-cover-box" style="${coverStyle}">
            <div class="video-play-btn" onclick="window.playVideoDrill('${escapeHtml(videoSource)}')" style="cursor: pointer;" title="Play Drill Video">▶</div>
            <span class="video-duration-badge">${escapeHtml(item.duration || '10:00 min')}</span>
          </div>

          <div class="lib-card-header">
            <span class="lib-badge badge-category-mindset">${escapeHtml(item.category || 'Mindset')}</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="lib-badge badge-phase">${escapeHtml(item.phase || 'Foundation')}</span>
              ${item.xpReward > 0 ? `<span class="lib-badge badge-xp">+${item.xpReward} XP</span>` : ''}
              <button type="button" class="btn-del-item" onclick="window.handleDeleteLibraryItem('${item._id}')" title="Delete Video" style="background: none; border: none; cursor: pointer; color: #9CA3AF; padding: 4px; font-size: 14px;">
                🗑️
              </button>
            </div>
          </div>

          <h3 class="lib-card-title">${escapeHtml(item.title)}</h3>
          <div class="video-coach-text">Presenter: ${escapeHtml(item.coachName || 'Valentino Di Lorenzo')}</div>

          ${
            item.teachingPoints && item.teachingPoints.length > 0
              ? `<ul class="video-teaching-points">${teachingPointsList}</ul>`
              : `<p class="lib-card-desc" style="font-style: italic; color: #9CA3AF;">Comprehensive breakdown drill with instructional cues.</p>`
          }
        </div>

        <div class="lib-card-footer">
          ${
            videoSource
              ? `<a href="javascript:void(0)" onclick="window.playVideoDrill('${escapeHtml(videoSource)}')" style="color: #E8A820; font-weight: 600; text-decoration: none; font-size: 11.5px; display: inline-flex; align-items: center; gap: 4px;">▶ Watch Drill Video</a>`
              : `<span style="color: #6A7282; font-size: 11px;">Embedded Video Drill</span>`
          }
          <span style="margin-left: auto; font-size: 11px; color: #9CA3AF;">
            Added ${formatRelativeDate(item.createdAt)}
          </span>
        </div>
      </article>
    `;
  }

  // 3. Reflection Card Renderer (#33304:1357)
  function renderReflectionCard(item) {
    const promptList = item.prompt || item.prompts || item.questions || [];
    const questionsList = promptList
      .map((q) => `<li>${escapeHtml(q)}</li>`)
      .join('');

    return `
      <article class="lib-card" data-id="${item._id}">
        <div>
          <div class="lib-card-header">
            <span class="lib-badge badge-category-mindset">${escapeHtml(item.formType || 'Match Audit')}</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="lib-badge badge-duration">⏱ ${escapeHtml(item.completionTime || '5 min')}</span>
              <button type="button" class="btn-del-item" onclick="window.handleDeleteLibraryItem('${item._id}')" title="Delete Form" style="background: none; border: none; cursor: pointer; color: #9CA3AF; padding: 4px; font-size: 14px;">
                🗑️
              </button>
            </div>
          </div>

          <h3 class="lib-card-title">${escapeHtml(item.title)}</h3>

          <div style="font-family: 'Inter', sans-serif; font-size: 11.5px; color: #027A48; font-weight: 600; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
            <span>💬</span> ${item.autoPostToChat ? 'Auto-posts to 3-Way Group Chat on submission' : 'Private to Athlete & Dedicated Coach'}
          </div>

          ${
            promptList && promptList.length > 0
              ? `
                <div style="font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; color: #6A7282; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em;">
                  Reflection Prompts (${promptList.length})
                </div>
                <ol class="reflection-questions-list">${questionsList}</ol>
              `
              : `<p class="lib-card-desc" style="font-style: italic; color: #9CA3AF;">Comprehensive mentality self-audit questionnaire.</p>`
          }
        </div>

        <div class="lib-card-footer">
          <span style="font-size: 11.5px; color: #374151; font-weight: 600;">
            ${promptList.length} Prompts
          </span>
          <span style="margin-left: auto; font-size: 11px; color: #9CA3AF;">
            Added ${formatRelativeDate(item.createdAt)}
          </span>
        </div>
      </article>
    `;
  }

  // 4. Curriculum Card Renderer (#33304:2397)
  function renderCurriculumCard(item) {
    const phasesList = (item.phases || [])
      .map(
        (p) => `
        <div class="curriculum-phase-pill">
          <strong>Phase ${p.phaseNumber || ''}:</strong> ${escapeHtml(p.title || '')}
        </div>
      `
      )
      .join('');

    return `
      <article class="lib-card" data-id="${item._id}">
        <div>
          <div class="lib-card-header">
            <span class="lib-badge badge-category-mindset">${escapeHtml(item.curriculumType || 'Flagship 90-Day')}</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="lib-badge badge-tier">${escapeHtml(item.tier || 'Mentorship 90')}</span>
              <button type="button" class="btn-del-item" onclick="window.handleDeleteLibraryItem('${item._id}')" title="Delete Curriculum" style="background: none; border: none; cursor: pointer; color: #9CA3AF; padding: 4px; font-size: 14px;">
                🗑️
              </button>
            </div>
          </div>

          <h3 class="lib-card-title">${escapeHtml(item.title)}</h3>

          <div style="display: flex; gap: 12px; margin-bottom: 12px; font-family: 'Inter', sans-serif; font-size: 11.5px; color: #4A5565;">
            <span>⏱ <strong>Duration:</strong> ${escapeHtml(item.duration || '12 Weeks')}</span>
            <span>📚 <strong>Modules:</strong> ${item.moduleCount || 24}</span>
          </div>

          ${
            item.phases && item.phases.length > 0
              ? `
                <div style="font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; color: #6A7282; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em;">
                  Progression Phases (${item.phases.length})
                </div>
                <div class="curriculum-phases-list">${phasesList}</div>
              `
              : `<p class="lib-card-desc" style="font-style: italic; color: #9CA3AF;">Three-tier progressive mastery curriculum architecture.</p>`
          }
        </div>

        <div class="lib-card-footer">
          <span style="font-size: 11.5px; color: #E8A820; font-weight: 600;">
            Flagship Mentorship Curriculum
          </span>
          <span style="margin-left: auto; font-size: 11px; color: #9CA3AF;">
            Added ${formatRelativeDate(item.createdAt)}
          </span>
        </div>
      </article>
    `;
  }

  // Delete Action
  window.handleDeleteLibraryItem = async (id) => {
    if (!id) return;
    const confirmDelete = window.confirm(
      'Are you sure you want to remove this item from Master Libraries? It will no longer be available in new athlete deployments.'
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/v1/library/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || json.status !== 'success') {
        throw new Error(json.message || 'Failed to delete library item');
      }

      showToast('Master library item removed successfully');
      fetchLibraryData();
    } catch (err) {
      console.error('Delete error:', err);
      showToast(err.message, true);
    }
  };

  // Helper exposure for reload & trigger
  window.reloadLibraryData = fetchLibraryData;
  window.triggerOpenModal = () => openModal(activeTabType);

  // Form Submit Handler (Creates Item with file uploads!)
  if (libraryContentForm) {
    libraryContentForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      let itemPayload = {
        contentType: modalActiveType,
      };

      if (modalActiveType === 'habit') {
        const title = document.getElementById('habitTitle')?.value?.trim();
        const category = document.getElementById('habitCategory')?.value;
        const frequency = document.getElementById('habitFrequency')?.value;
        const checkInWindow = document.getElementById('habitCheckInWindow')?.value;
        const xpReward = Number(document.getElementById('habitXpReward')?.value) || 0;
        const instructions = document.getElementById('habitInstructions')?.value?.trim();

        if (!title) {
          alert('Please enter a Habit title.');
          return;
        }

        itemPayload = {
          ...itemPayload,
          title,
          category: category || 'Mindset',
          frequency: frequency || 'Daily (7x a week)',
          checkInWindow: checkInWindow || 'Morning (8:00 AM)',
          xpReward,
          instructions: instructions || '',
        };
      } else if (modalActiveType === 'video-drill') {
        const title = document.getElementById('videoTitle')?.value?.trim();
        const videoUrl = document.getElementById('videoUrl')?.value?.trim();
        const category = document.getElementById('videoCategory')?.value;
        const phase = document.getElementById('videoPhase')?.value;
        const duration = document.getElementById('videoDuration')?.value?.trim();
        const xpReward = Number(document.getElementById('videoXpReward')?.value) || 0;
        const coachName = document.getElementById('videoCoachName')?.value?.trim();
        const teachingPoints = document.getElementById('videoTeachingPoints')?.value;

        if (!title) {
          alert('Please enter a Video Drill title.');
          return;
        }

        itemPayload = {
          ...itemPayload,
          title,
          category: category || 'Mindset',
          phase: phase || 'Foundation (Phase 1)',
          duration: duration || '10:00 min',
          xpReward,
          coachName: coachName || 'Valentino Di Lorenzo',
          teachingPoints: teachingPoints || '',
        };

        if (videoUrl) {
          itemPayload.videoUrl = videoUrl;
        }
      } else if (modalActiveType === 'reflection') {
        const title = document.getElementById('reflectionTitle')?.value?.trim();
        const formType = document.getElementById('reflectionFormType')?.value;
        const completionTime = document.getElementById('reflectionCompletionTime')?.value?.trim();
        const questions = document.getElementById('reflectionQuestions')?.value;
        const autoPostToChat = document.getElementById('reflectionAutoPost')?.checked ?? true;

        if (!title) {
          alert('Please enter a Reflection Form title.');
          return;
        }

        itemPayload = {
          ...itemPayload,
          title,
          formType: formType || 'Match Audit',
          completionTime: completionTime || '5 min',
          prompt: questions || '',
          autoPostToChat,
        };
      } else if (modalActiveType === 'curriculum') {
        const title = document.getElementById('curriculumTitle')?.value?.trim();
        const curriculumType = document.getElementById('curriculumType')?.value;
        const duration = document.getElementById('curriculumDuration')?.value?.trim();
        const tier = document.getElementById('curriculumTier')?.value?.trim();
        const moduleCount = Number(document.getElementById('curriculumModuleCount')?.value) || 24;
        const phases = document.getElementById('curriculumPhases')?.value;

        if (!title) {
          alert('Please enter a Curriculum title.');
          return;
        }

        itemPayload = {
          ...itemPayload,
          title,
          curriculumType: curriculumType || 'Flagship 90-Day',
          duration: duration || '12 Weeks (90 Days)',
          tier: tier || 'Mentorship 90 Tier',
          moduleCount,
          phases: phases || '',
        };
      }

      // Multipart FormData: Bundle data under 'data' & upload files separately!
      const formData = new FormData();
      formData.append('data', JSON.stringify(itemPayload));

      // Direct fields for maximum server/middleware compatibility
      Object.keys(itemPayload).forEach((k) => {
        formData.append(k, itemPayload[k]);
      });

      // Attach video file separately if selected
      if (videoFileInput && videoFileInput.files && videoFileInput.files[0]) {
        formData.append('video', videoFileInput.files[0]);
      }

      // Attach image file separately if selected
      if (imageFileInput && imageFileInput.files && imageFileInput.files[0]) {
        formData.append('image', imageFileInput.files[0]);
      }

      // Submit via API (Multipart FormData)
      try {
        if (submitLibraryModalBtn) {
          submitLibraryModalBtn.disabled = true;
          submitLibraryModalBtn.textContent = 'Uploading & Saving...';
        }

        const res = await fetch('/api/v1/library', {
          method: 'POST',
          body: formData,
        });

        const json = await res.json();
        if (!res.ok || json.status !== 'success') {
          throw new Error(json.message || 'Failed to save master library item');
        }

        showToast('Saved to Master Library successfully!');
        closeModal();
        libraryContentForm.reset();
        resetUploadInputs();

        // Switch active overview tab if user added a different category
        if (activeTabType !== modalActiveType) {
          switchPageTab(modalActiveType);
        } else {
          fetchLibraryData();
        }
      } catch (err) {
        console.error('Error creating library item:', err);
        showToast(err.message, true);
      } finally {
        if (submitLibraryModalBtn) {
          submitLibraryModalBtn.disabled = false;
          // Restore label
          setModalType(modalActiveType);
        }
      }
    });
  }

  // Switch Page Tab
  function switchPageTab(type) {
    activeTabType = type;
    allTabs.forEach((tab) => {
      if (!tab) return;
      if (tab.dataset.type === type) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    fetchLibraryData();
  }

  // Event Listeners - Page Tabs
  allTabs.forEach((tab) => {
    if (!tab) return;
    tab.addEventListener('click', () => {
      switchPageTab(tab.dataset.type);
    });
  });

  // Event Listeners - Modal Switchers
  allModalSwitches.forEach((btn) => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      setModalType(btn.dataset.type);
    });
  });

  // Modal Open/Close Buttons
  if (openMainModalBtn) openMainModalBtn.addEventListener('click', () => openModal());
  if (topQuickAddBtn) topQuickAddBtn.addEventListener('click', () => openModal());
  if (subbarActionBtn) subbarActionBtn.addEventListener('click', () => openModal(activeTabType));
  if (closeLibraryModalBtn) closeLibraryModalBtn.addEventListener('click', closeModal);
  if (cancelLibraryModalBtn) cancelLibraryModalBtn.addEventListener('click', closeModal);

  // Close modal on backdrop click
  if (libraryModal) {
    libraryModal.addEventListener('click', (e) => {
      if (e.target === libraryModal) {
        closeModal();
      }
    });
  }

  // Live Search Input Debounce
  if (librarySearchInput) {
    librarySearchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        fetchLibraryData();
      }, 250);
    });
  }

  // Helpers
  function escapeHtml(str) {
    if (typeof str !== 'string') return str || '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatRelativeDate(dateString) {
    if (!dateString) return 'recently';
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  }

  // Initial Load
  fetchLibraryData();
});
