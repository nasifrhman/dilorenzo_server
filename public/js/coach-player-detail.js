/**
 * ==========================================================================
 * Coach Player Detail & 9-Tab Management Suite JavaScript Controller
 * ==========================================================================
 */

(function () {
  'use strict';

  // State
  let currentAthleteId = null;
  let currentAthleteData = null;
  let selectedActionStep = null;

  // DOM Elements
  const heroAthleteName = document.getElementById('heroAthleteName');
  const heroAthleteClub = document.getElementById('heroAthleteClub');
  const heroStatDay = document.getElementById('heroStatDay');
  const heroStatLevel = document.getElementById('heroStatLevel');
  const heroStatXp = document.getElementById('heroStatXp');
  const heroStatStreak = document.getElementById('heroStatStreak');
  const heroProgressCaption = document.getElementById('heroProgressCaption');
  const heroProgressPercentBadge = document.getElementById('heroProgressPercentBadge');
  const heroProgressBarFill = document.getElementById('heroProgressBarFill');
  const coachNameDisplay = document.getElementById('coachNameDisplay');
  const coachClubDisplay = document.getElementById('coachClubDisplay');
  const coachAvatarEmoji = document.getElementById('coachAvatarEmoji');

  // Overview Tab Elements
  const ovNextSessionTitle = document.getElementById('ovNextSessionTitle');
  const ovNextSessionTime = document.getElementById('ovNextSessionTime');
  const btnOvJoinSession = document.getElementById('btnOvJoinSession');
  const btnOvAddNotes = document.getElementById('btnOvAddNotes');
  const ovSubmissionsList = document.getElementById('ovSubmissionsList');
  const ovHabitsList = document.getElementById('ovHabitsList');
  const ovTasksList = document.getElementById('ovTasksList');

  // Tab Panels & Lists
  const habitsFullList = document.getElementById('habitsFullList');
  const tasksFullList = document.getElementById('tasksFullList');
  const trainingTableBody = document.getElementById('trainingTableBody');
  const actionStepsSidebarList = document.getElementById('actionStepsSidebarList');
  const asDetailContent = document.getElementById('asDetailContent');
  const asDetailPlaceholder = document.getElementById('asDetailPlaceholder');
  const asDetailTitle = document.getElementById('asDetailTitle');
  const asDetailMeta = document.getElementById('asDetailMeta');
  const asDetailStatusBadge = document.getElementById('asDetailStatusBadge');
  const asDetailMentality = document.getElementById('asDetailMentality');
  const asDetailWentWell = document.getElementById('asDetailWentWell');
  const asDetailImprove = document.getElementById('asDetailImprove');
  const asDetailFeedbackText = document.getElementById('asDetailFeedbackText');
  const feedbackCardsGrid = document.getElementById('feedbackCardsGrid');
  const sessionsFullList = document.getElementById('sessionsFullList');

  // Group Chat Elements
  const groupMembersRibbon = document.getElementById('groupMembersRibbon');
  const groupMemberCount = document.getElementById('groupMemberCount');
  const chatFeed = document.getElementById('chatFeed');
  const groupChatForm = document.getElementById('groupChatForm');
  const groupMessageInput = document.getElementById('groupMessageInput');

  // Progress Metrics
  const progValProgress = document.getElementById('progValProgress');
  const progValTaskComp = document.getElementById('progValTaskComp');
  const progValHabitCons = document.getElementById('progValHabitCons');
  const progValTrainingDone = document.getElementById('progValTrainingDone');
  const phaseFoundationPct = document.getElementById('phaseFoundationPct');
  const phaseFoundationBar = document.getElementById('phaseFoundationBar');
  const phaseDevelopmentPct = document.getElementById('phaseDevelopmentPct');
  const phaseDevelopmentBar = document.getElementById('phaseDevelopmentBar');
  const phasePerformancePct = document.getElementById('phasePerformancePct');
  const phasePerformanceBar = document.getElementById('phasePerformanceBar');

  // Helper: Toast notifications
  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Helper: Escape HTML
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * 1. Load Player Details from API
   */
  async function loadPlayerData() {
    const urlParams = new URLSearchParams(window.location.search);
    currentAthleteId = urlParams.get('id') || '6acc80dca1df2a2ed315c20e';

    try {
      const response = await fetch(`/api/v1/coach/players/${currentAthleteId}`);
      const resData = await response.json();

      if (!response.ok || resData.status !== 'success') {
        throw new Error(resData.message || 'Failed to load athlete profile');
      }

      currentAthleteData = resData.data?.attributes || resData.data;
      renderAll(currentAthleteData);

      const tabParam = urlParams.get('tab');
      if (tabParam) {
        window.switchTab(tabParam);
      }
    } catch (err) {
      console.error('Error loading player data:', err);
      showToast(err.message, 'error');
    }
  }

  /**
   * Render All Tabs & Header
   */
  function renderAll(data) {
    const athlete = data.athlete || {};
    const coach = data.coach || {};

    // 1. Top Bar & Hero
    if (coachNameDisplay) coachNameDisplay.textContent = coach.name || '';
    if (coachClubDisplay) coachClubDisplay.textContent = coach.title || '';
    if (coachAvatarEmoji) coachAvatarEmoji.textContent = coach.avatarEmoji || '';

    if (heroAthleteName) heroAthleteName.textContent = athlete.name || '';
    if (heroAthleteClub) heroAthleteClub.textContent = athlete.club || '';
    if (heroStatDay) heroStatDay.textContent = athlete.day || '';
    if (heroStatLevel) heroStatLevel.textContent = athlete.level ?? 0;
    if (heroStatXp) heroStatXp.textContent = Number(athlete.xp || 0).toLocaleString();
    if (heroStatStreak) heroStatStreak.textContent = athlete.streak || '0d';

    const progPct = athlete.progressPercentage ?? 0;
    if (heroProgressCaption) heroProgressCaption.textContent = athlete.caption || `${progPct}% program complete`;
    if (heroProgressPercentBadge) heroProgressPercentBadge.textContent = `${progPct}%`;
    if (heroProgressBarFill) heroProgressBarFill.style.width = `${progPct}%`;

    // Dynamic Pane Titles
    const habitsTitle = document.getElementById('habitsTitle');
    if (habitsTitle) habitsTitle.textContent = athlete.name ? `Active Habits for ${athlete.name}` : 'Active Habits';
    const tasksTitle = document.getElementById('tasksTitle');
    if (tasksTitle) tasksTitle.textContent = athlete.name ? `Tasks for ${athlete.name}` : 'Tasks';
    const actionStepsTitle = document.getElementById('actionStepsTitle');
    if (actionStepsTitle) actionStepsTitle.textContent = athlete.name ? `Submissions from ${athlete.name}` : 'Submissions';
    const feedbackTitle = document.getElementById('feedbackTitle');
    if (feedbackTitle) feedbackTitle.textContent = athlete.name ? `Feedback for ${athlete.name}` : 'Feedback';
    const progressTitle = document.getElementById('progressTitle');
    if (progressTitle) progressTitle.textContent = athlete.name ? `Progress Analytics — ${athlete.name}` : 'Progress Analytics';
    const sessionsTitle = document.getElementById('sessionsTitle');
    if (sessionsTitle) sessionsTitle.textContent = athlete.name ? `Coaching Sessions — ${athlete.name}` : 'Coaching Sessions';

    // 2. Tab 1: Overview
    renderOverviewTab(data);

    // 3. Tab 2: Goals & Habits
    renderHabitsTab(data.habits || []);

    // 4. Tab 3: Tasks
    renderTasksTab(data.tasks || []);

    // 5. Tab 4: Training
    renderTrainingTab(data.training || []);

    // 6. Tab 5: Action Steps
    renderActionStepsTab(data.actionSteps || []);

    // 7. Tab 6: Feedback
    renderFeedbackTab(data.feedback || []);

    // 8. Tab 7: Progress
    renderProgressTab(data.progressAnalytics || {}, athlete);

    // 9. Tab 8: Group 3-Way Chat
    renderGroupChatTab(data.group || {});

    // 10. Tab 9: Sessions
    renderSessionsTab(data.sessions || {});
  }

  /**
   * Render Tab 1: Overview
   */
  function renderOverviewTab(data) {
    const nextSess = data.overview?.nextSession;
    if (nextSess) {
      if (ovNextSessionTitle) ovNextSessionTitle.textContent = nextSess.title;
      if (ovNextSessionTime) ovNextSessionTime.textContent = nextSess.timeLabel;
      if (btnOvJoinSession) {
        if (nextSess.canJoin && nextSess.meetingLink) {
          btnOvJoinSession.href = nextSess.meetingLink;
          btnOvJoinSession.target = '_blank';
          btnOvJoinSession.style.display = 'inline-flex';
        } else {
          btnOvJoinSession.href = 'javascript:void(0)';
          btnOvJoinSession.onclick = () => showToast('Session link will be active 15m prior to call.');
        }
      }
      if (btnOvAddNotes) {
        btnOvAddNotes.onclick = () => window.openAddNotesModal(nextSess._id);
      }
    } else {
      if (ovNextSessionTitle) ovNextSessionTitle.textContent = 'No upcoming sessions';
      if (ovNextSessionTime) ovNextSessionTime.textContent = 'Schedule a 1-on-1 call below';
      if (btnOvJoinSession) btnOvJoinSession.style.display = 'none';
    }

    // Submissions recap
    if (ovSubmissionsList) {
      const recaps = data.overview?.recentActionSteps || [];
      if (recaps.length === 0) {
        ovSubmissionsList.innerHTML = `<div class="recap-item"><span class="recap-item-title" style="color:#737378;">No action step submissions yet.</span></div>`;
      } else {
        ovSubmissionsList.innerHTML = recaps
          .map((as) => {
            const badgeClass = as.status === 'reviewed' ? 'badge-status-reviewed' : as.status === 'needs-revision' ? 'badge-status-revision' : 'badge-status-pending';
            return `
              <div class="recap-item" onclick="window.switchTab('action-steps'); window.selectActionStep('${escapeHtml(as._id)}')">
                <div class="recap-item-left">
                  <span>📹</span>
                  <div>
                    <div class="recap-item-title">${escapeHtml(as.title)}</div>
                    <div class="recap-item-meta">${escapeHtml(as.submittedDate || 'Recent')}</div>
                  </div>
                </div>
                <span class="${badgeClass}">${escapeHtml((as.status || 'pending').toUpperCase())}</span>
              </div>
            `;
          })
          .join('');
      }
    }

    // Habits recap
    if (ovHabitsList) {
      const habits = data.overview?.activeHabits || [];
      if (habits.length === 0) {
        ovHabitsList.innerHTML = `<div class="recap-item"><span class="recap-item-title" style="color:#737378;">No active habits assigned.</span></div>`;
      } else {
        ovHabitsList.innerHTML = habits
          .map((h) => {
            return `
              <div class="recap-item" onclick="window.switchTab('habits')">
                <div class="recap-item-left">
                  <span>${escapeHtml(h.icon || '🎯')}</span>
                  <div>
                    <div class="recap-item-title">${escapeHtml(h.title)}</div>
                    <div class="recap-item-meta">${escapeHtml(h.frequencyLabel || '')}</div>
                  </div>
                </div>
                <span class="habit-streak-pill">${escapeHtml(h.streak || '0d')}</span>
              </div>
            `;
          })
          .join('');
      }
    }

    // Tasks recap
    if (ovTasksList) {
      const tasks = data.overview?.recentTasks || [];
      if (tasks.length === 0) {
        ovTasksList.innerHTML = `<div class="recap-item"><span class="recap-item-title" style="color:#737378;">All tasks completed!</span></div>`;
      } else {
        ovTasksList.innerHTML = tasks
          .map((t) => {
            return `
              <div class="recap-item" onclick="window.switchTab('tasks')">
                <div class="recap-item-left">
                  <span>${t.isCompleted ? '✅' : '⏳'}</span>
                  <div>
                    <div class="recap-item-title" style="${t.isCompleted ? 'text-decoration: line-through; color: #737378;' : ''}">${escapeHtml(t.title)}</div>
                    <div class="recap-item-meta">${t.dueDate ? `Due: ${escapeHtml(t.dueDate)}` : ''}</div>
                  </div>
                </div>
                <span class="task-frequency-badge">${escapeHtml(t.frequency || '')}</span>
              </div>
            `;
          })
          .join('');
      }
    }
  }

  /**
   * Render Tab 2: Goals & Habits (33044:14910)
   */
  function renderHabitsTab(habits) {
    if (!habitsFullList) return;
    if (habits.length === 0) {
      habitsFullList.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #737378; background: #131820; border-radius: 16px; border: 1px dashed rgba(255,255,255,0.08);">
          No active habits yet. Click "+ New Habit" to assign one.
        </div>
      `;
      return;
    }

    const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    habitsFullList.innerHTML = habits
      .map((h, hIdx) => {
        // Generate simulated completed weekly bubbles
        const bubblesHtml = daysOfWeek
          .map((day, dIdx) => {
            const isDone = dIdx < 5 || (hIdx === 0 && dIdx < 7);
            return `<div class="day-bubble ${isDone ? 'done' : ''}">${day}</div>`;
          })
          .join('');

        return `
          <div class="habit-card">
            <div class="habit-meta-col">
              <div class="habit-icon-box">${escapeHtml(h.icon || '🔥')}</div>
              <div>
                <div class="habit-name">${escapeHtml(h.title)}</div>
                <div class="habit-freq-caption">${escapeHtml(h.frequencyLabel || 'Daily')} · ${escapeHtml(h.timesPerWeek || 7)}×/week · Started ${escapeHtml(h.startDate || 'Recently')}</div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 24px;">
              <div class="weekly-bubbles-track">
                ${bubblesHtml}
              </div>
              <div class="habit-streak-pill">${escapeHtml(h.streak || '0d')} Streak</div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  /**
   * Render Tab 3: Tasks (33061:1545)
   */
  function renderTasksTab(tasks) {
    if (!tasksFullList) return;
    if (tasks.length === 0) {
      tasksFullList.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #737378; background: #131820; border-radius: 16px; border: 1px dashed rgba(255,255,255,0.08);">
          No tasks assigned yet. Click "+ Assign Task" to assign one.
        </div>
      `;
      return;
    }

    tasksFullList.innerHTML = tasks
      .map((t) => {
        return `
          <div class="task-card-item ${t.isCompleted ? 'completed' : ''}" data-task-id="${escapeHtml(t._id)}">
            <div class="task-left-section">
              <button class="task-checkbox-circle ${t.isCompleted ? 'checked' : ''}" onclick="window.toggleTask('${escapeHtml(t._id)}')"></button>
              <div class="task-title-text">${escapeHtml(t.title)}</div>
            </div>
            <div class="task-right-section">
              <span class="task-due-date ${t.isOverdue ? 'overdue' : ''}">Due: ${escapeHtml(t.dueDate || 'Today')}</span>
              <span class="task-frequency-badge">${escapeHtml(t.frequency || 'Once')}</span>
            </div>
          </div>
        `;
      })
      .join('');
  }

  /**
   * Render Tab 4: Training (33074:1628)
   */
  function renderTrainingTab(trainings) {
    if (!trainingTableBody) return;
    if (trainings.length === 0) {
      trainingTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: #737378; padding: 32px;">No training assignments yet.</td>
        </tr>
      `;
      return;
    }

    trainingTableBody.innerHTML = trainings
      .map((tr) => {
        const catClass = (tr.category || 'technical').toLowerCase();
        return `
          <tr>
            <td style="font-weight: 600;">${escapeHtml(tr.title)}</td>
            <td><span class="category-tag ${catClass}">${escapeHtml(tr.category || 'Technical')}</span></td>
            <td>${escapeHtml(tr.duration || '15 min')}</td>
            <td>${escapeHtml(tr.weekLabel || 'Week 1')}</td>
            <td>
              ${
                tr.videoUrl
                  ? `<a href="${escapeHtml(tr.videoUrl)}" target="_blank" class="btn-video-preview">▶ Watch Video</a>`
                  : `<span style="color: #737378;">No video</span>`
              }
            </td>
            <td>
              <span class="${tr.isCompleted ? 'badge-status-reviewed' : 'badge-status-pending'}">
                ${tr.isCompleted ? 'COMPLETED' : 'ASSIGNED'}
              </span>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  /**
   * Render Tab 5: Action Steps (33078:3424)
   */
  function renderActionStepsTab(actionSteps) {
    if (!actionStepsSidebarList) return;
    if (actionSteps.length === 0) {
      actionStepsSidebarList.innerHTML = `<div style="color:#737378; padding: 20px; text-align: center;">No submissions from athlete.</div>`;
      if (asDetailPlaceholder) asDetailPlaceholder.style.display = 'block';
      if (asDetailContent) asDetailContent.style.display = 'none';
      return;
    }

    actionStepsSidebarList.innerHTML = actionSteps
      .map((as, idx) => {
        const badgeClass = as.status === 'reviewed' ? 'badge-status-reviewed' : as.status === 'needs-revision' ? 'badge-status-revision' : 'badge-status-pending';
        return `
          <div class="as-list-item ${idx === 0 ? 'selected' : ''}" id="asItem_${escapeHtml(as._id)}" onclick="window.selectActionStep('${escapeHtml(as._id)}')">
            <div class="as-item-header">
              <span class="as-item-title">${escapeHtml(as.title)}</span>
              <span class="${badgeClass}">${escapeHtml((as.status || 'pending').toUpperCase())}</span>
            </div>
            <div class="as-item-date">${escapeHtml(as.typeLabel || as.submittedDate || 'Aug 13 · Practice')}</div>
          </div>
        `;
      })
      .join('');

    // Default select first item
    window.selectActionStep(actionSteps[0]._id);
  }

  /**
   * Select Action Step
   */
  window.selectActionStep = function (asId) {
    if (!currentAthleteData?.actionSteps) return;
    const item = currentAthleteData.actionSteps.find((as) => as._id === asId);
    if (!item) return;

    selectedActionStep = item;

    // Highlight sidebar
    document.querySelectorAll('.as-list-item').forEach((el) => el.classList.remove('selected'));
    const selectedEl = document.getElementById(`asItem_${asId}`);
    if (selectedEl) selectedEl.classList.add('selected');

    // Populate Detail Pane
    if (asDetailPlaceholder) asDetailPlaceholder.style.display = 'none';
    if (asDetailContent) asDetailContent.style.display = 'block';

    if (asDetailTitle) asDetailTitle.textContent = item.title;
    if (asDetailMeta) asDetailMeta.textContent = item.typeLabel || item.submittedDate || '';

    if (asDetailStatusBadge) {
      asDetailStatusBadge.className = item.status === 'reviewed' ? 'badge-status-reviewed' : item.status === 'needs-revision' ? 'badge-status-revision' : 'badge-status-pending';
      asDetailStatusBadge.textContent = (item.status || 'pending').toUpperCase();
    }

    if (asDetailMentality) asDetailMentality.textContent = item.mentalityUsed || '—';
    if (asDetailWentWell) asDetailWentWell.textContent = item.whatWentWell || '—';
    if (asDetailImprove) asDetailImprove.textContent = item.areaToImprove || '—';

    if (asDetailFeedbackText) {
      if (item.coachFeedback?.textNotes) {
        asDetailFeedbackText.textContent = item.coachFeedback.textNotes;
      } else {
        asDetailFeedbackText.textContent = 'No feedback provided yet. Click "Give Feedback / Review" below.';
      }
    }
  };

  /**
   * Render Tab 6: Feedback (33078:4755)
   */
  function renderFeedbackTab(feedbacks) {
    if (!feedbackCardsGrid) return;
    if (feedbacks.length === 0) {
      feedbackCardsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: #737378; background: #131820; border-radius: 16px; border: 1px dashed rgba(255,255,255,0.08);">
          No feedback entries yet. Click "+ Give Feedback" to record coach notes.
        </div>
      `;
      return;
    }

    feedbackCardsGrid.innerHTML = feedbacks
      .map((fb) => {
        const tagsHtml = (fb.tags || [])
          .map((t) => `<span class="fb-tag-pill">${escapeHtml(t)}</span>`)
          .join('');

        const ratingHtml = fb.rating
          ? `<span class="fb-rating-badge" title="Rating: ${fb.rating}/5">★ ${fb.rating}/5</span>`
          : '';

        return `
          <div class="feedback-card-item">
            <div>
              <div class="fb-card-top">
                <div class="fb-card-title">${escapeHtml(fb.title)}</div>
                <div class="fb-card-meta-right">
                  ${ratingHtml}
                  <div class="fb-card-date">${escapeHtml(fb.date)}</div>
                </div>
              </div>
              <div class="fb-card-msg">${escapeHtml(fb.message)}</div>
            </div>
            <div class="fb-card-tags">
              ${tagsHtml}
            </div>
          </div>
        `;
      })
      .join('');
  }

  /**
   * Render Tab 7: Progress (33086:7191)
   */
  function renderProgressTab(analytics, athlete) {
    if (progValProgress) progValProgress.textContent = `${analytics.progressPercentage ?? athlete.progressPercentage ?? 0}%`;
    if (progValTaskComp) progValTaskComp.textContent = `${analytics.taskCompletionRate ?? 0}%`;
    if (progValHabitCons) progValHabitCons.textContent = `${analytics.habitConsistencyRate ?? 0}%`;
    if (progValTrainingDone) progValTrainingDone.textContent = `${analytics.trainingDoneRate ?? 0}%`;

    const phases = analytics.phases || {};
    const fPct = phases.foundation?.percent ?? 0;
    const dPct = phases.development?.percent ?? 0;
    const pPct = phases.performance?.percent ?? 0;

    if (phaseFoundationPct) phaseFoundationPct.textContent = `${fPct}%`;
    if (phaseFoundationBar) phaseFoundationBar.style.width = `${fPct}%`;

    if (phaseDevelopmentPct) phaseDevelopmentPct.textContent = `${dPct}%`;
    if (phaseDevelopmentBar) phaseDevelopmentBar.style.width = `${dPct}%`;

    if (phasePerformancePct) phasePerformancePct.textContent = `${pPct}%`;
    if (phasePerformanceBar) phasePerformanceBar.style.width = `${pPct}%`;

    const weeklyBarChart = document.getElementById('weeklyBarChart');
    if (weeklyBarChart) {
      const weekly = analytics.weeklyTaskCompletion || [];
      if (weekly.length === 0) {
        weeklyBarChart.innerHTML = '<div style="color: #737378; padding: 20px; text-align: center; width: 100%;">No weekly task data yet.</div>';
      } else {
        weeklyBarChart.innerHTML = weekly.map((item, idx) => `
          <div class="chart-col">
            <div class="bar-fill-wrap"><div class="bar-fill ${idx === weekly.length - 1 ? 'active' : ''}" style="height: ${item.rate}%;"></div></div>
            <div class="bar-val ${idx === weekly.length - 1 ? 'active' : ''}">${item.rate}%</div>
            <div class="bar-label">${escapeHtml(item.week)}</div>
          </div>
        `).join('');
      }
    }
  }

  /**
   * Render Tab 8: Group 3-Way Chat (33086:8034)
   */
  function renderGroupChatTab(group) {
    if (groupMemberCount) groupMemberCount.textContent = `${group.memberCount || 3} members`;

    if (groupMembersRibbon) {
      groupMembersRibbon.innerHTML = (group.members || [])
        .map((m) => {
          return `
            <div class="member-chip">
              <span>${escapeHtml(m.avatarEmoji || '⚽')}</span>
              <span>${escapeHtml(m.label || m.name)}</span>
            </div>
          `;
        })
        .join('');
    }

    if (chatFeed) {
      chatFeed.innerHTML = (group.messages || [])
        .map((m) => {
          const isSelf = m.senderRole === 'coach';
          const roleClass = (m.roleBadge || 'player').toLowerCase();
          return `
            <div class="chat-msg-row ${isSelf ? 'self' : ''}">
              <div class="chat-msg-avatar">${escapeHtml(m.avatarEmoji || '⚽')}</div>
              <div class="chat-msg-content-wrap">
                <div class="chat-msg-sender-meta">
                  <span class="chat-msg-sender-name">${escapeHtml(m.senderName)}</span>
                  <span class="role-tag ${roleClass}">${escapeHtml(m.roleBadge)}</span>
                  <span class="chat-msg-time">${escapeHtml(m.timeLabel || '')}</span>
                </div>
                <div class="chat-bubble">${escapeHtml(m.content)}</div>
              </div>
            </div>
          `;
        })
        .join('');

      // Scroll to bottom
      chatFeed.scrollTop = chatFeed.scrollHeight;
    }
  }

  /**
   * Render Tab 9: Sessions (33092:10372)
   */
  function renderSessionsTab(sessions) {
    if (!sessionsFullList) return;

    const all = [...(sessions.upcoming || []), ...(sessions.completed || [])];
    if (all.length === 0) {
      sessionsFullList.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #737378; background: #131820; border-radius: 16px; border: 1px dashed rgba(255,255,255,0.08);">
          No scheduled sessions yet. Click "+ Schedule Session" to set up a call.
        </div>
      `;
      return;
    }

    sessionsFullList.innerHTML = all
      .map((s) => {
        const isUpcoming = s.status === 'scheduled';
        return `
          <div class="session-card-row ${isUpcoming ? 'upcoming' : ''}">
            <div class="sess-left-info">
              <div class="sess-title">${escapeHtml(s.title)}</div>
              <div class="sess-time-meta">${escapeHtml(s.timeLabel)} · ${escapeHtml(s.duration || '45 min')} (${escapeHtml(s.platform || 'Zoom')})</div>
              ${s.notes ? `<div class="sess-notes-snippet">"${escapeHtml(s.notes)}"</div>` : ''}
            </div>

            <div class="sess-right-actions">
              ${
                isUpcoming
                  ? `<a href="${escapeHtml(s.meetingLink || 'javascript:void(0)')}" target="_blank" class="btn-join-gold">Join Session</a>`
                  : `<button class="btn-outline-gold" onclick="window.openAddNotesModal('${escapeHtml(s._id)}')">${s.notes ? 'Edit Notes' : '+ Add Notes'}</button>`
              }
            </div>
          </div>
        `;
      })
      .join('');
  }

  /**
   * Dedicated Fetchers for Separate Sub-Resource APIs
   */
  async function fetchHabitsTab() {
    try {
      const res = await fetch(`/api/v1/coach/players/${currentAthleteId}/habits`);
      const data = await res.json();
      const attr = data.data?.attributes || data.data || {};
      renderHabitsTab(attr.habits || (Array.isArray(attr) ? attr : []));
    } catch (e) {
      console.error('Error fetching habits:', e);
    }
  }

  async function fetchTasksTab() {
    try {
      const res = await fetch(`/api/v1/coach/players/${currentAthleteId}/tasks`);
      const data = await res.json();
      const attr = data.data?.attributes || data.data || {};
      renderTasksTab(attr.tasks || (Array.isArray(attr) ? attr : []));
    } catch (e) {
      console.error('Error fetching tasks:', e);
    }
  }

  async function fetchTrainingTab() {
    try {
      const res = await fetch(`/api/v1/coach/players/${currentAthleteId}/training`);
      const data = await res.json();
      const attr = data.data?.attributes || data.data || {};
      renderTrainingTab(attr.training || (Array.isArray(attr) ? attr : []));
    } catch (e) {
      console.error('Error fetching training:', e);
    }
  }

  async function fetchActionStepsTab() {
    try {
      const res = await fetch(`/api/v1/coach/players/${currentAthleteId}/action-steps`);
      const data = await res.json();
      const attr = data.data?.attributes || data.data || {};
      renderActionStepsTab(attr.actionSteps || (Array.isArray(attr) ? attr : []));
    } catch (e) {
      console.error('Error fetching action steps:', e);
    }
  }

  async function fetchFeedbackTab() {
    try {
      const res = await fetch(`/api/v1/coach/players/${currentAthleteId}/feedback`);
      const data = await res.json();
      const attr = data.data?.attributes || data.data || {};
      renderFeedbackTab(attr.feedback || (Array.isArray(attr) ? attr : []));
    } catch (e) {
      console.error('Error fetching feedback:', e);
    }
  }

  async function fetchProgressTab() {
    try {
      const res = await fetch(`/api/v1/coach/players/${currentAthleteId}/progress`);
      const data = await res.json();
      const attr = data.data?.attributes || data.data || {};
      renderProgressTab(attr.progressAnalytics || attr || {}, currentAthleteData?.athlete || {});
    } catch (e) {
      console.error('Error fetching progress:', e);
    }
  }

  async function fetchGroupTab() {
    try {
      const res = await fetch(`/api/v1/coach/players/${currentAthleteId}/group-chat`);
      const data = await res.json();
      const attr = data.data?.attributes || data.data || {};
      renderGroupChatTab(attr.group || attr || {});
    } catch (e) {
      console.error('Error fetching group chat:', e);
    }
  }

  async function fetchSessionsTab() {
    try {
      const res = await fetch(`/api/v1/coach/players/${currentAthleteId}/sessions`);
      const data = await res.json();
      const attr = data.data?.attributes || data.data || {};
      renderSessionsTab(attr.sessions || attr || {});
    } catch (e) {
      console.error('Error fetching sessions:', e);
    }
  }

  /**
   * Tab Switching Logic
   */
  window.switchTab = function (tabName) {
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    document.querySelectorAll('.tab-pane').forEach((pane) => {
      pane.classList.toggle('active', pane.id === `pane-${tabName}`);
    });

    // Load tab content from dedicated separate sub-resource API
    if (tabName === 'habits') fetchHabitsTab();
    else if (tabName === 'tasks') fetchTasksTab();
    else if (tabName === 'training') fetchTrainingTab();
    else if (tabName === 'action-steps') fetchActionStepsTab();
    else if (tabName === 'feedback') fetchFeedbackTab();
    else if (tabName === 'progress') fetchProgressTab();
    else if (tabName === 'group') fetchGroupTab();
    else if (tabName === 'sessions') fetchSessionsTab();
  };

  // Wire tab buttons
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.switchTab(btn.getAttribute('data-tab'));
    });
  });

  // Hero action buttons
  const btnHeroMessage = document.getElementById('btnHeroMessage');
  if (btnHeroMessage) {
    btnHeroMessage.addEventListener('click', () => window.switchTab('group'));
  }

  const btnHeroGiveFeedback = document.getElementById('btnHeroGiveFeedback');
  if (btnHeroGiveFeedback) {
    btnHeroGiveFeedback.addEventListener('click', () => window.openModal('modalGiveFeedback'));
  }

  /**
   * Modal Management
   */
  window.openModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  };

  window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  };

  document.querySelectorAll('.btn-modal-close').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      window.closeModal(modalId);
    });
  });

  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.classList.remove('active');
    });
  });

  // Open modal button triggers
  window.openNewHabitModal = () => window.openModal('modalNewHabit');
  window.openAssignTaskModal = () => window.openModal('modalAssignTask');
  window.openAssignTrainingModal = () => window.openModal('modalAssignTraining');
  window.openGiveFeedbackModal = () => window.openModal('modalGiveFeedback');

  const btnOpenNewHabitModal = document.getElementById('btnOpenNewHabitModal');
  if (btnOpenNewHabitModal) btnOpenNewHabitModal.addEventListener('click', window.openNewHabitModal);

  const btnOpenAssignTaskModal = document.getElementById('btnOpenAssignTaskModal');
  if (btnOpenAssignTaskModal) btnOpenAssignTaskModal.addEventListener('click', window.openAssignTaskModal);

  const btnOpenAssignTrainingModal = document.getElementById('btnOpenAssignTrainingModal');
  if (btnOpenAssignTrainingModal) btnOpenAssignTrainingModal.addEventListener('click', window.openAssignTrainingModal);

  const btnOpenFeedbackModal = document.getElementById('btnOpenFeedbackModal');
  if (btnOpenFeedbackModal) btnOpenFeedbackModal.addEventListener('click', window.openGiveFeedbackModal);

  const btnOpenScheduleSessionModal = document.getElementById('btnOpenScheduleSessionModal');
  if (btnOpenScheduleSessionModal) btnOpenScheduleSessionModal.addEventListener('click', () => window.openModal('modalScheduleSession'));

  window.openAddNotesModal = function (sessionId) {
    const input = document.getElementById('notesSessionIdInput');
    if (input) input.value = sessionId;
    window.openModal('modalAddNotes');
  };

  // Review Action Step button
  const btnOpenReviewActionStepModal = document.getElementById('btnOpenReviewActionStepModal');
  if (btnOpenReviewActionStepModal) {
    btnOpenReviewActionStepModal.addEventListener('click', () => {
      if (!selectedActionStep) return;
      const input = document.getElementById('reviewActionStepIdInput');
      if (input) input.value = selectedActionStep._id;
      window.openModal('modalReviewActionStep');
    });
  }

  // Quick Approve Action Step
  const btnQuickApproveActionStep = document.getElementById('btnQuickApproveActionStep');
  if (btnQuickApproveActionStep) {
    btnQuickApproveActionStep.addEventListener('click', async () => {
      if (!selectedActionStep) return;
      try {
        const res = await fetch(`/api/v1/coach/action-steps/${selectedActionStep._id}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'reviewed', textNotes: 'Reviewed & Approved by Coach.' }),
        });
        const d = await res.json();
        if (d.status === 'success') {
          showToast('Action step marked as reviewed!');
          loadPlayerData();
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  /**
   * Action: Toggle Task
   */
  window.toggleTask = async function (taskId) {
    try {
      const res = await fetch(`/api/v1/coach/tasks/${taskId}/status`, {
        method: 'PATCH',
      });
      const data = await res.json();
      if (data.status === 'success') {
        showToast('Task updated!');
        fetchTasksTab();
        loadPlayerData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  /**
   * Form 1: New Habit Submit
   */
  const formNewHabit = document.getElementById('formNewHabit');
  if (formNewHabit) {
    formNewHabit.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('habitNameInput').value.trim();
      const frequency = document.getElementById('habitFrequencySelect').value;
      const startDate = document.getElementById('habitStartDateInput').value;

      try {
        const res = await fetch(`/api/v1/coach/players/${currentAthleteId}/habits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, frequency, startDate }),
        });
        const data = await res.json();
        if (data.status === 'success') {
          showToast('Habit added successfully!');
          window.closeModal('modalNewHabit');
          formNewHabit.reset();
          fetchHabitsTab();
          loadPlayerData();
        } else {
          throw new Error(data.message || 'Failed to add habit');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  /**
   * Form 2: Assign Task Submit
   */
  const formAssignTask = document.getElementById('formAssignTask');
  if (formAssignTask) {
    formAssignTask.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('taskTitleInput').value.trim();
      const dueDate = document.getElementById('taskDueDateInput').value;
      const frequency = document.getElementById('taskFrequencySelect').value;

      try {
        const res = await fetch(`/api/v1/coach/players/${currentAthleteId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, dueDate, frequency }),
        });
        const data = await res.json();
        if (data.status === 'success') {
          showToast('Task assigned successfully!');
          window.closeModal('modalAssignTask');
          formAssignTask.reset();
          fetchTasksTab();
          loadPlayerData();
        } else {
          throw new Error(data.message || 'Failed to assign task');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  /**
   * Form 3: Assign Training Submit
   */
  const formAssignTraining = document.getElementById('formAssignTraining');
  if (formAssignTraining) {
    formAssignTraining.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('trainingTitleInput').value.trim();
      const videoUrl = document.getElementById('trainingVideoUrlInput').value.trim();
      const category = document.getElementById('trainingCategorySelect').value;
      const duration = document.getElementById('trainingDurationInput').value.trim();
      const week = document.getElementById('trainingWeekInput').value;

      try {
        const res = await fetch(`/api/v1/coach/players/${currentAthleteId}/training`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, videoUrl, category, duration, week }),
        });
        const data = await res.json();
        if (data.status === 'success') {
          showToast('Training assigned successfully!');
          window.closeModal('modalAssignTraining');
          formAssignTraining.reset();
          fetchTrainingTab();
          loadPlayerData();
        } else {
          throw new Error(data.message || 'Failed to assign training');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  /**
   * Form 4: Give Feedback Submit
   */
  const formGiveFeedback = document.getElementById('formGiveFeedback');
  if (formGiveFeedback) {
    // Tag pill selection toggles
    document.querySelectorAll('#feedbackTagsContainer .tag-chip').forEach((chip) => {
      chip.addEventListener('click', () => chip.classList.toggle('active'));
    });

    formGiveFeedback.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('feedbackTitleInput').value.trim();
      const message = document.getElementById('feedbackMessageTextarea').value.trim();
      const tags = Array.from(document.querySelectorAll('#feedbackTagsContainer .tag-chip.active')).map((c) => c.getAttribute('data-tag'));
      const ratingVal = document.getElementById('feedbackRatingSelect') ? document.getElementById('feedbackRatingSelect').value : '';
      const rating = ratingVal ? Number(ratingVal) : null;

      try {
        const res = await fetch(`/api/v1/coach/players/${currentAthleteId}/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, message, tags, rating }),
        });
        const data = await res.json();
        if (data.status === 'success') {
          showToast('Feedback recorded successfully!');
          window.closeModal('modalGiveFeedback');
          formGiveFeedback.reset();
          fetchFeedbackTab();
          loadPlayerData();
        } else {
          throw new Error(data.message || 'Failed to submit feedback');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  /**
   * Form 5: Add Notes Submit
   */
  const formAddNotes = document.getElementById('formAddNotes');
  if (formAddNotes) {
    formAddNotes.addEventListener('submit', async (e) => {
      e.preventDefault();
      const sessionId = document.getElementById('notesSessionIdInput').value;
      const notes = document.getElementById('sessionNotesTextarea').value.trim();

      try {
        const res = await fetch(`/api/v1/coach/sessions/${sessionId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes }),
        });
        const data = await res.json();
        if (data.status === 'success') {
          showToast('Session notes saved!');
          window.closeModal('modalAddNotes');
          formAddNotes.reset();
          fetchSessionsTab();
          loadPlayerData();
        } else {
          throw new Error(data.message || 'Failed to save notes');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  /**
   * Form 6: Schedule Session Submit
   */
  const formScheduleSession = document.getElementById('formScheduleSession');
  if (formScheduleSession) {
    formScheduleSession.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('sessionTitleInput').value.trim();
      const date = document.getElementById('sessionDateInput').value;
      const startTime = document.getElementById('sessionTimeInput').value;
      const duration = document.getElementById('sessionDurationInput').value.trim();
      const platform = document.getElementById('sessionPlatformSelect').value;
      const meetingLink = document.getElementById('sessionMeetingLinkInput').value.trim();

      const isoDateTime = `${date}T${startTime}:00.000Z`;

      try {
        const res = await fetch(`/api/v1/coach/players/${currentAthleteId}/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            date,
            dateTime: isoDateTime,
            startTime,
            duration,
            platform,
            meetingLink,
          }),
        });
        const data = await res.json();
        if (data.status === 'success') {
          showToast('Session scheduled successfully!');
          window.closeModal('modalScheduleSession');
          formScheduleSession.reset();
          fetchSessionsTab();
          loadPlayerData();
        } else {
          throw new Error(data.message || 'Failed to schedule session');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  /**
   * Form 7: Review Action Step Submit
   */
  const formReviewActionStep = document.getElementById('formReviewActionStep');
  if (formReviewActionStep) {
    formReviewActionStep.addEventListener('submit', async (e) => {
      e.preventDefault();
      const actionStepId = document.getElementById('reviewActionStepIdInput').value;
      const status = document.getElementById('reviewStatusSelect').value;
      const textNotes = document.getElementById('reviewTextNotesTextarea').value.trim();
      const videoUrl = document.getElementById('reviewVideoUrlInput').value.trim();

      try {
        const res = await fetch(`/api/v1/coach/action-steps/${actionStepId}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, textNotes, videoUrl }),
        });
        const data = await res.json();
        if (data.status === 'success') {
          showToast('Review submitted successfully!');
          window.closeModal('modalReviewActionStep');
          formReviewActionStep.reset();
          fetchActionStepsTab();
          loadPlayerData();
        } else {
          throw new Error(data.message || 'Failed to submit review');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  /**
   * Form 8: 3-Way Group Message Send
   */
  if (groupChatForm) {
    groupChatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = groupMessageInput.value.trim();
      if (!content) return;

      try {
        const res = await fetch(`/api/v1/coach/players/${currentAthleteId}/group-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        const data = await res.json();
        if (data.status === 'success') {
          groupMessageInput.value = '';
          fetchGroupTab();
          loadPlayerData();
        } else {
          throw new Error(data.message || 'Failed to send message');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Initial Data Load
  document.addEventListener('DOMContentLoaded', loadPlayerData);
})();
