document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentStep = 1;
  let activitiesState = [];
  let availableAthletes = [];
  let selectedAthleteIds = new Set();

  // Elements
  const wizardOverlay = document.getElementById('wizardOverlay');
  const openWizardBtn = document.getElementById('openWizardBtn');
  const topCreateBtn = document.getElementById('topCreateBtn');
  const closeWizardBtn = document.getElementById('closeWizardBtn');
  const wizardBackBtn = document.getElementById('wizardBackBtn');
  const wizardNextBtn = document.getElementById('wizardNextBtn');
  const wizardLaunchBtn = document.getElementById('wizardLaunchBtn');
  const wizardQuickFillBtn = document.getElementById('wizardQuickFillBtn');
  const wizardStepSub = document.getElementById('wizardStepSub');
  const wizardTitle = document.getElementById('wizardTitle');

  // Stats elements
  const statActiveCount = document.getElementById('statActiveCount');
  const statParticipantsCount = document.getElementById('statParticipantsCount');
  const statXpCount = document.getElementById('statXpCount');
  const challengesGrid = document.getElementById('challengesGrid');

  // Step 1 Elements
  const iconPicker = document.getElementById('iconPicker');
  const selectedIconInput = document.getElementById('selectedIcon');
  const challengeNameInput = document.getElementById('challengeNameInput');
  const categoryPillGroup = document.getElementById('categoryPillGroup');
  const selectedCategoryInput = document.getElementById('selectedCategory');
  const difficultyPillGroup = document.getElementById('difficultyPillGroup');
  const selectedDifficultyInput = document.getElementById('selectedDifficulty');
  const challengeDescInput = document.getElementById('challengeDescInput');

  // Step 2 Elements
  const startDateInput = document.getElementById('startDateInput');
  const endDateInput = document.getElementById('endDateInput');
  const xpGoalInput = document.getElementById('xpGoalInput');
  const showAddActivityBtn = document.getElementById('showAddActivityBtn');
  const newActivityBox = document.getElementById('newActivityBox');
  const newActTitle = document.getElementById('newActTitle');
  const newActDesc = document.getElementById('newActDesc');
  const newActXp = document.getElementById('newActXp');
  const actCategoryPills = document.getElementById('actCategoryPills');
  const saveInlineActivityBtn = document.getElementById('saveInlineActivityBtn');
  const cancelInlineActivityBtn = document.getElementById('cancelInlineActivityBtn');
  const addedActivitiesList = document.getElementById('addedActivitiesList');
  const activitiesHeaderLabel = document.getElementById('activitiesHeaderLabel');
  let currentInlineActCat = 'mindset';

  // Step 3 Elements
  const athletesSelectList = document.getElementById('athletesSelectList');
  const selectedAthletesCountBadge = document.getElementById('selectedAthletesCountBadge');

  // Step 4 Elements
  const revIcon = document.getElementById('revIcon');
  const revTitle = document.getElementById('revTitle');
  const revDifficulty = document.getElementById('revDifficulty');
  const revDesc = document.getElementById('revDesc');
  const revDates = document.getElementById('revDates');
  const revXpGoal = document.getElementById('revXpGoal');
  const revAthletesCount = document.getElementById('revAthletesCount');
  const revActivitiesLabel = document.getElementById('revActivitiesLabel');
  const revActivitiesList = document.getElementById('revActivitiesList');
  const revParticipantsLabel = document.getElementById('revParticipantsLabel');
  const revParticipantsChips = document.getElementById('revParticipantsChips');

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

  // Set default dates (Today to +30 days)
  const today = new Date();
  const nextMonth = new Date();
  nextMonth.setDate(today.getDate() + 30);
  startDateInput.value = today.toISOString().split('T')[0];
  endDateInput.value = nextMonth.toISOString().split('T')[0];

  // Load Dashboard Data
  loadCommunityOverview();
  loadPeople();

  // Check if URL has ?open=create
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('open') === 'create') {
    openWizard();
  }

  // Event Listeners for Wizard Open/Close
  if (openWizardBtn) openWizardBtn.addEventListener('click', openWizard);
  if (topCreateBtn) topCreateBtn.addEventListener('click', openWizard);
  if (closeWizardBtn) closeWizardBtn.addEventListener('click', closeWizard);

  function openWizard() {
    wizardOverlay.classList.add('open');
    goToStep(1);
  }

  function closeWizard() {
    wizardOverlay.classList.remove('open');
  }

  // Wizard Step Navigation
  wizardNextBtn.addEventListener('click', () => {
    if (validateCurrentStep()) {
      goToStep(currentStep + 1);
    }
  });

  wizardBackBtn.addEventListener('click', () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  });

  function goToStep(step) {
    currentStep = step;

    // Update Titles
    const stepTitles = {
      1: 'Challenge Setup',
      2: 'Activities & Duration',
      3: 'Assign Athletes',
      4: 'Review & Launch',
    };
    wizardTitle.textContent = stepTitles[step] || 'Create Challenge';
    wizardStepSub.textContent = `Step ${step} of 4`;

    // Toggle Panes
    for (let i = 1; i <= 4; i++) {
      const pane = document.getElementById(`stepPane${i}`);
      const node = document.getElementById(`stepNode${i}`);
      const div = document.getElementById(`stepDiv${i}`);

      if (pane) pane.classList.toggle('active', i === step);

      if (node) {
        node.classList.remove('active', 'completed');
        if (i === step) node.classList.add('active');
        else if (i < step) node.classList.add('completed');
      }

      if (div) {
        div.classList.toggle('completed', i < step);
      }
    }

    // Toggle Back / Next / Launch buttons
    wizardBackBtn.style.visibility = step > 1 ? 'visible' : 'hidden';

    if (step === 4) {
      wizardNextBtn.style.display = 'none';
      wizardLaunchBtn.style.display = 'inline-flex';
      renderStep4Review();
    } else {
      wizardNextBtn.style.display = 'inline-flex';
      wizardLaunchBtn.style.display = 'none';
    }
  }

  function validateCurrentStep() {
    if (currentStep === 1) {
      if (!challengeNameInput.value.trim()) {
        showToast('Please enter a Challenge Name.', true);
        challengeNameInput.focus();
        return false;
      }
    } else if (currentStep === 2) {
      if (!startDateInput.value || !endDateInput.value) {
        showToast('Please select both Start and End dates.', true);
        return false;
      }
      if (new Date(startDateInput.value) > new Date(endDateInput.value)) {
        showToast('Start date cannot be after End date.', true);
        return false;
      }
    }
    return true;
  }

  // Step 1: Icon Picker
  iconPicker.querySelectorAll('.icon-btn-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      iconPicker.querySelectorAll('.icon-btn-opt').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedIconInput.value = btn.dataset.icon;
    });
  });

  // Step 1: Category Pills
  categoryPillGroup.querySelectorAll('.pill-opt-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      categoryPillGroup.querySelectorAll('.pill-opt-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedCategoryInput.value = btn.dataset.val;
    });
  });

  // Step 1: Difficulty Pills
  difficultyPillGroup.querySelectorAll('.pill-opt-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      difficultyPillGroup.querySelectorAll('.pill-opt-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedDifficultyInput.value = btn.dataset.val;
    });
  });

  // Step 2: Activity Category Pills
  actCategoryPills.querySelectorAll('.pill-opt-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      actCategoryPills.querySelectorAll('.pill-opt-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      currentInlineActCat = btn.dataset.actcat;
    });
  });

  // Step 2: Show/Hide Inline Activity Form
  showAddActivityBtn.addEventListener('click', () => {
    newActivityBox.style.display = 'flex';
    newActTitle.focus();
  });

  cancelInlineActivityBtn.addEventListener('click', () => {
    resetInlineActivityForm();
  });

  saveInlineActivityBtn.addEventListener('click', () => {
    const title = newActTitle.value.trim();
    if (!title) {
      showToast('Activity title is required.', true);
      newActTitle.focus();
      return;
    }

    const xp = parseInt(newActXp.value, 10) || 50;
    const desc = newActDesc.value.trim();

    activitiesState.push({
      title,
      description: desc,
      xpReward: xp,
      category: currentInlineActCat,
      isRequired: true,
    });

    resetInlineActivityForm();
    renderAddedActivities();
  });

  function resetInlineActivityForm() {
    newActTitle.value = '';
    newActDesc.value = '';
    newActXp.value = '50';
    newActivityBox.style.display = 'none';
  }

  function renderAddedActivities() {
    addedActivitiesList.innerHTML = '';
    activitiesHeaderLabel.textContent = `Challenge Activities (${activitiesState.length})`;

    if (activitiesState.length === 0) {
      addedActivitiesList.innerHTML = `<p style="font-size:12px; color:#99A1AF; margin: 4px 0;">No activities added yet. Click "+ Add Activity" above to configure tasks.</p>`;
      return;
    }

    activitiesState.forEach((act, idx) => {
      const item = document.createElement('div');
      item.className = 'activity-inline-item';
      item.innerHTML = `
        <div class="activity-inline-info">
          <span class="activity-inline-title">${idx + 1}. ${escapeHtml(act.title)}</span>
          <span class="activity-inline-sub">${escapeHtml(act.description || capitalize(act.category))}</span>
        </div>
        <span class="activity-inline-xp">+${act.xpReward} XP</span>
        <button type="button" class="btn-trash-inline" data-idx="${idx}" title="Delete activity">🗑️</button>
      `;
      addedActivitiesList.appendChild(item);
    });

    addedActivitiesList.querySelectorAll('.btn-trash-inline').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx, 10);
        activitiesState.splice(idx, 1);
        renderAddedActivities();
      });
    });
  }

  // Load Participating Athletes for Step 3
  async function loadPeople() {
    try {
      const resA = await fetch('/api/v1/user/athlete');
      const dataA = await resA.json();
      if (dataA.status === 'success' && Array.isArray(dataA.data?.attributes)) {
        availableAthletes = dataA.data.attributes;
        renderAthletesList();
      }
    } catch (err) {
      console.error('Failed to load athletes:', err);
    }
  }

  function renderAthletesList() {
    if (!athletesSelectList) return;
    athletesSelectList.innerHTML = '';
    if (availableAthletes.length === 0) {
      athletesSelectList.innerHTML = `<p style="font-size:12px; color:#99A1AF;">No athletes found. Intake an athlete from the topbar tab.</p>`;
      return;
    }

    availableAthletes.forEach((ath) => {
      const initials = getInitials(ath.fullName);
      const isChecked = selectedAthleteIds.has(ath._id);

      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.justifyContent = 'space-between';
      label.style.padding = '6px 8px';
      label.style.background = '#FFFFFF';
      label.style.borderRadius = '8px';
      label.style.border = '1px solid #E5E7EB';
      label.style.cursor = 'pointer';

      label.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <input type="checkbox" value="${ath._id}" ${isChecked ? 'checked' : ''} style="cursor:pointer;">
          <div style="width:24px; height:24px; border-radius:9999px; background:#2B7FFF; color:#fff; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700;">
            ${initials}
          </div>
          <div>
            <div style="font-size:12.5px; font-weight:600; color:#101828;">${escapeHtml(ath.fullName)}</div>
            <div style="font-size:10.5px; color:#6A7282;">${escapeHtml(ath.currentClub || 'Academy Athlete')}</div>
          </div>
        </div>
        <span style="font-size:11px; font-weight:600; color:#E8A820;">${ath.xp || 0} XP</span>
      `;

      const checkbox = label.querySelector('input[type="checkbox"]');
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selectedAthleteIds.add(ath._id);
        else selectedAthleteIds.delete(ath._id);
        if (selectedAthletesCountBadge) {
          selectedAthletesCountBadge.textContent = `${selectedAthleteIds.size} selected`;
        }
      });

      athletesSelectList.appendChild(label);
    });

    if (selectedAthletesCountBadge) {
      selectedAthletesCountBadge.textContent = `${selectedAthleteIds.size} selected`;
    }
  }

  // Step 4 Review
  function renderStep4Review() {
    revIcon.textContent = selectedIconInput.value || '🏆';
    revTitle.textContent = challengeNameInput.value.trim() || 'Untitled Challenge';
    revDifficulty.textContent = capitalize(selectedDifficultyInput.value || 'medium');
    revDifficulty.className = `badge-difficulty ${selectedDifficultyInput.value.toLowerCase()}`;
    revDesc.textContent = challengeDescInput.value.trim() || 'No description provided.';
    revDates.textContent = `📅 ${startDateInput.value || 'N/A'} → ${endDateInput.value || 'N/A'}`;
    revXpGoal.textContent = `⚡ ${xpGoalInput.value || 300} XP Goal`;
    revAthletesCount.textContent = `👥 ${selectedAthleteIds.size} Athletes`;

    // Activities list
    const totalXp = activitiesState.reduce((sum, a) => sum + (a.xpReward || 0), 0);
    revActivitiesLabel.textContent = `Activities (${activitiesState.length}) · ${totalXp} Total XP`;
    revActivitiesList.innerHTML = '';
    activitiesState.forEach((act, idx) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'space-between';
      row.style.padding = '8px 12px';
      row.style.background = '#FFFFFF';
      row.style.border = '1px solid #E5E7EB';
      row.style.borderRadius = '8px';
      row.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:11px; font-weight:700; color:#99A1AF;">${idx + 1}</span>
          <span style="font-size:12.5px; font-weight:600; color:#101828;">${escapeHtml(act.title)}</span>
          <span style="font-size:11px; color:#6A7282;">(${capitalize(act.category)})</span>
        </div>
        <span style="font-size:12px; font-weight:700; color:#E8A820;">+${act.xpReward} XP</span>
      `;
      revActivitiesList.appendChild(row);
    });

    // Participants chips
    revParticipantsLabel.textContent = `Participants (${selectedAthleteIds.size})`;
    revParticipantsChips.innerHTML = '';
    selectedAthleteIds.forEach((id) => {
      const ath = availableAthletes.find((a) => a._id === id);
      if (ath) {
        const chip = document.createElement('div');
        chip.style.display = 'flex';
        chip.style.alignItems = 'center';
        chip.style.gap = '6px';
        chip.style.padding = '4px 10px 4px 4px';
        chip.style.background = '#FFFFFF';
        chip.style.border = '1px solid #E5E7EB';
        chip.style.borderRadius = '9999px';
        chip.innerHTML = `
          <div style="width:20px; height:20px; border-radius:9999px; background:#2B7FFF; color:#fff; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:700;">
            ${getInitials(ath.fullName)}
          </div>
          <span style="font-size:11.5px; font-weight:600; color:#101828;">${escapeHtml(ath.fullName)}</span>
        `;
        revParticipantsChips.appendChild(chip);
      }
    });
  }

  // Launch Challenge Submission
  wizardLaunchBtn.addEventListener('click', async () => {
    try {
      wizardLaunchBtn.disabled = true;
      wizardLaunchBtn.textContent = 'Launching...';

      const payload = {
        title: challengeNameInput.value.trim(),
        description: challengeDescInput.value.trim(),
        icon: selectedIconInput.value || '🏆',
        category: selectedCategoryInput.value || 'mental',
        difficulty: selectedDifficultyInput.value || 'medium',
        startDate: startDateInput.value,
        endDate: endDateInput.value,
        xpGoal: Number(xpGoalInput.value) || 300,
        activities: activitiesState,
        assignedAthletes: Array.from(selectedAthleteIds),
      };

      const res = await fetch('/api/v1/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        showToast('🚀 Challenge created and launched successfully!');
        closeWizard();
        loadDashboardStats();
        loadChallenges();
      } else {
        showToast(data.message || 'Failed to create challenge.', true);
      }
    } catch (err) {
      console.error('Error creating challenge:', err);
      showToast('Network error while launching challenge.', true);
    } finally {
      wizardLaunchBtn.disabled = false;
      wizardLaunchBtn.textContent = '🚀 Launch Challenge';
    }
  });

  // Quick Fill Button (Figma Node Values)
  wizardQuickFillBtn.addEventListener('click', () => {
    selectedIconInput.value = '🏆';
    iconPicker.querySelectorAll('.icon-btn-opt').forEach((b) => {
      b.classList.toggle('selected', b.dataset.icon === '🏆');
    });

    challengeNameInput.value = 'Mental Toughness Week';
    challengeDescInput.value = 'Complete 7 consecutive daily mental drills and maintain 100% habit compliance under match conditions.';

    selectedCategoryInput.value = 'mental';
    categoryPillGroup.querySelectorAll('.pill-opt-btn').forEach((b) => {
      b.classList.toggle('selected', b.dataset.val === 'mental');
    });

    selectedDifficultyInput.value = 'elite';
    difficultyPillGroup.querySelectorAll('.pill-opt-btn').forEach((b) => {
      b.classList.toggle('selected', b.dataset.val === 'elite');
    });

    startDateInput.value = '2026-09-01';
    endDateInput.value = '2026-09-30';
    xpGoalInput.value = '500';

    activitiesState = [
      {
        title: 'Morning Mindset Journal',
        description: 'Write 3 non-negotiables before training.',
        xpReward: 50,
        category: 'mindset',
        isRequired: true,
      },
      {
        title: 'Goldfish Reset Protocol',
        description: '3-second memory purge after each mistake.',
        xpReward: 75,
        category: 'mental',
        isRequired: true,
      },
      {
        title: 'Match Focus Sprint',
        description: 'Execute pre-game routine flawlessly.',
        xpReward: 50,
        category: 'technical',
        isRequired: false,
      },
    ];
    renderAddedActivities();

    // Select all available athletes
    availableAthletes.forEach((a) => selectedAthleteIds.add(a._id));
    renderAthletesList();

    showToast('Figma mock data loaded into wizard!');
  });

  // Load Unified Community Overview (Figma Node 33299:22507)
  async function loadCommunityOverview() {
    try {
      const res = await fetch('/api/v1/challenge/overview');
      const data = await res.json();
      if (res.ok && data.status === 'success' && data.data?.attributes) {
        const { stats, challenges } = data.data.attributes;
        if (stats) {
          if (statActiveCount) statActiveCount.textContent = stats.activeChallengesCount || 0;
          if (statParticipantsCount) statParticipantsCount.textContent = stats.totalParticipantsCount || 0;
          if (statXpCount) statXpCount.textContent = (stats.xpAwardedThisMonth || 0).toLocaleString();
        }
        if (Array.isArray(challenges)) {
          challengesGrid.innerHTML = '';
          if (challenges.length === 0) {
            challengesGrid.innerHTML = `
              <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: #fff; border-radius: 16px; border: 1px dashed #D1D5DC;">
                <span style="font-size: 36px;">🏆</span>
                <h3 style="font-size: 16px; font-weight: 700; color: #101828; margin: 8px 0 4px;">No Challenges Active</h3>
                <p style="font-size: 13px; color: #6A7282; margin: 0 0 16px;">Create your first challenge to get athletes motivated and logging daily drills.</p>
                <button type="button" class="btn-create-challenge" onclick="document.getElementById('openWizardBtn').click()">+ Create Challenge</button>
              </div>
            `;
            return;
          }
          challenges.forEach((ch) => {
            const card = renderChallengeCard(ch);
            challengesGrid.appendChild(card);
          });
        }
      } else {
        loadDashboardStats();
        loadChallenges();
      }
    } catch (err) {
      console.warn('Overview fallback to separate endpoints:', err);
      loadDashboardStats();
      loadChallenges();
    }
  }

  // Load Dashboard Stats
  async function loadDashboardStats() {
    try {
      const res = await fetch('/api/v1/challenge/stats');
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        const stats = data.data.attributes;
        if (statActiveCount) statActiveCount.textContent = stats.activeChallengesCount || 0;
        if (statParticipantsCount) statParticipantsCount.textContent = stats.totalParticipantsCount || 0;
        if (statXpCount) statXpCount.textContent = (stats.xpAwardedThisMonth || 0).toLocaleString();
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  // Load Challenges List
  async function loadChallenges() {
    try {
      const res = await fetch('/api/v1/challenge');
      const data = await res.json();
      challengesGrid.innerHTML = '';

      if (res.ok && data.status === 'success' && Array.isArray(data.data.attributes)) {
        const challenges = data.data.attributes;

        if (challenges.length === 0) {
          challengesGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: #fff; border-radius: 16px; border: 1px dashed #D1D5DC;">
              <span style="font-size: 36px;">🏆</span>
              <h3 style="font-size: 16px; font-weight: 700; color: #101828; margin: 8px 0 4px;">No Challenges Active</h3>
              <p style="font-size: 13px; color: #6A7282; margin: 0 0 16px;">Create your first challenge to get athletes motivated and logging daily drills.</p>
              <button type="button" class="btn-create-challenge" onclick="document.getElementById('openWizardBtn').click()">+ Create Challenge</button>
            </div>
          `;
          return;
        }

        challenges.forEach((ch) => {
          const card = renderChallengeCard(ch);
          challengesGrid.appendChild(card);
        });
      }
    } catch (err) {
      console.error('Failed to load challenges:', err);
    }
  }

  function renderChallengeCard(ch) {
    const card = document.createElement('article');
    card.className = 'challenge-card';

    const startDateStr = ch.startDate ? ch.startDate.split('T')[0] : '';
    const endDateStr = ch.endDate ? ch.endDate.split('T')[0] : '';
    const athletesCount = ch.athletesCount || (ch.assignedAthletes?.length) || 0;

    // Build athlete avatar overlap bubbles
    let avatarsHtml = '';
    if (Array.isArray(ch.assignedAthletes)) {
      ch.assignedAthletes.slice(0, 4).forEach((ath, i) => {
        const colors = ['#2B7FFF', '#615FFF', '#8E51FF', '#FF2056', '#00BC7D'];
        const bg = ath.avatarColor || colors[i % colors.length];
        const initials = ath.avatarInitials || (ath.fullName ? getInitials(ath.fullName) : 'AT');
        avatarsHtml += `<div class="avatar-overlap" style="background:${bg};">${initials}</div>`;
      });
    }

    card.innerHTML = `
      <div class="challenge-card-top">
        <div class="challenge-card-title-row">
          <div class="challenge-icon-box">${ch.icon || '🏆'}</div>
          <div class="challenge-card-heading-box">
            <div class="challenge-card-title-badges">
              <h3 class="challenge-card-title">${escapeHtml(ch.title)}</h3>
              <span class="badge-difficulty ${ch.difficulty || 'medium'}">${capitalize(ch.difficulty || 'medium')}</span>
            </div>
            <p class="challenge-card-desc">${escapeHtml(ch.description || '')}</p>
          </div>
        </div>
        <div class="badge-xp-goal">
          ⚡ ${ch.xpGoal || 300} XP
        </div>
      </div>

      <div class="challenge-card-meta">
        <div class="challenge-meta-item">
          👥 <strong>${athletesCount}</strong> Athletes
        </div>
        <div class="challenge-meta-item">
          📅 ${startDateStr} → ${endDateStr}
        </div>
        <div class="challenge-meta-item" style="color:#BB4D00; font-weight:700;">
          ⚡ ${ch.xpGoal || 300} XP
        </div>
      </div>

      <div class="challenge-card-footer">
        <div class="challenge-card-avatars">
          ${avatarsHtml}
          ${athletesCount > 4 ? `<span class="avatar-overlap-label">+${athletesCount - 4} more</span>` : ''}
        </div>
        <a href="/manage-challenge?id=${ch._id}" class="btn-card-manage">
          Manage →
        </a>
      </div>
    `;

    return card;
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
