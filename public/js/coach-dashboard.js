// public/js/coach-dashboard.js
// Interactive client-side controller for Coach Web Dashboard
// Implements Figma Node #33026:13150 (Overview), #33092:10786 (My Players),
// #33097:12108 (Tasks), #33097:13469 (Training Programs), #33253:3342 (Full Section)

(function () {
  'use strict';

  let currentDashboardData = null;
  let currentFeedbackData = null;
  let currentSessionsData = null;
  let currentRosterPlayers = [];
  let allPlayers = [];
  let currentRosterFilter = 'all';

  // DOM Elements - Navigation & Views
  const sidebarItems = document.querySelectorAll('.sidebar-nav .sidebar-item[data-view]');
  const viewPanes = document.querySelectorAll('.dashboard-view-pane');
  const refreshBtn = document.getElementById('refreshBtn');
  const dashboardSearchInput = document.getElementById('dashboardSearchInput');

  // Sidebar dynamic indicators
  const sidebarPlayersCount = document.getElementById('sidebarPlayersCount');
  const sidebarTasksCount = document.getElementById('sidebarTasksCount');
  const sidebarActionStepsCount = document.getElementById('sidebarActionStepsCount');
  const sidebarCoachName = document.getElementById('sidebarCoachName');
  const sidebarCoachSub = document.getElementById('sidebarCoachSub');

  // VIEW 1: Overview Elements
  const metricAssignedCount = document.getElementById('metricAssignedCount');
  const metricAssignedSub = document.getElementById('metricAssignedSub');
  const metricAttentionCount = document.getElementById('metricAttentionCount');
  const metricAttentionSub = document.getElementById('metricAttentionSub');
  const metricPendingCount = document.getElementById('metricPendingCount');
  const metricPendingSub = document.getElementById('metricPendingSub');
  const metricSessionsCount = document.getElementById('metricSessionsCount');
  const metricSessionsSub = document.getElementById('metricSessionsSub');
  const playersGrid = document.getElementById('playersGrid');
  const recentActivityList = document.getElementById('recentActivityList');
  const upcomingSessionsList = document.getElementById('upcomingSessionsList');

  // VIEW 2: My Players Roster Elements
  const rosterSearchInput = document.getElementById('rosterSearchInput');
  const rosterFilterPills = document.querySelectorAll('#rosterFilterPills .roster-pill');
  const rosterTableBody = document.getElementById('rosterTableBody');

  // VIEW 3: Tasks Overview Elements
  const tasksStatToday = document.getElementById('tasksStatToday');
  const tasksStatUpcoming = document.getElementById('tasksStatUpcoming');
  const tasksStatOverdue = document.getElementById('tasksStatOverdue');
  const tasksStatCompleted = document.getElementById('tasksStatCompleted');
  const tasksPlayersList = document.getElementById('tasksPlayersList');

  // VIEW 4: Training Programs Elements
  const trainingStatToday = document.getElementById('trainingStatToday');
  const trainingStatUpcoming = document.getElementById('trainingStatUpcoming');
  const trainingStatOverdue = document.getElementById('trainingStatOverdue');
  const trainingStatCompleted = document.getElementById('trainingStatCompleted');
  const trainingPlayersGrid = document.getElementById('trainingPlayersGrid');

  // Additional View Containers
  const actionStepsOverviewContainer = document.getElementById('actionStepsOverviewContainer');
  const feedbackOverviewDesc = document.getElementById('feedbackOverviewDesc');
  const feedbackPlayersGrid = document.getElementById('feedbackPlayersGrid');
  const sessionsUpcomingList = document.getElementById('sessionsUpcomingList');
  const sessionsCompletedList = document.getElementById('sessionsCompletedList');

  // Player Drawer Modal Elements
  const playerModalBackdrop = document.getElementById('playerModalBackdrop');
  const closePlayerModalBtn = document.getElementById('closePlayerModalBtn');
  const modalPlayerAvatar = document.getElementById('modalPlayerAvatar');
  const modalPlayerName = document.getElementById('modalPlayerName');
  const modalPlayerClub = document.getElementById('modalPlayerClub');
  const modalPlayerDay = document.getElementById('modalPlayerDay');
  const modalPlayerLvl = document.getElementById('modalPlayerLvl');
  const modalPlayerStreak = document.getElementById('modalPlayerStreak');
  const modalPlayerPending = document.getElementById('modalPlayerPending');
  const modalPlayerProgressText = document.getElementById('modalPlayerProgressText');
  const modalProgressBar = document.getElementById('modalProgressBar');

  // Session Notes Modal Elements (Figma #33102:688)
  const sessionNotesModalBackdrop = document.getElementById('sessionNotesModalBackdrop');
  const closeSessionNotesBtn = document.getElementById('closeSessionNotesBtn');
  const sessionNotesAvatar = document.getElementById('sessionNotesAvatar');
  const sessionNotesAthleteName = document.getElementById('sessionNotesAthleteName');
  const sessionNotesTopic = document.getElementById('sessionNotesTopic');
  const sessionNotesDateTime = document.getElementById('sessionNotesDateTime');
  const sessionNotesContent = document.getElementById('sessionNotesContent');

  /**
   * Escape HTML utility to prevent XSS
   */
  function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * 1. View Switching Controller (Supports sidebar clicks & ?view=... query param)
   */
  function switchView(viewName, updateUrl = true) {
    if (!viewName) viewName = 'dashboard';

    // Map any alias
    if (viewName === 'overview') viewName = 'dashboard';
    if (viewName === 'my-players') viewName = 'players';

    let matchedPane = document.getElementById(`view-${viewName}`);
    if (!matchedPane) {
      viewName = 'dashboard';
      matchedPane = document.getElementById('view-dashboard');
    }

    // Toggle active pane
    viewPanes.forEach((pane) => {
      pane.classList.toggle('active', pane.id === `view-${viewName}`);
    });

    // Toggle active sidebar item
    sidebarItems.forEach((item) => {
      const itemTarget = item.getAttribute('data-view');
      item.classList.toggle('active', itemTarget === viewName);
    });

    if (updateUrl) {
      const url = new URL(window.location.href);
      if (viewName === 'dashboard') {
        url.searchParams.delete('view');
      } else {
        url.searchParams.set('view', viewName);
      }
      window.history.pushState({ view: viewName }, '', url.toString());
    }
  }

  // Bind Sidebar Item Clicks
  sidebarItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = item.getAttribute('data-view');
      switchView(targetView, true);
    });
  });

  // Handle Browser Back/Forward Navigation
  window.addEventListener('popstate', (e) => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view') || 'dashboard';
    switchView(view, false);
  });

  /**
   * 2. Fetch Dashboard Data from Backend API
   */
  async function loadDashboardData() {
    try {
      const [dashRes, feedbackRes, sessionsRes, playersRes] = await Promise.allSettled([
        fetch('/api/v1/coach/dashboard'),
        fetch('/api/v1/coach/feedback'),
        fetch('/api/v1/coach/sessions'),
        fetch('/api/v1/coach/players')
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value.ok) {
        const json = await dashRes.value.json();
        const data = json.data?.attributes || json.data;
        if (data) {
          currentDashboardData = data;
          allPlayers = data.players || [];
        }
      }

      if (feedbackRes.status === 'fulfilled' && feedbackRes.value.ok) {
        const fJson = await feedbackRes.value.json();
        currentFeedbackData = fJson.data?.attributes || fJson.data;
      }

      if (sessionsRes.status === 'fulfilled' && sessionsRes.value.ok) {
        const sJson = await sessionsRes.value.json();
        currentSessionsData = sJson.data?.attributes || sJson.data;
      }

      if (playersRes.status === 'fulfilled' && playersRes.value.ok) {
        const pJson = await playersRes.value.json();
        currentRosterPlayers = pJson.data?.attributes?.players || pJson.data?.players || [];
      }

      if (currentDashboardData) {
        renderAllViews(currentDashboardData);
      } else {
        loadFallbackData();
      }
    } catch (err) {
      console.warn('API error, using cached data:', err);
      loadFallbackData();
    }
  }

  /**
   * Fallback data if offline
   */
  function loadFallbackData() {
    const emptyData = {
      coach: { name: 'Coach Rivera', title: 'DSM Soccer', avatarEmoji: '🎯' },
      metrics: {
        assignedPlayers: { count: 4, subtitle: 'All active' },
        needsAttention: { count: 1, subtitle: 'Jordan Lee' },
        pendingActionSteps: { count: 9, subtitle: 'Across all players' },
        sessionsToday: { count: 1, subtitle: '3:00 PM — Alex' },
      },
      players: [],
      recentActivity: [],
      upcomingSessions: [],
      tasksOverview: {
        metrics: { today: 3, upcoming: 8, overdue: 2, completed: 41 },
        players: [],
      },
      trainingOverview: {
        metrics: { today: 3, upcoming: 8, overdue: 2, completed: 41 },
        players: [],
      },
    };

    currentDashboardData = emptyData;
    allPlayers = [];
    renderAllViews(emptyData);
  }

  /**
   * 3. Render All Dashboard Views
   */
  function renderAllViews(data) {
    // A. Update Sidebar Coach Info & Indicators
    if (sidebarCoachName && data.coach?.name) sidebarCoachName.textContent = data.coach.name;
    if (sidebarCoachSub && data.coach?.title) sidebarCoachSub.textContent = data.coach.title;
    if (sidebarPlayersCount) sidebarPlayersCount.textContent = (data.players || []).length;
    if (sidebarTasksCount) {
      const totalPendingTasks = (data.players || []).reduce((acc, p) => acc + (Number(p.pending) || 0), 0);
      sidebarTasksCount.textContent = totalPendingTasks || 6;
    }

    // B. View 1: Overview
    renderOverview(data);

    // C. View 2: My Players Roster (Figma #33092:10786)
    renderRosterTable(currentRosterPlayers.length > 0 ? currentRosterPlayers : allPlayers);

    // D. View 3: Tasks Overview (Figma #33097:12108)
    renderTasksView(data.tasksOverview || {});

    // E. View 4: Training Programs (Figma #33097:13469)
    renderTrainingView(data.trainingOverview || {});

    // F. View 5: Action Steps
    renderActionStepsOverview(data);

    // G. View 6: Feedback Overview (Figma #33101:65)
    renderFeedbackOverview(currentFeedbackData || data.feedbackOverview || {});

    // H. View 7: Coaching Sessions (Figma #33102:688)
    renderSessionsOverview(currentSessionsData || { upcoming: data.upcomingSessions || [], completed: [] });
  }

  /**
   * VIEW 1: Overview
   */
  function renderOverview(data) {
    if (data.metrics) {
      if (metricAssignedCount) metricAssignedCount.textContent = data.metrics.assignedPlayers?.count ?? 4;
      if (metricAssignedSub) metricAssignedSub.textContent = data.metrics.assignedPlayers?.subtitle ?? 'All active';

      if (metricAttentionCount) metricAttentionCount.textContent = data.metrics.needsAttention?.count ?? 1;
      if (metricAttentionSub) metricAttentionSub.textContent = data.metrics.needsAttention?.subtitle ?? 'Jordan Lee';

      if (metricPendingCount) metricPendingCount.textContent = data.metrics.pendingActionSteps?.count ?? 9;
      if (metricPendingSub) metricPendingSub.textContent = data.metrics.pendingActionSteps?.subtitle ?? 'Across all players';

      if (metricSessionsCount) metricSessionsCount.textContent = data.metrics.sessionsToday?.count ?? 1;
      if (metricSessionsSub) metricSessionsSub.textContent = data.metrics.sessionsToday?.subtitle ?? '3:00 PM — Alex';
    }

    renderPlayersGrid(data.players || []);
    renderRecentActivity(data.recentActivity || []);
    renderUpcomingSessions(data.upcomingSessions || []);
  }

  /**
   * Render Players 2x2 Grid (Overview)
   */
  function renderPlayersGrid(players) {
    if (!playersGrid) return;

    if (!players || players.length === 0) {
      playersGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: #737378; background: #131820; border-radius: 16px; border: 1px dashed rgba(255,255,255,0.08);">
          No assigned players match your filter.
        </div>
      `;
      return;
    }

    playersGrid.innerHTML = players
      .map((p) => {
        let badgeClass = 'badge-active';
        if (p.badgeType === 'attention' || p.statusBadge === 'ATTENTION') {
          badgeClass = 'badge-attention';
        } else if (p.badgeType === 'finishing' || p.statusBadge === 'FINISHING') {
          badgeClass = 'badge-finishing';
        }

        const barColor = p.accentColor || (p.badgeType === 'attention' ? '#FF5C5C' : '#3B82F6');
        const pendingColorClass = (Number(p.pending) > 2 || p.badgeType === 'attention') ? 'stat-col-val red' : 'stat-col-val';

        return `
          <article class="player-card" data-player-id="${escapeHtml(p._id)}" onclick="window.handleOpenPlayerDetails('${escapeHtml(p._id)}')">
            <div>
              <div class="player-card-header">
                <div class="player-avatar-circle">${escapeHtml(p.avatarEmoji || '🏃')}</div>
                <div class="player-title-box">
                  <div class="player-name-row">
                    <span class="player-name">${escapeHtml(p.name)}</span>
                    <span class="player-badge ${badgeClass}">${escapeHtml(p.statusBadge || 'ACTIVE')}</span>
                  </div>
                  <div class="player-club">${escapeHtml(p.club || 'Regional Stars U18')}</div>
                </div>
              </div>

              <div class="player-stats-cols">
                <div>
                  <div class="stat-col-val">${escapeHtml(p.day || '34/90')}</div>
                  <div class="stat-col-lbl">Day</div>
                </div>
                <div>
                  <div class="stat-col-val">${escapeHtml(p.level || 1)}</div>
                  <div class="stat-col-lbl">Lvl</div>
                </div>
                <div>
                  <div class="stat-col-val">${escapeHtml(p.streak || '0d')}</div>
                  <div class="stat-col-lbl">Streak</div>
                </div>
                <div>
                  <div class="${pendingColorClass}">${escapeHtml(p.pending || 0)}</div>
                  <div class="stat-col-lbl">Pending</div>
                </div>
              </div>

              <div class="player-progress-track">
                <div class="player-progress-fill" style="width: ${p.progressPercentage || 0}%; background-color: ${barColor};"></div>
              </div>
            </div>

            <div class="player-card-caption">
              ${escapeHtml(p.caption || `${p.progressPercentage || 0}% complete`)}
            </div>
          </article>
        `;
      })
      .join('');
  }

  /**
   * Render Recent Activity
   */
  function renderRecentActivity(activities) {
    if (!recentActivityList) return;

    if (!activities || activities.length === 0) {
      recentActivityList.innerHTML = `
        <div style="padding: 24px 12px; text-align: center; color: #737378; font-size: 13px;">
          No recent activity logged across athletes.
        </div>
      `;
      return;
    }

    recentActivityList.innerHTML = activities
      .map((item) => {
        const actionClass = item.isAlert ? 'activity-action alert-red' : 'activity-action';
        return `
          <div class="activity-row">
            <div class="activity-icon-box">${escapeHtml(item.avatarEmoji || '⚡')}</div>
            <div class="activity-text-box">
              <div class="activity-name">${escapeHtml(item.name)}</div>
              <div class="${actionClass}">${escapeHtml(item.action)}</div>
            </div>
            <div class="activity-time">${escapeHtml(item.timeAgo)}</div>
          </div>
        `;
      })
      .join('');
  }

  /**
   * Render Upcoming Sessions (Overview)
   */
  function renderUpcomingSessions(sessions) {
    if (!upcomingSessionsList) return;

    if (!sessions || sessions.length === 0) {
      upcomingSessionsList.innerHTML = `
        <div style="padding: 24px 12px; text-align: center; color: #737378; font-size: 13px;">
          No upcoming coaching sessions scheduled.
        </div>
      `;
      return;
    }

    upcomingSessionsList.innerHTML = sessions
      .map((sess) => {
        const featuredClass = sess.canJoin ? 'session-item-card featured' : 'session-item-card';
        return `
          <div class="${featuredClass}">
            <div class="session-icon-box">📹</div>
            <div class="session-info">
              <div class="session-athlete-name">${escapeHtml(sess.athleteName)}</div>
              <div class="session-time-text">${escapeHtml(sess.timeLabel)}</div>
            </div>
            ${
              sess.canJoin
                ? `<a href="${escapeHtml(sess.meetingLink || 'javascript:void(0)')}" class="btn-join-session" onclick="if(!'${sess.meetingLink}') alert('Launching Coach Room for ${escapeHtml(sess.athleteName)}...')">Join</a>`
                : ''
            }
          </div>
        `;
      })
      .join('');
  }

  /**
   * VIEW 2: My Players Roster Table (Figma #33092:10786)
   */
  function renderRosterTable(players) {
    if (!rosterTableBody) return;

    let source = players || currentRosterPlayers;
    if (!source || source.length === 0) source = allPlayers || [];

    let filtered = [...source];

    // Filter by tab pill
    if (currentRosterFilter && currentRosterFilter !== 'all') {
      filtered = filtered.filter((p) => (p.badgeType || p.statusBadge || '').toLowerCase().includes(currentRosterFilter.toLowerCase()));
    }

    // Filter by search query
    const q = (rosterSearchInput?.value || '').toLowerCase().trim();
    if (q) {
      filtered = filtered.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.club || '').toLowerCase().includes(q) ||
          (p.programTrack || '').toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      rosterTableBody.innerHTML = `
        <div style="padding: 36px 20px; text-align: center; color: #737378; font-size: 13.5px;">
          No athletes match the current filter.
        </div>
      `;
      return;
    }

    rosterTableBody.innerHTML = filtered
      .map((p) => {
        const pendingCount = Number(p.pending) || 0;
        let pendingColor = 'gray';
        if (pendingCount >= 4 || p.badgeType === 'attention') {
          pendingColor = 'red';
        } else if (pendingCount > 0) {
          pendingColor = 'gold';
        }

        const pendingDisplay = pendingCount > 0 ? String(pendingCount) : '-';
        const progDay = p.programDay || (p.dayNumber ? `Day ${p.dayNumber}/90` : 'Day 1/90');
        const progTrack = p.programTrack || 'Development';
        const progressVal = p.progressPercentage !== undefined ? p.progressPercentage : 50;
        const lvl = p.levelLabel || `Lvl ${p.level || 1}`;
        const lastActive = p.lastActive ? p.lastActive.replace(/^Last active\s*/i, '') : '1d ago';

        return `
          <div class="roster-row">
            <div class="roster-player-col">
              <div class="roster-player-avatar">${escapeHtml(p.avatarEmoji || '🏃')}</div>
              <div>
                <div class="roster-player-name">${escapeHtml(p.name)}</div>
                <div class="roster-player-club">${escapeHtml(p.club || 'Regional Stars U18')}</div>
              </div>
            </div>

            <div>
              <div class="roster-program-day">${escapeHtml(progDay)}</div>
              <div class="roster-program-track">${escapeHtml(progTrack)}</div>
            </div>

            <div>
              <div class="roster-progress-wrap">
                <div class="roster-progress-mini-track">
                  <div class="roster-progress-mini-fill" style="width: ${progressVal}%;"></div>
                </div>
                <span class="roster-progress-pct">${progressVal}%</span>
              </div>
            </div>

            <div class="roster-level-text">${escapeHtml(lvl)}</div>

            <div>
              <span class="roster-pending-text ${pendingColor}">${escapeHtml(pendingDisplay)}</span>
            </div>

            <div class="roster-lastactive-text">${escapeHtml(lastActive)}</div>

            <div class="roster-actions-col">
              <a href="/coach-player-detail?id=${escapeHtml(p._id)}" class="btn-roster-view">View</a>
              <a href="/coach-player-detail?id=${escapeHtml(p._id)}&tab=feedback" class="btn-roster-feedback">Feedback</a>
            </div>
          </div>
        `;
      })
      .join('');
  }

  // Bind Roster Search & Filter Pills
  if (rosterSearchInput) {
    rosterSearchInput.addEventListener('input', () => {
      renderRosterTable(currentRosterPlayers.length > 0 ? currentRosterPlayers : allPlayers);
    });
  }

  rosterFilterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      rosterFilterPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      currentRosterFilter = pill.getAttribute('data-filter') || 'all';
      renderRosterTable(currentRosterPlayers.length > 0 ? currentRosterPlayers : allPlayers);
    });
  });

  /**
   * VIEW 3: Tasks Overview (Figma #33097:12108)
   */
  function renderTasksView(tasksData) {
    const metrics = tasksData.metrics || {};
    if (tasksStatToday) tasksStatToday.textContent = metrics.today ?? 3;
    if (tasksStatUpcoming) tasksStatUpcoming.textContent = metrics.upcoming ?? 8;
    if (tasksStatOverdue) tasksStatOverdue.textContent = metrics.overdue ?? 2;
    if (tasksStatCompleted) tasksStatCompleted.textContent = metrics.completed ?? 41;

    if (!tasksPlayersList) return;

    const players = tasksData.players || [];
    if (players.length === 0) {
      tasksPlayersList.innerHTML = `
        <div style="padding: 36px 20px; text-align: center; color: #737378; font-size: 13.5px; background: #131820; border-radius: 16px;">
          No active player tasks recorded.
        </div>
      `;
      return;
    }

    tasksPlayersList.innerHTML = players
      .map((p) => {
        let badgeClass = 'badge-gold';
        if (p.badgeType === 'overdue' || (Number(p.pending) >= 3)) {
          badgeClass = 'badge-red';
        } else if (p.badgeType === 'completed' || Number(p.pending) === 0) {
          badgeClass = 'badge-green';
        }

        const pendingNum = p.pending !== undefined ? p.pending : (p.pendingCount || 0);
        const badgeText = `${pendingNum} pending`;
        const rate = p.progressPercentage !== undefined ? p.progressPercentage : (p.completionRate !== undefined ? p.completionRate : 60);

        return `
          <div class="task-player-card" onclick="window.location.href='/coach-player-detail?id=${escapeHtml(p._id)}&tab=tasks'">
            <div class="task-card-header">
              <span class="task-player-avatar">${escapeHtml(p.avatarEmoji || '🏃')}</span>
              <span class="task-player-name">${escapeHtml(p.name)}</span>
              <span class="task-pending-badge ${badgeClass}">${escapeHtml(badgeText)}</span>
            </div>
            <div class="task-progress-track">
              <div class="task-progress-fill" style="width: ${rate}%;"></div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  /**
   * VIEW 4: Training Programs Overview (Figma #33097:13469)
   */
  function renderTrainingView(trainingData) {
    const metrics = trainingData.metrics || {};
    if (trainingStatToday) trainingStatToday.textContent = metrics.today ?? 3;
    if (trainingStatUpcoming) trainingStatUpcoming.textContent = metrics.upcoming ?? 8;
    if (trainingStatOverdue) trainingStatOverdue.textContent = metrics.overdue ?? 2;
    if (trainingStatCompleted) trainingStatCompleted.textContent = metrics.completed ?? 41;

    if (!trainingPlayersGrid) return;

    const players = trainingData.players || [];
    if (players.length === 0) {
      trainingPlayersGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 36px 20px; text-align: center; color: #737378; font-size: 13.5px; background: #131820; border-radius: 16px;">
          No active training assignments recorded.
        </div>
      `;
      return;
    }

    trainingPlayersGrid.innerHTML = players
      .map((p) => {
        const rate = p.completionRate !== undefined ? p.completionRate : 60;
        const caption = p.label || `${p.completedVideos || 3}/${p.totalVideos || 5} videos complete · Week ${p.week || 5}`;

        return `
          <div class="training-player-card" onclick="window.location.href='/coach-player-detail?id=${escapeHtml(p._id)}&tab=training'">
            <div>
              <div class="training-card-header">
                <span class="training-player-avatar">${escapeHtml(p.avatarEmoji || '🏃')}</span>
                <div>
                  <div class="training-player-name">${escapeHtml(p.name)}</div>
                  <div class="training-player-club">${escapeHtml(p.club || 'Regional Stars U18')}</div>
                </div>
              </div>
              <div class="training-progress-track">
                <div class="training-progress-fill" style="width: ${rate}%;"></div>
              </div>
            </div>
            <div class="training-card-caption">
              ${escapeHtml(caption)}
            </div>
          </div>
        `;
      })
      .join('');
  }

  /**
   * VIEW 5: Action Steps Overview
   */
  function renderActionStepsOverview(data) {
    if (!actionStepsOverviewContainer) return;

    const players = data.players || [];
    actionStepsOverviewContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 14px;">
        ${players
          .map(
            (p) => `
          <div class="notif-card-item" style="cursor: pointer;" onclick="window.location.href='/coach-player-detail?id=${escapeHtml(p._id)}&tab=action-steps'">
            <span style="font-size: 24px;">${escapeHtml(p.avatarEmoji || '🏃')}</span>
            <div style="flex: 1;">
              <div style="font-weight: 700; color: #FFFFFF; font-size: 14.5px;">${escapeHtml(p.name)}</div>
              <div style="font-size: 12.5px; color: #BFBFBF;">${escapeHtml(p.pending || 0)} submissions awaiting coach review</div>
            </div>
            <button type="button" class="btn-join-session" style="padding: 6px 14px; font-size: 12px;">Review Steps</button>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  /**
   * VIEW 6: Feedback Overview (Figma Node #33101:65)
   */
  function renderFeedbackOverview(feedbackData) {
    if (feedbackOverviewDesc && feedbackData.description) {
      feedbackOverviewDesc.textContent = feedbackData.description;
    }

    if (!feedbackPlayersGrid) return;

    const players = feedbackData.players || (currentDashboardData && currentDashboardData.players) || [];
    if (players.length === 0) {
      feedbackPlayersGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: #737378; background: #131820; border-radius: 16px; border: 1px dashed rgba(255,255,255,0.08);">
          No assigned players found for feedback evaluations.
        </div>
      `;
      return;
    }

    feedbackPlayersGrid.innerHTML = players
      .map((p) => {
        const sub = p.lastFeedbackText || (p.lastFeedbackDate ? `Last feedback: ${p.lastFeedbackDate}` : 'No feedback recorded yet');
        return `
          <article class="feedback-player-card" onclick="window.location.href='/coach-player-detail?id=${escapeHtml(p._id)}&tab=feedback'">
            <div class="feedback-card-header">
              <div class="feedback-player-avatar">${escapeHtml(p.avatarEmoji || '🏃')}</div>
              <div>
                <div class="feedback-player-name">${escapeHtml(p.name)}</div>
                <div class="feedback-player-sub">${escapeHtml(sub)}</div>
              </div>
            </div>
            <button type="button" class="btn-give-feedback" onclick="event.stopPropagation(); window.location.href='/coach-player-detail?id=${escapeHtml(p._id)}&tab=feedback'">
              Give Feedback &rarr;
            </button>
          </article>
        `;
      })
      .join('');
  }

  /**
   * VIEW 7: Coaching Sessions Overview (Figma Node #33102:688)
   */
  function renderSessionsOverview(sessionsData) {
    const upcoming = sessionsData.upcoming || [];
    const completed = sessionsData.completed || [];

    // Store in global window variable for session notes popup
    window._allCoachSessions = [...upcoming, ...completed];

    // 1. Render Upcoming
    if (sessionsUpcomingList) {
      if (upcoming.length === 0) {
        sessionsUpcomingList.innerHTML = `
          <div style="padding: 24px 20px; text-align: center; color: #737378; font-size: 13.5px; background: #131820; border-radius: 16px;">
            No upcoming sessions scheduled.
          </div>
        `;
      } else {
        sessionsUpcomingList.innerHTML = upcoming
          .map((s) => {
            const timeLabel = s.timeTopicLabel || `${s.date || ''} · ${s.startTime || ''} · ${s.topic || 'Mentorship Call'}`;
            const joinHref = s.meetingLink || 'javascript:void(0)';
            return `
              <div class="session-row-card">
                <div class="session-row-left">
                  <div class="session-row-avatar">${escapeHtml(s.avatarEmoji || '🏃')}</div>
                  <div class="session-row-info">
                    <div class="session-row-name">${escapeHtml(s.athleteName)}</div>
                    <div class="session-row-subtitle">${escapeHtml(timeLabel)}</div>
                  </div>
                </div>
                <div class="session-row-right">
                  <span class="session-badge upcoming">UPCOMING</span>
                  <a href="${escapeHtml(joinHref)}" target="_blank" class="btn-session-action join" onclick="if(!'${escapeHtml(s.meetingLink)}') { alert('Launching session room...'); }">
                    Join
                  </a>
                </div>
              </div>
            `;
          })
          .join('');
      }
    }

    // 2. Render Completed
    if (sessionsCompletedList) {
      if (completed.length === 0) {
        sessionsCompletedList.innerHTML = `
          <div style="padding: 24px 20px; text-align: center; color: #737378; font-size: 13.5px; background: #131820; border-radius: 16px;">
            No completed sessions recorded yet.
          </div>
        `;
      } else {
        sessionsCompletedList.innerHTML = completed
          .map((s) => {
            const timeLabel = s.timeTopicLabel || `${s.date || ''} · ${s.startTime || ''} · ${s.topic || 'Mentorship Call'}`;
            return `
              <div class="session-row-card">
                <div class="session-row-left">
                  <div class="session-row-avatar">${escapeHtml(s.avatarEmoji || '🏃')}</div>
                  <div class="session-row-info">
                    <div class="session-row-name">${escapeHtml(s.athleteName)}</div>
                    <div class="session-row-subtitle">${escapeHtml(timeLabel)}</div>
                  </div>
                </div>
                <div class="session-row-right">
                  <span class="session-badge completed">DONE</span>
                  <button type="button" class="btn-session-action notes" onclick="window.showSessionNotes('${escapeHtml(s._id)}')">
                    Notes
                  </button>
                </div>
              </div>
            `;
          })
          .join('');
      }
    }
  }

  /**
   * Session Notes Modal Handling
   */
  window.showSessionNotes = function (sessionId) {
    const list = window._allCoachSessions || [];
    const session = list.find((s) => String(s._id) === String(sessionId));
    if (!session) return;

    if (sessionNotesAvatar) sessionNotesAvatar.textContent = session.avatarEmoji || '🏃';
    if (sessionNotesAthleteName) sessionNotesAthleteName.textContent = session.athleteName || 'Athlete';
    if (sessionNotesTopic) sessionNotesTopic.textContent = session.topic || '1-on-1 Mentorship Call';
    if (sessionNotesDateTime) sessionNotesDateTime.textContent = session.timeTopicLabel || `${session.date || ''} · ${session.startTime || ''}`;
    if (sessionNotesContent) sessionNotesContent.textContent = session.notes || 'No notes recorded for this session.';

    if (sessionNotesModalBackdrop) {
      sessionNotesModalBackdrop.classList.add('active');
    }
  };

  if (closeSessionNotesBtn) {
    closeSessionNotesBtn.addEventListener('click', () => {
      if (sessionNotesModalBackdrop) sessionNotesModalBackdrop.classList.remove('active');
    });
  }

  if (sessionNotesModalBackdrop) {
    sessionNotesModalBackdrop.addEventListener('click', (e) => {
      if (e.target === sessionNotesModalBackdrop) {
        sessionNotesModalBackdrop.classList.remove('active');
      }
    });
  }

  /**
   * Topbar Search filtering across overview cards
   */
  if (dashboardSearchInput) {
    dashboardSearchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) {
        renderPlayersGrid(allPlayers);
        return;
      }
      const filtered = allPlayers.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.club || '').toLowerCase().includes(q) ||
          (p.statusBadge && p.statusBadge.toLowerCase().includes(q))
      );
      renderPlayersGrid(filtered);
    });
  }

  /**
   * Player Navigation / Detail Opening
   */
  window.handleOpenPlayerDetails = function (playerId) {
    window.location.href = `/coach-player-detail?id=${encodeURIComponent(playerId)}`;
  };

  /**
   * Player Modal Handling (Optional fallback modal)
   */
  if (closePlayerModalBtn) {
    closePlayerModalBtn.addEventListener('click', () => {
      if (playerModalBackdrop) playerModalBackdrop.classList.remove('active');
    });
  }

  if (playerModalBackdrop) {
    playerModalBackdrop.addEventListener('click', (e) => {
      if (e.target === playerModalBackdrop) {
        playerModalBackdrop.classList.remove('active');
      }
    });
  }

  /**
   * Refresh Button
   */
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshBtn.style.transform = 'rotate(180deg)';
      loadDashboardData().finally(() => {
        setTimeout(() => {
          refreshBtn.style.transform = 'none';
        }, 300);
      });
    });
  }

  /**
   * Initial Setup
   */
  document.addEventListener('DOMContentLoaded', () => {
    // Check if initial view is specified in query parameters (?view=tasks or ?view=training, etc.)
    const params = new URLSearchParams(window.location.search);
    const initialView = params.get('view') || 'dashboard';
    switchView(initialView, false);

    // Fetch live dashboard data
    loadDashboardData();
  });
})();
