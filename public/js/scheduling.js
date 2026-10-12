/**
 * Di Lorenzo Soccer - Sessions & Admission Calls Client Script
 * Matches Figma Node #33305:3332 & Modal #33305:4485
 */

document.addEventListener('DOMContentLoaded', () => {
  let currentFilter = 'all';

  const sessionsGrid = document.getElementById('sessionsGrid');
  const tabAll = document.getElementById('tabAll');
  const tabSessions = document.getElementById('tabSessions');
  const tabAssignments = document.getElementById('tabAssignments');
  const tabAdmission = document.getElementById('tabAdmission');
  const tabMatch = document.getElementById('tabMatch');

  const scheduleModal = document.getElementById('scheduleModal');
  const openScheduleModalBtn = document.getElementById('openScheduleModalBtn');
  const topQuickScheduleBtn = document.getElementById('topQuickScheduleBtn');
  const closeScheduleModalBtn = document.getElementById('closeScheduleModalBtn');
  const cancelScheduleBtn = document.getElementById('cancelScheduleBtn');
  const scheduleSessionForm = document.getElementById('scheduleSessionForm');
  const sessionDateTimeInput = document.getElementById('sessionDateTime');
  const toastNotification = document.getElementById('toastNotification');
  const toastMsg = document.getElementById('toastMsg');
  const toastIcon = document.getElementById('toastIcon');

  // Helper to format ISO with +00:00 timezone
  function getNowIsoWithTimezone() {
    return new Date().toISOString().replace('Z', '+00:00');
  }

  // Set default ISO Date & Time in modal
  if (sessionDateTimeInput && !sessionDateTimeInput.value) {
    sessionDateTimeInput.value = getNowIsoWithTimezone();
  }

  // Load coaches & athletes for modal dropdowns
  async function loadModalOptions() {
    try {
      const [coachRes, athleteRes] = await Promise.all([
        fetch('/api/v1/user/coach'),
        fetch('/api/v1/user/athlete'),
      ]);
      const coachJson = await coachRes.json();
      const athleteJson = await athleteRes.json();

      const coaches = coachJson.data?.attributes || coachJson.data || [];
      const athletes = athleteJson.data?.attributes || athleteJson.data || [];

      const coachSelect = document.getElementById('assignedCoach');
      const athleteSelect = document.getElementById('athleteName');

      if (coachSelect && Array.isArray(coaches) && coaches.length > 0) {
        coachSelect.innerHTML = coaches.map((c) => `
          <option value="${c._id}">${escapeHtml(c.fullName || 'Coach')}</option>
        `).join('');
      }

      if (athleteSelect && Array.isArray(athletes) && athletes.length > 0) {
        athleteSelect.innerHTML = athletes.map((a) => `
          <option value="${a._id}">${escapeHtml(a.fullName || 'Athlete')}</option>
        `).join('');
      }
    } catch (e) {
      console.warn('Could not populate modal coaches/athletes:', e);
    }
  }
  loadModalOptions();

  function showToast(message, isError = false) {
    if (!toastNotification) return;
    toastMsg.textContent = message;
    toastIcon.textContent = isError ? '⚠️' : '✅';
    toastNotification.style.background = isError ? '#DC2626' : '#101828';
    toastNotification.style.display = 'flex';
    setTimeout(() => {
      toastNotification.style.display = 'none';
    }, 3500);
  }

  function openModal() {
    if (scheduleModal) {
      scheduleModal.classList.add('open');
    }
  }

  function closeModal() {
    if (scheduleModal) {
      scheduleModal.classList.remove('open');
    }
  }

  if (openScheduleModalBtn) openScheduleModalBtn.addEventListener('click', openModal);
  if (topQuickScheduleBtn) topQuickScheduleBtn.addEventListener('click', openModal);
  if (closeScheduleModalBtn) closeScheduleModalBtn.addEventListener('click', closeModal);
  if (cancelScheduleBtn) cancelScheduleBtn.addEventListener('click', closeModal);

  if (scheduleModal) {
    scheduleModal.addEventListener('click', (e) => {
      if (e.target === scheduleModal) {
        closeModal();
      }
    });
  }

  // Filter tabs listeners
  const tabButtons = document.querySelectorAll('.schedule-tab-btn');
  tabButtons.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabButtons.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.getAttribute('data-filter') || 'all';
      loadSessions(currentFilter);
    });
  });

  async function loadSessions(filter = 'all') {
    try {
      sessionsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: #fff; border-radius: 14px; border: 1px dashed #D1D5DC;">
          <span style="font-size: 32px;">⏳</span>
          <p style="font-size: 13.5px; color: #6A7282; margin: 8px 0 0;">Loading sessions...</p>
        </div>
      `;

      let url = '/api/v1/session/overview';
      if (filter && filter !== 'all') {
        url += `?type=${encodeURIComponent(filter)}`;
      }

      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok || (json.status && json.status !== 'success')) {
        throw new Error(json.message || 'Failed to load sessions');
      }

      const payloadData = json.data?.attributes || json.data || {};
      const filterCounts = payloadData.filterCounts || {};
      const sessions = payloadData.sessions || [];

      // Update Tab Counter Labels
      if (filterCounts) {
        if (tabAll) tabAll.textContent = `All (${filterCounts.all || 0})`;
        if (tabSessions) tabSessions.textContent = `Sessions (${filterCounts.sessions || 0})`;
        if (tabAssignments) tabAssignments.textContent = `Assignments (${filterCounts.assignments || 0})`;
        if (tabAdmission) tabAdmission.textContent = `Admission Calls (${filterCounts.admissionCalls || 0})`;
        if (tabMatch) tabMatch.textContent = `Match Activations (${filterCounts.matchActivations || 0})`;
      }

      if (!sessions || sessions.length === 0) {
        sessionsGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: #fff; border-radius: 14px; border: 1px dashed #E5E7EB;">
            <span style="font-size: 36px;">📋</span>
            <h3 style="font-size: 16px; color: #101828; margin: 12px 0 4px; font-weight: 700;">No scheduled sessions found</h3>
            <p style="font-size: 13px; color: #6A7282; margin: 0 0 16px;">There are no items matching this category yet.</p>
            <button type="button" class="btn-schedule-session" onclick="document.getElementById('openScheduleModalBtn').click()">+ Schedule Session</button>
          </div>
        `;
        return;
      }

      // Render Session Cards
      sessionsGrid.innerHTML = sessions.map((s) => {
        const isAdmission = s.sessionType === 'admission-call';
        const cardClass = isAdmission ? 'session-card highlight-admission' : 'session-card';

        let badgeClass = 'badge-session';
        if (s.sessionType === 'assignment') badgeClass = 'badge-assignment';
        else if (s.sessionType === 'admission-call') badgeClass = 'badge-admission';
        else if (s.sessionType === 'match-activation' || s.sessionType === 'match-audit') badgeClass = 'badge-match';

        const avatarColor = s.athlete?.avatarColor || '#2B7FFF';
        const avatarInitials = s.athlete?.avatarInitials || 'AT';
        const athleteName = s.athlete?.fullName || 'Athlete';
        const coachName = s.coach?.fullName || 'Coach Rivera';

        return `
          <article class="${cardClass}">
            <div>
              <div class="session-card-header">
                <span class="session-badge ${badgeClass}">${escapeHtml(s.typeBadge || 'SESSION')}</span>
                <span class="session-card-date">${escapeHtml(s.date || '')}</span>
              </div>
              <h3 class="session-card-title">${escapeHtml(s.title || '')}</h3>
              <div class="session-athlete-row">
                <div class="session-avatar" style="background-color: ${avatarColor};">
                  ${escapeHtml(avatarInitials)}
                </div>
                <div class="session-athlete-meta">
                  <span class="session-athlete-name">${escapeHtml(athleteName)}</span>
                  <span class="session-coach-name">${escapeHtml(coachName)}</span>
                </div>
              </div>
            </div>

            <div class="session-meta-footer">
              <span class="meta-clock-icon">⏱</span>
              <span class="meta-time">${escapeHtml(s.startTime || '')}</span>
              <span class="meta-sep">·</span>
              <span class="meta-duration">${escapeHtml(s.duration || '')}</span>
              <span class="meta-sep">·</span>
              <span class="meta-platform">${escapeHtml(s.platform || '')}</span>
            </div>
          </article>
        `;
      }).join('');

    } catch (err) {
      console.error('Error fetching sessions:', err);
      sessionsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: #fff; border-radius: 14px; border: 1px dashed #FCA5A5;">
          <span style="font-size: 32px;">⚠️</span>
          <p style="font-size: 14px; color: #DC2626; margin: 8px 0;">Error loading sessions: ${escapeHtml(err.message)}</p>
          <button type="button" class="btn-schedule-session" onclick="window.location.reload()">Retry</button>
        </div>
      `;
    }
  }

  // Handle Form Submission (Modal #33305:4485)
  if (scheduleSessionForm) {
    scheduleSessionForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = document.getElementById('sessionTitle')?.value?.trim();
      const sessionType = document.getElementById('sessionType')?.value;
      const coach = document.getElementById('assignedCoach')?.value?.trim();
      const athlete = document.getElementById('athleteName')?.value?.trim();
      const dateTime = document.getElementById('sessionDateTime')?.value?.trim();

      if (!title || !dateTime || !athlete) {
        showToast('Please fill in required fields.', true);
        return;
      }

      const submitBtn = document.getElementById('confirmScheduleBtn');
      const originalBtnText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Scheduling...';

      try {
        const payload = {
          title,
          sessionType,
          coach,
          athlete,
          dateTime,
        };

        const res = await fetch('/api/v1/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok || (data.status && data.status !== 'success')) {
          throw new Error(data.message || 'Failed to create session');
        }

        showToast('Session scheduled & calendar invite sent!');
        closeModal();
        scheduleSessionForm.reset();
        if (sessionDateTimeInput) {
          sessionDateTimeInput.value = getNowIsoWithTimezone();
        }

        // Reload sessions
        await loadSessions(currentFilter);
      } catch (err) {
        console.error('Submission error:', err);
        showToast(err.message || 'Error scheduling session', true);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Initial load
  loadSessions('all');
});
