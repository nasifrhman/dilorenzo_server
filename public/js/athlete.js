/**
 * DI LORENZO SOCCER (DSM SOCCER) — ATHLETE INTAKE SCRIPT
 * Figma Design Node: 33275-6181 ("New Athlete Intake & Registration")
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const form = document.getElementById('athleteForm');
  const quickFillBtn = document.getElementById('quickFillBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const closeBtn = document.getElementById('closeModalBtn');
  const submitBtn = document.getElementById('submitBtn');
  const assignedCoachSelect = document.getElementById('assignedCoach');
  
  // Inputs
  const athleteFullName = document.getElementById('athleteFullName');
  const athleteEmail = document.getElementById('athleteEmail');
  const athletePhone = document.getElementById('athletePhone');
  const programTier = document.getElementById('programTier');
  const leagueDivision = document.getElementById('leagueDivision');
  const parentFullName = document.getElementById('parentFullName');
  const parentEmail = document.getElementById('parentEmail');
  const intakeNotes = document.getElementById('intakeNotes');

  // Success Modal Elements
  const successOverlay = document.getElementById('successOverlay');
  const successCloseBtn = document.getElementById('successCloseBtn');
  const successAddAnotherBtn = document.getElementById('successAddAnotherBtn');
  const dispAthleteName = document.getElementById('dispAthleteName');
  const dispAthleteEmail = document.getElementById('dispAthleteEmail');
  const dispAthleteTier = document.getElementById('dispAthleteTier');
  const dispAssignedCoach = document.getElementById('dispAssignedCoach');
  const dispAthletePass = document.getElementById('dispAthletePass');

  // Load coaches dynamically from backend API
  loadCoaches();

  async function loadCoaches() {
    try {
      const res = await fetch('/api/v1/user/coach');
      if (res.ok) {
        const json = await res.json();
        const coaches = json.data || [];
        if (coaches.length > 0) {
          // Clear and rebuild options
          assignedCoachSelect.innerHTML = '';
          
          // Add default Figma option first
          const defaultOpt = document.createElement('option');
          defaultOpt.value = '';
          defaultOpt.textContent = 'Coach Rivera (Mental Performance Specialist) — 4/10 Active';
          assignedCoachSelect.appendChild(defaultOpt);

          coaches.forEach(coach => {
            const opt = document.createElement('option');
            opt.value = coach._id;
            const designation = coach.roleTitle || 'Mindset Coach';
            const cap = coach.maxAthleteCapacity || 15;
            opt.textContent = `${coach.fullName} (${designation}) — 0/${cap} Active`;
            assignedCoachSelect.appendChild(opt);
          });
        }
      }
    } catch (err) {
      console.warn('Could not load dynamic coaches, using defaults:', err);
    }
  }

  // Quick fill Figma mock data
  if (quickFillBtn) {
    quickFillBtn.addEventListener('click', () => {
      athleteFullName.value = 'Marcus Sterling';
      athleteEmail.value = 'marcus.sterling@example.com';
      athletePhone.value = '+1 (555) 000-0000';
      programTier.value = '90-day-mentorship';
      leagueDivision.value = 'Regional Stars U18';
      parentFullName.value = 'David Sterling';
      parentEmail.value = 'david.sterling@example.com';
      intakeNotes.value = 'Athlete struggled with pre-game anxiety in state finals. Goal: build 5-step composure habit.';

      showToast('Figma mock data populated successfully!', 'success');
      athleteFullName.focus();
    });
  }

  // Cancel & Close Handlers
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to cancel athlete intake? All entered data will be reset.')) {
        form.reset();
        showToast('Form reset', 'info');
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (confirm('Close intake dialog?')) {
        window.location.href = '/add-coach';
      }
    });
  }

  // Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate Required Fields
    const fullNameVal = athleteFullName.value.trim();
    const emailVal = athleteEmail.value.trim();

    if (!fullNameVal) {
      showToast('Athlete full name is required.', 'error');
      athleteFullName.focus();
      return;
    }

    if (!emailVal || !emailVal.includes('@')) {
      showToast('A valid email address is required.', 'error');
      athleteEmail.focus();
      return;
    }

    // Build payload
    const payload = {
      fullName: fullNameVal,
      email: emailVal,
      phoneNumber: athletePhone.value.trim(),
      tier: programTier.value,
      leagueDivision: leagueDivision.value,
      currentClub: leagueDivision.value,
      assignedCoach: assignedCoachSelect.value || assignedCoachSelect.options[assignedCoachSelect.selectedIndex]?.text,
      parentFullName: parentFullName.value.trim(),
      parentEmail: parentEmail.value.trim(),
      intakeNotes: intakeNotes.value.trim(),
      focusGoals: intakeNotes.value.trim()
    };

    // Button loading state
    const originalBtnHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10"></path>
      </svg>
      <span>Enrolling Athlete...</span>
    `;

    try {
      const response = await fetch('/api/v1/user/athlete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': 'en'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to complete athlete intake.');
      }

      const athlete = data.data || {};
      
      // Update success card info
      dispAthleteName.textContent = athlete.fullName || payload.fullName;
      dispAthleteEmail.textContent = athlete.email || payload.email;
      dispAthleteTier.textContent = athlete.tier === '90-day-mentorship' 
        ? '90-Day Mentorship (Selective)' 
        : (athlete.tier === 'premium' ? 'Premium Access' : 'Free Standard');
      
      const coachName = athlete.assignedCoach?.fullName || assignedCoachSelect.options[assignedCoachSelect.selectedIndex]?.text?.split('(')[0]?.trim() || 'Coach Rivera';
      dispAssignedCoach.textContent = coachName;
      dispAthletePass.textContent = 'DSMAthlete2026!';

      // Show success overlay
      successOverlay.style.display = 'flex';
      showToast('Athlete intake completed successfully!', 'success');

      // Reset form
      form.reset();

    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  });

  // Success dialog actions
  if (successCloseBtn) {
    successCloseBtn.addEventListener('click', () => {
      successOverlay.style.display = 'none';
    });
  }

  if (successAddAnotherBtn) {
    successAddAnotherBtn.addEventListener('click', () => {
      successOverlay.style.display = 'none';
      athleteFullName.focus();
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
