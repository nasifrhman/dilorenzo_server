/**
 * DI LORENZO SOCCER (DSM SOCCER) — ASSIGN DEDICATED COACH SCRIPT
 * Figma Design Node: 33275-5077 ("Assign Dedicated Coach & Program")
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const form = document.getElementById('assignCoachForm');
  const athleteCards = document.querySelectorAll('.athlete-card-btn');
  const coachCards = document.querySelectorAll('.coach-card-btn');
  const habitLabels = document.querySelectorAll('.habit-checkbox-label');
  const habitsCountBadge = document.getElementById('habitsSelectedCount');
  const selectedAthleteInput = document.getElementById('selectedAthleteId');
  const selectedCoachInput = document.getElementById('selectedCoachId');
  const programTierSelect = document.getElementById('programTier');
  const startingPhaseSelect = document.getElementById('startingPhase');
  const autoLaunchGroupChatCheckbox = document.getElementById('autoLaunchGroupChat');
  const adminWelcomeMessageTextarea = document.getElementById('adminWelcomeMessage');
  const quickFillBtn = document.getElementById('quickFillBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const closeBtn = document.getElementById('closeModalBtn');
  const submitBtn = document.getElementById('submitBtn');

  // Success Elements
  const successOverlay = document.getElementById('successOverlay');
  const successCloseBtn = document.getElementById('successCloseBtn');
  const successNewAssignBtn = document.getElementById('successNewAssignBtn');
  const dispAthleteName = document.getElementById('dispAthleteName');
  const dispCoachName = document.getElementById('dispCoachName');
  const dispTier = document.getElementById('dispTier');
  const dispPhase = document.getElementById('dispPhase');
  const dispHabitsCount = document.getElementById('dispHabitsCount');

  // Load live DB overview if available
  loadLiveOverview();

  async function loadLiveOverview() {
    try {
      const res = await fetch('/api/v1/user/assign-coach/overview');
      if (res.ok) {
        const json = await res.json();
        const athletes = json.data?.athletes || [];
        const coaches = json.data?.coaches || [];

        // Map live athlete ObjectIds onto selection buttons
        if (athletes.length > 0) {
          athletes.forEach((ath, idx) => {
            if (athleteCards[idx]) {
              athleteCards[idx].setAttribute('data-athlete-id', ath._id);
              athleteCards[idx].setAttribute('data-athlete-name', ath.fullName);
              const nameEl = athleteCards[idx].querySelector('.athlete-card-name');
              if (nameEl) nameEl.textContent = ath.fullName;
              if (idx === 0 && !selectedAthleteInput.value) {
                selectedAthleteInput.value = ath._id;
              }
            }
          });
          if (athletes[0]) {
            selectedAthleteInput.value = athletes[0]._id;
          }
        }

        // Map live coach ObjectIds onto selection buttons
        if (coaches.length > 0) {
          coaches.forEach((c, idx) => {
            if (coachCards[idx]) {
              coachCards[idx].setAttribute('data-coach-id', c._id);
              coachCards[idx].setAttribute('data-coach-name', c.fullName);
              const nameEl = coachCards[idx].querySelector('.coach-card-name');
              if (nameEl) nameEl.textContent = c.fullName;
              if (idx === 0 && !selectedCoachInput.value) {
                selectedCoachInput.value = c._id;
              }
            }
          });
          if (coaches[0]) {
            selectedCoachInput.value = coaches[0]._id;
          }
        }
      }
    } catch (err) {
      console.warn('Could not sync overview with DB:', err);
    }
  }

  // 1. Athlete Selection
  athleteCards.forEach(btn => {
    btn.addEventListener('click', () => {
      athleteCards.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const athleteId = btn.getAttribute('data-athlete-id');
      selectedAthleteInput.value = athleteId;
      showToast(`Selected athlete: ${btn.getAttribute('data-athlete-name')}`, 'info');
    });
  });

  // 2. Coach Selection
  coachCards.forEach(btn => {
    btn.addEventListener('click', () => {
      coachCards.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const coachId = btn.getAttribute('data-coach-id');
      selectedCoachInput.value = coachId;
      showToast(`Selected coach: ${btn.getAttribute('data-coach-name')}`, 'info');
    });
  });

  // 3. Habit Checkbox Interaction & Count Sync
  habitLabels.forEach(label => {
    const checkbox = label.querySelector('input[type="checkbox"]');
    label.addEventListener('click', (e) => {
      if (e.target.tagName !== 'INPUT') {
        checkbox.checked = !checkbox.checked;
      }
      label.classList.toggle('checked', checkbox.checked);
      updateHabitsCount();
    });
  });

  function updateHabitsCount() {
    const checked = document.querySelectorAll('.habit-checkbox-label input[type="checkbox"]:checked');
    if (habitsCountBadge) {
      habitsCountBadge.textContent = `${checked.length} SELECTED`;
    }
  }

  // 4. Quick Fill Figma Mock Data
  if (quickFillBtn) {
    quickFillBtn.addEventListener('click', () => {
      // Select Andrew Vasquez
      athleteCards.forEach(btn => {
        const isTarget = btn.getAttribute('data-athlete-name') === 'Andrew Vasquez';
        btn.classList.toggle('selected', isTarget);
        if (isTarget) {
          selectedAthleteInput.value = btn.getAttribute('data-athlete-id') || 'Andrew Vasquez';
        }
      });

      // Select Coach Rivera
      coachCards.forEach(btn => {
        const isTarget = btn.getAttribute('data-coach-name') === 'Coach Rivera';
        btn.classList.toggle('selected', isTarget);
        if (isTarget) {
          selectedCoachInput.value = btn.getAttribute('data-coach-id') || 'Coach Rivera';
        }
      });

      // Program selects
      programTierSelect.value = '90-Day Mentorship (Elite 1-on-1)';
      startingPhaseSelect.value = 'Phase 1: Foundation (Days 1 – 30)';

      // Habits: check 4 defaults
      const defaultHabitVals = [
        'Ball mastery / Dribbling (5x/week)',
        'Send action steps feedback (3x/week)',
        'Morning Mindset Journal (Daily)',
        'Breathing Reset 4-7-8 Protocol (Pre-training)'
      ];

      habitLabels.forEach(label => {
        const input = label.querySelector('input[type="checkbox"]');
        const shouldCheck = defaultHabitVals.includes(input.value);
        input.checked = shouldCheck;
        label.classList.toggle('checked', shouldCheck);
      });
      updateHabitsCount();

      // Welcome message & group chat toggle
      autoLaunchGroupChatCheckbox.checked = true;
      adminWelcomeMessageTextarea.value = 'Welcome to your private 90-Day Mentorship group! Your coach has been assigned to your program. This is your space for all weekly habit accountability, video reviews, and session recordings.';

      showToast('Figma mock data loaded!', 'success');
    });
  }

  // Cancel & Close
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (confirm('Cancel coach assignment? Form selections will be reset.')) {
        form.reset();
        updateHabitsCount();
        showToast('Form reset', 'info');
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      window.location.href = '/add-athlete';
    });
  }

  // 5. Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const selectedAthlete = selectedAthleteInput.value;
    const selectedCoach = selectedCoachInput.value;

    if (!selectedAthlete) {
      showToast('Please select an athlete ID.', 'error');
      return;
    }

    if (!selectedCoach) {
      showToast('Please select a coach ID.', 'error');
      return;
    }

    const selectedHabits = Array.from(document.querySelectorAll('.habit-checkbox-label input[type="checkbox"]:checked'))
      .map(cb => cb.value);

    const payload = {
      athleteId: selectedAthlete,
      coachId: selectedCoach,
      tier: programTierSelect.value,
      startingPhase: startingPhaseSelect.value,
      habits: selectedHabits,
      autoLaunchGroupChat: autoLaunchGroupChatCheckbox.checked,
      adminWelcomeMessage: adminWelcomeMessageTextarea.value.trim()
    };

    // Button loading animation
    const originalBtnHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10"></path>
      </svg>
      <span>Assigning Coach...</span>
    `;

    try {
      const response = await fetch('/api/v1/user/assign-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': 'en'
        },
        body: JSON.stringify(payload)
      });

      const resJson = await response.json();
      if (!response.ok) {
        throw new Error(resJson.message || 'Failed to assign coach.');
      }

      const assignedData = resJson.data || {};

      // Populate success dialog
      dispAthleteName.textContent = assignedData.athlete?.fullName || selectedAthlete;
      dispCoachName.textContent = assignedData.coach?.fullName || selectedCoach;
      dispTier.textContent = payload.tier;
      dispPhase.textContent = payload.startingPhase;
      dispHabitsCount.textContent = `${selectedHabits.length} Initial Habits Activated`;

      successOverlay.style.display = 'flex';
      showToast('Dedicated coach and program assigned successfully!', 'success');

    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  });

  // Success Overlay buttons
  if (successCloseBtn) {
    successCloseBtn.addEventListener('click', () => {
      successOverlay.style.display = 'none';
    });
  }

  if (successNewAssignBtn) {
    successNewAssignBtn.addEventListener('click', () => {
      successOverlay.style.display = 'none';
    });
  }

  // Toast Helper
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-msg toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 200ms ease';
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  }
});
