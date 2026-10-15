const mongoose = require('mongoose');
const { status } = require('http-status');
const ApiError = require('../../helpers/ApiError');
const User = require('../User/user.model');
const Session = require('../Session/session.model');
const CoachFeedback = require('../Coach/coachFeedback.model');
const Habit = require('../Habit/habit.model');
const HabitLog = require('../Habit/habitLog.model');
const Task = require('../Coach/task.model');
const TrainingAssignment = require('../Coach/trainingAssignment.model');
const Notification = require('../Notification/notification.model');
const ChallengeParticipant = require('../Challenge/challengeParticipant.model');
const XpTransaction = require('../Xp/xpTransaction.model');
const ChatRoom = require('../Chat/chatRoom.model');
const Message = require('../Chat/message.model');
require('../Challenge/challenge.model');

// Helper to format relative time (e.g., "A day ago", "2h ago")
const formatRelativeTime = (date) => {
  if (!date) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return 'A day ago';
  return `${diffDay}d ago`;
};

// Helper to format readable date (e.g., "Aug 5", "Oct 12")
const formatReadableDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
};

// Helper to format local date string (YYYY-MM-DD)
const formatLocalDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get Parent Homepage / Dashboard Data (Figma Node 32910:4742)
 *
 * @param {Object} params
 * @param {string} [params.parentId] - Optional Parent User ID
 * @param {string} [params.athleteId] - Optional Athlete Child User ID
 */
const getParentHomepageService = async ({ parentId = null, athleteId = null }) => {
  let athleteDoc = null;
  let parentDoc = null;

  // 1. Resolve Parent if provided
  if (parentId) {
    if (!mongoose.Types.ObjectId.isValid(parentId)) {
      throw new ApiError(status.BAD_REQUEST, 'Invalid parent ID provided.');
    }
    parentDoc = await User.findById(parentId).lean();
    if (!parentDoc) {
      throw new ApiError(status.NOT_FOUND, 'Parent account not found.');
    }
  }

  // 2. Resolve Athlete
  if (athleteId) {
    if (!mongoose.Types.ObjectId.isValid(athleteId)) {
      throw new ApiError(status.BAD_REQUEST, 'Invalid athlete ID provided.');
    }
    athleteDoc = await User.findOne({
      _id: athleteId,
      role: 'athlete',
      isDeleted: { $ne: true },
    }).lean();
    if (!athleteDoc) {
      throw new ApiError(status.NOT_FOUND, 'Athlete child not found.');
    }
  } else if (parentDoc && Array.isArray(parentDoc.athletes) && parentDoc.athletes.length > 0) {
    athleteDoc = await User.findOne({
      _id: parentDoc.athletes[0],
      role: 'athlete',
      isDeleted: { $ne: true },
    }).lean();
    if (!athleteDoc) {
      throw new ApiError(status.NOT_FOUND, 'Linked athlete child not found.');
    }
  } else {
    throw new ApiError(
      status.BAD_REQUEST,
      'athleteId is required or no child is linked to this parent account.'
    );
  }

  // If parent not specified, check if athlete has parents
  if (!parentDoc && athleteDoc.parents && athleteDoc.parents.length > 0) {
    parentDoc = await User.findById(athleteDoc.parents[0]).lean();
  }

  // 3. Resolve Coach
  let coachDoc = null;
  if (athleteDoc.assignedCoach && mongoose.Types.ObjectId.isValid(athleteDoc.assignedCoach)) {
    coachDoc = await User.findById(athleteDoc.assignedCoach).lean();
  }

  // 4. Notifications Count for Parent
  let unreadNotificationsCount = 0;
  if (parentDoc) {
    unreadNotificationsCount = await Notification.countDocuments({
      receiver: parentDoc._id,
      isRead: false,
    });
  }

  // 5. Leaderboard Rank (by XP among active athletes)
  const higherXpCount = await User.countDocuments({
    role: 'athlete',
    isDeleted: { $ne: true },
    xp: { $gt: Number(athleteDoc.xp) || 0 },
  });
  const rank = higherXpCount + 1;

  // 6. Child Card Info
  const xpVal = Number(athleteDoc.xp) || 0;
  const levelVal = Number(athleteDoc.level) || 0;
  const streakVal = Number(athleteDoc.streak) || 0;

  const child = {
    _id: athleteDoc._id.toString(),
    fullName: athleteDoc.fullName || '',
    avatarUrl: athleteDoc.avatarUrl || athleteDoc.image || '',
    xp: xpVal,
    level: levelVal,
    streak: streakVal,
    rank,
  };

  // 7. 4 Stat Metrics (Total XP, Streak, Drills Done, Rank)
  const [completedTasksCount, completedTrainingCount] = await Promise.all([
    Task.countDocuments({ athlete: athleteDoc._id, status: 'completed' }),
    TrainingAssignment.countDocuments({ athlete: athleteDoc._id, status: 'completed' }),
  ]);
  const drillsDone = completedTasksCount + completedTrainingCount;

  const stats = {
    totalXp: xpVal,
    streak: streakVal,
    drillsDone,
    rank,
  };

  // 8. Weekly Goal Progress (Monday to Sunday) - Habits, Drills/Tasks, Video Assignments
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

  const days = weekDayLabels.map((dayLabel, index) => {
    const dayDate = new Date(monday.getTime() + index * 86400000);
    return {
      day: dayLabel,
      completed: activeDatesSet.has(dayDate.toDateString()),
    };
  });

  const completedDaysCount = days.filter((d) => d.completed).length;

  const weeklyGoalProgress = {
    completedDaysCount,
    days,
  };

  // 9. Next Coaching Session
  const nextSessionDoc = await Session.findOne({
    athlete: athleteDoc._id,
    status: 'scheduled',
  })
    .sort({ date: 1, startTime: 1 })
    .populate('coach', 'fullName')
    .lean();

  let nextSession = null;
  if (nextSessionDoc) {
    const sessionCoachName = nextSessionDoc.coach?.fullName || coachDoc?.fullName || '';
    const dateStr = formatReadableDate(nextSessionDoc.date);
    const timeStr = nextSessionDoc.startTime || '';
    const durationStr = nextSessionDoc.duration || '';

    nextSession = {
      _id: nextSessionDoc._id.toString(),
      title: nextSessionDoc.title || '',
      coachName: sessionCoachName,
      date: dateStr,
      time: timeStr,
      duration: durationStr,
      status: nextSessionDoc.status || '',
      meetingLink: nextSessionDoc.meetingLink || '',
      canJoin: Boolean(nextSessionDoc.meetingLink) && nextSessionDoc.status === 'scheduled',
    };
  }

  // 10. Latest Coach Feedback
  const latestFeedbackDoc = await CoachFeedback.findOne({ athlete: athleteDoc._id })
    .sort({ date: -1, createdAt: -1 })
    .populate('coach', 'fullName avatarColor avatarInitials')
    .lean();

  let latestFeedback = null;
  if (latestFeedbackDoc) {
    const fbCoachName = latestFeedbackDoc.coach?.fullName || coachDoc?.fullName || '';
    latestFeedback = {
      _id: latestFeedbackDoc._id.toString(),
      coachName: fbCoachName,
      coachAvatar: latestFeedbackDoc.coach?.avatarColor || '',
      time: formatRelativeTime(latestFeedbackDoc.date || latestFeedbackDoc.createdAt),
      date: formatReadableDate(latestFeedbackDoc.date || latestFeedbackDoc.createdAt),
      message: latestFeedbackDoc.message || '',
      rating: Number(latestFeedbackDoc.rating) || 0,
    };
  }

  // 11. Recent Achievement (Derived from Completed Challenges)
  let recentAchievement = null;
  const completedChallenge = await ChallengeParticipant.findOne({
    athlete: athleteDoc._id,
    $or: [{ isGoalReached: true }, { completedAt: { $ne: null } }],
  })
    .sort({ completedAt: -1, updatedAt: -1 })
    .populate('challenge', 'title description xpGoal category difficulty')
    .lean();

  if (completedChallenge && completedChallenge.challenge) {
    const ch = completedChallenge.challenge;
    const xpVal = completedChallenge.earnedXp || ch.xpGoal || 0;
    recentAchievement = {
      _id: completedChallenge._id.toString(),
      challengeId: ch._id ? ch._id.toString() : '',
      title: ch.title || '',
      description: ch.description || '',
      xpReward: xpVal > 0 ? `+${xpVal} XP` : '',
      earnedXp: xpVal,
      completedAt: completedChallenge.completedAt || completedChallenge.updatedAt,
    };
  } else if (athleteDoc.recentAchievement && typeof athleteDoc.recentAchievement === 'object') {
    recentAchievement = athleteDoc.recentAchievement;
  } else if (Array.isArray(athleteDoc.achievements) && athleteDoc.achievements.length > 0) {
    const latestAch = athleteDoc.achievements[athleteDoc.achievements.length - 1];
    recentAchievement = {
      title: latestAch.title || latestAch.name || '',
      description: latestAch.description || '',
      xpReward: latestAch.xpReward || '',
    };
  }

  return {
    header: {
      title: 'HOME',
      unreadNotificationsCount,
    },
    child,
    stats,
    weeklyGoalProgress,
    nextSession,
    latestFeedback,
    recentAchievement,
  };
};

/**
 * Get Parent Progress Overview (Figma Nodes 32917:6566, 32917:7202, 32917:7790)
 *
 * @param {Object} params
 * @param {string} [params.parentId] - Optional Parent User ID
 * @param {string} [params.athleteId] - Optional Athlete Child User ID
 * @param {string} [params.tab] - Optional tab: 'week' | 'month' | 'academy' (returns all if omitted)
 */
const getParentProgressService = async ({ parentId = null, athleteId = null, tab = null }) => {
  let athleteDoc = null;
  let parentDoc = null;

  // 1. Resolve Parent if provided
  if (parentId) {
    if (!mongoose.Types.ObjectId.isValid(parentId)) {
      throw new ApiError(status.BAD_REQUEST, 'Invalid parent ID provided.');
    }
    parentDoc = await User.findById(parentId).lean();
    if (!parentDoc) {
      throw new ApiError(status.NOT_FOUND, 'Parent account not found.');
    }
  }

  // 2. Resolve Athlete
  if (athleteId) {
    if (!mongoose.Types.ObjectId.isValid(athleteId)) {
      throw new ApiError(status.BAD_REQUEST, 'Invalid athlete ID provided.');
    }
    athleteDoc = await User.findOne({
      _id: athleteId,
      role: 'athlete',
      isDeleted: { $ne: true },
    }).lean();
    if (!athleteDoc) {
      throw new ApiError(status.NOT_FOUND, 'Athlete child not found.');
    }
  } else if (parentDoc && Array.isArray(parentDoc.athletes) && parentDoc.athletes.length > 0) {
    athleteDoc = await User.findOne({
      _id: parentDoc.athletes[0],
      role: 'athlete',
      isDeleted: { $ne: true },
    }).lean();
    if (!athleteDoc) {
      throw new ApiError(status.NOT_FOUND, 'Linked athlete child not found.');
    }
  } else {
    throw new ApiError(
      status.BAD_REQUEST,
      'athleteId is required or no child is linked to this parent account.'
    );
  }

  const now = new Date();

  // 3. Leaderboard Rank (XP among active athletes)
  const higherXpCount = await User.countDocuments({
    role: 'athlete',
    isDeleted: { $ne: true },
    xp: { $gt: Number(athleteDoc.xp) || 0 },
  });
  const rank = higherXpCount + 1;

  // Athlete basic details
  const athlete = {
    _id: athleteDoc._id.toString(),
    fullName: athleteDoc.fullName || '',
    avatarUrl: athleteDoc.avatarUrl || athleteDoc.image || '',
    xp: Number(athleteDoc.xp) || 0,
    level: Number(athleteDoc.level) || 0,
    streak: Number(athleteDoc.streak) || 0,
    rank,
    mentorshipDay: Number(athleteDoc.mentorshipDay) || 0,
    mentorshipPhase: athleteDoc.mentorshipPhase || '',
  };

  // Assigned habits for athlete
  const assignedHabits = await Habit.find({
    $or: [{ assignedAthletes: athleteDoc._id }, { isMasterLibrary: true }],
    isActive: { $ne: false },
    status: 'active',
  }).lean();
  const dailyTargetCount = Math.max(1, assignedHabits.length);

  // Helper: check if two dates are the same calendar day
  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.toDateString() === date2.toDateString();
  };

  // ==========================================
  // TAB 1: THIS WEEK (Node 32917:6566)
  // ==========================================
  const buildWeekData = async () => {
    const dayOfWeek = now.getDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const weekStart = new Date(monday);
    const weekEnd = new Date(monday.getTime() + 7 * 86400000);

    const [weekHabitLogs, weekTasks, weekTrainings] = await Promise.all([
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

    const weekDayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const mentalPerformanceScores = [];
    const activeDatesSet = new Set();

    weekDayLabels.forEach((label, i) => {
      const dayDate = new Date(monday.getTime() + i * 86400000);
      const isPastOrToday = dayDate <= now || isSameDay(dayDate, now);

      const dayHabitsCount = weekHabitLogs.filter((l) => isSameDay(l.date, dayDate)).length;
      const dayTasksCount = weekTasks.filter((t) => isSameDay(t.completedAt || t.updatedAt, dayDate)).length;
      const dayTrainingsCount = weekTrainings.filter((tr) => isSameDay(tr.completedAt || tr.updatedAt, dayDate)).length;
      const dayCompletedCount = dayHabitsCount + dayTasksCount + dayTrainingsCount;

      if (dayCompletedCount > 0) {
        activeDatesSet.add(dayDate.toDateString());
      }

      const score = isPastOrToday ? Math.min(100, Math.round((dayCompletedCount / dailyTargetCount) * 100)) : 0;

      mentalPerformanceScores.push({
        day: label,
        score,
      });
    });

    const completedDaysCount = mentalPerformanceScores.filter((_, i) => {
      const dayDate = new Date(monday.getTime() + i * 86400000);
      return activeDatesSet.has(dayDate.toDateString());
    }).length;

    const weeklyGoalProgress = {
      completedDaysCount,
      days: weekDayLabels.map((label, i) => {
        const dayDate = new Date(monday.getTime() + i * 86400000);
        return {
          day: label,
          completed: activeDatesSet.has(dayDate.toDateString()),
        };
      }),
    };

    const dailyHabits = assignedHabits.map((h) => {
      const completedCount = weekHabitLogs.filter((l) => l.habit?.toString() === h._id.toString()).length;
      const completionRate = Math.min(100, Math.round((completedCount / 7) * 100));
      return {
        _id: h._id.toString(),
        title: h.title || '',
        completionRate,
      };
    });

    return {
      mentalPerformanceScore: {
        timeframe: 'Mon – Sun · This week',
        scores: mentalPerformanceScores,
      },
      weeklyGoalProgress,
      dailyHabits,
    };
  };

  // ==========================================
  // TAB 2: THIS MONTH (Node 32917:7202)
  // ==========================================
  const buildMonthData = async () => {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const totalDaysInMonth = endOfMonth.getDate();
    const currentDayOfMonth = now.getDate();

    const [monthHabitLogs, monthTasks, monthTrainings, monthSessions, xpMonthlyAggregation] = await Promise.all([
      HabitLog.find({
        athlete: athleteDoc._id,
        date: { $gte: startOfMonth, $lte: endOfMonth },
        status: 'completed',
      }).populate('habit', 'category title').lean(),
      Task.find({
        athlete: athleteDoc._id,
        status: 'completed',
        $or: [
          { completedAt: { $gte: startOfMonth, $lte: endOfMonth } },
          { completedAt: null, updatedAt: { $gte: startOfMonth, $lte: endOfMonth } },
        ],
      }).lean(),
      TrainingAssignment.find({
        athlete: athleteDoc._id,
        status: 'completed',
        $or: [
          { completedAt: { $gte: startOfMonth, $lte: endOfMonth } },
          { completedAt: null, updatedAt: { $gte: startOfMonth, $lte: endOfMonth } },
        ],
      }).lean(),
      Session.countDocuments({
        athlete: athleteDoc._id,
        date: { $gte: startOfMonth, $lte: endOfMonth },
      }),
      XpTransaction.aggregate([
        {
          $match: {
            athlete: new mongoose.Types.ObjectId(athleteDoc._id),
            createdAt: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        {
          $group: {
            _id: null,
            totalXp: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const totalXpEarnedMonth = xpMonthlyAggregation.length > 0 ? xpMonthlyAggregation[0].totalXp : 0;

    // Daily scores across the month
    const dailyScores = [];
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const dayDate = new Date(now.getFullYear(), now.getMonth(), dayNum);
      const isPastOrToday = dayNum <= currentDayOfMonth;

      const dayHabitsCount = monthHabitLogs.filter((l) => isSameDay(l.date, dayDate)).length;
      const dayTasksCount = monthTasks.filter((t) => isSameDay(t.completedAt || t.updatedAt, dayDate)).length;
      const dayTrainingsCount = monthTrainings.filter((tr) => isSameDay(tr.completedAt || tr.updatedAt, dayDate)).length;
      const dayCompleted = dayHabitsCount + dayTasksCount + dayTrainingsCount;

      const score = isPastOrToday ? Math.min(100, Math.round((dayCompleted / dailyTargetCount) * 100)) : 0;

      dailyScores.push({
        day: dayNum,
        score,
      });
    }

    // Monthly Progress Categories
    const expectedHabitsUpToNow = Math.max(1, assignedHabits.length * currentDayOfMonth);
    const habitCompletionRate = Math.min(100, Math.round((monthHabitLogs.length / expectedHabitsUpToNow) * 100));

    const countCompletedCategory = (categoryPattern) => {
      return monthHabitLogs.filter((l) => {
        const cat = (l.habit?.category || '').toLowerCase();
        const title = (l.habit?.title || '').toLowerCase();
        return cat.includes(categoryPattern) || title.includes(categoryPattern);
      }).length;
    };

    const focusCompleted = countCompletedCategory('focus') + countCompletedCategory('mindset');
    const resilienceCompleted = countCompletedCategory('resilience') + countCompletedCategory('recovery');
    const confidenceCompleted = countCompletedCategory('confidence') + countCompletedCategory('technical');

    const focusDevelopment = Math.min(100, Math.round((focusCompleted / Math.max(1, currentDayOfMonth)) * 100));
    const resilienceGrowth = Math.min(100, Math.round((resilienceCompleted / Math.max(1, currentDayOfMonth)) * 100));
    const confidenceBuilding = Math.min(100, Math.round((confidenceCompleted / Math.max(1, currentDayOfMonth)) * 100));

    const activeDaysThisMonth = dailyScores.filter((d) => d.completedCount > 0).length;
    const overallPerformance = currentDayOfMonth > 0 ? Math.min(100, Math.round((activeDaysThisMonth / currentDayOfMonth) * 100)) : 0;

    const monthlyProgress = {
      overallPerformance,
      focusDevelopment,
      resilienceGrowth,
      confidenceBuilding,
      habitCompletion: habitCompletionRate,
    };

    const totalExpectedActivities = Math.max(1, currentDayOfMonth);
    const overallCompletionRate = Math.min(100, Math.round((activeDaysThisMonth / totalExpectedActivities) * 100));

    const summaryStats = {
      sessions: monthSessions,
      completionRate: overallCompletionRate,
      xpEarned: totalXpEarnedMonth || Number(athleteDoc.xp) || 0,
    };

    return {
      mentalPerformanceScore: {
        timeframe: `1 – ${totalDaysInMonth} · This month`,
        scores: dailyScores,
      },
      monthlyProgress,
      summaryStats,
    };
  };

  // ==========================================
  // TAB 3: ACADEMY (Node 32917:7790)
  // ==========================================
  const buildAcademyData = async () => {
    const mentorshipDay = Number(athleteDoc.mentorshipDay) || 0;
    const totalDays = 90;
    const currentWeek = Math.min(12, Math.max(1, Math.ceil((mentorshipDay || 1) / 7)));
    const totalWeeks = 12;
    const progressPercentage = Math.min(100, Math.round((mentorshipDay / totalDays) * 100));

    // Determine completed phase and running phase across the 90-Day Mentorship
    let completedPhase = null;
    let runningPhase = 'Foundation Phase';
    let statusText = 'Foundation Phase in progress';

    if (mentorshipDay <= 30) {
      completedPhase = null;
      runningPhase = 'Foundation Phase';
      statusText = 'Foundation Phase in progress';
    } else if (mentorshipDay <= 60) {
      completedPhase = 'Foundation Phase';
      runningPhase = 'Development Phase';
      statusText = 'Foundation Phase complete · Development Phase in progress';
    } else if (mentorshipDay <= 90) {
      completedPhase = 'Development Phase';
      runningPhase = 'Performance Phase';
      statusText = 'Development Phase complete · Performance Phase in progress';
    } else {
      completedPhase = 'Performance Phase';
      runningPhase = 'Program Completed';
      statusText = 'All Academy Phases complete';
    }

    const academyProgress = {
      weekLabel: `Week ${currentWeek} / ${totalWeeks}`,
      completedPhase,
      runningPhase,
      statusText,
      progressPercentage,
    };

    // Mindset Development Breakdown
    // Sourced from completed HabitLogs, Tasks (drills), and TrainingAssignments
    const allHabitLogs = await HabitLog.find({
      athlete: athleteDoc._id,
      status: 'completed',
    }).populate('habit', 'title category').lean();

    const completedTasks = await Task.find({
      athlete: athleteDoc._id,
      status: 'completed',
    }).lean();

    const completedTrainings = await TrainingAssignment.find({
      athlete: athleteDoc._id,
      status: 'completed',
    }).lean();

    const countMatches = (patterns) => {
      const habitMatches = allHabitLogs.filter((l) => {
        const title = (l.habit?.title || '').toLowerCase();
        const cat = (l.habit?.category || '').toLowerCase();
        return patterns.some((p) => title.includes(p) || cat.includes(p));
      }).length;

      const taskMatches = completedTasks.filter((t) => {
        const title = (t.title || '').toLowerCase();
        return patterns.some((p) => title.includes(p));
      }).length;

      const trainingMatches = completedTrainings.filter((tr) => {
        const title = (tr.title || '').toLowerCase();
        const cat = (tr.category || '').toLowerCase();
        return patterns.some((p) => title.includes(p) || cat.includes(p));
      }).length;

      return habitMatches + taskMatches + trainingMatches;
    };

    const preMatchCount = countMatches(['pre-match', 'pre match', 'ritual', 'journal', 'routine', 'warmup']);
    const pressureCount = countMatches(['pressure', 'breath', 'calm', 'heart', 'composure']);
    const focusCount = countMatches(['focus', 'visuali', 'concentration', 'scanning', 'awareness']);
    const confidenceCount = countMatches(['confidence', 'belief', 'self-talk', 'reflection', 'feedback', 'mindset']);
    const resilienceCount = countMatches(['resilience', 'recovery', 'bounce', 'mistake', 'reset', 'grit']);

    const totalDaysElapsed = Math.max(1, mentorshipDay);
    const preMatchRitual = Math.min(100, Math.round((preMatchCount / totalDaysElapsed) * 100));
    const pressureManagement = Math.min(100, Math.round((pressureCount / totalDaysElapsed) * 100));
    const focusControl = Math.min(100, Math.round((focusCount / totalDaysElapsed) * 100));
    const confidence = Math.min(100, Math.round((confidenceCount / totalDaysElapsed) * 100));
    const resilience = Math.min(100, Math.round((resilienceCount / totalDaysElapsed) * 100));

    const mindsetDevelopment = [
      { label: 'Pre-Match Ritual', progress: preMatchRitual },
      { label: 'Pressure Management', progress: pressureManagement },
      { label: 'Focus Control', progress: focusControl },
      { label: 'Confidence', progress: confidence },
      { label: 'Resilience', progress: resilience },
    ];

    // Academy Achievements (Completed Challenges + Milestone Unlocks)
    const completedChallenges = await ChallengeParticipant.find({
      athlete: athleteDoc._id,
      $or: [{ isGoalReached: true }, { completedAt: { $ne: null } }],
    })
      .sort({ completedAt: -1 })
      .populate('challenge', 'title description xpGoal')
      .lean();

    const streakVal = Number(athleteDoc.streak) || 0;
    const xpVal = Number(athleteDoc.xp) || 0;

    const academyAchievements = [
      {
        title: '7-Day Streak',
        description: 'Trained 7 days in a row',
        xpReward: '+200 XP',
        isUnlocked: streakVal >= 7,
      },
      {
        title: 'Focus Master',
        description: 'Completed 10 Focus drills',
        xpReward: '+300 XP',
        isUnlocked: (focusCount >= 10) || (athleteDoc.level >= 5),
      },
      {
        title: 'XP Milestone',
        description: 'Reached 2,000 XP',
        xpReward: '+250 XP',
        isUnlocked: xpVal >= 2000,
      },
      {
        title: 'Top 5 Regional',
        description: 'Rank in regional top 5',
        xpReward: '+500 XP',
        isUnlocked: rank <= 5,
      },
    ];

    completedChallenges.forEach((cp) => {
      if (cp.challenge) {
        academyAchievements.unshift({
          title: cp.challenge.title,
          description: cp.challenge.description || '',
          xpReward: cp.challenge.xpGoal ? `+${cp.challenge.xpGoal} XP` : '',
          isUnlocked: true,
        });
      }
    });

    return {
      academyProgress,
      mindsetDevelopment,
      academyAchievements,
    };
  };

  if (tab === 'week') {
    return await buildWeekData();
  }

  if (tab === 'month') {
    return await buildMonthData();
  }

  if (tab === 'academy') {
    return await buildAcademyData();
  }

  // If tab is omitted, return all 3 tabs
  const [week, month, academy] = await Promise.all([
    buildWeekData(),
    buildMonthData(),
    buildAcademyData(),
  ]);

  return {
    week,
    month,
    academy,
  };
};

/**
 * Get Parent Coach Hub Data (Figma Nodes 32923:8581, 32923:9295, 32924:9853, 32924:10241)
 * Single unified API handling all 4 tabs via ?tab=feedback|tasks|sessions|chat
 *
 * @param {Object} params
 * @param {string} [params.parentId] - Parent User ID
 * @param {string} [params.athleteId] - Athlete Child User ID
 * @param {string} [params.tab] - 'feedback' | 'tasks' | 'sessions' | 'chat'
 */
const getParentCoachHubService = async ({ parentId = null, athleteId = null, tab = null }) => {
  let athleteDoc = null;
  let parentDoc = null;

  // 1. Resolve Parent if provided
  if (parentId) {
    if (!mongoose.Types.ObjectId.isValid(parentId)) {
      throw new ApiError(status.BAD_REQUEST, 'Invalid parent ID provided.');
    }
    parentDoc = await User.findById(parentId).lean();
    if (!parentDoc) {
      throw new ApiError(status.NOT_FOUND, 'Parent account not found.');
    }
  }

  // 2. Resolve Athlete
  if (athleteId) {
    if (!mongoose.Types.ObjectId.isValid(athleteId)) {
      throw new ApiError(status.BAD_REQUEST, 'Invalid athlete ID provided.');
    }
    athleteDoc = await User.findOne({
      _id: athleteId,
      role: 'athlete',
      isDeleted: { $ne: true },
    }).lean();
    if (!athleteDoc) {
      throw new ApiError(status.NOT_FOUND, 'Athlete child not found.');
    }
  } else if (parentDoc && Array.isArray(parentDoc.athletes) && parentDoc.athletes.length > 0) {
    athleteDoc = await User.findOne({
      _id: parentDoc.athletes[0],
      role: 'athlete',
      isDeleted: { $ne: true },
    }).lean();
  }

  if (!athleteDoc) {
    throw new ApiError(status.BAD_REQUEST, 'athleteId is required or no child is linked to this parent account.');
  }

  // 3. Resolve Assigned Coach
  let coachDoc = null;
  if (athleteDoc.assignedCoach && mongoose.Types.ObjectId.isValid(athleteDoc.assignedCoach)) {
    coachDoc = await User.findById(athleteDoc.assignedCoach).lean();
  }
  if (!coachDoc) {
    coachDoc = await User.findOne({ role: 'coach', isDeleted: { $ne: true } }).lean();
  }

  const coachInfo = coachDoc ? {
    _id: coachDoc._id.toString(),
    fullName: coachDoc.fullName || 'Assigned Coach',
    roleTitle: coachDoc.roleTitle || 'Mental Performance Specialist · 8 yrs',
    avatarUrl: coachDoc.image || 'user.jpg',
    status: 'Active',
  } : null;

  // Helper builders for each tab
  // Tab 1: Feedback (Node 32923:8581)
  const buildFeedbackData = async () => {
    const rawFeedbacks = await CoachFeedback.find({ athlete: athleteDoc._id })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    const feedbacks = rawFeedbacks.map((f, idx) => {
      let timeframe = f.timeframe || '';
      if (!timeframe && f.date) {
        const d = new Date(f.date);
        timeframe = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      let weekLabel = 'Past Feedback';
      if (idx === 0) weekLabel = 'This Week';
      else if (idx === 1) weekLabel = 'Last Week';
      else if (idx === 2) weekLabel = '2 Weeks Ago';

      return {
        _id: f._id.toString(),
        weekLabel,
        timeframe,
        message: f.message || '',
        tags: Array.isArray(f.tags) ? f.tags : [],
        rating: f.rating !== undefined && f.rating !== null ? Number(f.rating) : null,
      };
    });

    return {
      coach: coachInfo,
      feedbacks,
    };
  };

  // Tab 2: Tasks (Node 32923:9295)
  const buildTasksData = async () => {
    const allTasks = await Task.find({ athlete: athleteDoc._id })
      .sort({ createdAt: -1 })
      .populate('coach', 'fullName')
      .lean();

    const formatDueLabel = (dueDate) => {
      if (!dueDate) return 'Due Today';
      const d = new Date(dueDate);
      const today = new Date();
      if (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      ) {
        return 'Due Today';
      }
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (
        d.getFullYear() === tomorrow.getFullYear() &&
        d.getMonth() === tomorrow.getMonth() &&
        d.getDate() === tomorrow.getDate()
      ) {
        return 'Tomorrow';
      }
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const mapTask = (t) => {
      const coachName = t.coach?.fullName || coachInfo?.fullName || 'Coach Rivera';
      const dueDateLabel = formatDueLabel(t.dueDate);
      const xpReward = Number(t.xpReward) || 80;
      const xpLabel = `+${xpReward} XP`;
      const isCompleted = t.status === 'completed';
      const statusBadge = isCompleted ? '✓ Done' : 'Pending';
      const subtitle = `${coachName} · ${dueDateLabel} · ${xpLabel}`;

      return {
        _id: t._id.toString(),
        icon: t.icon || (isCompleted ? '🎥' : '💨'),
        title: t.title,
        status: t.status,
        statusBadge,
        coachName,
        dueDate: t.dueDate,
        dueDateLabel,
        xpReward,
        xpLabel,
        subtitle,
        description: t.description || '',
      };
    };

    const currentAssignments = allTasks
      .filter((t) => t.status !== 'completed')
      .sort((a, b) => {
        if (a.description && !b.description) return -1;
        if (!a.description && b.description) return 1;
        if (a.title.includes('Breathing') && !b.title.includes('Breathing')) return -1;
        if (!a.title.includes('Breathing') && b.title.includes('Breathing')) return 1;
        return (new Date(a.dueDate || 0)) - (new Date(b.dueDate || 0));
      })
      .map(mapTask);

    const completed = allTasks
      .filter((t) => t.status === 'completed')
      .sort((a, b) => {
        if (a.description && !b.description) return -1;
        if (!a.description && b.description) return 1;
        return (new Date(b.completedAt || b.updatedAt || 0)) - (new Date(a.completedAt || a.updatedAt || 0));
      })
      .map(mapTask);

    return {
      pendingCount: currentAssignments.length,
      pendingLabel: `${currentAssignments.length} pending`,
      currentAssignments,
      completed,
    };
  };

  // Tab 3: Sessions (Node 32924:9853)
  const buildSessionsData = async () => {
    const sessions = await Session.find({ athlete: athleteDoc._id })
      .sort({ date: 1, dateTime: 1 })
      .populate('coach', 'fullName')
      .lean();

    const upcomingSessions = sessions
      .filter((s) => s.status === 'scheduled' || s.status === 'in-progress')
      .map((s) => {
        const coachDisplay = s.coachName || s.coach?.fullName || coachInfo?.fullName || 'Coach Rivera';
        const dateStr = s.dateTime || s.date;
        const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
        const startTime = s.startTime || '10:30am';
        const duration = s.duration || '30 min';
        return {
          _id: s._id.toString(),
          icon: s.icon || '🎯',
          title: s.title,
          schedule: `${coachDisplay} · ${formattedDate}, ${startTime} · ${duration}`,
          meetingLink: s.meetingLink || '',
        };
      });

    const completedSessions = sessions
      .filter((s) => s.status === 'completed')
      .map((s) => {
        const coachDisplay = s.coachName || s.coach?.fullName || coachInfo?.fullName || 'Coach Rivera';
        const formattedDate = s.date ? new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
        const startTime = s.startTime || '9:00am';
        return {
          _id: s._id.toString(),
          icon: s.icon || '📹',
          title: s.title,
          schedule: `${coachDisplay} · ${formattedDate}, ${startTime}`,
          status: 'Completed',
        };
      });

    return {
      upcomingSessions,
      completedSessions,
    };
  };

  // Tab 4: Chat (Node 32924:10241)
  const buildChatData = async () => {
    let chatRoom = await ChatRoom.findOne({
      athlete: athleteDoc._id,
      type: '3-way',
    }).lean();

    // If chat room doesn't exist, create it automatically with athlete, coach, parent and admin
    if (!chatRoom) {
      const participants = [athleteDoc._id];
      if (coachDoc) participants.push(coachDoc._id);
      if (parentDoc) participants.push(parentDoc._id);
      const adminDoc = await User.findOne({ role: 'admin', isDeleted: { $ne: true } }).lean();
      if (adminDoc) participants.push(adminDoc._id);

      const newRoom = await ChatRoom.create({
        name: `${athleteDoc.fullName || 'Athlete'}'s Coaching Group`,
        type: '3-way',
        athlete: athleteDoc._id,
        coach: coachDoc?._id || null,
        parent: parentDoc?._id || null,
        participants,
      });

      chatRoom = await ChatRoom.findById(newRoom._id).lean();
    }

    let messages = [];
    if (chatRoom) {
      const rawMessages = await Message.find({ chatRoom: chatRoom._id })
        .sort({ createdAt: 1 })
        .populate('sender', 'fullName role image')
        .lean();

      messages = rawMessages.map((m) => {
        const rawRole = (m.sender?.role || 'user').toLowerCase();
        let role = 'User';
        if (rawRole === 'admin') role = 'Admin';
        else if (rawRole === 'coach') role = 'Coach';
        else if (rawRole === 'athlete') role = 'Athlete';
        else if (rawRole === 'parent') role = 'Parent';

        const createdDate = m.createdAt ? new Date(m.createdAt) : new Date();
        const weekday = createdDate.toLocaleDateString('en-US', { weekday: 'short' });
        const timePart = createdDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });
        const time = `${weekday} ${timePart}`;

        let mediaDuration = '';
        if (m.mediaDuration) {
          const minutes = Math.floor(m.mediaDuration / 60);
          const seconds = Math.floor(m.mediaDuration % 60).toString().padStart(2, '0');
          mediaDuration = `${minutes}:${seconds}`;
        }

        let fileName = '';
        if (m.mediaUrl && (m.messageType === 'file' || m.messageType === 'video')) {
          fileName = m.mediaUrl.split('/').pop() || 'recording.mp4';
        }

        return {
          _id: m._id.toString(),
          senderId: m.sender?._id?.toString() || null,
          senderName: m.sender?.fullName || 'User',
          role,
          avatarUrl: m.sender?.image || 'user.jpg',
          messageType: m.messageType || 'text',
          content: m.content || '',
          mediaUrl: m.mediaUrl || '',
          mediaDuration,
          fileName,
          time,
        };
      });
    }

    return {
      chatRoomId: chatRoom?._id?.toString() || null,
      messages,
    };
  };

  // If specific tab is requested
  if (tab === 'feedback') {
    return await buildFeedbackData();
  }

  if (tab === 'tasks') {
    return await buildTasksData();
  }

  if (tab === 'sessions') {
    return await buildSessionsData();
  }

  if (tab === 'chat') {
    return await buildChatData();
  }

  // If tab is omitted, return all 4 tabs unified
  const [feedback, tasks, sessions, chat] = await Promise.all([
    buildFeedbackData(),
    buildTasksData(),
    buildSessionsData(),
    buildChatData(),
  ]);

  return {
    feedback,
    tasks,
    sessions,
    chat,
  };
};

/**
 * Send message to 3-Way Coaching Chat (Parent Role)
 */
const sendParentCoachMessageService = async ({ parentId, athleteId, content, messageType = 'text', mediaUrl = '', mediaDuration = 0 }) => {
  if (!content && !mediaUrl) {
    throw new ApiError(status.BAD_REQUEST, 'Message content or media is required.');
  }

  let chatRoom = null;
  if (athleteId) {
    chatRoom = await ChatRoom.findOne({ athlete: athleteId, type: '3-way' });
  }

  if (!chatRoom && parentId) {
    const parent = await User.findById(parentId).lean();
    if (parent && parent.athletes && parent.athletes.length > 0) {
      chatRoom = await ChatRoom.findOne({ athlete: parent.athletes[0], type: '3-way' });
    }
  }

  if (!chatRoom) {
    throw new ApiError(status.NOT_FOUND, '3-Way coaching chat room not found for this athlete/parent.');
  }

  const message = await Message.create({
    chatRoom: chatRoom._id,
    sender: parentId,
    content: content || '',
    messageType: messageType || 'text',
    mediaUrl: mediaUrl || '',
    mediaDuration: Number(mediaDuration) || 0,
  });

  chatRoom.lastMessage = message._id;
  chatRoom.lastMessageAt = new Date();
  await chatRoom.save();

  const populated = await Message.findById(message._id).populate('sender', 'fullName role image').lean();

  const createdDate = populated.createdAt ? new Date(populated.createdAt) : new Date();
  const weekday = createdDate.toLocaleDateString('en-US', { weekday: 'short' });
  const timePart = createdDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });
  const time = `${weekday} ${timePart}`;

  let mediaDurationStr = '';
  if (populated.mediaDuration) {
    const minutes = Math.floor(populated.mediaDuration / 60);
    const seconds = Math.floor(populated.mediaDuration % 60).toString().padStart(2, '0');
    mediaDurationStr = `${minutes}:${seconds}`;
  }

  return {
    _id: populated._id.toString(),
    chatRoomId: chatRoom._id.toString(),
    senderId: populated.sender?._id?.toString() || null,
    senderName: populated.sender?.fullName || '',
    role: 'Parent',
    avatarUrl: populated.sender?.image || 'user.jpg',
    messageType: populated.messageType,
    content: populated.content,
    mediaUrl: populated.mediaUrl,
    mediaDuration: mediaDurationStr,
    fileName: populated.mediaUrl ? populated.mediaUrl.split('/').pop() : '',
    time,
  };
};

module.exports = {
  getParentHomepageService,
  getParentProgressService,
  getParentCoachHubService,
  sendParentCoachMessageService,
};
