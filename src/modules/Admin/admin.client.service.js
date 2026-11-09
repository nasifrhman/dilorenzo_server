const mongoose = require('mongoose');
const User = require('../User/user.model');
const ActionStep = require('../ActionStep/actionStep.model');
const Session = require('../Session/session.model');
const Habit = require('../Habit/habit.model');
const Task = require('../Coach/task.model');
const TrainingAssignment = require('../Coach/trainingAssignment.model');
const ChatRoom = require('../Chat/chatRoom.model');

// Helper to compute initials
const getInitials = (fullName) => {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Helper to format relative time
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

// Helper to determine truthful phase label without hardcoded fallbacks
const getAthletePhaseLabel = (athlete) => {
  if (!athlete) return '';
  if (athlete.tier === '90-day-mentorship') {
    let phaseName = '';
    if (typeof athlete.mentorshipDay === 'number' && athlete.mentorshipDay > 0) {
      if (athlete.mentorshipDay <= 30) phaseName = 'Foundation';
      else if (athlete.mentorshipDay <= 60) phaseName = 'Acceleration';
      else phaseName = 'Mastery';
      return `${phaseName} • Day ${athlete.mentorshipDay}/90`;
    }
    if (athlete.mentorshipPhase) {
      phaseName = athlete.mentorshipPhase.charAt(0).toUpperCase() + athlete.mentorshipPhase.slice(1);
      return phaseName;
    }
  }
  return athlete.startingPhase || '';
};

// Helper to determine truthful program label without dummy fallbacks
const getAthleteProgramLabel = (tier) => {
  if (tier === '90-day-mentorship') return 'Soccer Mindset - 90 Day Mentorship';
  if (tier === 'premium') return 'Academy Pro Membership';
  if (tier && tier !== 'free') return tier;
  return '';
};

/**
 * 1. Client Directory Service (Figma Nodes 33295:19693, 33288:14067, 33288:17116, 33292:18613, 33295:19065)
 * Clean response: Only real enrolled clients, dynamic phase derivation, zero dummy defaults.
 */
const getClientDirectoryService = async (query = {}) => {
  const { tab = 'all', search = '', page = 1, limit = 50 } = query;

  const baseFilter = {
    $or: [
      { role: 'athlete' },
      { tier: { $in: ['90-day-mentorship', 'premium'] } },
    ],
    isDeleted: false,
  };

  const allAthletes = await User.find(baseFilter)
    .populate('assignedCoach', 'fullName email image')
    .sort({ createdAt: -1 })
    .lean();

  const totalEnrolled = allAthletes.length;
  const mentorshipCount = allAthletes.filter(a => a.tier === '90-day-mentorship').length;
  const needsCoachCount = allAthletes.filter(a => !a.assignedCoach).length;
  const needsAttentionCount = allAthletes.filter(a => (!a.streak || a.streak === 0)).length;
  const academyProCount = allAthletes.filter(a => a.tier === 'premium').length;

  // Clean Summary Metrics
  const summaryMetrics = {
    totalEnrolled,
    mentorship: mentorshipCount,
    needsCoach: needsCoachCount,
    needsAttention: needsAttentionCount,
  };

  // Clean Filter Tab Counts
  const tabs = {
    all: totalEnrolled,
    needsCoach: needsCoachCount,
    mentorship: mentorshipCount,
    academyPro: academyProCount,
    needsAttention: needsAttentionCount,
  };

  // Filter by active tab
  let filtered = [...allAthletes];
  const normalizedTab = tab.toLowerCase();

  if (normalizedTab === 'needs-coach') {
    filtered = filtered.filter(a => !a.assignedCoach);
  } else if (normalizedTab === 'mentorship' || normalizedTab === '90-day-mentorship') {
    filtered = filtered.filter(a => a.tier === '90-day-mentorship');
  } else if (normalizedTab === 'academy-pro' || normalizedTab === 'academy') {
    filtered = filtered.filter(a => a.tier === 'premium');
  } else if (normalizedTab === 'needs-attention' || normalizedTab === 'attention') {
    filtered = filtered.filter(a => (!a.streak || a.streak === 0));
  }

  // Filter by search query
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(a => {
      const name = (a.fullName || '').toLowerCase();
      const club = (a.currentClub || a.leagueDivision || '').toLowerCase();
      const reg = (a.region || a.nation || '').toLowerCase();
      const coach = (a.assignedCoach?.fullName || '').toLowerCase();
      return name.includes(q) || club.includes(q) || reg.includes(q) || coach.includes(q);
    });
  }

  // Pagination
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 50;
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / limitNum) || 1;
  const paginated = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  // Query Tasks, Habits, and ChatRooms for the paginated athletes
  const athleteIds = paginated.map(a => a._id);
  const [tasksForAthletes, habitsForAthletes, chatRoomsForAthletes] = await Promise.all([
    Task.find({ athlete: { $in: athleteIds } }).select('athlete status').lean(),
    Habit.find({ assignedAthletes: { $in: athleteIds }, isDeleted: { $ne: true } }).select('assignedAthletes completionRate').lean(),
    ChatRoom.find({ athlete: { $in: athleteIds }, type: '3-way' }).select('athlete _id').lean(),
  ]);

  // Clean athlete cards with strictly genuine data
  const clients = paginated.map(athlete => {
    let status = 'Active';
    if (athlete.isBan) status = 'Banned';
    else if (!athlete.assignedCoach) status = 'Needs Coach';
    else if (!athlete.streak || athlete.streak === 0) status = 'Needs Attention';

    const program = getAthleteProgramLabel(athlete.tier);
    const phase = getAthletePhaseLabel(athlete);

    // Calculate real adherence from habits and tasks
    const aTasks = tasksForAthletes.filter(t => t.athlete?.toString() === athlete._id.toString());
    const aHabits = habitsForAthletes.filter(h =>
      Array.isArray(h.assignedAthletes) && h.assignedAthletes.some(id => id?.toString() === athlete._id.toString())
    );

    let habitSum = 0;
    let habitCount = 0;
    for (const h of aHabits) {
      if (typeof h.completionRate === 'number' && h.completionRate > 0) {
        habitSum += h.completionRate;
        habitCount++;
      }
    }
    const habitRate = habitCount > 0 ? Math.round(habitSum / habitCount) : 0;

    const completedTasks = aTasks.filter(t => t.status === 'completed').length;
    const taskRate = aTasks.length > 0 ? Math.round((completedTasks / aTasks.length) * 100) : 0;

    let adherence = 0;
    if (habitRate > 0 && taskRate > 0) {
      adherence = Math.round((habitRate + taskRate) / 2);
    } else if (habitRate > 0) {
      adherence = habitRate;
    } else if (taskRate > 0) {
      adherence = taskRate;
    }

    const chatRoom = chatRoomsForAthletes.find(c => c.athlete?.toString() === athlete._id.toString());
    const chatId = chatRoom ? chatRoom._id.toString() : null;

    return {
      id: athlete._id,
      name: athlete.fullName || '',
      initials: getInitials(athlete.fullName),
      image: athlete.image && athlete.image !== 'user.jpg' ? athlete.image : null,
      team: athlete.currentClub || athlete.leagueDivision || '',
      region: athlete.region || '',
      program,
      phase,
      coach: athlete.assignedCoach ? {
        id: athlete.assignedCoach._id,
        name: athlete.assignedCoach.fullName || '',
      } : null,
      streak: athlete.streak || 0,
      xp: athlete.xp || 0,
      adherence,
      status,
      chatId,
    };
  });

  return {
    summaryMetrics,
    tabs,
    activeTab: normalizedTab,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalItems,
      limit: limitNum,
    },
    clients,
  };
};

/**
 * 2. Athlete Hub Header Helper
 * Clean header: Only genuine athlete & coach attributes and real chatId.
 */
const buildAthleteHubHeader = async (athlete) => {
  const coach = athlete.assignedCoach;
  const program = getAthleteProgramLabel(athlete.tier);
  const phase = getAthletePhaseLabel(athlete);

  // Find or create real ChatRoom for this athlete & coach with Admin, Athlete, and Coach
  let chatRoom = await ChatRoom.findOne({ athlete: athlete._id, type: '3-way' });
  if (!chatRoom && coach) {
    const coachId = coach._id || coach;
    const adminUser = await User.findOne({ role: { $in: ['admin', 'super-admin'] } });
    const participants = [athlete._id, coachId];
    if (adminUser) participants.push(adminUser._id);

    const newRoom = await ChatRoom.create({
      name: `3-Way Mentorship Group (${athlete.fullName || 'Athlete'} & ${coach.fullName || 'Coach'})`,
      type: '3-way',
      athlete: athlete._id,
      coach: coachId,
      participants,
    });
    chatRoom = newRoom;
  } else if (chatRoom && coach) {
    const adminUser = await User.findOne({ role: { $in: ['admin', 'super-admin'] } });
    if (adminUser && !chatRoom.participants?.some(p => p.toString() === adminUser._id.toString())) {
      await ChatRoom.updateOne({ _id: chatRoom._id }, { $addToSet: { participants: adminUser._id } });
    }
  }

  const chatId = chatRoom ? chatRoom._id.toString() : null;

  return {
    athlete: {
      id: athlete._id,
      name: athlete.fullName || '',
      initials: getInitials(athlete.fullName),
      image: athlete.image && athlete.image !== 'user.jpg' ? athlete.image : null,
      team: athlete.currentClub || athlete.leagueDivision || '',
      region: athlete.region || '',
      program,
      phase,
      xp: athlete.xp || 0,
    },
    streak: athlete.streak || 0,
    coach: coach ? {
      id: coach._id,
      name: coach.fullName || '',
      roleTitle: coach.roleTitle || '',
      image: coach.image && coach.image !== 'user.jpg' ? coach.image : null,
    } : null,
    chatId,
    chatRoomId: chatId,
  };
};

/**
 * Tab 1: Dash (Figma Node 33308:7690)
 * Real onboarding checklist and today's tasks without synthetic completion flags.
 */
const getAthleteDashTab = async (athlete) => {
  const hasPhase = Boolean(athlete.mentorshipPhase || athlete.startingPhase);
  const hasCoach = Boolean(athlete.assignedCoach);
  const hasApp = Boolean(athlete.fcmToken);

  const submittedActionStepCount = await ActionStep.countDocuments({
    athlete: athlete._id,
    status: { $in: ['submitted', 'in-review', 'reviewed', 'completed'] }
  });
  const hasVideoReviewed = submittedActionStepCount > 0;

  const checklist = [
    { id: 'phase', title: 'Setup training phase', completed: hasPhase },
    { id: 'coach', title: 'Assigned 3-way coach', completed: hasCoach },
    { id: 'apps', title: 'Connect with apps', completed: hasApp },
    { id: 'review_video', title: 'Review first game video', completed: hasVideoReviewed },
  ];

  const completedChecklistCount = checklist.filter(c => c.completed).length;

  const tasks = await Task.find({ athlete: athlete._id }).sort({ createdAt: -1 }).lean();
  const completedTasksCount = tasks.filter(t => t.status === 'completed').length;

  return {
    onboardingSetup: {
      completedCount: completedChecklistCount,
      totalCount: checklist.length,
      percentage: Math.round((completedChecklistCount / checklist.length) * 100),
      checklist,
    },
    thingsToDoToday: {
      completedCount: completedTasksCount,
      totalCount: tasks.length,
      tasks: tasks.map(t => ({
        id: t._id,
        title: t.title || '',
        category: t.category || '',
        xp: t.xpReward || 0,
        completed: t.status === 'completed',
      })),
    },
  };
};

/**
 * Tab 2: Goals and Habits (Figma Node 33308:8628)
 * Strictly genuine assigned habits, no unassigned master library injections, no synthetic IDs.
 */
const getAthleteGoalsHabitsTab = async (athlete) => {
  const streak = athlete.streak || 0;

  const habitsList = await Habit.find({
    assignedAthletes: athlete._id,
    isDeleted: { $ne: true },
  }).sort({ createdAt: -1 }).lean();

  const ratedHabits = habitsList.filter(h => typeof h.completionRate === 'number' && h.completionRate > 0);
  const habitRate = ratedHabits.length > 0
    ? Math.round(ratedHabits.reduce((acc, h) => acc + h.completionRate, 0) / ratedHabits.length)
    : 0;

  const athleteTasks = await Task.find({ athlete: athlete._id }).select('status').lean();
  const completedTasks = athleteTasks.filter(t => t.status === 'completed').length;
  const taskRate = athleteTasks.length > 0 ? Math.round((completedTasks / athleteTasks.length) * 100) : 0;

  let adherenceVal = 0;
  if (habitRate > 0 && taskRate > 0) {
    adherenceVal = Math.round((habitRate + taskRate) / 2);
  } else if (habitRate > 0) {
    adherenceVal = habitRate;
  } else if (taskRate > 0) {
    adherenceVal = taskRate;
  }

  return {
    streak,
    adherence: adherenceVal,
    habits: habitsList.map(h => ({
      id: h._id,
      title: h.title || '',
      frequency: h.frequency || '',
      category: h.category || '',
      adherence: h.completionRate || 0,
      status: h.status || 'active',
    })),
  };
};

/**
 * Tab 3: Training Program (Figma Node 33309:9674)
 * Real training phase and assignments without default fallback strings.
 */
const getAthleteTrainingTab = async (athlete) => {
  const assignments = await TrainingAssignment.find({ athlete: athlete._id })
    .sort({ week: 1, createdAt: 1 })
    .lean();

  let phase = '';
  if (athlete.tier === '90-day-mentorship') {
    if (typeof athlete.mentorshipDay === 'number' && athlete.mentorshipDay > 0) {
      let phaseName = 'Foundation';
      if (athlete.mentorshipDay <= 30) phaseName = 'Foundation';
      else if (athlete.mentorshipDay <= 60) phaseName = 'Acceleration';
      else phaseName = 'Mastery';
      phase = `Phase: ${phaseName}`;
    } else if (athlete.mentorshipPhase) {
      phase = `Phase: ${athlete.mentorshipPhase.charAt(0).toUpperCase() + athlete.mentorshipPhase.slice(1)}`;
    }
  }
  if (!phase && athlete.startingPhase) {
    phase = athlete.startingPhase.startsWith('Phase') ? athlete.startingPhase : `Phase: ${athlete.startingPhase}`;
  }

  return {
    phase,
    completedCount: assignments.filter(a => a.status === 'completed').length,
    totalCount: assignments.length,
    modules: assignments.map(a => ({
      id: a._id,
      title: a.title || '',
      duration: a.duration || '',
      category: a.category || '',
      status: a.status || '',
      xp: a.xpReward || 0,
      week: a.week || 1,
      videoUrl: a.videoUrl || '',
    })),
  };
};

/**
 * Tab 4: Action Steps & Reports (Figma Node 33309:10703)
 * Real submitted action steps with true status.
 */
const getAthleteReportsTab = async (athlete) => {
  const dbSteps = await ActionStep.find({ athlete: athlete._id })
    .populate('coach', 'fullName email')
    .populate('feedback')
    .sort({ submittedAt: -1, createdAt: -1 })
    .lean();

  return {
    totalSubmissions: dbSteps.length,
    reports: dbSteps.map(step => ({
      id: step._id,
      title: step.title || '',
      submittedAt: step.submittedAt || step.createdAt ? formatRelativeTime(step.submittedAt || step.createdAt) : '',
      reviewedBy: step.coach?.fullName || null,
      status: step.status || '',
      whatWentWell: step.whatWentWell || '',
      areaToImprove: step.areaToImprove || '',
      feedback: step.feedback?.message || '',
    })),
  };
};

/**
 * Tab 5: Calendar (Figma Node 33309:11542)
 * Genuine session and task events without fake dummy strings.
 */
const getAthleteCalendarTab = async (athlete) => {
  const sessions = await Session.find({ athlete: athlete._id })
    .populate('coach', 'fullName email')
    .sort({ date: 1 })
    .lean();

  const scheduledTasks = await Task.find({
    athlete: athlete._id,
    dueDate: { $ne: null }
  }).sort({ dueDate: 1 }).lean();

  const sessionEvents = sessions.map(s => {
    const d = s.date ? new Date(s.date) : (s.dateTime ? new Date(s.dateTime) : null);
    return {
      id: s._id,
      date: d ? d.toISOString().split('T')[0] : '',
      title: s.title || '',
      time: s.startTime || '',
      duration: s.duration || '',
      coachName: s.coach?.fullName || s.coachName || '',
      type: s.sessionType || '',
      status: s.status || '',
    };
  });

  const taskEvents = scheduledTasks.map(t => {
    const d = t.dueDate ? new Date(t.dueDate) : null;
    return {
      id: t._id,
      date: d ? d.toISOString().split('T')[0] : '',
      title: t.title || '',
      time: '',
      duration: '',
      coachName: '',
      type: t.category || '',
      status: t.status || '',
    };
  });

  const now = new Date();
  const currentMonth = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return {
    month: currentMonth,
    events: [...sessionEvents, ...taskEvents],
  };
};

/**
 * 3. Athlete Hub Master Service
 */
const getAthleteHubService = async (athleteId, tab = 'dash') => {
  if (!athleteId) {
    const error = new Error('athleteId is required.');
    error.statusCode = 400;
    throw error;
  }

  let athlete = null;
  if (mongoose.isValidObjectId(athleteId)) {
    athlete = await User.findById(athleteId).populate('assignedCoach').lean();
  } else {
    athlete = await User.findOne({ fullName: new RegExp(athleteId, 'i'), role: { $in: ['user', 'athlete'] } })
      .populate('assignedCoach')
      .lean();
  }

  if (!athlete) {
    const error = new Error('Athlete not found.');
    error.statusCode = 404;
    throw error;
  }

  const header = await buildAthleteHubHeader(athlete);
  const tabParam = (typeof tab === 'object' && tab !== null) ? tab.tab : tab;
  const normalizedTab = String(tabParam || 'dash').toLowerCase();

  let tabData = {};
  if (normalizedTab === 'dash') {
    tabData = await getAthleteDashTab(athlete);
  } else if (normalizedTab === 'goals-habits' || normalizedTab === 'goals' || normalizedTab === 'habits') {
    tabData = await getAthleteGoalsHabitsTab(athlete);
  } else if (normalizedTab === 'training' || normalizedTab === 'training-program') {
    tabData = await getAthleteTrainingTab(athlete);
  } else if (normalizedTab === 'reports' || normalizedTab === 'action-steps') {
    tabData = await getAthleteReportsTab(athlete);
  } else if (normalizedTab === 'calendar' || normalizedTab === 'schedule') {
    tabData = await getAthleteCalendarTab(athlete);
  } else if (normalizedTab === 'all') {
    tabData = {
      dash: await getAthleteDashTab(athlete),
      goalsHabits: await getAthleteGoalsHabitsTab(athlete),
      training: await getAthleteTrainingTab(athlete),
      reports: await getAthleteReportsTab(athlete),
      calendar: await getAthleteCalendarTab(athlete),
    };
  } else {
    tabData = await getAthleteDashTab(athlete);
  }

  return {
    header,
    activeTab: normalizedTab,
    data: tabData,
  };
};

module.exports = {
  getClientDirectoryService,
  getAthleteHubService,
  getAthleteDashTab,
  getAthleteGoalsHabitsTab,
  getAthleteTrainingTab,
  getAthleteReportsTab,
  getAthleteCalendarTab,
  buildAthleteHubHeader,
};
