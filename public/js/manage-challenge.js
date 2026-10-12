document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const challengeId = urlParams.get('id');

  if (!challengeId) {
    // If no ID provided, try to fetch the first challenge or redirect
    fetchFirstChallengeOrRedirect();
    return;
  }

  // State
  let challengeData = null;
  let allAvailableAthletes = [];

  // Header Elements
  const detailIcon = document.getElementById('detailIcon');
  const detailTitle = document.getElementById('detailTitle');
  const detailDifficulty = document.getElementById('detailDifficulty');
  const detailDesc = document.getElementById('detailDesc');
  const detailParticipantsVal = document.getElementById('detailParticipantsVal');
  const detailCoachesSub = document.getElementById('detailCoachesSub');
  const detailXpGoalVal = document.getElementById('detailXpGoalVal');
  const detailActivitiesVal = document.getElementById('detailActivitiesVal');
  const detailDaysRemainingVal = document.getElementById('detailDaysRemainingVal');
  const detailEndsSub = document.getElementById('detailEndsSub');
  const deleteChallengeBtn = document.getElementById('deleteChallengeBtn');

  // Tab Elements
  const tabButtons = document.querySelectorAll('.manage-tab-btn');
  const tabPanelOverview = document.getElementById('tabPanelOverview');
  const tabPanelActivities = document.getElementById('tabPanelActivities');
  const tabPanelParticipants = document.getElementById('tabPanelParticipants');
  const tabPanelLeaderboard = document.getElementById('tabPanelLeaderboard');
  const tabPanelChat = document.getElementById('tabPanelChat');

  // Overview Tab
  const overviewDates = document.getElementById('overviewDates');
  const overviewDaysMeta = document.getElementById('overviewDaysMeta');
  const chatCardTitle = document.getElementById('chatCardTitle');
  const chatCardMembers = document.getElementById('chatCardMembers');
  const overviewActivitiesList = document.getElementById('overviewActivitiesList');
  const btnOpenChatTab = document.getElementById('btnOpenChatTab');

  // Activities Tab
  const activitiesSubHeader = document.getElementById('activitiesSubHeader');
  const activitiesCardsList = document.getElementById('activitiesCardsList');
  const openAddActivityModalBtn = document.getElementById('openAddActivityModalBtn');

  // Participants Tab
  const participantsSubHeader = document.getElementById('participantsSubHeader');
  const participantsCardsGrid = document.getElementById('participantsCardsGrid');
  const openAddParticipantModalBtn = document.getElementById('openAddParticipantModalBtn');

  // Leaderboard Tab
  const leaderboardList = document.getElementById('leaderboardList');

  // Modals
  const awardXpModal = document.getElementById('awardXpModal');
  const openAwardXpModalBtn = document.getElementById('openAwardXpModalBtn');
  const closeAwardXpBtn = document.getElementById('closeAwardXpBtn');
  const cancelAwardXpBtn = document.getElementById('cancelAwardXpBtn');
  const awardXpForm = document.getElementById('awardXpForm');
  const awardAthleteSelect = document.getElementById('awardAthleteSelect');
  const awardActivityTitleInput = document.getElementById('awardActivityTitleInput');
  const awardXpAmountInput = document.getElementById('awardXpAmountInput');
  const challengeActivitiesDatalist = document.getElementById('challengeActivitiesDatalist');

  const addActivityModal = document.getElementById('addActivityModal');
  const closeAddActModalBtn = document.getElementById('closeAddActModalBtn');
  const cancelAddActModalBtn = document.getElementById('cancelAddActModalBtn');
  const addActivityForm = document.getElementById('addActivityForm');

  const addParticipantModal = document.getElementById('addParticipantModal');
  const closeAddPartModalBtn = document.getElementById('closeAddPartModalBtn');
  const cancelAddPartModalBtn = document.getElementById('cancelAddPartModalBtn');
  const addParticipantForm = document.getElementById('addParticipantForm');
  const modalEnrollAthleteSelect = document.getElementById('modalEnrollAthleteSelect');

  // Toast
  const toast = document.getElementById('toastNotification');
  const toastMsg = document.getElementById('toastMsg');
  const toastIcon = document.getElementById('toastIcon');

  function showToast(message, isError = false) {
    if (!toast) return;
    toastMsg.textContent = message;
    toastIcon.textContent = isError ? '⚠️' : '✅';
    toast.style.display = 'flex';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3500);
  }

  // Initial Load
  loadChallengeDetails();
  loadAllAthletes();

  // Tab Switching
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.dataset.tab;
      tabPanelOverview.classList.toggle('active', targetTab === 'overview');
      tabPanelActivities.classList.toggle('active', targetTab === 'activities');
      tabPanelParticipants.classList.toggle('active', targetTab === 'participants');
      tabPanelLeaderboard.classList.toggle('active', targetTab === 'leaderboard');
      tabPanelChat.classList.toggle('active', targetTab === 'chat');
    });
  });

  if (btnOpenChatTab) {
    btnOpenChatTab.addEventListener('click', () => {
      document.querySelector('[data-tab="chat"]')?.click();
    });
  }

  // Load Main Challenge Data
  async function loadChallengeDetails() {
    try {
      const res = await fetch(`/api/v1/challenge/${challengeId}`);
      const data = await res.json();

      if (res.ok && data.status === 'success') {
        challengeData = data.data.attributes;
        renderHeader();
        renderOverviewTab();
        renderActivitiesTab();
        renderParticipantsTab();
        renderLeaderboardTab();
        populateAwardModalAthletes();
      } else {
        showToast(data.message || 'Challenge not found.', true);
      }
    } catch (err) {
      console.error('Error loading challenge:', err);
      showToast('Network error loading challenge details.', true);
    }
  }

  // Render Header
  function renderHeader() {
    const ch = challengeData.challenge;
    detailIcon.textContent = ch.icon || '🏆';
    detailTitle.textContent = ch.title || 'Untitled Challenge';
    detailDifficulty.textContent = capitalize(ch.difficulty || 'medium');
    detailDifficulty.className = `badge-difficulty ${ch.difficulty || 'medium'}`;
    detailDesc.textContent = ch.description || 'No description provided.';

    const count = ch.participantsCount ?? ch.athletesCount ?? 0;
    detailParticipantsVal.textContent = count;
    detailCoachesSub.textContent = `${count} athletes enrolled`;
    detailXpGoalVal.textContent = ch.xpGoal || 300;
    detailActivitiesVal.textContent = ch.activitiesCount ?? challengeData.activities?.length ?? 0;
    detailDaysRemainingVal.textContent = ch.daysRemaining ?? 0;

    const endDateStr = ch.endDate ? ch.endDate.split('T')[0] : 'N/A';
    detailEndsSub.textContent = `ends ${endDateStr}`;
  }

  // Render Overview Tab (Figma #33384:4219)
  function renderOverviewTab() {
    const ch = challengeData.challenge;
    const startDateStr = ch.startDate ? ch.startDate.split('T')[0] : '';
    const endDateStr = ch.endDate ? ch.endDate.split('T')[0] : '';

    overviewDates.textContent = `${startDateStr} → ${endDateStr}`;
    overviewDaysMeta.textContent = `${ch.daysActive || 0} days active · ${ch.daysRemaining || 0} days remaining`;

    chatCardTitle.textContent = `${ch.title} – Group`;
    chatCardMembers.textContent = `${ch.athletesCount || 0} members · Auto-created`;

    // Activities summary list
    overviewActivitiesList.innerHTML = '';
    const acts = challengeData.activities || [];
    if (acts.length === 0) {
      overviewActivitiesList.innerHTML = `<p style="font-size:12px; color:#99A1AF;">No activities configured yet.</p>`;
    } else {
      acts.forEach((act, idx) => {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.justifyContent = 'space-between';
        item.style.padding = '10px 14px';
        item.style.background = '#FFFFFF';
        item.style.border = '1px solid #E5E7EB';
        item.style.borderRadius = '10px';
        item.innerHTML = `
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:12px; font-weight:700; color:#99A1AF; width:20px;">${idx + 1}</span>
            <div>
              <div style="font-size:13px; font-weight:600; color:#101828;">${escapeHtml(act.title)}</div>
              <div style="font-size:11.5px; color:#6A7282;">${capitalize(act.category)}${act.description ? ' · ' + escapeHtml(act.description) : ''}</div>
            </div>
          </div>
          <span style="font-size:12.5px; font-weight:700; color:#E8A820;">+${act.xpReward} XP</span>
        `;
        overviewActivitiesList.appendChild(item);
      });
    }
  }

  // Render Activities Tab (Figma #33384:5212)
  function renderActivitiesTab() {
    const acts = challengeData.activities || [];
    const totalXp = challengeData.challenge.totalAvailableXp || acts.reduce((s, a) => s + (a.xpReward || 0), 0);
    activitiesSubHeader.textContent = `${acts.length} activities · ${totalXp} total XP available`;

    activitiesCardsList.innerHTML = '';
    if (acts.length === 0) {
      activitiesCardsList.innerHTML = `
        <div style="text-align:center; padding:32px; background:#F9FAFB; border-radius:12px; border:1px dashed #D1D5DC;">
          <p style="font-size:13px; color:#6A7282;">No tasks or drills added yet. Click "+ Add Activity" above to create one.</p>
        </div>
      `;
      return;
    }

    acts.forEach((act) => {
      const card = document.createElement('div');
      card.style.background = '#FFFFFF';
      card.style.border = '1px solid #E5E7EB';
      card.style.borderRadius = '14px';
      card.style.padding = '18px 20px';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.gap = '12px';

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div style="display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge-difficulty hard" style="font-size:10px;">${capitalize(act.category)}</span>
              <span style="font-size:11.5px; font-weight:700; color:#E8A820;">+${act.xpReward} XP</span>
            </div>
            <h3 style="font-size:14.5px; font-weight:700; color:#101828; margin:2px 0 0;">${escapeHtml(act.title)}</h3>
            <p style="font-size:12px; color:#6A7282; margin:0;">${escapeHtml(act.description || '')}</p>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <button type="button" class="btn-trash-inline delete-activity-btn" data-actid="${act._id}" title="Delete activity">🗑️</button>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:6px; border-top:1px solid #F3F4F6; padding-top:10px;">
          <div style="display:flex; justify-content:space-between; font-size:11.5px;">
            <span style="color:#6A7282;">Athlete Completion (${act.completedCount || 0} completed)</span>
            <span style="font-weight:700; color:#009689;">${act.completionPercentage || 0}%</span>
          </div>
          <div style="width:100%; height:6px; background:#F3F4F6; border-radius:9999px; overflow:hidden;">
            <div style="height:100%; width:${act.completionPercentage || 0}%; background:#00BBA7; border-radius:9999px;"></div>
          </div>
        </div>
      `;

      card.querySelector('.delete-activity-btn').addEventListener('click', async (e) => {
        const idToDelete = e.currentTarget.dataset.actid;
        if (confirm('Are you sure you want to remove this activity?')) {
          await deleteActivity(idToDelete);
        }
      });

      activitiesCardsList.appendChild(card);
    });
  }

  // Render Participants Tab (Figma #33384:5694)
  function renderParticipantsTab() {
    const parts = challengeData.participants || [];
    participantsSubHeader.textContent = `${parts.length} participants enrolled`;

    participantsCardsGrid.innerHTML = '';
    if (parts.length === 0) {
      participantsCardsGrid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:32px; background:#F9FAFB; border-radius:12px; border:1px dashed #D1D5DC;">
          <p style="font-size:13px; color:#6A7282;">No athletes enrolled in this challenge yet. Click "+ Add Participant" above to enroll members.</p>
        </div>
      `;
      return;
    }

    const xpGoal = challengeData.challenge.xpGoal || 300;

    parts.forEach((p) => {
      const ath = p.athlete || {};
      const card = document.createElement('div');
      card.style.background = '#FFFFFF';
      card.style.border = '1px solid #E5E7EB';
      card.style.borderRadius = '14px';
      card.style.padding = '16px';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.gap = '12px';

      const initials = ath.avatarInitials || getInitials(ath.fullName);
      const avatarBg = ath.avatarColor || '#2B7FFF';
      const earnedXp = p.earnedXp || 0;
      const progressPct = p.progressPercentage ?? (xpGoal > 0 ? Math.min(100, Math.round((earnedXp / xpGoal) * 100)) : 0);

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:36px; height:36px; border-radius:9999px; background:${avatarBg}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700;">
              ${initials}
            </div>
            <div>
              <div style="font-size:13.5px; font-weight:600; color:#101828;">${escapeHtml(ath.fullName || 'Athlete')}</div>
            </div>
          </div>
          <button type="button" class="btn-trash-inline unenroll-btn" data-athid="${ath._id}" title="Remove athlete">✕</button>
        </div>

        <div style="display:flex; flex-direction:column; gap:4px; border-top:1px solid #F3F4F6; padding-top:8px;">
          <div style="display:flex; justify-content:space-between; font-size:11.5px;">
            <span style="font-weight:600; color:#101828;">${earnedXp}/${p.xpGoal || xpGoal}</span>
            <span style="font-weight:700; color:#E8A820;">${progressPct}%</span>
          </div>
          <div style="width:100%; height:6px; background:#F3F4F6; border-radius:9999px; overflow:hidden;">
            <div style="height:100%; width:${progressPct}%; background:#E8A820; border-radius:9999px;"></div>
          </div>
        </div>
      `;

      card.querySelector('.unenroll-btn').addEventListener('click', async (e) => {
        const athId = e.currentTarget.dataset.athid;
        if (confirm(`Remove ${ath.fullName || 'this athlete'} from challenge?`)) {
          await removeParticipant(athId);
        }
      });

      participantsCardsGrid.appendChild(card);
    });
  }

  // Render Leaderboard Tab (Figma #33384:6692)
  function renderLeaderboardTab() {
    const board = challengeData.leaderboard || [];
    leaderboardList.innerHTML = '';

    if (board.length === 0) {
      leaderboardList.innerHTML = `
        <div style="text-align:center; padding:32px; background:#F9FAFB; border-radius:12px;">
          <p style="font-size:13px; color:#6A7282;">No participants ranked yet. Award XP to see rankings live!</p>
        </div>
      `;
      return;
    }

    const maxXp = Math.max(...board.map((b) => b.earnedXp || 0), challengeData.challenge.xpGoal || 300);

    board.forEach((item) => {
      const ath = item.athlete || {};
      const row = document.createElement('div');
      row.className = 'leaderboard-item';

      const initials = ath.avatarInitials || getInitials(ath.fullName);
      const avatarBg = ath.avatarColor || '#8E51FF';
      const barWidthPct = item.progressPercentage ?? (maxXp > 0 ? Math.min(100, Math.max(8, Math.round(((item.earnedXp || 0) / maxXp) * 100))) : 8);

      row.innerHTML = `
        <div class="leaderboard-rank">${item.medal}</div>
        <div class="leaderboard-avatar" style="background:${avatarBg}; color:#fff;">${initials}</div>
        <div class="leaderboard-info">
          <span class="leaderboard-name">${escapeHtml(ath.fullName || 'Athlete')}</span>
        </div>
        <span class="leaderboard-xp-tag">${item.earnedXp || 0} XP</span>
        <div class="leaderboard-bar-box">
          <div class="leaderboard-bar-fill" style="width: ${barWidthPct}%;"></div>
        </div>
      `;

      leaderboardList.appendChild(row);
    });
  }

  // Populate Award Modal Select
  function populateAwardModalAthletes() {
    awardAthleteSelect.innerHTML = '';
    const parts = challengeData.participants || [];
    if (parts.length === 0) {
      awardAthleteSelect.innerHTML = `<option value="">No enrolled athletes</option>`;
    } else {
      parts.forEach((p) => {
        const ath = p.athlete;
        if (ath) {
          const opt = document.createElement('option');
          opt.value = ath._id;
          opt.textContent = `${ath.fullName} (Current XP: ${p.earnedXp || 0})`;
          awardAthleteSelect.appendChild(opt);
        }
      });
    }

    // Populate activities datalist
    challengeActivitiesDatalist.innerHTML = '';
    (challengeData.activities || []).forEach((act) => {
      const opt = document.createElement('option');
      opt.value = act.title;
      challengeActivitiesDatalist.appendChild(opt);
    });
  }

  // Load All Athletes for Enrollment
  async function loadAllAthletes() {
    try {
      const res = await fetch('/api/v1/user/athlete');
      const data = await res.json();
      if (res.ok && data.status === 'success' && Array.isArray(data.data.attributes)) {
        allAvailableAthletes = data.data.attributes;
        populateEnrollAthleteSelect();
      }
    } catch (err) {
      console.error('Failed to load athletes:', err);
    }
  }

  function populateEnrollAthleteSelect() {
    modalEnrollAthleteSelect.innerHTML = '';
    allAvailableAthletes.forEach((ath) => {
      const opt = document.createElement('option');
      opt.value = ath._id;
      opt.textContent = `${ath.fullName} (${ath.currentClub || 'Academy'})`;
      modalEnrollAthleteSelect.appendChild(opt);
    });
  }

  // ==================== ACTIONS & MODALS ====================

  // 1. Award XP
  openAwardXpModalBtn.addEventListener('click', () => {
    populateAwardModalAthletes();
    awardXpModal.classList.add('open');
  });
  closeAwardXpBtn.addEventListener('click', () => awardXpModal.classList.remove('open'));
  cancelAwardXpBtn.addEventListener('click', () => awardXpModal.classList.remove('open'));

  awardXpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const athleteId = awardAthleteSelect.value;
    const xpAmount = Number(awardXpAmountInput.value);
    const activityTitle = awardActivityTitleInput.value.trim();

    if (!athleteId) {
      showToast('Please select an athlete.', true);
      return;
    }

    try {
      const res = await fetch(`/api/v1/challenge/${challengeId}/award-xp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteId, xpAmount, activityTitle }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        showToast(`⚡ +${xpAmount} XP awarded successfully!`);
        awardXpModal.classList.remove('open');
        loadChallengeDetails();
      } else {
        showToast(data.message || 'Failed to award XP.', true);
      }
    } catch (err) {
      showToast('Network error while awarding XP.', true);
    }
  });

  // 2. Add Activity
  openAddActivityModalBtn.addEventListener('click', () => addActivityModal.classList.add('open'));
  closeAddActModalBtn.addEventListener('click', () => addActivityModal.classList.remove('open'));
  cancelAddActModalBtn.addEventListener('click', () => addActivityModal.classList.remove('open'));

  addActivityForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('modalActTitle').value.trim();
    const description = document.getElementById('modalActDesc').value.trim();
    const xpReward = Number(document.getElementById('modalActXp').value) || 50;
    const category = document.getElementById('modalActCategory').value;

    try {
      const res = await fetch(`/api/v1/challenge/${challengeId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, xpReward, category, isRequired: true }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        showToast('Activity added to challenge!');
        addActivityModal.classList.remove('open');
        addActivityForm.reset();
        loadChallengeDetails();
      } else {
        showToast(data.message || 'Failed to add activity.', true);
      }
    } catch (err) {
      showToast('Network error adding activity.', true);
    }
  });

  async function deleteActivity(actId) {
    try {
      const res = await fetch(`/api/v1/challenge/${challengeId}/activities/${actId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        showToast('Activity removed.');
        loadChallengeDetails();
      } else {
        showToast(data.message || 'Failed to remove activity.', true);
      }
    } catch (err) {
      showToast('Network error removing activity.', true);
    }
  }

  // 3. Add Participant
  openAddParticipantModalBtn.addEventListener('click', () => addParticipantModal.classList.add('open'));
  closeAddPartModalBtn.addEventListener('click', () => addParticipantModal.classList.remove('open'));
  cancelAddPartModalBtn.addEventListener('click', () => addParticipantModal.classList.remove('open'));

  addParticipantForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const athleteId = modalEnrollAthleteSelect.value;
    if (!athleteId) return;

    try {
      const res = await fetch(`/api/v1/challenge/${challengeId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteId }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        showToast('Athlete enrolled in challenge!');
        addParticipantModal.classList.remove('open');
        loadChallengeDetails();
      } else {
        showToast(data.message || 'Failed to enroll athlete.', true);
      }
    } catch (err) {
      showToast('Network error enrolling athlete.', true);
    }
  });

  async function removeParticipant(athId) {
    try {
      const res = await fetch(`/api/v1/challenge/${challengeId}/participants/${athId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        showToast('Athlete removed from challenge.');
        loadChallengeDetails();
      } else {
        showToast(data.message || 'Failed to remove athlete.', true);
      }
    } catch (err) {
      showToast('Network error removing athlete.', true);
    }
  }

  // 4. Delete Challenge
  deleteChallengeBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete this challenge permanently?')) {
      try {
        const res = await fetch(`/api/v1/challenge/${challengeId}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (res.ok && data.status === 'success') {
          alert('Challenge deleted successfully.');
          window.location.href = '/challenges';
        } else {
          showToast(data.message || 'Failed to delete challenge.', true);
        }
      } catch (err) {
        showToast('Network error deleting challenge.', true);
      }
    }
  });

  // Fallback: If no ID in URL, find first challenge
  async function fetchFirstChallengeOrRedirect() {
    try {
      const res = await fetch('/api/v1/challenge');
      const data = await res.json();
      if (res.ok && data.status === 'success' && data.data.attributes?.length > 0) {
        const firstId = data.data.attributes[0]._id;
        window.location.replace(`/manage-challenge?id=${firstId}`);
      } else {
        window.location.replace('/challenges');
      }
    } catch (e) {
      window.location.replace('/challenges');
    }
  }

  // Utilities
  function getInitials(name) {
    if (!name) return 'AT';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
});
