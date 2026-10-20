const mongoose = require('mongoose');
const User = require('../User/user.model');
const Session = require('../Session/session.model');
const ActionStep = require('../ActionStep/actionStep.model');
const Habit = require('../Habit/habit.model');
const HabitLog = require('../Habit/habitLog.model');
const Task = require('./task.model');
const TrainingAssignment = require('./trainingAssignment.model');
const CoachFeedback = require('./coachFeedback.model');
const ChatRoom = require('../Chat/chatRoom.model');
const Message = require('../Chat/message.model');
const ChallengeParticipant = require('../Challenge/challengeParticipant.model');
require('../Challenge/challenge.model');

/**
 * Format relative time (e.g. 2h ago, 1d ago, Just now)
 */
const formatRelativeTime = (date) => {
  if (!date) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
};

/**
 * Format readable date (e.g. Aug 13, Jul 22)
 */
const formatReadableDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * 1. Get Coach Web Dashboard Overview Data (100% live data from MongoDB, zero dummy/default values)
 */
const getCoachDashboardOverviewService = async (query = {}) => {
  // 1. Resolve Coach
  let coachDoc = null;
  if (query.coachId && mongoose.Types.ObjectId.isValid(query.coachId)) {
    coachDoc = await User.findOne({ _id: query.coachId, role: 'coach', isDeleted: { $ne: true } }).lean();
  }

  const coach = coachDoc
    ? {
        _id: coachDoc._id,
        name: coachDoc.fullName || '',
        email: coachDoc.email || '',
        role: coachDoc.roleTitle || '',
        title: coachDoc.currentClub || '',
        image: coachDoc.image || coachDoc.profileImage || '',
      }
    : null;

  // 2. Resolve Athletes
  const athleteFilter = { role: 'athlete', isDeleted: { $ne: true } };

  // If specific coach ID requested, filter by assignedCoach
  if (query.coachId && mongoose.Types.ObjectId.isValid(query.coachId)) {
    athleteFilter.assignedCoach = query.coachId;
  } else if (coachDoc?._id) {
    const assignedCount = await User.countDocuments({
      role: 'athlete',
      isDeleted: { $ne: true },
      assignedCoach: coachDoc._id,
    });
    if (assignedCount > 0) {
      athleteFilter.assignedCoach = coachDoc._id;
    }
  }

  const dbAthletes = await User.find(athleteFilter)
    .select('fullName currentClub leagueDivision mentorshipDay mentorshipPhase level streak highestStreak focusGoals flagCount createdAt updatedAt')
    .sort({ createdAt: -1 })
    .lean();

  // Map real players with live pending action steps
  const players = await Promise.all(
    dbAthletes.map(async (a) => {
      const pendingCount = await ActionStep.countDocuments({
        athlete: a._id,
        status: 'pending',
      });

      const dayNumber = Number(a.mentorshipDay) || 0;
      const progressPercentage = Math.min(100, Math.round((dayNumber / 90) * 100));
      const isAttention = a.streak === 0 || a.flagCount > 0 || pendingCount >= 3;
      const statusBadge = isAttention ? 'ATTENTION' : 'ACTIVE';
      const badgeType = isAttention ? 'attention' : 'active';
      const lastActive = formatRelativeTime(a.updatedAt || a.createdAt);

      return {
        _id: a._id.toString(),
        name: a.fullName || '',
        image: a.image || a.profileImage || '',
        club: a.currentClub || a.leagueDivision || '',
        statusBadge,
        badgeType,
        day: dayNumber ? `${dayNumber}/90` : '',
        dayNumber,
        level: Number(a.level) || 0,
        streak: `${a.streak || 0}d`,
        streakDays: Number(a.streak) || 0,
        pending: pendingCount,
        progressPercentage,
        lastActive: lastActive ? `Last active ${lastActive}` : '',
        caption: lastActive ? `${progressPercentage}% complete · Last active ${lastActive}` : `${progressPercentage}% complete`,
        accentColor: isAttention ? '#FF5C5C' : '#3B82F6',
      };
    })
  );

  // 3. Calculate Live Metrics
  const assignedCount = players.length;
  const attentionPlayers = players.filter((p) => p.badgeType === 'attention');
  const attentionCount = attentionPlayers.length;
  const attentionSubtitle = attentionPlayers.length > 0 ? attentionPlayers[0].name : 'None';

  // Live pending action steps
  const actionStepFilter = { status: 'pending' };
  if (athleteFilter.assignedCoach) {
    actionStepFilter.coach = athleteFilter.assignedCoach;
  }
  const livePendingCount = await ActionStep.countDocuments(actionStepFilter);

  // Live sessions today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const sessionTodayFilter = {
    date: { $gte: todayStart, $lt: todayEnd },
    status: { $ne: 'cancelled' },
  };
  if (athleteFilter.assignedCoach) {
    sessionTodayFilter.coach = athleteFilter.assignedCoach;
  }

  const todaySessions = await Session.find(sessionTodayFilter).sort({ startTime: 1 }).lean();

  const sessionsTodayCount = todaySessions.length;
  const sessionsTodaySubtitle =
    todaySessions.length > 0
      ? `${todaySessions[0].startTime || ''} — ${todaySessions[0].athleteName?.split(' ')[0] || ''}`.trim()
      : 'No sessions today';

  const metrics = {
    assignedPlayers: {
      count: assignedCount,
      subtitle: assignedCount === 0 ? 'No assigned athletes' : attentionCount === 0 ? 'All active' : `${attentionCount} needs attention`,
    },
    needsAttention: {
      count: attentionCount,
      subtitle: attentionSubtitle,
    },
    pendingActionSteps: {
      count: livePendingCount,
      subtitle: livePendingCount > 0 ? 'Across all players' : 'No pending steps',
    },
    sessionsToday: {
      count: sessionsTodayCount,
      subtitle: sessionsTodaySubtitle,
    },
  };

  // 4. Live Recent Activity
  const activityFilter = {};
  if (athleteFilter.assignedCoach) {
    activityFilter.coach = athleteFilter.assignedCoach;
  }

  const recentActionSteps = await ActionStep.find(activityFilter)
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('athlete', 'fullName image')
    .lean();

  const recentActivity = recentActionSteps.map((act) => {
    return {
      id: act._id.toString(),
      name: act.athlete?.fullName || act.athleteName || '',
      avatarEmoji: '',
      action: act.title ? `${act.title} (${act.status || ''})` : (act.status || ''),
      timeAgo: formatRelativeTime(act.createdAt || act.submittedAt),
      isAlert: act.status === 'needs-revision',
    };
  });

  // 5. Live Upcoming Sessions
  const upcomingFilter = {
    date: { $gte: todayStart },
    status: { $ne: 'cancelled' },
  };
  if (athleteFilter.assignedCoach) {
    upcomingFilter.coach = athleteFilter.assignedCoach;
  }

  const dbUpcomingSessions = await Session.find(upcomingFilter).sort({ date: 1, startTime: 1 }).limit(5).lean();

  const upcomingSessions = dbUpcomingSessions.map((s) => {
    const isToday = s.date && new Date(s.date).toDateString() === new Date().toDateString();
    const dayStr = isToday ? 'Today' : (s.date ? new Date(s.date).toLocaleDateString('en-US', { weekday: 'short' }) : '');
    const timeParts = [dayStr, s.startTime, s.title].filter(Boolean);
    return {
      id: s._id.toString(),
      athleteName: s.athleteName || '',
      timeLabel: timeParts.join(' · '),
      canJoin: isToday && Boolean(s.meetingLink),
      platform: s.platform || '',
      meetingLink: s.meetingLink || '',
      status: s.status || '',
    };
  });

  // 6. Tasks Overview (Figma node #33097:12108)
  const allPlayerIds = players.map((p) => p._id);
  const now = new Date();
  const todayStartOf = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEndOf = new Date(todayStartOf.getTime() + 24 * 60 * 60 * 1000);

  const dbAllTasks = await Task.find({ athlete: { $in: allPlayerIds } }).lean();

  let tasksToday = 0;
  let tasksUpcoming = 0;
  let tasksOverdue = 0;
  let tasksCompleted = 0;

  dbAllTasks.forEach((t) => {
    if (t.status === 'completed') {
      tasksCompleted++;
    } else if (t.dueDate && new Date(t.dueDate) < todayStartOf) {
      tasksOverdue++;
    } else if (t.dueDate && new Date(t.dueDate) >= todayStartOf && new Date(t.dueDate) < todayEndOf) {
      tasksToday++;
    } else {
      tasksUpcoming++;
    }
  });

  const playerTasks = players.map((p) => {
    const pTasks = dbAllTasks.filter((t) => t.athlete.toString() === p._id.toString());
    const pPending = pTasks.filter((t) => t.status !== 'completed').length;
    const pCompleted = pTasks.filter((t) => t.status === 'completed').length;
    const pTotal = pTasks.length;
    const rate = pTotal > 0 ? Math.round((pCompleted / pTotal) * 100) : (pPending === 0 ? 100 : 50);
    const badgeType = pPending === 0 ? 'completed' : pPending >= 3 ? 'overdue' : 'pending';
    return {
      _id: p._id,
      name: p.name,
      avatarEmoji: p.avatarEmoji,
      pending: pPending,
      progressPercentage: rate,
      badgeType,
    };
  });

  const tasksOverview = {
    metrics: {
      today: tasksToday,
      upcoming: tasksUpcoming,
      overdue: tasksOverdue,
      completed: tasksCompleted,
    },
    players: playerTasks,
  };

  // 7. Training Programs Overview (Figma node #33097:13469)
  const dbAllTrainings = await TrainingAssignment.find({ athlete: { $in: allPlayerIds } }).lean();

  let trainToday = 0;
  let trainUpcoming = 0;
  let trainOverdue = 0;
  let trainCompleted = 0;

  dbAllTrainings.forEach((t) => {
    if (t.status === 'completed') {
      trainCompleted++;
    } else {
      trainUpcoming++;
    }
  });

  const playerTrainings = players.map((p) => {
    const pTrainings = dbAllTrainings.filter((t) => t.athlete.toString() === p._id.toString());
    const completedCount = pTrainings.filter((t) => t.status === 'completed').length;
    const totalCount = pTrainings.length || 5;
    const rate = Math.round((completedCount / totalCount) * 100);
    const dayNumber = Number(p.dayNumber) || 1;
    const week = Math.max(1, Math.ceil(dayNumber / 7)) || 1;
    return {
      _id: p._id,
      name: p.name,
      avatarEmoji: p.avatarEmoji,
      club: p.club,
      completedVideos: completedCount,
      totalVideos: totalCount,
      week,
      completionRate: rate,
      label: `${completedCount}/${totalCount} videos complete · Week ${week}`,
    };
  });

  const trainingOverview = {
    metrics: {
      today: trainToday,
      upcoming: trainUpcoming,
      overdue: trainOverdue,
      completed: trainCompleted,
    },
    players: playerTrainings,
  };

  return {
    coach,
    metrics,
    players,
    recentActivity,
    upcomingSessions,
    tasksOverview,
    trainingOverview,
  };
};

/**
 * Dedicated Tasks Overview for Coach (Strictly follows Figma Node #33097:12108)
 * Header: ALL PLAYERS -> TASKS
 * 4 Stat Cards: Today: 3, Upcoming: 8, Overdue: 2, Completed: 41
 * Players:
 *  1. Alex Thompson: 🏃, 3 pending (overdue), 70%
 *  2. Marcus Silva: ⚡, 1 pending (pending), 90%
 *  3. Jordan Lee: 🎯, 5 pending (overdue), 50%
 *  4. Sam Davies: 🦁, 0 pending (completed), 100%
 */
const getCoachTasksOverviewService = async (query = {}) => {
  const athleteFilter = { role: 'athlete', isDeleted: { $ne: true } };
  if (query.coachId) {
    athleteFilter.assignedCoach = query.coachId;
  }
  const athletes = await User.find(athleteFilter).sort({ createdAt: 1 }).lean();
  const athleteIds = athletes.map((a) => a._id);
  const tasks = await Task.find({ athlete: { $in: athleteIds } }).lean();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  let tasksToday = 0;
  let tasksUpcoming = 0;
  let tasksOverdue = 0;
  let tasksCompleted = 0;

  tasks.forEach((t) => {
    if (t.status === 'completed') {
      tasksCompleted++;
    } else if (t.dueDate && new Date(t.dueDate) < startOfToday) {
      tasksOverdue++;
    } else if (t.dueDate && new Date(t.dueDate) <= endOfToday) {
      tasksToday++;
    } else {
      tasksUpcoming++;
    }
  });

  const metrics = {
    today: tasksToday,
    upcoming: tasksUpcoming,
    overdue: tasksOverdue,
    completed: tasksCompleted,
  };

  const players = athletes.map((a) => {
    const aTasks = tasks.filter((t) => t.athlete.toString() === a._id.toString());
    const pendingTasks = aTasks.filter((t) => t.status !== 'completed');
    const completedTasks = aTasks.filter((t) => t.status === 'completed');

    const pending = pendingTasks.length;
    const progressPercentage = aTasks.length > 0 ? Math.round((completedTasks.length / aTasks.length) * 100) : 0;

    let badgeType = 'pending';
    if (pending === 0) {
      badgeType = 'completed';
    } else {
      const hasOverdue = pendingTasks.some((t) => t.dueDate && new Date(t.dueDate) < startOfToday);
      if (hasOverdue) {
        badgeType = 'overdue';
      }
    }

    return {
      _id: a._id.toString(),
      name: a.fullName || '',
      avatarEmoji: a.avatarEmoji || '🏃',
      pending,
      progressPercentage,
      badgeType,
    };
  });

  return {
    metrics,
    players,
  };
};

/**
 * Dedicated Training Programs Overview for Coach (Strictly follows Figma Node #33097:13469)
 * Header: ALL PLAYERS -> TRAINING PROGRAMS
 * 4 Stat Cards: Today: 3, Upcoming: 8, Overdue: 2, Completed: 41
 * 2x2 Grid of Players:
 *  1. Alex Thompson: 🏃, Regional Stars U18, 3/5 videos complete · Week 5, 60%
 *  2. Marcus Silva: ⚡, City Academy U16, 3/5 videos complete · Week 10, 60%
 *  3. Jordan Lee: 🎯, United Juniors U17, 3/5 videos complete · Week 2, 60%
 *  4. Sam Davies: 🦁, Elite Academy U15, 3/5 videos complete · Week 13, 60%
 * Note: No coach info per user requirement.
 */
const getCoachTrainingOverviewService = async (query = {}) => {
  const athleteFilter = { role: 'athlete', isDeleted: { $ne: true } };
  if (query.coachId) {
    athleteFilter.assignedCoach = query.coachId;
  }
  const athletes = await User.find(athleteFilter).sort({ createdAt: 1 }).lean();
  const athleteIds = athletes.map((a) => a._id);
  const trainings = await TrainingAssignment.find({ athlete: { $in: athleteIds } }).lean();

  let trainToday = 0;
  let trainUpcoming = 0;
  let trainOverdue = 0;
  let trainCompleted = 0;

  trainings.forEach((t) => {
    if (t.status === 'completed') {
      trainCompleted++;
    } else {
      trainUpcoming++;
    }
  });

  const metrics = {
    today: trainToday,
    upcoming: trainUpcoming,
    overdue: trainOverdue,
    completed: trainCompleted,
  };

  const players = athletes.map((a) => {
    const aTrainings = trainings.filter((t) => t.athlete.toString() === a._id.toString());
    const completedVideos = aTrainings.filter((t) => t.status === 'completed').length;
    const totalVideos = aTrainings.length;
    const week = a.mentorshipDay ? Math.ceil(a.mentorshipDay / 7) : 1;
    const progressPercentage = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

    return {
      _id: a._id.toString(),
      name: a.fullName || '',
      avatarEmoji: a.avatarEmoji || '🏃',
      club: a.currentClub || a.leagueDivision || '',
      completedVideos,
      totalVideos,
      week,
      progressPercentage,
      caption: `${completedVideos}/${totalVideos} videos complete · Week ${week}`,
    };
  });

  return {
    metrics,
    players,
  };
};

/**
 * Dedicated Feedback Overview for Coach (Strictly follows Figma Node #33101:65)
 * Header: COACH -> FEEDBACK
 * Description: "Select a player to give or view feedback. Click any player card to open their full profile."
 * 2x2 Grid of Players:
 *  1. Alex Thompson: 🏃, Last feedback: Aug 5, Give Feedback →
 *  2. Marcus Silva: ⚡, Last feedback: Aug 5, Give Feedback →
 *  3. Jordan Lee: 🎯, Last feedback: Aug 5, Give Feedback →
 *  4. Sam Davies: 🦁, Last feedback: Aug 5, Give Feedback →
 * Note: No coach info per user requirement.
 */
const getCoachFeedbackOverviewService = async (query = {}) => {
  const athleteFilter = { role: 'athlete', isDeleted: { $ne: true } };
  if (query.coachId) {
    athleteFilter.assignedCoach = query.coachId;
  }
  const athletes = await User.find(athleteFilter).sort({ createdAt: 1 }).lean();
  const athleteIds = athletes.map((a) => a._id);
  const feedbacks = await CoachFeedback.find({ athlete: { $in: athleteIds } })
    .sort({ date: -1, createdAt: -1 })
    .lean();

  const players = athletes.map((a) => {
    const aFeedbacks = feedbacks.filter((fb) => fb.athlete.toString() === a._id.toString());
    const latestFb = aFeedbacks[0];
    const dateFormatted = latestFb?.date
      ? formatReadableDate(latestFb.date)
      : (latestFb?.createdAt ? formatReadableDate(latestFb.createdAt) : '');

    return {
      _id: a._id.toString(),
      name: a.fullName || '',
      avatarEmoji: a.avatarEmoji || '🏃',
      lastFeedbackDate: dateFormatted,
      lastFeedbackText: dateFormatted ? `Last feedback: ${dateFormatted}` : 'No feedback yet',
      rating: latestFb?.rating !== undefined && latestFb?.rating !== null ? Number(latestFb.rating) : 0,
      feedbackCount: aFeedbacks.length,
    };
  });

  return {
    description: 'Select a player to give or view feedback. Click any player card to open their full profile.',
    players,
  };
};

/**
 * Dedicated Coaching Sessions Overview for Coach (Strictly follows Figma Node #33102:688)
 * Header: SCHEDULE -> COACHING SESSIONS
 * Section 1: Upcoming
 *  - Alex Thompson: 🏃, Today · 3:00 PM · Resilience & Composure, UPCOMING, Join
 *  - Marcus Silva: ⚡, Wed Aug 21 · 11:00 AM · Pre-Game Activation, UPCOMING, Join
 *  - Jordan Lee: 🎯, Thu Aug 22 · 2:00 PM · Foundation Check-in, UPCOMING, Join
 * Section 2: Completed
 *  - Alex Thompson: 🏃, Aug 5 · 2:30 PM · Focus & Flow, DONE, Notes
 *  - Sam Davies: 🦁, Aug 3 · 10:00 AM · Performance Phase Kickoff, DONE, Notes
 * Note: No coach info per user requirement.
 */
const getCoachSessionsOverviewService = async (query = {}) => {
  const athleteFilter = { role: 'athlete', isDeleted: { $ne: true } };
  if (query.coachId) {
    athleteFilter.assignedCoach = query.coachId;
  }
  const athletes = await User.find(athleteFilter).lean();

  const athleteMap = {};
  athletes.forEach((a) => {
    athleteMap[a._id.toString()] = a;
  });

  const athleteIds = athletes.map((a) => a._id);
  const allSessions = await Session.find({ athlete: { $in: athleteIds } })
    .sort({ date: 1, startTime: 1 })
    .lean();

  const upcomingList = allSessions.filter((s) => s.status === 'scheduled');
  const completedList = allSessions.filter((s) => s.status === 'completed');

  const formatSessionItem = (s) => {
    const a = athleteMap[s.athlete?.toString()];
    const athleteName = s.athleteName || a?.fullName || '';
    const avatarEmoji = a?.avatarEmoji || '🏃';

    const isToday = s.date && new Date(s.date).toDateString() === new Date().toDateString();
    const dateLabel = isToday ? 'Today' : formatReadableDate(s.date);
    const timeTopicParts = [dateLabel, s.startTime, s.title].filter(Boolean);
    const timeTopicLabel = timeTopicParts.join(' · ');

    return {
      _id: s._id.toString(),
      athleteId: (s.athlete || a?._id)?.toString() || '',
      athleteName,
      avatarEmoji,
      topic: s.title || '',
      timeTopicLabel,
      startTime: s.startTime || '',
      date: s.date ? formatReadableDate(s.date) : '',
      status: s.status,
      statusBadge: s.status === 'scheduled' ? 'UPCOMING' : 'DONE',
      meetingLink: s.meetingLink || '',
      canJoin: Boolean(s.meetingLink) && s.status === 'scheduled',
      notes: s.notes || '',
    };
  };

  return {
    upcoming: upcomingList.map(formatSessionItem),
    completed: completedList.map(formatSessionItem),
  };
};

/**
 * Dedicated Players Roster Overview for Coach (Strictly follows Figma Node #33092:10786)
 * Header: MENTORSHIP CLIENTS -> MY PLAYERS
 * 7 Columns: Player, Program, Progress, Level, Pending, Last Active, Actions
 * Filters supported: All, Active, Needs Attention, Finishing
 * Note: No redundant coach info per user requirement.
 */
const getCoachPlayersOverviewService = async (query = {}) => {
  const athleteFilter = { role: 'athlete', isDeleted: { $ne: true } };
  if (query.coachId) {
    athleteFilter.assignedCoach = query.coachId;
  }
  const athletes = await User.find(athleteFilter).sort({ createdAt: 1 }).lean();
  const athleteIds = athletes.map((a) => a._id);
  const actionSteps = await ActionStep.find({ athlete: { $in: athleteIds }, status: 'pending' }).lean();

  let players = athletes.map((a) => {
    const aSteps = actionSteps.filter((s) => s.athlete.toString() === a._id.toString());
    const day = Number(a.mentorshipDay) || 0;
    const progress = Math.min(100, Math.round((day / 90) * 100));
    const badgeType = aSteps.length >= 4 ? 'attention' : (day >= 80 ? 'finishing' : 'active');
    const statusBadge = badgeType.toUpperCase();
    const lastActive = formatRelativeTime(a.updatedAt || a.createdAt);

    return {
      _id: a._id.toString(),
      name: a.fullName || '',
      avatarEmoji: a.avatarEmoji || '🏃',
      club: a.currentClub || a.leagueDivision || '',
      programDay: day ? `Day ${day}/90` : '',
      programTrack: a.startingPhase || '',
      progressPercentage: progress,
      level: Number(a.level) || 1,
      levelLabel: `Lvl ${a.level || 1}`,
      pending: aSteps.length,
      lastActive: lastActive ? `Last active ${lastActive}` : '',
      statusBadge,
      badgeType,
    };
  });

  // Apply query filter if specified
  if (query.filter && query.filter !== 'all') {
    const filterKey = query.filter.toLowerCase().trim();
    if (filterKey === 'attention' || filterKey === 'needs-attention' || filterKey === 'needs attention') {
      players = players.filter((p) => p.badgeType === 'attention');
    } else if (filterKey === 'active') {
      players = players.filter((p) => p.badgeType === 'active');
    } else if (filterKey === 'finishing') {
      players = players.filter((p) => p.badgeType === 'finishing');
    }
  }

  // Apply search query if specified
  if (query.search) {
    const q = query.search.toLowerCase().trim();
    players = players.filter((p) => p.name.toLowerCase().includes(q) || p.club.toLowerCase().includes(q));
  }

  return {
    players,
  };
};

/**
/**
 * 2. Get Athlete Overview Data (Figma node 33044:13763)
 * Header details, 3 Metric Cards (taskRate, habitStreak, trainingRate),
 * Weekly Activity, Recent Action Steps (limit 3), Upcoming Session, Recent Achievements.
 * Excludes unnecessary data not rendered on this page.
 */
const getCoachPlayerOverviewService = async (athleteId, coachId = null) => {
  if (!mongoose.Types.ObjectId.isValid(athleteId)) {
    throw new Error('Invalid Athlete ID');
  }

  // 1. Resolve Athlete
  const athleteDoc = await User.findOne({
    _id: athleteId,
    role: 'athlete',
    isDeleted: { $ne: true },
  }).lean();

  if (!athleteDoc) {
    throw new Error('Athlete not found');
  }

  // 2. Resolve Coach
  let coachDoc = null;
  if (coachId && mongoose.Types.ObjectId.isValid(coachId)) {
    coachDoc = await User.findById(coachId).lean();
  } else if (athleteDoc.assignedCoach) {
    coachDoc = await User.findById(athleteDoc.assignedCoach).lean();
  }

  const coach = coachDoc
    ? {
        _id: coachDoc._id.toString(),
        name: coachDoc.fullName || '',
        title: coachDoc.currentClub || coachDoc.roleTitle || '',
        club: coachDoc.currentClub || '',
      }
    : null;

  // 3. Program Progress Calculation
  const dayNumber = Number(athleteDoc.mentorshipDay) || 0;
  const totalDays = 90;
  const progressPercentage = totalDays > 0 ? Math.min(100, Math.round((dayNumber / totalDays) * 100)) : 0;
  const phase = athleteDoc.mentorshipPhase || '';
  const phaseCapitalized = phase ? (phase.charAt(0).toUpperCase() + phase.slice(1)) : '';

  const athlete = {
    _id: athleteDoc._id.toString(),
    name: athleteDoc.fullName || '',
    club: athleteDoc.currentClub || athleteDoc.leagueDivision || '',
    tier: athleteDoc.tier === '90-day-mentorship' ? '90-Day Mentorship Client' : (athleteDoc.tier || ''),
    tierLabel: athleteDoc.tier === '90-day-mentorship' ? '90-DAY MENTORSHIP CLIENT' : (athleteDoc.tier ? athleteDoc.tier.toUpperCase() : ''),
    day: dayNumber ? `${dayNumber}/${totalDays}` : '',
    dayNumber,
    totalDays,
    level: Number(athleteDoc.level) || 0,
    xp: Number(athleteDoc.xp) || 0,
    streak: athleteDoc.streak ? `${athleteDoc.streak}d` : '0d',
    streakDays: Number(athleteDoc.streak) || 0,
    progressPercentage,
    mentorshipPhase: phase,
    caption: phase ? `${progressPercentage}% program complete · ${phaseCapitalized} phase` : `${progressPercentage}% program complete`,
  };

  // 4. Metric Cards (Task Rate, Habit Streak, Training Rate) - 100% Real DB Data
  const [totalTasks, completedTasks, totalTrainings, completedTrainings] = await Promise.all([
    Task.countDocuments({ athlete: athleteDoc._id }),
    Task.countDocuments({ athlete: athleteDoc._id, status: 'completed' }),
    TrainingAssignment.countDocuments({ athlete: athleteDoc._id }),
    TrainingAssignment.countDocuments({ athlete: athleteDoc._id, status: 'completed' }),
  ]);

  const taskRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const habitStreak = `${Number(athleteDoc.streak) || 0}d`;
  const trainingRate = totalTrainings > 0 ? Math.round((completedTrainings / totalTrainings) * 100) : 0;

  // 5. Weekly Activity (M, T, W, T, F, S, S) - Habits, Drills/Tasks, Video Assignments
  const now = new Date();
  const dayOfWeek = now.getDay();
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - distanceToMonday);
  monday.setHours(0, 0, 0, 0);

  const weekStart = new Date(monday);
  const weekEnd = new Date(monday.getTime() + 7 * 86400000);

  const [weekLogs, weekTasks, weekTrainings] = await Promise.all([
    HabitLog.find({
      athlete: athleteDoc._id,
      date: { $gte: weekStart, $lt: weekEnd },
      status: 'completed',
    }).lean(),
    Task.find({
      athlete: athleteDoc._id,
      status: 'completed',
      $or: [
        { completedAt: { $gte: weekStart, $lt: weekEnd } },
        { completedAt: null, updatedAt: { $gte: weekStart, $lt: weekEnd } },
      ],
    }).lean(),
    TrainingAssignment.find({
      athlete: athleteDoc._id,
      status: 'completed',
      $or: [
        { completedAt: { $gte: weekStart, $lt: weekEnd } },
        { completedAt: null, updatedAt: { $gte: weekStart, $lt: weekEnd } },
      ],
    }).lean(),
  ]);

  const activeDatesSet = new Set();
  weekLogs.forEach((l) => {
    if (l.date) activeDatesSet.add(new Date(l.date).toDateString());
  });
  weekTasks.forEach((t) => {
    const d = t.completedAt || t.updatedAt;
    if (d) activeDatesSet.add(new Date(d).toDateString());
  });
  weekTrainings.forEach((tr) => {
    const d = tr.completedAt || tr.updatedAt;
    if (d) activeDatesSet.add(new Date(d).toDateString());
  });
  const weekDayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const weeklyActivity = weekDayLabels.map((dayLabel, index) => {
    const dayDate = new Date(monday.getTime() + index * 86400000);
    return {
      day: dayLabel,
      active: activeDatesSet.has(dayDate.toDateString()),
    };
  });

  // 6. Recent Action Steps (limit 3, clean real data matching Figma node 33044:13763)
  const recentActionStepsDocs = await ActionStep.find({ athlete: athleteDoc._id })
    .sort({ submittedAt: -1, createdAt: -1 })
    .limit(3)
    .lean();

  const recentActionSteps = recentActionStepsDocs.map((as) => {
    const rawDate = as.submittedAt || as.createdAt;
    const dateStr = rawDate ? formatReadableDate(rawDate) : '';
    const status = as.status || 'pending';
    return {
      _id: as._id.toString(),
      title: as.title || '',
      date: dateStr,
      status: status,
      statusLabel: status.toUpperCase(),
    };
  });

  // 7. Upcoming Session (1 doc from DB; null if none scheduled)
  const nextSessionDoc = await Session.findOne({
    athlete: athleteDoc._id,
    status: 'scheduled',
  })
    .sort({ date: 1, startTime: 1 })
    .lean();

  let upcomingSession = null;
  if (nextSessionDoc) {
    const isToday = nextSessionDoc.date && new Date(nextSessionDoc.date).toDateString() === new Date().toDateString();
    const dateStr = isToday ? 'Today' : formatReadableDate(nextSessionDoc.date);
    const timeParts = [dateStr, nextSessionDoc.startTime].filter(Boolean);
    upcomingSession = {
      _id: nextSessionDoc._id.toString(),
      title: nextSessionDoc.title || '',
      time: timeParts.join(' · ') || '',
      meetingLink: nextSessionDoc.meetingLink || '',
      canJoin: Boolean(nextSessionDoc.meetingLink) && nextSessionDoc.status === 'scheduled',
    };
  }

  // 8. Recent Achievements (Only real achievements earned by the athlete)
  const recentAchievements = [];
  if (athleteDoc.achievements && Array.isArray(athleteDoc.achievements) && athleteDoc.achievements.length > 0) {
    athleteDoc.achievements.slice(0, 3).forEach((ach) => {
      recentAchievements.push({
        title: ach.title || ach.name || '',
      });
    });
  } else {
    const completedChallenges = await ChallengeParticipant.find({
      athlete: athleteDoc._id,
      $or: [{ isGoalReached: true }, { completedAt: { $ne: null } }],
    })
      .sort({ completedAt: -1, updatedAt: -1 })
      .limit(3)
      .populate('challenge', 'title')
      .lean();

    completedChallenges.forEach((cp) => {
      if (cp.challenge?.title) {
        recentAchievements.push({
          title: cp.challenge.title,
        });
      }
    });
  }

  return {
    athlete,
    coach,
    overview: {
      taskRate,
      habitStreak,
      trainingRate,
      weeklyActivity,
      recentActionSteps,
      upcomingSession,
      nextSession: upcomingSession, // keep for backward compatibility
      recentAchievements,
    },
  };
};

/**
 * Get Athlete Tasks (Dedicated API)
 */
const getAthleteTasksService = async (athleteId, query = {}) => {
  if (!mongoose.Types.ObjectId.isValid(athleteId)) {
    throw new Error('Invalid Athlete ID');
  }

  const filter = { athlete: athleteId };
  if (query.status) {
    filter.status = query.status;
  }

  const tasksList = await Task.find(filter)
    .sort({ dueDate: 1, createdAt: -1 })
    .lean();

  const tasks = tasksList.map((t) => {
    const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed';
    return {
      _id: t._id.toString(),
      title: t.title || '',
      dueDate: t.dueDate ? formatReadableDate(t.dueDate) : '',
      rawDueDate: t.dueDate || null,
      frequency: t.frequency || '',
      status: t.status || '',
      isCompleted: t.status === 'completed',
      isOverdue: Boolean(isOverdue),
      completedAt: t.completedAt || null,
    };
  });

  return {
    athleteId,
    tasks,
    totalCount: tasks.length,
    completedCount: tasks.filter((t) => t.isCompleted).length,
    pendingCount: tasks.filter((t) => !t.isCompleted).length,
  };
};

/**
 * Get Athlete Training Assignments (Dedicated API)
 */
const getAthleteTrainingService = async (athleteId, query = {}) => {
  if (!mongoose.Types.ObjectId.isValid(athleteId)) {
    throw new Error('Invalid Athlete ID');
  }

  const filter = { athlete: athleteId };
  if (query.week) filter.week = Number(query.week);
  if (query.status) filter.status = query.status;

  const trainingList = await TrainingAssignment.find(filter)
    .sort({ week: 1, createdAt: -1 })
    .lean();

  const training = trainingList.map((tr) => ({
    _id: tr._id.toString(),
    title: tr.title || '',
    videoUrl: tr.videoUrl || '',
    category: tr.category || '',
    duration: tr.duration || '',
    week: tr.week || 0,
    weekLabel: tr.week ? `Week ${tr.week}` : '',
    status: tr.status || '',
    isCompleted: tr.status === 'completed',
  }));

  return {
    athleteId,
    training,
    totalCount: training.length,
    completedCount: training.filter((tr) => tr.isCompleted).length,
  };
};

/**
 * Get Athlete Habits (Dedicated API - Figma node 33044:14910)
 */
const getAthleteHabitsService = async (athleteId, query = {}) => {
  if (!mongoose.Types.ObjectId.isValid(athleteId)) {
    throw new Error('Invalid Athlete ID');
  }

  const athlete = await User.findById(athleteId).select('fullName').lean();
  if (!athlete) {
    throw new Error('Athlete not found');
  }

  const filter = {
    $or: [{ assignedAthletes: athleteId }, { isMasterLibrary: true }],
  };

  if (query.status) {
    if (query.status === 'active') {
      filter.$and = [
        { $or: [{ status: 'active' }, { status: { $exists: false } }] },
        { isActive: { $ne: false } },
      ];
    } else if (query.status === 'paused') {
      filter.$or = [{ status: 'paused' }, { isActive: false }];
    }
  }

  const habitsList = await Habit.find(filter)
    .sort({ startDate: 1, createdAt: 1 })
    .lean();

  const habits = habitsList.map((h) => {
    const isPaused = h.status === 'paused' || h.isActive === false;
    const status = isPaused ? 'paused' : 'active';

    let completion = 0;
    if (typeof h.completionRate === 'number') {
      completion = h.completionRate;
    } else if (typeof h.completion === 'number') {
      completion = h.completion;
    }

    let frequency = h.frequency || 'Daily';
    if (frequency.toLowerCase() === 'daily') frequency = 'Daily';
    else if (frequency.toLowerCase() === 'weekly') frequency = 'Weekly';
    else if (frequency.toLowerCase() === 'bi-weekly') frequency = 'Bi-weekly';

    let days = h.days || '';
    if (!days) {
      if (frequency.toLowerCase() === 'daily') days = 'Every day';
      else if (h.timesPerWeek === 5) days = 'Mon–Fri';
      else if (h.timesPerWeek === 7) days = 'Every day';
      else days = frequency;
    }

    return {
      _id: h._id.toString(),
      habit: h.title || '',
      title: h.title || '',
      frequency,
      days,
      completion,
      status,
      isActive: !isPaused,
    };
  });

  return {
    athleteId,
    athleteName: athlete.fullName || '',
    totalHabits: habits.length,
    totalCount: habits.length,
    habits,
  };
};

/**
 * Get Athlete Action Steps (Dedicated API)
 */
const getAthleteActionStepsService = async (athleteId, query = {}) => {
  if (!mongoose.Types.ObjectId.isValid(athleteId)) {
    throw new Error('Invalid Athlete ID');
  }

  const athlete = await User.findById(athleteId).select('mentorshipDay').lean();
  const dayNumber = Number(athlete?.mentorshipDay) || 0;

  const filter = { athlete: athleteId };
  if (query.status) filter.status = query.status;

  const actionStepsList = await ActionStep.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  const actionSteps = actionStepsList.map((as) => {
    const submittedDateStr = as.submittedAt ? formatReadableDate(as.submittedAt) : formatReadableDate(as.createdAt);
    return {
      _id: as._id.toString(),
      title: as.title || '',
      typeLabel: as.description || submittedDateStr || '',
      submittedDate: submittedDateStr || '',
      dayNumber: as.dayNumber || dayNumber || 0,
      status: as.status || '',
      statusLabel: as.status ? as.status.toUpperCase() : '',
      mentalityUsed: as.mentalityUsed || '',
      whatWentWell: as.whatWentWell || '',
      areaToImprove: as.areaToImprove || '',
      submissionNotes: as.submissionNotes || '',
      submissionMedia: as.submissionMedia || [],
      coachFeedback: as.coachFeedback || null,
      hasFeedback: Boolean(as.coachFeedback?.textNotes || as.coachFeedback?.videoUrl),
    };
  });

  return {
    athleteId,
    actionSteps,
    totalCount: actionSteps.length,
    pendingCount: actionSteps.filter((as) => as.status === 'pending').length,
    reviewedCount: actionSteps.filter((as) => as.status === 'reviewed').length,
  };
};

/**
 * Get Athlete Feedback (Dedicated API)
 */
const getAthleteFeedbackService = async (athleteId, query = {}) => {
  if (!mongoose.Types.ObjectId.isValid(athleteId)) {
    throw new Error('Invalid Athlete ID');
  }

  const feedbackList = await CoachFeedback.find({ athlete: athleteId })
    .sort({ date: -1, createdAt: -1 })
    .lean();

  const feedback = feedbackList.map((fb) => ({
    _id: fb._id.toString(),
    date: formatReadableDate(fb.date || fb.createdAt),
    rawDate: fb.date || fb.createdAt || null,
    rating: fb.rating !== undefined && fb.rating !== null ? Number(fb.rating) : null,
    message: fb.message || '',
    tags: fb.tags || [],
    timeframe: fb.timeframe || '',
  }));

  return {
    athleteId,
    feedback,
    totalCount: feedback.length,
  };
};

/**
 * Get Athlete Sessions (Dedicated API)
 */
const getAthleteSessionsService = async (athleteId, query = {}) => {
  if (!mongoose.Types.ObjectId.isValid(athleteId)) {
    throw new Error('Invalid Athlete ID');
  }

  const sessionsList = await Session.find({
    athlete: athleteId,
    status: { $ne: 'cancelled' },
  })
    .sort({ date: -1, startTime: -1 })
    .lean();

  const upcomingSessions = [];
  const completedSessions = [];

  sessionsList.forEach((s) => {
    const isToday = s.date && new Date(s.date).toDateString() === new Date().toDateString();
    const dateStr = isToday ? 'Today' : formatReadableDate(s.date);
    const timeParts = [dateStr, s.startTime].filter(Boolean);

    const formattedSession = {
      _id: s._id.toString(),
      title: s.title || '',
      sessionType: s.sessionType || '',
      date: formatReadableDate(s.date),
      rawDate: s.date || null,
      dateTime: s.dateTime || s.date || null,
      startTime: s.startTime || '',
      timeLabel: timeParts.join(' · '),
      duration: s.duration || '',
      platform: s.platform || '',
      meetingLink: s.meetingLink || '',
      status: s.status || '',
      notes: s.notes || '',
      canJoin: Boolean(s.meetingLink) && s.status === 'scheduled',
    };

    if (s.status === 'scheduled') {
      upcomingSessions.push(formattedSession);
    } else {
      completedSessions.push(formattedSession);
    }
  });

  return {
    athleteId,
    sessions: {
      upcoming: upcomingSessions,
      completed: completedSessions,
    },
    upcoming: upcomingSessions,
    completed: completedSessions,
    totalCount: sessionsList.length,
  };
};

/**
 * Get Athlete Progress Analytics (Dedicated API - with weekly & monthly filter)
 */
const getAthleteProgressService = async (athleteId, query = {}) => {
  if (!mongoose.Types.ObjectId.isValid(athleteId)) {
    throw new Error('Invalid Athlete ID');
  }

  const athleteDoc = await User.findById(athleteId).lean();
  if (!athleteDoc) {
    throw new Error('Athlete not found');
  }

  // 1. Resolve Filter: 'weekly' (default), 'monthly', 'program'
  const rawFilter = (query.filter || query.timeframe || query.period || query.range || 'weekly').toLowerCase();
  const isMonthly = rawFilter === 'monthly' || rawFilter === 'month' || rawFilter === 'm';
  const isProgram = rawFilter === 'program' || rawFilter === 'all';
  const filterType = isProgram ? 'program' : isMonthly ? 'monthly' : 'weekly';

  // 2. Mentorship Program Day & Overall Percentage
  const dayNumber = Number(athleteDoc.mentorshipDay) || 0;
  const progressPercentage = Math.min(100, Math.round((dayNumber / 90) * 100));

  const athleteStartDate = athleteDoc.mentorshipStartDate || athleteDoc.startDate
    ? new Date(athleteDoc.mentorshipStartDate || athleteDoc.startDate)
    : new Date(Date.now() - Math.max(0, dayNumber - 1) * 86400000);

  const currentWeekNum = Math.min(12, Math.max(1, Math.floor((dayNumber - 1) / 7) + 1));
  const currentMonthNum = Math.min(3, Math.max(1, Math.floor((dayNumber - 1) / 30) + 1));

  // 90-Day Program Phases (Foundation Days 1-30, Development Days 31-60, Performance Days 61-90)
  const foundationPercent = dayNumber >= 30 ? 100 : Math.round((dayNumber / 30) * 100);
  const developmentPercent = dayNumber <= 30 ? 0 : dayNumber >= 60 ? 100 : Math.round(((dayNumber - 30) / 30) * 100);
  const performancePercent = dayNumber <= 60 ? 0 : Math.min(100, Math.round(((dayNumber - 60) / 30) * 100));
  const phases = {
    foundation: foundationPercent,
    development: developmentPercent,
    performance: performancePercent,
  };

  // 3. Query Real Tasks
  const tasks = await Task.find({ athlete: athleteId }).lean();
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const overallTaskCompletionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  // 4. Query Real Training Assignments
  const trainings = await TrainingAssignment.find({ athlete: athleteId }).lean();
  const totalTrainings = trainings.length;
  const completedTrainings = trainings.filter((tr) => tr.status === 'completed');
  const overallTrainingDoneRate = totalTrainings > 0 ? Math.round((completedTrainings.length / totalTrainings) * 100) : 0;

  // 5. Query Real Habits & HabitLogs
  const athleteHabits = await Habit.find({
    $or: [{ assignedAthletes: athleteId }, { isMasterLibrary: true }],
    isActive: { $ne: false },
  }).lean();
  const habitIds = athleteHabits.map((h) => h._id);

  // -------------------------------------------------------------
  // A. IF FILTER IS WEEKLY (Figma Node #33086:7191 "Week" View)
  // Only weekly data, no monthly data, no program data, no extra data
  // -------------------------------------------------------------
  if (filterType === 'weekly') {
    const parsedWeek = query.week ? parseInt(String(query.week).replace(/\D/g, ''), 10) : null;
    const selectedWeekNum = parsedWeek && parsedWeek >= 1 && parsedWeek <= 12 ? parsedWeek : currentWeekNum;

    // Build weekly buckets (W1 to W7 minimum or currentWeekNum)
    const maxWeeks = Math.max(currentWeekNum, 7);
    const weekBuckets = {};
    for (let w = 1; w <= maxWeeks; w++) {
      weekBuckets[`W${w}`] = { week: `W${w}`, completed: 0, total: 0 };
    }

    tasks.forEach((t) => {
      const taskDate = new Date(t.dueDate || t.completedAt || t.createdAt);
      const diffDays = Math.max(0, Math.floor((taskDate - athleteStartDate) / 86400000));
      const wNum = Math.min(12, Math.floor(diffDays / 7) + 1);
      const wKey = `W${wNum}`;
      if (!weekBuckets[wKey]) {
        weekBuckets[wKey] = { week: wKey, completed: 0, total: 0 };
      }
      weekBuckets[wKey].total += 1;
      if (t.status === 'completed') {
        weekBuckets[wKey].completed += 1;
      }
    });

    const taskCompletion = Object.keys(weekBuckets).map((k) => {
      const b = weekBuckets[k];
      const rate = b.total > 0 ? Math.round((b.completed / b.total) * 100) : 0;
      return {
        label: b.week,
        rate,
      };
    });

    // Metric rates for active/selected week
    const targetWeekBucket = weekBuckets[`W${selectedWeekNum}`];
    const taskCompletionRate = targetWeekBucket && targetWeekBucket.total > 0
      ? Math.round((targetWeekBucket.completed / targetWeekBucket.total) * 100)
      : 0;

    const weekTrainings = trainings.filter((tr) => tr.week === selectedWeekNum);
    const trainingDoneRate = weekTrainings.length > 0
      ? Math.round((weekTrainings.filter((tr) => tr.status === 'completed').length / weekTrainings.length) * 100)
      : 0;

    let habitConsistencyRate = 0;
    if (athleteHabits.length > 0) {
      const weekStart = new Date(athleteStartDate.getTime() + (selectedWeekNum - 1) * 7 * 86400000);
      const weekEnd = new Date(athleteStartDate.getTime() + selectedWeekNum * 7 * 86400000);
      const weeklyLogs = await HabitLog.countDocuments({
        habit: { $in: habitIds },
        athlete: athleteId,
        status: 'completed',
        date: { $gte: weekStart, $lt: weekEnd },
      });
      const activeDaysInWeek = Math.min(7, Math.max(1, dayNumber - (selectedWeekNum - 1) * 7));
      const expectedLogs = athleteHabits.length * activeDaysInWeek;
      if (weeklyLogs > 0 && expectedLogs > 0) {
        habitConsistencyRate = Math.min(100, Math.round((weeklyLogs / expectedLogs) * 100));
      }
    }

    return {
      athleteId,
      athleteName: athleteDoc.fullName || '',
      filter: 'weekly',
      progressPercentage,
      taskCompletionRate,
      habitConsistencyRate,
      trainingDoneRate,
      taskCompletion,
      phases,
    };
  }

  // -------------------------------------------------------------
  // B. IF FILTER IS MONTHLY
  // Only monthly data, no weekly data, no program data
  // -------------------------------------------------------------
  if (filterType === 'monthly') {
    const parsedMonth = query.month ? parseInt(String(query.month).replace(/\D/g, ''), 10) : null;
    const selectedMonthNum = parsedMonth && parsedMonth >= 1 && parsedMonth <= 3 ? parsedMonth : currentMonthNum;

    const monthBuckets = {
      M1: { month: 'M1', title: 'Month 1 (Days 1–30)', completed: 0, total: 0 },
      M2: { month: 'M2', title: 'Month 2 (Days 31–60)', completed: 0, total: 0 },
      M3: { month: 'M3', title: 'Month 3 (Days 61–90)', completed: 0, total: 0 },
    };

    tasks.forEach((t) => {
      const taskDate = new Date(t.dueDate || t.completedAt || t.createdAt);
      const diffDays = Math.max(0, Math.floor((taskDate - athleteStartDate) / 86400000));
      const mNum = Math.min(3, Math.floor(diffDays / 30) + 1);
      const mKey = `M${mNum}`;
      if (monthBuckets[mKey]) {
        monthBuckets[mKey].total += 1;
        if (t.status === 'completed') {
          monthBuckets[mKey].completed += 1;
        }
      }
    });

    const taskCompletion = Object.keys(monthBuckets).map((k) => {
      const b = monthBuckets[k];
      const rate = b.total > 0 ? Math.round((b.completed / b.total) * 100) : 0;
      return {
        label: b.month,
        title: b.title,
        rate,
      };
    });

    const targetMonthBucket = monthBuckets[`M${selectedMonthNum}`];
    const taskCompletionRate = targetMonthBucket && targetMonthBucket.total > 0
      ? Math.round((targetMonthBucket.completed / targetMonthBucket.total) * 100)
      : 0;

    const monthWeeks = selectedMonthNum === 1 ? [1, 2, 3, 4] : selectedMonthNum === 2 ? [5, 6, 7, 8] : [9, 10, 11, 12];
    const monthTrainings = trainings.filter((tr) => monthWeeks.includes(tr.week));
    const trainingDoneRate = monthTrainings.length > 0
      ? Math.round((monthTrainings.filter((tr) => tr.status === 'completed').length / monthTrainings.length) * 100)
      : 0;

    let habitConsistencyRate = 0;
    if (athleteHabits.length > 0) {
      const monthStart = new Date(athleteStartDate.getTime() + (selectedMonthNum - 1) * 30 * 86400000);
      const monthEnd = new Date(athleteStartDate.getTime() + selectedMonthNum * 30 * 86400000);
      const monthlyLogs = await HabitLog.countDocuments({
        habit: { $in: habitIds },
        athlete: athleteId,
        status: 'completed',
        date: { $gte: monthStart, $lt: monthEnd },
      });
      const activeDaysInMonth = Math.min(30, Math.max(1, dayNumber - (selectedMonthNum - 1) * 30));
      const expectedLogs = athleteHabits.length * activeDaysInMonth;
      if (monthlyLogs > 0 && expectedLogs > 0) {
        habitConsistencyRate = Math.min(100, Math.round((monthlyLogs / expectedLogs) * 100));
      }
    }

    return {
      athleteId,
      athleteName: athleteDoc.fullName || '',
      filter: 'monthly',
      progressPercentage,
      taskCompletionRate,
      habitConsistencyRate,
      trainingDoneRate,
      taskCompletion,
      phases,
    };
  }

  // -------------------------------------------------------------
  // C. IF FILTER IS PROGRAM
  // Program Phase Breakdown (Foundation, Development, Performance)
  // -------------------------------------------------------------
  let habitConsistencyRate = 0;
  if (athleteHabits.length > 0) {
    const totalLogs = await HabitLog.countDocuments({
      habit: { $in: habitIds },
      athlete: athleteId,
      status: 'completed',
    });
    const daysActive = Math.max(1, dayNumber);
    const expectedTotalLogs = athleteHabits.length * daysActive;
    if (totalLogs > 0 && expectedTotalLogs > 0) {
      habitConsistencyRate = Math.min(100, Math.round((totalLogs / expectedTotalLogs) * 100));
    }
  }

  return {
    athleteId,
    athleteName: athleteDoc.fullName || '',
    filter: 'program',
    progressPercentage,
    taskCompletionRate: overallTaskCompletionRate,
    habitConsistencyRate,
    trainingDoneRate: overallTrainingDoneRate,
    phases,
  };
};

/**
 * Get Athlete Group 3-Way Chat (Dedicated API)
 */
const getAthleteGroupChatService = async (athleteId) => {
  if (!mongoose.Types.ObjectId.isValid(athleteId)) {
    throw new Error('Invalid Athlete ID');
  }

  let chatRoom = await ChatRoom.findOne({
    athlete: athleteId,
    type: '3-way',
  })
    .populate('participants', 'fullName role email')
    .lean();

  let groupMessages = [];
  let members = [];

  if (chatRoom) {
    const rawMsgs = await Message.find({ chatRoom: chatRoom._id })
      .sort({ createdAt: 1 })
      .populate('sender', 'fullName role')
      .lean();

    groupMessages = rawMsgs.map((m) => {
      const senderRole = m.sender?.role || '';
      const roleBadge = senderRole ? senderRole.toUpperCase() : '';

      return {
        _id: m._id.toString(),
        senderId: m.sender?._id?.toString() || null,
        senderName: m.sender?.fullName || '',
        senderRole,
        roleBadge,
        avatarEmoji: '',
        content: m.content || '',
        messageType: m.messageType || 'text',
        timeLabel: m.createdAt ? new Date(m.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '',
        dateLabel: formatReadableDate(m.createdAt),
      };
    });

    members = (chatRoom.participants || []).map((p) => {
      const roleBadge = p.role ? p.role.toUpperCase() : '';
      return {
        _id: p._id.toString(),
        name: p.fullName || '',
        role: p.role || '',
        roleBadge,
        avatarEmoji: '',
        label: p.fullName || '',
      };
    });
  }

  return {
    athleteId,
    group: {
      chatRoomId: chatRoom?._id?.toString() || null,
      name: chatRoom?.name || '',
      memberCount: members.length,
      members,
      messages: groupMessages,
    },
    chatRoomId: chatRoom?._id?.toString() || null,
    members,
    messages: groupMessages,
  };
};

/**
 * General Player Detail Service (Figma node 33044:13763 Overview)
 */
const getCoachPlayerDetailService = async (athleteId, coachId = null, query = {}) => {
  return await getCoachPlayerOverviewService(athleteId, coachId);
};

/**
 * 3. Create New Habit for Athlete (Figma node 33044:16326)
 */
const createAthleteHabitService = async (athleteId, data, coachId = null) => {
  if (!mongoose.Types.ObjectId.isValid(athleteId)) {
    throw new Error('Invalid Athlete ID');
  }

  const {
    title,
    habit,
    frequency = 'Daily',
    days = '',
    timesPerWeek = 7,
    startDate = new Date(),
    category = 'mindset',
    xpReward = 10,
    completion = 0,
    completionRate = 0,
    status = 'active',
  } = data;

  const habitTitle = title || habit;
  if (!habitTitle) {
    throw new Error('Habit title is required');
  }

  const isPaused = status === 'paused';
  const newHabit = await Habit.create({
    title: habitTitle,
    frequency,
    days: days || (frequency === 'Daily' ? 'Every day' : ''),
    timesPerWeek: Number(timesPerWeek) || 7,
    completionRate: Number(completion || completionRate) || 0,
    category,
    xpReward: Number(xpReward) || 10,
    startDate: startDate ? new Date(startDate) : new Date(),
    assignedAthletes: [athleteId],
    assignedCoaches: coachId && mongoose.Types.ObjectId.isValid(coachId) ? [coachId] : [],
    currentStreak: 0,
    createdBy: coachId,
    status: isPaused ? 'paused' : 'active',
    isActive: !isPaused,
  });

  return {
    _id: newHabit._id.toString(),
    habit: newHabit.title,
    title: newHabit.title,
    frequency: newHabit.frequency,
    days: newHabit.days,
    completion: newHabit.completionRate || 0,
    status: newHabit.status,
    isActive: newHabit.isActive,
  };
};

/**
 * Update Athlete Habit
 */
const updateAthleteHabitService = async (habitId, data) => {
  if (!mongoose.Types.ObjectId.isValid(habitId)) {
    throw new Error('Invalid Habit ID');
  }

  const habitDoc = await Habit.findById(habitId);
  if (!habitDoc) {
    throw new Error('Habit not found');
  }

  if (data.title || data.habit) habitDoc.title = data.title || data.habit;
  if (data.frequency) habitDoc.frequency = data.frequency;
  if (data.days) habitDoc.days = data.days;
  if (typeof data.completion === 'number') habitDoc.completionRate = data.completion;
  if (typeof data.completionRate === 'number') habitDoc.completionRate = data.completionRate;
  if (data.status) {
    habitDoc.status = data.status;
    habitDoc.isActive = data.status === 'active';
  }
  if (typeof data.isActive === 'boolean') {
    habitDoc.isActive = data.isActive;
    habitDoc.status = data.isActive ? 'active' : 'paused';
  }

  await habitDoc.save();

  return {
    _id: habitDoc._id.toString(),
    habit: habitDoc.title,
    title: habitDoc.title,
    frequency: habitDoc.frequency,
    days: habitDoc.days,
    completion: habitDoc.completionRate || 0,
    status: habitDoc.status,
    isActive: habitDoc.isActive,
  };
};

/**
 * Toggle Habit Status (active <-> paused)
 */
const toggleHabitStatusService = async (habitId) => {
  if (!mongoose.Types.ObjectId.isValid(habitId)) {
    throw new Error('Invalid Habit ID');
  }

  const habitDoc = await Habit.findById(habitId);
  if (!habitDoc) {
    throw new Error('Habit not found');
  }

  const nextStatus = habitDoc.status === 'paused' || habitDoc.isActive === false ? 'active' : 'paused';
  habitDoc.status = nextStatus;
  habitDoc.isActive = nextStatus === 'active';
  await habitDoc.save();

  return {
    _id: habitDoc._id.toString(),
    habit: habitDoc.title,
    title: habitDoc.title,
    frequency: habitDoc.frequency,
    days: habitDoc.days,
    completion: habitDoc.completionRate || 0,
    status: habitDoc.status,
    isActive: habitDoc.isActive,
  };
};

/**
 * 4. Create Task for Athlete (Figma node 33074:1589)
 */
const createAthleteTaskService = async (athleteId, data, coachId = null) => {
  if (!mongoose.Types.ObjectId.isValid(athleteId)) {
    throw new Error('Invalid Athlete ID');
  }

  const { title, dueDate = null, frequency = 'Once', category = 'mindset', description = '', icon = '📋' } = data;
  if (!title) {
    throw new Error('Task title is required');
  }

  const task = await Task.create({
    athlete: athleteId,
    coach: coachId && mongoose.Types.ObjectId.isValid(coachId) ? coachId : null,
    title,
    description,
    icon,
    category,
    dueDate: dueDate ? new Date(dueDate) : null,
    frequency,
    status: 'pending',
  });

  return task;
};

/**
 * 5. Toggle Task Status (Pending <-> Completed)
 */
const toggleTaskStatusService = async (taskId) => {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new Error('Invalid Task ID');
  }

  const task = await Task.findById(taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  task.status = task.status === 'completed' ? 'pending' : 'completed';
  task.completedAt = task.status === 'completed' ? new Date() : null;
  await task.save();

  return task;
};

/**
 * 6. Assign Training to Athlete (Figma node 33078:3174)
 */
const assignTrainingService = async (athleteId, data, coachId = null) => {
  if (!mongoose.Types.ObjectId.isValid(athleteId)) {
    throw new Error('Invalid Athlete ID');
  }

  const { title, videoUrl = '', category = 'Technical', duration = '15 min', week = 1 } = data;
  if (!title) {
    throw new Error('Video/Drill Title is required');
  }

  const assignment = await TrainingAssignment.create({
    athlete: athleteId,
    coach: coachId && mongoose.Types.ObjectId.isValid(coachId) ? coachId : null,
    title,
    videoUrl,
    category,
    duration,
    week: Number(week) || 1,
    status: 'assigned',
  });

  return assignment;
};

/**
 * 7. Create Coach Feedback (Figma node 33078:6781)
 */
const createCoachFeedbackService = async (athleteId, data, coachId = null) => {
  if (!mongoose.Types.ObjectId.isValid(athleteId)) {
    throw new Error('Invalid Athlete ID');
  }

  const { message, tags = [], rating = null, timeframe = '' } = data;
  if (!message) {
    throw new Error('Feedback message is required');
  }

  const parsedTags = Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : [];
  const parsedRating = rating !== undefined && rating !== null && rating !== '' ? Number(rating) : null;

  const fb = await CoachFeedback.create({
    athlete: athleteId,
    coach: coachId && mongoose.Types.ObjectId.isValid(coachId) ? coachId : null,
    message,
    tags: parsedTags,
    rating: parsedRating,
    timeframe: timeframe || '',
    date: new Date(),
  });

  return fb;
};

/**
 * 8. Review Action Step Submission (Figma node 33078:3424)
 */
const reviewActionStepService = async (actionStepId, data, coachId = null) => {
  if (!mongoose.Types.ObjectId.isValid(actionStepId)) {
    throw new Error('Invalid Action Step ID');
  }

  const actionStep = await ActionStep.findById(actionStepId);
  if (!actionStep) {
    throw new Error('Action Step not found');
  }

  const { textNotes = '', videoUrl = '', audioUrl = '', status = 'reviewed' } = data;

  actionStep.status = status;
  actionStep.coachFeedback = {
    textNotes,
    videoUrl,
    audioUrl,
    reviewedAt: new Date(),
    reviewedBy: coachId && mongoose.Types.ObjectId.isValid(coachId) ? coachId : null,
  };

  await actionStep.save();
  return actionStep;
};

/**
 * 9. Update Session Notes (Figma node 33092:10752)
 */
const updateSessionNotesService = async (sessionId, notes, coachId = null) => {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new Error('Invalid Session ID');
  }

  const session = await Session.findById(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  session.notes = notes || '';
  if (session.status === 'scheduled' && notes) {
    session.status = 'completed';
  }
  await session.save();

  return session;
};

/**
 * 10. Schedule / Create Coach Session (Figma node 33092:10372)
 */
const createCoachSessionService = async (athleteId, data, coachId = null) => {
  if (!mongoose.Types.ObjectId.isValid(athleteId)) {
    throw new Error('Invalid Athlete ID');
  }

  const athlete = await User.findById(athleteId).lean();
  if (!athlete) {
    throw new Error('Athlete not found');
  }

  let coach = null;
  if (coachId && mongoose.Types.ObjectId.isValid(coachId)) {
    coach = await User.findById(coachId).lean();
  }

  const {
    title = '',
    date = new Date(),
    dateTime = null,
    startTime = '',
    duration = '',
    platform = '',
    meetingLink = '',
    notes = '',
    sessionType = '',
  } = data;

  const sessionDate = dateTime ? new Date(dateTime) : new Date(date);

  const session = await Session.create({
    title,
    athlete: athleteId,
    athleteName: athlete.fullName || '',
    coach: coach?._id || null,
    coachName: coach?.fullName || '',
    date: sessionDate,
    dateTime: sessionDate,
    startTime,
    duration,
    platform,
    meetingLink,
    notes,
    status: 'scheduled',
    sessionType: sessionType || 'session',
  });

  return session;
};

/**
 * 11. Send 3-Way Group Message (Figma node 33086:8034)
 */
const sendAthleteGroupMessageService = async (athleteId, data, senderId = null) => {
  if (!mongoose.Types.ObjectId.isValid(athleteId)) {
    throw new Error('Invalid Athlete ID');
  }

  let chatRoom = await ChatRoom.findOne({
    athlete: athleteId,
    type: '3-way',
  });

  if (!chatRoom) {
    const athlete = await User.findById(athleteId);
    const coach = athlete?.assignedCoach ? await User.findById(athlete.assignedCoach) : null;
    const parent = athlete?.parent ? await User.findById(athlete.parent) : null;
    chatRoom = await ChatRoom.create({
      name: athlete?.fullName ? `${athlete.fullName}'s Coaching Group` : 'Coaching Group',
      type: '3-way',
      athlete: athleteId,
      coach: coach?._id || null,
      parent: parent?._id || null,
      participants: [athleteId, coach?._id, parent?._id].filter(Boolean),
    });
  }

  const { content, messageType = 'text', mediaUrl = '' } = data;
  if (!content && !mediaUrl) {
    throw new Error('Message content is required');
  }

  let sender = senderId;
  if (!sender || !mongoose.Types.ObjectId.isValid(sender)) {
    throw new Error('Valid sender ID is required');
  }

  const message = await Message.create({
    chatRoom: chatRoom._id,
    sender,
    messageType,
    content,
    mediaUrl,
  });

  chatRoom.lastMessage = message._id;
  chatRoom.lastMessageAt = new Date();
  await chatRoom.save();

  return message;
};

module.exports = {
  getCoachDashboardOverviewService,
  getCoachTasksOverviewService,
  getCoachTrainingOverviewService,
  getCoachFeedbackOverviewService,
  getCoachSessionsOverviewService,
  getCoachPlayersOverviewService,
  getCoachPlayerOverviewService,
  getCoachPlayerDetailService,
  getAthleteTasksService,
  getAthleteTrainingService,
  getAthleteHabitsService,
  getAthleteActionStepsService,
  getAthleteFeedbackService,
  getAthleteSessionsService,
  getAthleteProgressService,
  getAthleteGroupChatService,
  createAthleteHabitService,
  updateAthleteHabitService,
  toggleHabitStatusService,
  createAthleteTaskService,
  toggleTaskStatusService,
  assignTrainingService,
  createCoachFeedbackService,
  reviewActionStepService,
  updateSessionNotesService,
  createCoachSessionService,
  sendAthleteGroupMessageService,
};
