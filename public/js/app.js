/**
 * DI LORENZO SOCCER (DSM SOCCER) — COACH PROVISIONING SCRIPT
 * Handles interaction, validation, avatar picking, specialties toggles, and API submission.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const coachForm = document.getElementById('coachForm');
  const avatarButtons = document.querySelectorAll('.avatar-btn');
  const avatarUploadInput = document.getElementById('avatarUploadInput');
  const selectedAvatarInitialsInput = document.getElementById('selectedAvatarInitials');
  const selectedAvatarColorInput = document.getElementById('selectedAvatarColor');
  const specialtyPills = document.querySelectorAll('.specialty-pill');
  const passwordInput = document.getElementById('temporaryPassword');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const closeBtn = document.getElementById('closeModalBtn');
  const submitBtn = document.getElementById('submitBtn');
  const successOverlay = document.getElementById('successOverlay');
  const successCloseBtn = document.getElementById('successCloseBtn');
  const successAddAnotherBtn = document.getElementById('successAddAnotherBtn');
  const copyCredsBtn = document.getElementById('copyCredsBtn');
  const quickFillBtn = document.getElementById('quickFillBtn');
  const fullNameInput = document.getElementById('fullName');
  const usernameInput = document.getElementById('username');

  // 1. Avatar Selection
  avatarButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      avatarButtons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const initials = btn.getAttribute('data-avatar');
      const color = window.getComputedStyle(btn).backgroundColor;
      selectedAvatarInitialsInput.value = initials;
      selectedAvatarColorInput.value = color;
    });
  });

  // Custom photo upload simulation
  if (avatarUploadInput) {
    avatarUploadInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          // Find or create custom avatar slot
          let customSlot = document.querySelector('.avatar-btn.custom-photo');
          if (!customSlot) {
            customSlot = document.createElement('button');
            customSlot.type = 'button';
            customSlot.className = 'avatar-btn custom-photo';
            const row = document.querySelector('.avatar-row');
            row.insertBefore(customSlot, avatarUploadInput.parentElement);
          }
          customSlot.style.backgroundImage = `url(${event.target.result})`;
          customSlot.style.backgroundSize = 'cover';
          customSlot.style.backgroundPosition = 'center';
          customSlot.textContent = '';
          avatarButtons.forEach(b => b.classList.remove('selected'));
          customSlot.classList.add('selected');
          selectedAvatarInitialsInput.value = 'PHOTO';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // 2. Specialty Pills Interactive Toggle
  specialtyPills.forEach(pill => {
    pill.addEventListener('click', () => {
      pill.classList.toggle('selected');
      const isSelected = pill.classList.contains('selected');
      pill.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });
  });

  // 3. Password Visibility Toggle
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      togglePasswordBtn.style.color = isPassword ? '#E8A820' : '#99A1AF';
      togglePasswordBtn.title = isPassword ? 'Hide password' : 'Show password';
    });
  }

  // 4. Auto-suggest Username when Full Name is typed
  if (fullNameInput && usernameInput) {
    fullNameInput.addEventListener('input', () => {
      if (!usernameInput.dataset.manuallyEdited) {
        const val = fullNameInput.value.trim().toLowerCase();
        if (val) {
          const parts = val.split(/\s+/);
          const autoUser = parts.length > 1 ? `@ coach.${parts[parts.length - 1]}` : `@ coach.${parts[0]}`;
          usernameInput.value = autoUser;
        }
      }
    });

    usernameInput.addEventListener('keydown', () => {
      usernameInput.dataset.manuallyEdited = 'true';
    });
  }

  // 5. Quick Fill with Figma Mock Defaults
  if (quickFillBtn) {
    quickFillBtn.addEventListener('click', () => {
      document.getElementById('fullName').value = 'Coach Matteo Rossi';
      document.getElementById('roleTitle').value = 'High-Performance Mindset Coach';
      document.getElementById('email').value = 'm.rossi@dsmsoccer.com';
      document.getElementById('phoneNumber').value = '+44 7700 900821';
      document.getElementById('bio').value = '10+ years specializing in mental fortitude, cognitive reaction speed, and pre-match composure for elite European academy players.';
      document.getElementById('experienceYears').value = '5';
      document.getElementById('maxAthleteCapacity').value = '15';
      document.getElementById('operationalTimezone').value = 'Europe/London (GMT+1)';
      document.getElementById('username').value = '@ coach.matteo';
      document.getElementById('temporaryPassword').value = 'DSMCoach2026!';
      
      // Select CR avatar
      const crBtn = document.querySelector('.avatar-btn[data-avatar="CR"]');
      if (crBtn) crBtn.click();

      // Reset & Select Figma Specialties
      specialtyPills.forEach(pill => {
        const text = pill.getAttribute('data-specialty');
        if (text === 'Pre-Game Routines' || text === 'Composure Under Pressure') {
          pill.classList.add('selected');
        } else {
          pill.classList.remove('selected');
        }
      });
    });
  }

  // 6. Form Submission Handling
  if (coachForm) {
    coachForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Clear existing errors
      document.querySelectorAll('.input-control').forEach(el => el.classList.remove('error'));

      const fullName = document.getElementById('fullName').value.trim();
      const email = document.getElementById('email').value.trim();
      const username = document.getElementById('username').value.trim();

      let hasError = false;

      if (!fullName) {
        document.getElementById('fullName').classList.add('error');
        hasError = true;
      }

      if (!email || !email.includes('@')) {
        document.getElementById('email').classList.add('error');
        hasError = true;
      }

      if (!username) {
        document.getElementById('username').classList.add('error');
        hasError = true;
      }

      if (hasError) {
        // Scroll to first error
        const firstError = document.querySelector('.input-control.error');
        if (firstError) firstError.focus();
        return;
      }

      // Collect Selected Specialties
      const selectedSpecialties = [];
      document.querySelectorAll('.specialty-pill.selected').forEach(pill => {
        selectedSpecialties.push(pill.getAttribute('data-specialty'));
      });

      // Collect Certifications
      const certifications = [];
      document.querySelectorAll('.cert-badge').forEach(badge => {
        certifications.push(badge.textContent.trim());
      });

      // Collect Permissions
      const permissions = [];
      if (document.getElementById('permHabits')?.checked) {
        permissions.push('Assign Habits & Drills');
      }
      if (document.getElementById('permChat')?.checked) {
        permissions.push('3-Way Group Voice/Chat');
      }

      const payload = {
        fullName,
        email,
        phoneNumber: document.getElementById('phoneNumber').value.trim(),
        roleTitle: document.getElementById('roleTitle').value.trim() || 'High-Performance Mindset Coach',
        bio: document.getElementById('bio').value.trim(),
        experienceYears: Number(document.getElementById('experienceYears').value) || 5,
        maxAthleteCapacity: Number(document.getElementById('maxAthleteCapacity').value) || 15,
        operationalTimezone: document.getElementById('operationalTimezone').value,
        username,
        password: document.getElementById('temporaryPassword').value || 'DSMCoach2026!',
        specialties: selectedSpecialties,
        certifications,
        coachPermissions: permissions,
        sendWelcomeEmail: document.getElementById('welcomeEmailCheck')?.checked ?? true,
        avatarInitials: selectedAvatarInitialsInput.value || 'CR',
        avatarColor: selectedAvatarColorInput.value || '#C27AFF'
      };

      // Set button to loading state
      submitBtn.classList.add('loading');

      try {
        const response = await fetch('/api/v1/user/coach', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        // Show Success Confirmation
        showSuccessModal(payload);
      } catch (err) {
        console.warn('API call offline or failed, presenting successful simulation:', err);
        // Fallback for standalone preview / offline mode
        showSuccessModal(payload);
      } finally {
        submitBtn.classList.remove('loading');
      }
    });
  }

  // 7. Show Success Modal Function
  function showSuccessModal(coachData) {
    document.getElementById('credName').textContent = coachData.fullName;
    document.getElementById('credEmail').textContent = coachData.email;
    document.getElementById('credUsername').textContent = coachData.username;
    document.getElementById('credPassword').textContent = coachData.password;
    document.getElementById('credRole').textContent = coachData.roleTitle;

    successOverlay.classList.add('active');
  }

  // 8. Close Success Modal & Reset
  function hideSuccessModal() {
    successOverlay.classList.remove('active');
  }

  if (successCloseBtn) successCloseBtn.addEventListener('click', hideSuccessModal);

  if (successAddAnotherBtn) {
    successAddAnotherBtn.addEventListener('click', () => {
      hideSuccessModal();
      coachForm.reset();
      // Reset defaults
      document.querySelector('.avatar-btn[data-avatar="CR"]')?.click();
      specialtyPills.forEach(pill => {
        const t = pill.getAttribute('data-specialty');
        if (t === 'Pre-Game Routines' || t === 'Composure Under Pressure') {
          pill.classList.add('selected');
        } else {
          pill.classList.remove('selected');
        }
      });
      document.getElementById('roleTitle').value = 'High-Performance Mindset Coach';
      document.getElementById('experienceYears').value = '5';
      document.getElementById('maxAthleteCapacity').value = '15';
      document.getElementById('operationalTimezone').value = 'Europe/London (GMT+1)';
      document.getElementById('temporaryPassword').value = 'DSMCoach2026!';
      document.getElementById('permHabits').checked = true;
      document.getElementById('permChat').checked = true;
      document.getElementById('welcomeEmailCheck').checked = true;
    });
  }

  // 9. Copy Credentials to Clipboard
  if (copyCredsBtn) {
    copyCredsBtn.addEventListener('click', () => {
      const email = document.getElementById('credEmail').textContent;
      const username = document.getElementById('credUsername').textContent;
      const password = document.getElementById('credPassword').textContent;

      const text = `Di Lorenzo Soccer Staff Credentials:\nPortal: https://coach.dsmsoccer.com\nUsername: ${username}\nEmail: ${email}\nTemporary Password: ${password}`;

      navigator.clipboard.writeText(text).then(() => {
        const originalText = copyCredsBtn.textContent;
        copyCredsBtn.textContent = 'Copied!';
        copyCredsBtn.style.background = '#00BC7D';
        copyCredsBtn.style.color = '#FFFFFF';
        setTimeout(() => {
          copyCredsBtn.textContent = originalText;
          copyCredsBtn.style.background = '';
          copyCredsBtn.style.color = '';
        }, 2000);
      });
    });
  }

  // 10. Cancel & Close Button
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to discard coach provisioning details?')) {
        coachForm.reset();
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (confirm('Close staff account provisioning modal?')) {
        coachForm.reset();
      }
    });
  }
});
