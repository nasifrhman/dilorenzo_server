const mongoose = require('mongoose');
const Drill = require('../Drill/drill.model');
const Task = require('../Coach/task.model');
const User = require('../User/user.model');
const HabitLog = require('../Habit/habitLog.model');

const { default: status } = require('http-status');
const ApiError = require('../../helpers/ApiError');

/**
 * Format readable calendar date
 */
const formatReadableDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
};

/**
 * Resolve athlete document strictly from logged in user ID
 */
const resolveAthlete = async (userId) => {
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    return await User.findById(userId).lean();
  }
  return null;
};

/**
 * 1. Train Screen Overview (Figma Node 32772:5327)
 */
const getTrainOverviewService = async (userId, query = {}) => {
  const athleteDoc = await resolveAthlete(userId);
  if (!athleteDoc) {
    throw new ApiError(status.UNAUTHORIZED, 'Authentication required. Please login with a valid token to view train screen.');
  }

  const athleteId = athleteDoc._id;

  // 1. Calculate Real Streak & Weekly Tracker (Mon - Sun)
  const now = new Date();
  const currentDayIndex = (now.getDay() + 6) % 7; // 0 = Mon, 6 = Sun

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - currentDayIndex);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Fetch real completed activities for this athlete during this week
  const [completedTasks, completedHabits] = await Promise.all([
    Task.find({
      athlete: athleteId,
      status: 'completed',
      completedAt: { $gte: startOfWeek, $lte: endOfWeek },
    }).select('completedAt').lean(),
    HabitLog.find({
      athlete: athleteId,
      status: 'completed',
      completedAt: { $gte: startOfWeek, $lte: endOfWeek },
    }).select('completedAt').lean(),
  ]);

  const completedDateSet = new Set();
  completedTasks.forEach((t) => {
    if (t.completedAt) {
      completedDateSet.add(new Date(t.completedAt).toISOString().split('T')[0]);
    }
  });
  completedHabits.forEach((h) => {
    if (h.completedAt) {
      completedDateSet.add(new Date(h.completedAt).toISOString().split('T')[0]);
    }
  });

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const weeklyDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const isCompleted = completedDateSet.has(dateStr);
    weeklyDays.push({
      day: dayLabels[i],
      completed: isCompleted,
    });
  }

  const currentStreak = Number(athleteDoc.streak) || 0;

  // 2. Featured Session (Figma Node 32772:5327 "⚡ Today's Featured")
  const featuredDrill =
    (await Drill.findOne({ isFeatured: true, isActive: true }).lean()) ||
    (await Drill.findOne({ isActive: true }).sort({ xpReward: -1 }).lean());

  const featured = featuredDrill
    ? {
        _id: featuredDrill._id.toString(),
        title: featuredDrill.title,
        description: featuredDrill.description || '',
        duration: `${featuredDrill.duration || 15} min`,
        xp: `+${featuredDrill.xpReward || 280} XP`,
      }
    : null;

  // 3. Mental Performance Drills (Filtered by category, matching Figma cards strictly)
  const selectedCategory = (query.category || 'all').toLowerCase().trim();
  const drillFilter = { isActive: true, isFeatured: false };
  if (selectedCategory !== 'all') {
    drillFilter.category = selectedCategory;
  }

  const drillDocs = await Drill.find(drillFilter).sort({ createdAt: 1 }).lean();

  const drills = drillDocs.map((d) => {
    const diff = d.difficulty || 'beginner';
    const formattedDifficulty = diff.charAt(0).toUpperCase() + diff.slice(1).toLowerCase();
    return {
      _id: d._id.toString(),
      title: d.title,
      category: d.category,
      difficulty: formattedDifficulty,
      duration: `${d.duration || 10} min`,
      xp: `+${d.xpReward || 0} XP`,
    };
  });

  return {
    featured,
    streak: {
      streak: `${currentStreak}🔥`,
      weeklyDays,
    },
    category: selectedCategory,
    drills,
  };
};

/**
 * 2. Coach Assignments List Screen (Figma Node 33000:12481)
 */
const getCoachAssignmentsService = async (userId, query = {}) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(status.UNAUTHORIZED, 'Authentication token is required to view assignments');
  }

  const athleteDoc = await resolveAthlete(userId);
  if (!athleteDoc) {
    throw new ApiError(status.NOT_FOUND, 'Athlete account not found');
  }

  const athleteId = athleteDoc._id;

  const filter = { athlete: athleteId };
  if (query.status && query.status !== 'all') {
    filter.status = query.status;
  }

  const taskList = await Task.find(filter)
    .populate('coach', 'fullName name email profileImage')
    .sort({ dueDate: 1, createdAt: -1 })
    .lean();

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const assignments = taskList.map((t) => {
    const coachName = t.coach?.fullName || t.coach?.name || '';

    let dueText = '';
    if (t.dueDate) {
      const dueStr = new Date(t.dueDate).toISOString().split('T')[0];
      if (dueStr === todayStr) {
        dueText = 'Due Today';
      } else if (dueStr === tomorrowStr) {
        dueText = 'Due Tomorrow';
      } else {
        dueText = `Due ${formatReadableDate(t.dueDate)}`;
      }
    }

    const subtitleParts = [];
    if (coachName) subtitleParts.push(coachName);
    if (dueText) subtitleParts.push(dueText);
    const subtitle = subtitleParts.join(' · ');

    const xp = Number(t.xpReward) || 0;
    const xpReward = xp > 0 ? `+${xp} XP` : '+0 XP';

    const isEvidenceUploaded = Boolean(t.evidence?.isUploaded || t.status === 'completed');

    return {
      _id: t._id.toString(),
      title: t.title,
      subtitle,
      xpReward,
      description: t.description || '',
      isUploaded: isEvidenceUploaded,
    };
  });

  return {
    assignments,
  };
};

/**
 * 3. Upload Assignment Evidence / Complete Assignment (Figma Node 33000:12481)
 */
const uploadAssignmentEvidenceService = async (userId, taskId, file, body = {}) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(status.UNAUTHORIZED, 'Authentication token is required to upload assignment evidence');
  }

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new ApiError(status.BAD_REQUEST, 'Invalid Assignment ID');
  }

  const athleteDoc = await resolveAthlete(userId);
  if (!athleteDoc) {
    throw new ApiError(status.NOT_FOUND, 'Athlete account not found');
  }
  const athleteId = athleteDoc._id;

  const task = await Task.findOne({ _id: taskId, athlete: athleteId });
  if (!task) {
    throw new ApiError(status.NOT_FOUND, 'Assignment not found for this athlete');
  }

  let mediaUrl = body.mediaUrl || '';
  let mediaType = body.mediaType || 'document';

  if (file) {
    mediaUrl = `/uploads/evidence/${file.filename}`;
    if (file.mimetype.startsWith('video/')) mediaType = 'video';
    else if (file.mimetype.startsWith('image/')) mediaType = 'image';
    else if (file.mimetype.startsWith('audio/')) mediaType = 'audio';
    else mediaType = 'document';
  }

  const notes = body.notes || body.text || task.evidence?.notes || '';

  // Update task with evidence
  task.evidence = {
    isUploaded: true,
    mediaUrl: mediaUrl || task.evidence?.mediaUrl || '',
    mediaType,
    notes,
    submittedAt: new Date(),
  };
  task.status = 'completed';
  task.completedAt = new Date();
  await task.save();

  // Award XP to athlete
  const xpReward = Number(task.xpReward) || 0;
  if (xpReward > 0 && athleteId) {
    await User.findByIdAndUpdate(athleteId, {
      $inc: { xp: xpReward },
    });
  }

  return {
    _id: task._id.toString(),
    title: task.title,
    status: task.status,
    xpAwarded: xpReward,
    evidence: task.evidence,
    button: {
      text: '✓ Evidence Uploaded',
      isUploaded: true,
      status: 'uploaded',
    },
  };
};

/**
 * 4. Get Drill Detail
 */
const getDrillDetailService = async (drillId) => {
  if (!mongoose.Types.ObjectId.isValid(drillId)) {
    throw new Error('Invalid Drill ID');
  }

  const drill = await Drill.findById(drillId).lean();
  if (!drill) {
    throw new Error('Drill not found');
  }

  const diff = drill.difficulty || 'beginner';
  const formattedDifficulty = diff.charAt(0).toUpperCase() + diff.slice(1).toLowerCase();

  return {
    _id: drill._id.toString(),
    title: drill.title,
    icon: drill.icon || '🧠',
    category: drill.category,
    difficulty: formattedDifficulty,
    duration: drill.duration || 10,
    durationDisplay: `${drill.duration || 10} min`,
    xpReward: drill.xpReward || 0,
    xpRewardDisplay: `+${drill.xpReward || 0} XP`,
    description: drill.description || '',
    videoUrl: drill.videoUrl || '',
    thumbnail: drill.thumbnail || '',
    isFeatured: Boolean(drill.isFeatured),
  };
};

/**
 * 5. Complete Drill Session
 */
const completeDrillSessionService = async (userId, drillId) => {
  if (!mongoose.Types.ObjectId.isValid(drillId)) {
    throw new Error('Invalid Drill ID');
  }

  const athleteDoc = await resolveAthlete(userId);
  const athleteId = athleteDoc?._id;

  const drill = await Drill.findById(drillId);
  if (!drill) {
    throw new Error('Drill not found');
  }

  // Award XP to user
  const xpReward = Number(drill.xpReward) || 0;
  if (xpReward > 0 && athleteId) {
    await User.findByIdAndUpdate(athleteId, {
      $inc: { xp: xpReward },
    });
  }

  // Record user completion on drill
  if (athleteId && !drill.completedBy.includes(athleteId)) {
    drill.completedBy.push(athleteId);
    await drill.save();
  }

  // Also record a completed Task entry so activity tracker & weekly days recognize it
  if (athleteId) {
    await Task.create({
      athlete: athleteId,
      title: `Completed Drill: ${drill.title}`,
      category: drill.category,
      icon: drill.icon || '🧠',
      xpReward,
      dueDate: new Date(),
      status: 'completed',
      completedAt: new Date(),
      frequency: 'Once',
    });
  }

  return {
    drillId: drill._id.toString(),
    title: drill.title,
    xpEarned: xpReward,
    completedAt: new Date(),
  };
};

/**
 * 6. Training Planner Screen (Figma nodes 32954:2212 & 32954:2000)
 *
 * @param {string|null} userId - Current user ID
 * @param {Object} query - { month: '2026-08', date: '2026-08-04' }
 */
const getTrainingPlannerService = async (userId, query = {}) => {
  const Session = require('../Session/session.model');

  // 1. Determine target Month & Year
  let year;
  let monthIndex; // 0-11

  if (query.month && /^\d{4}-\d{2}$/.test(query.month)) {
    const [y, m] = query.month.split('-');
    year = parseInt(y, 10);
    monthIndex = parseInt(m, 10) - 1;
  } else if (query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date)) {
    const [y, m] = query.date.split('-');
    year = parseInt(y, 10);
    monthIndex = parseInt(m, 10) - 1;
  } else {
    const now = new Date();
    year = now.getFullYear();
    monthIndex = now.getMonth();
  }

  const startOfMonth = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  const totalDays = endOfMonth.getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = `${monthNames[monthIndex]} ${year}`;
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

  // 2. Fetch Sessions in this month
  const sessionFilter = {
    date: { $gte: startOfMonth, $lte: endOfMonth },
    status: { $ne: 'cancelled' },
  };

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    sessionFilter.$or = [
      { athlete: userId },
      { coach: userId },
      { athlete: null }, // Academy public / general sessions
    ];
  }

  // 3. Fetch Tasks / Assignments in this month
  const taskFilter = {
    dueDate: { $gte: startOfMonth, $lte: endOfMonth },
  };
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    taskFilter.athlete = userId;
  }

  const [monthSessions, monthTasks] = await Promise.all([
    Session.find(sessionFilter).sort({ date: 1, startTime: 1 }).lean(),
    Task.find(taskFilter).sort({ dueDate: 1 }).lean(),
  ]);

  // 4. Group by Day (1..totalDays)
  const dayDotsMap = new Map();
  for (let d = 1; d <= totalDays; d++) {
    dayDotsMap.set(d, new Set());
  }

  const allEvents = [];

  // Map sessions
  for (const s of monthSessions) {
    const sDate = new Date(s.date);
    const day = sDate.getDate();
    const eventType = 'session';

    if (dayDotsMap.has(day)) {
      dayDotsMap.get(day).add(eventType);
    }

    allEvents.push({
      _id: s._id.toString(),
      dayNumber: day,
      title: s.title,
      subtitle: `${monthNames[monthIndex].slice(0, 3)} ${day} · ${eventType}`,
      type: eventType,
      date: sDate.toISOString(),
      startTime: s.startTime || '10:00 AM',
      status: s.status || 'scheduled',
    });
  }

  // Map tasks (assignments)
  for (const t of monthTasks) {
    if (!t.dueDate) continue;
    const tDate = new Date(t.dueDate);
    const day = tDate.getDate();
    const eventType = 'assignment';

    if (dayDotsMap.has(day)) {
      dayDotsMap.get(day).add(eventType);
    }

    allEvents.push({
      _id: t._id.toString(),
      dayNumber: day,
      title: t.title,
      subtitle: `${monthNames[monthIndex].slice(0, 3)} ${day} · ${eventType}`,
      type: eventType,
      date: tDate.toISOString(),
      startTime: '11:59 PM',
      status: t.status || 'pending',
    });
  }

  // Sort events by date / dayNumber
  allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Build calendarDays array (1 to totalDays)
  const calendarDays = [];
  for (let day = 1; day <= totalDays; day++) {
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${monthKey}-${dayStr}`;
    const dotsSet = dayDotsMap.get(day) || new Set();
    const dots = Array.from(dotsSet);

    calendarDays.push({
      day,
      date: dateStr,
      hasEvents: dots.length > 0,
      dots,
    });
  }

  // 5. Filter for Upcoming Events (events that will come: today or future, and not completed/cancelled)
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  const isUpcoming = (e) => {
    const eventDate = new Date(e.date);
    const isFutureOrToday = eventDate >= startOfToday;
    const isNotCompleted = e.status !== 'completed' && e.status !== 'cancelled';
    return isFutureOrToday && isNotCompleted;
  };

  let selectedDate = null;
  let title = 'Training Planner';
  let upcomingEvents = [];

  if (query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date)) {
    selectedDate = query.date;
    const [qY, qM, qD] = query.date.split('-');
    const targetDay = parseInt(qD, 10);
    const targetMonthIdx = parseInt(qM, 10) - 1;

    // Filter events for that day that are upcoming (not completed/cancelled and not past)
    upcomingEvents = allEvents.filter(
      (e) => e.dayNumber === targetDay && new Date(e.date).getMonth() === targetMonthIdx && isUpcoming(e)
    );

    title = `${monthNames[targetMonthIdx]} ${targetDay}`;
  } else {
    // Monthly view: only upcoming events (that will come)
    upcomingEvents = allEvents.filter(isUpcoming);
  }

  return {
    title,
    month: monthName,
    monthKey,
    selectedDate,
    calendarDays,
    upcomingEvents,
  };
};

/**
 * Format video duration string (e.g. 14 -> "14:32" or format string)
 */
const formatDurationDisplay = (dur) => {
  if (typeof dur === 'string' && dur.includes(':')) return dur;
  const num = Number(dur) || 15;
  return `${num}:00`;
};

/**
 * 7. Exclusive Content Screen (Figma node 32959:2827)
 */
const getExclusiveContentService = async (userId, query = {}) => {
  const VideoProgress = require('./videoProgress.model');

  // Build filter for video drills
  const filter = {
    $or: [
      { tierRequired: 'premium' },
      { isMasterLibrary: true },
    ],
    isActive: { $ne: false },
  };

  if (query.category && query.category.toLowerCase().trim() !== 'all') {
    filter.category = query.category.toLowerCase().trim();
  }

  const drills = await Drill.find(filter).sort({ createdAt: -1 }).lean();

  // Load user watch progress if logged in
  const userProgressMap = new Map();
  let mostRecentInProgress = null;

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    const progressList = await VideoProgress.find({ user: userId })
      .sort({ lastWatchedAt: -1, updatedAt: -1 })
      .lean();

    for (const p of progressList) {
      userProgressMap.set(p.drill.toString(), p);
      if (!mostRecentInProgress && p.progress > 0 && p.progress < 100 && !p.isCompleted) {
        mostRecentInProgress = p;
      }
    }
  }

  // Format all video cards
  const formattedVideos = drills.map((d) => {
    const drillIdStr = d._id.toString();
    const progressDoc = userProgressMap.get(drillIdStr);

    let progress = 0;
    let isCompleted = false;

    if (userId && d.completedBy && d.completedBy.some((id) => id.toString() === userId.toString())) {
      isCompleted = true;
      progress = 100;
    } else if (progressDoc) {
      progress = progressDoc.progress || 0;
      isCompleted = Boolean(progressDoc.isCompleted || progress >= 100);
    }

    return {
      _id: drillIdStr,
      title: d.title,
      duration: formatDurationDisplay(d.duration),
      progress,
      isCompleted,
      category: d.category || 'mindset',
      videoUrl: d.videoUrl || '',
      thumbnail: d.thumbnail || '',
    };
  });

  // Find "Continue Watching" item:
  // Strictly the user's most recently watched video that is in progress (0 < progress < 100)
  let continueWatching = null;
  if (mostRecentInProgress) {
    const matchingVideo = formattedVideos.find((v) => v._id === mostRecentInProgress.drill.toString());
    if (matchingVideo) {
      continueWatching = {
        _id: matchingVideo._id,
        title: matchingVideo.title,
        duration: matchingVideo.duration,
        progress: matchingVideo.progress,
        progressPercentage: `${matchingVideo.progress}%`,
        category: matchingVideo.category,
        videoUrl: matchingVideo.videoUrl,
        thumbnail: matchingVideo.thumbnail,
      };
    }
  }

  // Do not show the same video twice (exclude continueWatching from the videos list)
  const videoList = continueWatching
    ? formattedVideos.filter((v) => v._id !== continueWatching._id)
    : formattedVideos;

  return {
    title: 'EXCLUSIVE CONTENT',
    subtitle: 'Premium video library',
    continueWatching,
    videos: videoList,
  };
};

/**
 * 8. Update Exclusive Video Progress
 */
const updateExclusiveVideoProgressService = async (userId, drillId, payload = {}) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(status.UNAUTHORIZED, 'Authentication required to save video progress.');
  }

  if (!mongoose.Types.ObjectId.isValid(drillId)) {
    throw new ApiError(status.BAD_REQUEST, 'Invalid Video / Drill ID.');
  }

  const VideoProgress = require('./videoProgress.model');
  const drill = await Drill.findById(drillId);
  if (!drill) {
    throw new ApiError(status.NOT_FOUND, 'Video not found.');
  }

  const progress = Math.min(100, Math.max(0, Number(payload.progress) || 0));
  const isCompleted = Boolean(payload.isCompleted || progress >= 100);

  const updatedProgress = await VideoProgress.findOneAndUpdate(
    { user: userId, drill: drill._id },
    {
      progress,
      isCompleted,
      lastWatchedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  if (isCompleted && !drill.completedBy.includes(userId)) {
    drill.completedBy.push(userId);
    await drill.save();

    // Award XP if not already awarded
    const xpReward = Number(drill.xpReward) || 20;
    if (xpReward > 0) {
      await User.findByIdAndUpdate(userId, {
        $inc: { xp: xpReward },
      });
    }
  }

  return {
    drillId: drill._id.toString(),
    title: drill.title,
    progress: updatedProgress.progress,
    progressPercentage: `${updatedProgress.progress}%`,
    isCompleted: updatedProgress.isCompleted,
    message: isCompleted ? 'Video completed!' : 'Progress saved successfully.',
  };
};

module.exports = {
  getTrainOverviewService,
  getCoachAssignmentsService,
  uploadAssignmentEvidenceService,
  getDrillDetailService,
  completeDrillSessionService,
  getTrainingPlannerService,
  getExclusiveContentService,
  updateExclusiveVideoProgressService,
};
