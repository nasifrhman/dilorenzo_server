const mongoose = require('mongoose');
const CurriculumMission = require('./curriculumMission.model');
const UserMissionProgress = require('./userMissionProgress.model');
const User = require('../User/user.model');
const ApiError = require('../../helpers/ApiError');
const { status } = require('http-status');

/**
 * Standardize single mission response formatting without duplicate fields
 */
const formatMission = (m) => {
  if (!m) return null;
  return {
    _id: m._id ? m._id.toString() : undefined,
    dayNumber: m.dayNumber,
    taskNumber: m.taskNumber || 1,
    icon: m.icon || '🧠',
    title: m.title,
    instructions: m.instructions || '',
    category: m.category || 'Mental',
    xpReward: Number(m.xpReward) || 50,
    isLiveNow: Boolean(m.isLiveNow),
    isMilestone: Boolean(m.isMilestone),
    status: m.status || (m.isLiveNow ? 'live' : 'queued'),
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
};

/**
 * 1. Admin: Get 90-Day Curriculum Schedule & Daily Mission Manager (Figma Node 33304:2397)
 */
const getAdminScheduleService = async (query = {}) => {
  const missions = await CurriculumMission.find({ isActive: true })
    .sort({ dayNumber: 1, taskNumber: 1, createdAt: 1 })
    .lean();

  // Find currently active live mission/day (if explicitly set)
  const liveMission = missions.find((m) => m.isLiveNow);
  const activeLiveDay = liveMission ? liveMission.dayNumber : 14;

  // Group by dayNumber
  const daysMap = new Map();
  for (const m of missions) {
    if (!daysMap.has(m.dayNumber)) {
      daysMap.set(m.dayNumber, []);
    }
    daysMap.get(m.dayNumber).push(m);
  }

  const scheduledDays = [];
  const sortedDayNumbers = Array.from(daysMap.keys()).sort((a, b) => a - b);

  for (const dayNum of sortedDayNumbers) {
    const dayMissions = daysMap.get(dayNum);
    const primary = dayMissions[0];

    const isLive = dayMissions.some((m) => m.isLiveNow) || dayNum === activeLiveDay;
    const status = isLive ? 'live' : (dayNum < activeLiveDay ? 'completed' : 'queued');

    const dayObj = {
      _id: primary._id.toString(),
      dayNumber: dayNum,
      taskNumber: primary.taskNumber || 1,
      icon: primary.icon || '🧠',
      title: primary.title,
      instructions: primary.instructions || '',
      category: primary.category || 'Mental',
      xpReward: Number(primary.xpReward) || 50,
      isLiveNow: isLive,
      status,
    };

    if (dayMissions.length > 1) {
      dayObj.tasks = dayMissions.map((t) => ({
        _id: t._id.toString(),
        taskNumber: t.taskNumber,
        icon: t.icon || '🧠',
        title: t.title,
        instructions: t.instructions || '',
        category: t.category,
        xpReward: Number(t.xpReward) || 50,
        isLiveNow: Boolean(t.isLiveNow),
        status: t.status || (t.isLiveNow ? 'live' : 'queued'),
      }));
    }

    scheduledDays.push(dayObj);
  }

  return {
    scheduledDays,
  };
};

/**
 * 2. Admin: Get List of Missions (Clean Flat List)
 */
const getAdminMissionsService = async (query = {}) => {
  const filter = { isActive: true };
  if (query.dayNumber) {
    filter.dayNumber = parseInt(query.dayNumber, 10);
  }
  if (query.category) {
    filter.category = query.category;
  }
  if (query.isLiveNow !== undefined) {
    filter.isLiveNow = query.isLiveNow === 'true' || query.isLiveNow === true;
  }

  const missions = await CurriculumMission.find(filter)
    .sort({ dayNumber: 1, taskNumber: 1, createdAt: 1 })
    .lean();

  return {
    totalMissions: missions.length,
    missions: missions.map(formatMission),
  };
};

/**
 * 3. Admin: Add Brand New Mission to 90-Day Schedule (Modal Figma 34010:5098)
 * Admin can create multiple tasks for a day!
 */
const createMissionService = async (adminId, payload) => {
  const {
    dayNumber,
    icon = '🧠',
    title,
    instructions = '',
    description = '',
    category = 'Mental',
    xpReward = 50,
    makeLiveNow = false,
    isLiveNow = false,
    isMilestone = false,
  } = payload;

  if (!dayNumber || isNaN(Number(dayNumber))) {
    throw new ApiError(status.BAD_REQUEST, 'Valid dayNumber (1-90) is required');
  }

  if (!title || !title.trim()) {
    throw new ApiError(status.BAD_REQUEST, 'Mission headline / title is required');
  }

  const dayNum = parseInt(dayNumber, 10);
  if (dayNum < 1 || dayNum > 90) {
    throw new ApiError(status.BAD_REQUEST, 'dayNumber must be between 1 and 90');
  }

  const promptText = (instructions || description || '').trim();
  const shouldBeLive = Boolean(makeLiveNow || isLiveNow);

  if (shouldBeLive) {
    // Unset any previous live missions
    await CurriculumMission.updateMany(
      { isLiveNow: true },
      { $set: { isLiveNow: false, status: 'completed' } }
    );
  }

  // Prevent duplicate documents if a mission with the same dayNumber and title already exists
  const existingMission = await CurriculumMission.findOne({
    dayNumber: dayNum,
    title: title.trim(),
    isActive: true,
  });

  let mission;
  if (existingMission) {
    if (icon) existingMission.icon = icon;
    if (promptText) existingMission.instructions = promptText;
    if (category) existingMission.category = category.trim();
    if (xpReward) existingMission.xpReward = Number(xpReward);
    existingMission.isLiveNow = shouldBeLive;
    if (payload.isMilestone !== undefined) existingMission.isMilestone = Boolean(isMilestone);
    existingMission.status = shouldBeLive ? 'live' : existingMission.status;
    if (adminId) existingMission.createdBy = adminId;
    await existingMission.save();
    mission = existingMission;
  } else {
    // Count existing tasks for this day to set taskNumber
    const existingCount = await CurriculumMission.countDocuments({
      dayNumber: dayNum,
      isActive: true,
    });
    const taskNumber = existingCount + 1;

    mission = await CurriculumMission.create({
      dayNumber: dayNum,
      taskNumber,
      icon: icon || '🧠',
      title: title.trim(),
      instructions: promptText,
      category: category.trim(),
      xpReward: Number(xpReward) || 50,
      isLiveNow: shouldBeLive,
      isMilestone: Boolean(isMilestone),
      status: shouldBeLive ? 'live' : 'queued',
      createdBy: adminId || null,
    });
  }

  return formatMission(mission);
};

/**
 * 3. Admin: Update Curriculum Mission By ID
 */
const updateMissionService = async (missionId, payload) => {
  if (!mongoose.Types.ObjectId.isValid(missionId)) {
    throw new ApiError(status.BAD_REQUEST, 'Invalid mission ID');
  }

  const mission = await CurriculumMission.findById(missionId);
  if (!mission || !mission.isActive) {
    throw new ApiError(status.NOT_FOUND, 'Mission not found');
  }

  const {
    dayNumber,
    icon,
    title,
    instructions,
    description,
    category,
    xpReward,
    makeLiveNow,
    isLiveNow,
    isMilestone,
  } = payload;

  if (dayNumber !== undefined) mission.dayNumber = parseInt(dayNumber, 10);
  if (icon !== undefined) mission.icon = icon;
  if (title !== undefined) mission.title = title.trim();
  if (instructions !== undefined) {
    mission.instructions = instructions.trim();
  } else if (description !== undefined) {
    mission.instructions = description.trim();
  }
  if (category !== undefined) mission.category = category.trim();
  if (xpReward !== undefined) mission.xpReward = Number(xpReward) || mission.xpReward;
  if (isMilestone !== undefined) mission.isMilestone = Boolean(isMilestone);

  const shouldBeLive = makeLiveNow !== undefined ? Boolean(makeLiveNow) : isLiveNow !== undefined ? Boolean(isLiveNow) : null;
  if (shouldBeLive === true) {
    await CurriculumMission.updateMany(
      { _id: { $ne: mission._id }, isLiveNow: true },
      { $set: { isLiveNow: false, status: 'completed' } }
    );
    mission.isLiveNow = true;
    mission.status = 'live';
  } else if (shouldBeLive === false) {
    mission.isLiveNow = false;
    mission.status = 'queued';
  }

  await mission.save();
  return formatMission(mission);
};

/**
 * 4. Admin: Delete Curriculum Mission By ID
 */
const deleteMissionService = async (missionId) => {
  if (!mongoose.Types.ObjectId.isValid(missionId)) {
    throw new ApiError(status.BAD_REQUEST, 'Invalid mission ID');
  }

  const mission = await CurriculumMission.findById(missionId);
  if (!mission) {
    throw new ApiError(status.NOT_FOUND, 'Mission not found');
  }

  await CurriculumMission.findByIdAndDelete(missionId);
  return { message: 'Mission deleted successfully from 90-day schedule' };
};

/**
 * 5. Admin: Make Day/Mission Live Now (Immediate Override on Member App)
 */
const makeLiveNowService = async (identifier) => {
  let targetDayNumber = null;
  let targetMissionId = null;

  if (mongoose.Types.ObjectId.isValid(identifier)) {
    targetMissionId = identifier;
    const mission = await CurriculumMission.findById(identifier);
    if (!mission) throw new ApiError(status.NOT_FOUND, 'Mission not found');
    targetDayNumber = mission.dayNumber;
  } else if (!isNaN(Number(identifier))) {
    targetDayNumber = parseInt(identifier, 10);
  } else {
    throw new ApiError(status.BAD_REQUEST, 'Invalid day number or mission ID');
  }

  // 1. Unset all current live missions
  await CurriculumMission.updateMany(
    { isLiveNow: true },
    { $set: { isLiveNow: false, status: 'completed' } }
  );

  // 2. Mark target day missions as Live Now
  await CurriculumMission.updateMany(
    { dayNumber: targetDayNumber, isActive: true },
    { $set: { isLiveNow: true, status: 'live' } }
  );

  // Also update days before targetDay to completed, and after to queued
  await CurriculumMission.updateMany(
    { dayNumber: { $lt: targetDayNumber }, isLiveNow: false, isActive: true },
    { $set: { status: 'completed' } }
  );
  await CurriculumMission.updateMany(
    { dayNumber: { $gt: targetDayNumber }, isLiveNow: false, isActive: true },
    { $set: { status: 'queued' } }
  );

  const updatedMissions = await CurriculumMission.find({
    dayNumber: targetDayNumber,
    isActive: true,
  }).lean();

  return {
    message: `Day ${targetDayNumber} is now LIVE on Member App hero section!`,
    liveDayNumber: targetDayNumber,
    missions: updatedMissions.map(formatMission),
  };
};

/**
 * 6. User: Get Today's Mission (Hero Section - Figma Node 32682:3299)
 * Visible for 24 hours per day in 90-day cycle.
 */
const getTodayMissionService = async (userId) => {
  let user = null;
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    user = await User.findById(userId).lean();
  }

  // Fallback to Alex Thompson or first athlete for preview
  if (!user) {
    user = await User.findOne({ email: 'alex.thompson@example.com', isDeleted: false }).lean();
    if (!user) user = await User.findOne({ role: 'athlete', isDeleted: false }).lean();
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Hours left in current 24-hour cycle
  const msRemainingToday = endOfToday.getTime() - now.getTime();
  const hoursRemaining = Math.max(1, Math.round(msRemainingToday / (1000 * 60 * 60)));

  // 1. Check if Admin has explicitly set a day as "LIVE NOW" (Override)
  const explicitLiveMission = await CurriculumMission.findOne({
    isLiveNow: true,
    isActive: true,
  })
    .sort({ taskNumber: 1, createdAt: 1 })
    .lean();

  let targetDayNumber = explicitLiveMission ? explicitLiveMission.dayNumber : 14;
  let isEnrolled = false;

  // 2. If user purchased 90-day mentorship, calculate current day in the 90-day schedule (24h per day)
  if (user && (user.tier === '90-day-mentorship' || user.mentorshipStartDate)) {
    isEnrolled = true;
    if (!explicitLiveMission && user.mentorshipStartDate) {
      const msSinceStart = now.getTime() - new Date(user.mentorshipStartDate).getTime();
      const daysPassed = Math.floor(msSinceStart / (1000 * 60 * 60 * 24));
      targetDayNumber = Math.min(Math.max(1, daysPassed + 1), 90);
    } else if (!explicitLiveMission && user.mentorshipDay) {
      targetDayNumber = Math.min(Math.max(1, user.mentorshipDay), 90);
    }
  }

  // 3. Fetch all missions / tasks for targetDayNumber
  let dayMissions = await CurriculumMission.find({
    dayNumber: targetDayNumber,
    isActive: true,
  })
    .sort({ taskNumber: 1, createdAt: 1 })
    .lean();

  // If no missions configured for this specific day, fallback to nearest available mission or Day 1
  if (!dayMissions || dayMissions.length === 0) {
    dayMissions = await CurriculumMission.find({ isActive: true })
      .sort({ dayNumber: 1, taskNumber: 1 })
      .limit(1)
      .lean();
  }

  const primaryMission = dayMissions[0] || {
    _id: new mongoose.Types.ObjectId(),
    dayNumber: targetDayNumber,
    icon: '🧠',
    title: 'Morning Mindset Journal',
    instructions:
      "Write 3 things you're grateful for and set one focus goal for today. Journaling primes your brain for high performance before the session even starts.",
    category: 'Mental',
    xpReward: 50,
  };

  // 4. Check if current user has completed this mission today
  let isCompleted = false;
  let completedAt = null;

  if (user) {
    const progress = await UserMissionProgress.findOne({
      athlete: user._id,
      mission: primaryMission._id,
      isCompleted: true,
    }).lean();

    if (progress) {
      isCompleted = true;
      completedAt = progress.completedAt;
    }
  }

  const xpVal = Number(primaryMission.xpReward) || 50;

  return {
    dayNumber: primaryMission.dayNumber,
    dayLabel: `Day ${primaryMission.dayNumber}`,
    currentMentorshipDay: targetDayNumber,
    totalMentorshipDays: 90,
    isEnrolled,
    timeRemainingHours: hoursRemaining,
    timeRemainingFormatted: `${hoursRemaining}h remaining today`,
    mission: {
      _id: primaryMission._id.toString(),
      dayNumber: primaryMission.dayNumber,
      icon: primaryMission.icon || '🧠',
      title: primaryMission.title,
      instructions:
        primaryMission.instructions ||
        primaryMission.description ||
        "Write 3 things you're grateful for and set one focus goal for today.",
      xpReward: xpVal,
      xpRewardFormatted: `+${xpVal} XP`,
      category: primaryMission.category || 'Mental',
      badge: `${primaryMission.category || 'Mental'}`,
      isCompleted,
      completedAt,
      buttonText: isCompleted ? 'Completed ✓' : '✓ Mark Complete',
    },
    tasksForToday: dayMissions.map((m) => ({
      _id: m._id.toString(),
      taskNumber: m.taskNumber,
      icon: m.icon || '🧠',
      title: m.title,
      instructions: m.instructions || m.description || '',
      xpReward: Number(m.xpReward) || 50,
      category: m.category,
      isCompleted,
    })),
  };
};

/**
 * 7. User: Mark Today's Mission Complete (+XP Awarded & Streak Incremented)
 */
const completeTodayMissionService = async (userId, missionId, notes = '') => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(status.UNAUTHORIZED, 'Authentication required');
  }

  const user = await User.findById(userId);
  if (!user || user.isDeleted) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }

  let mission = null;
  if (missionId && mongoose.Types.ObjectId.isValid(missionId)) {
    mission = await CurriculumMission.findById(missionId);
  }

  // If no missionId passed, complete today's current active mission
  if (!mission) {
    const todayData = await getTodayMissionService(userId);
    mission = await CurriculumMission.findById(todayData.mission._id);
  }

  if (!mission) {
    throw new ApiError(status.NOT_FOUND, 'Target mission not found');
  }

  // Check if already completed
  let progress = await UserMissionProgress.findOne({
    athlete: user._id,
    mission: mission._id,
  });

  if (progress && progress.isCompleted) {
    return {
      message: 'Mission already completed for today!',
      isCompleted: true,
      earnedXp: 0,
      totalXp: user.xp || 0,
      currentStreak: user.streak || 1,
      level: user.level || 1,
    };
  }

  const xpReward = Number(mission.xpReward) || 50;

  // Record completion
  if (!progress) {
    progress = new UserMissionProgress({
      athlete: user._id,
      mission: mission._id,
      dayNumber: mission.dayNumber,
      isCompleted: true,
      completedAt: new Date(),
      earnedXp: xpReward,
      notes: notes || '',
    });
  } else {
    progress.isCompleted = true;
    progress.completedAt = new Date();
    progress.earnedXp = xpReward;
    if (notes) progress.notes = notes;
  }
  await progress.save();

  // Award XP and calculate Level
  const currentXp = Number(user.xp) || 0;
  const newXp = currentXp + xpReward;
  user.xp = newXp;

  // Level: every 500 XP = 1 Level
  user.level = Math.max(1, Math.floor(newXp / 500) + 1);

  // Update streak (increment streak if not already credited today)
  const currentStreak = Number(user.streak) || 0;
  user.streak = currentStreak + 1;
  if (user.streak > (user.highestStreak || 0)) {
    user.highestStreak = user.streak;
  }

  await user.save();

  return {
    message: `Mission completed successfully! +${xpReward} XP awarded!`,
    isCompleted: true,
    earnedXp: xpReward,
    totalXp: user.xp,
    currentStreak: user.streak,
    level: user.level,
    completedMission: {
      _id: mission._id.toString(),
      dayNumber: mission.dayNumber,
      title: mission.title,
      icon: mission.icon,
    },
  };
};

/**
 * 8. User: Purchase / Enroll in 90-Day Mentorship
 */
const purchaseMentorshipService = async (userId) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(status.UNAUTHORIZED, 'Authentication required');
  }

  const user = await User.findById(userId);
  if (!user || user.isDeleted) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }

  const now = new Date();
  const endDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  user.tier = '90-day-mentorship';
  user.mentorshipPhase = 'foundation';
  user.mentorshipDay = 1;
  user.mentorshipStartDate = now;
  user.mentorshipEndDate = endDate;

  await user.save();

  // Fetch Day 1 mission for user
  const day1Mission = await CurriculumMission.findOne({ dayNumber: 1, isActive: true }).lean();

  return {
    message: 'Congratulations! You have successfully enrolled in the 90-Day Mentorship program.',
    tier: user.tier,
    mentorshipPhase: user.mentorshipPhase,
    mentorshipStartDate: user.mentorshipStartDate,
    mentorshipEndDate: user.mentorshipEndDate,
    currentDay: 1,
    day1Mission: day1Mission || null,
  };
};

/**
 * 9. User: Get 90-Day Mentorship Program Overview & Progress
 */
const getMentorshipProgramService = async (userId) => {
  let user = null;
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    user = await User.findById(userId).lean();
  }

  if (!user) {
    user = await User.findOne({ email: 'alex.thompson@example.com' }).lean();
  }

  const totalConfiguredMissions = await CurriculumMission.countDocuments({ isActive: true });
  const completedMissionsCount = user
    ? await UserMissionProgress.countDocuments({ athlete: user._id, isCompleted: true })
    : 0;

  const currentDay = user?.mentorshipDay || 14;

  return {
    title: '90-Day Mentorship Program',
    tier: user?.tier || 'free',
    isEnrolled: user?.tier === '90-day-mentorship',
    currentDay,
    totalDays: 90,
    progressPercentage: Math.round((currentDay / 90) * 100),
    phase: user?.mentorshipPhase || 'foundation',
    completedMissionsCount,
    totalConfiguredMissions,
    mentorshipStartDate: user?.mentorshipStartDate || null,
    mentorshipEndDate: user?.mentorshipEndDate || null,
  };
};

module.exports = {
  getAdminScheduleService,
  getAdminMissionsService,
  createMissionService,
  updateMissionService,
  deleteMissionService,
  makeLiveNowService,
  getTodayMissionService,
  completeTodayMissionService,
  purchaseMentorshipService,
  getMentorshipProgramService,
};
