const mongoose = require('mongoose');
const httpStatus = require('http-status').default;
const ApiError = require('../../helpers/ApiError');
const Challenge = require('./challenge.model');
const ChallengeParticipant = require('./challengeParticipant.model');
const User = require('../User/user.model');

/**
 * Get dashboard overview statistics for Challenges
 * As shown in Figma node 33299:22507
 */
const getChallengeOverviewStatsService = async () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 1. Active Challenges count
  const activeChallengesCount = await Challenge.countDocuments({
    status: 'active',
  });

  // 2. Total distinct participants currently enrolled across active challenges
  const activeChallengeIds = await Challenge.find({ status: 'active' }).distinct('_id');
  const totalParticipantsCount = await ChallengeParticipant.countDocuments({
    challenge: { $in: activeChallengeIds },
  });

  // 3. XP Awarded this month
  const xpMonthlyAggregation = await ChallengeParticipant.aggregate([
    {
      $match: {
        updatedAt: { $gte: startOfMonth },
      },
    },
    {
      $group: {
        _id: null,
        totalXp: { $sum: '$earnedXp' },
      },
    },
  ]);

  const xpAwardedThisMonth = xpMonthlyAggregation.length > 0 ? xpMonthlyAggregation[0].totalXp : 0;

  return {
    activeChallengesCount,
    totalParticipantsCount,
    xpAwardedThisMonth,
  };
};

/**
 * Create a new Challenge (Wizard Steps 1 to 4)
 */
const createChallengeService = async (payload, creatorId = null) => {
  const {
    title,
    description = '',
    icon = '🏆',
    category = 'mental',
    difficulty = 'medium',
    startDate,
    endDate,
    xpGoal = 300,
    activities = [],
    assignedAthletes = [],
    status = 'active',
  } = payload;

  if (!title || !title.trim()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Challenge title is required.');
  }

  if (!startDate || !endDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Start date and end date are required.');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid date format provided for start or end date.');
  }

  // Validate Athlete IDs if provided
  const validAthleteIds = [];
  if (Array.isArray(assignedAthletes)) {
    for (const id of assignedAthletes) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        validAthleteIds.push(new mongoose.Types.ObjectId(id));
      }
    }
  }

  // Sanitize activities
  const sanitizedActivities = Array.isArray(activities)
    ? activities.map((act) => ({
        title: act.title || 'Challenge Activity',
        description: act.description || '',
        xpReward: Number(act.xpReward) || 50,
        category: (act.category || 'mindset').toLowerCase(),
        isRequired: Boolean(act.isRequired),
      }))
    : [];

  const challenge = await Challenge.create({
    title: title.trim(),
    description: description.trim(),
    icon,
    category: category.toLowerCase(),
    difficulty: difficulty.toLowerCase(),
    startDate: start,
    endDate: end,
    xpGoal: Number(xpGoal) || 300,
    activities: sanitizedActivities,
    assignedAthletes: validAthleteIds,
    status,
    createdBy: creatorId && mongoose.Types.ObjectId.isValid(creatorId) ? creatorId : null,
  });

  // Automatically create ChallengeParticipant records for each assigned athlete
  if (validAthleteIds.length > 0) {
    const participantDocs = validAthleteIds.map((athleteId) => ({
      challenge: challenge._id,
      athlete: athleteId,
      earnedXp: 0,
      completedActivities: [],
      isGoalReached: false,
    }));

    await ChallengeParticipant.insertMany(participantDocs, { ordered: false }).catch(() => {
      // Ignore duplicates if any
    });
  }

  return await Challenge.findById(challenge._id)
    .populate('assignedAthletes', 'fullName email image position preferredFoot currentClub xp');
};

const AVATAR_PALETTE = ['#2B7FFF', '#615FFF', '#8E51FF', '#FF2056', '#00BC7D', '#FE9A00'];

const computeAvatarInitials = (fullName = '') => {
  if (!fullName || typeof fullName !== 'string') return 'AT';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AT';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const computeAvatarColor = (name = '', index = 0) => {
  if (typeof index === 'number' && index >= 0) {
    return AVATAR_PALETTE[index % AVATAR_PALETTE.length];
  }
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

/**
 * Get all Challenges with computed metadata (Athletes count, days remaining, etc.)
 */
const getChallengesService = async (query = {}) => {
  const filter = {};
  if (query.status && query.status !== 'all') {
    filter.status = query.status;
  }
  if (query.category) {
    filter.category = query.category.toLowerCase();
  }
  if (query.difficulty) {
    filter.difficulty = query.difficulty.toLowerCase();
  }
  if (query.search) {
    filter.title = { $regex: query.search, $options: 'i' };
  }

  const challenges = await Challenge.find(filter)
    .sort({ createdAt: -1 })
    .populate('assignedAthletes', 'fullName image');

  return challenges.map((ch) => {
    const athletes = (ch.assignedAthletes || []).filter(Boolean);
    return {
      _id: ch._id,
      icon: ch.icon,
      title: ch.title,
      difficulty: ch.difficulty,
      description: ch.description,
      athletesCount: athletes.length,
      startDate: ch.startDate,
      endDate: ch.endDate,
      xpGoal: ch.xpGoal,
      assignedAthletes: athletes.map((ath, idx) => ({
        _id: ath._id,
        fullName: ath.fullName,
        image: ath.image,
        avatarInitials: computeAvatarInitials(ath.fullName),
        avatarColor: computeAvatarColor(ath.fullName, idx),
      })),
    };
  });
};

/**
 * Get Challenge Details with Participants, Leaderboard, Activities Progress
 * Supports Manage Challenge step (Figma nodes 33384:4219, 33384:5212, 33384:5694, 33384:6692)
 */
const getChallengeByIdService = async (challengeId) => {
  if (!mongoose.Types.ObjectId.isValid(challengeId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid challenge ID format.');
  }

  const challenge = await Challenge.findById(challengeId);
  if (!challenge) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Challenge not found.');
  }

  // Fetch participants enrolled in this challenge
  const participants = await ChallengeParticipant.find({ challenge: challenge._id })
    .populate('athlete', 'fullName image');

  const now = new Date();
  const end = new Date(challenge.endDate);
  const start = new Date(challenge.startDate);
  const diffTime = end.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const activeDiff = now.getTime() - start.getTime();
  const daysActive = Math.max(0, Math.ceil(activeDiff / (1000 * 60 * 60 * 24)));

  // Calculate activities summary & completion % (Figma #33384:4219 & #33384:5212)
  const totalParticipants = participants.length;
  const activitiesWithProgress = challenge.activities.map((act) => {
    let completedCount = 0;
    participants.forEach((p) => {
      const isDone = p.completedActivities?.some(
        (ca) => ca.activityTitle.toLowerCase() === act.title.toLowerCase()
      );
      if (isDone) completedCount++;
    });

    const completionPercentage = totalParticipants > 0 ? Math.round((completedCount / totalParticipants) * 100) : 0;

    return {
      _id: act._id,
      title: act.title,
      description: act.description,
      category: act.category,
      xpReward: act.xpReward,
      completionPercentage,
    };
  });

  const totalAvailableXp = challenge.activities.reduce((sum, act) => sum + (act.xpReward || 0), 0);

  // Participants Tab list (Figma #33384:5694)
  const participantsList = participants.map((p, index) => {
    const ath = p.athlete || {};
    const progressPercentage = challenge.xpGoal > 0 ? Math.min(100, Math.round((p.earnedXp / challenge.xpGoal) * 100)) : 0;
    return {
      athlete: {
        _id: ath._id,
        fullName: ath.fullName,
        image: ath.image,
        avatarInitials: computeAvatarInitials(ath.fullName),
        avatarColor: computeAvatarColor(ath.fullName, index),
      },
      earnedXp: p.earnedXp,
      xpGoal: challenge.xpGoal,
      progressPercentage,
    };
  });

  // Leaderboard Tab ranked list (Figma #33384:6692)
  const sortedParticipants = [...participants].sort((a, b) => b.earnedXp - a.earnedXp);
  const leaderboardList = sortedParticipants.map((p, index) => {
    let medal = `${index + 1}`;
    if (index === 0) medal = '🥇';
    else if (index === 1) medal = '🥈';
    else if (index === 2) medal = '🥉';

    const progressPercentage = challenge.xpGoal > 0 ? Math.min(100, Math.round((p.earnedXp / challenge.xpGoal) * 100)) : 0;
    const ath = p.athlete || {};

    return {
      rank: index + 1,
      medal,
      athlete: {
        _id: ath._id,
        fullName: ath.fullName,
        image: ath.image,
        avatarInitials: computeAvatarInitials(ath.fullName),
        avatarColor: computeAvatarColor(ath.fullName, index),
      },
      earnedXp: p.earnedXp,
      xpGoal: challenge.xpGoal,
      progressPercentage,
    };
  });

  return {
    challenge: {
      _id: challenge._id,
      icon: challenge.icon,
      title: challenge.title,
      difficulty: challenge.difficulty,
      status: challenge.status,
      description: challenge.description,
      participantsCount: participants.length,
      xpGoal: challenge.xpGoal,
      activitiesCount: challenge.activities.length,
      daysRemaining,
      daysActive,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
      totalAvailableXp,
    },
    activities: activitiesWithProgress,
    participants: participantsList,
    leaderboard: leaderboardList,
  };
};

/**
 * Update Challenge details
 */
const updateChallengeService = async (challengeId, updateData) => {
  if (!mongoose.Types.ObjectId.isValid(challengeId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid challenge ID format.');
  }

  const challenge = await Challenge.findById(challengeId);
  if (!challenge) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Challenge not found.');
  }

  const allowedFields = [
    'title',
    'description',
    'icon',
    'category',
    'difficulty',
    'startDate',
    'endDate',
    'xpGoal',
    'status',
    'activities',
    'assignedAthletes',
  ];

  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      challenge[field] = updateData[field];
    }
  });

  await challenge.save();

  // If assignedAthletes was provided, sync ChallengeParticipant records
  if (Array.isArray(updateData.assignedAthletes)) {
    const validAthleteIds = updateData.assignedAthletes.filter((id) => mongoose.Types.ObjectId.isValid(id));
    for (const athleteId of validAthleteIds) {
      await ChallengeParticipant.findOneAndUpdate(
        { challenge: challenge._id, athlete: athleteId },
        { $setOnInsert: { earnedXp: 0, completedActivities: [], isGoalReached: false } },
        { upsert: true, new: true }
      );
    }
  }

  return await getChallengeByIdService(challenge._id);
};

/**
 * Delete a Challenge
 */
const deleteChallengeService = async (challengeId) => {
  if (!mongoose.Types.ObjectId.isValid(challengeId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid challenge ID format.');
  }

  const challenge = await Challenge.findByIdAndDelete(challengeId);
  if (!challenge) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Challenge not found.');
  }

  await ChallengeParticipant.deleteMany({ challenge: challengeId });
  return { id: challengeId, deleted: true };
};

/**
 * Add a single activity to an existing Challenge
 */
const addActivityToChallengeService = async (challengeId, activityData) => {
  if (!mongoose.Types.ObjectId.isValid(challengeId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid challenge ID format.');
  }

  const challenge = await Challenge.findById(challengeId);
  if (!challenge) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Challenge not found.');
  }

  const newActivity = {
    title: activityData.title || 'New Activity',
    description: activityData.description || '',
    xpReward: Number(activityData.xpReward) || 50,
    category: (activityData.category || 'mindset').toLowerCase(),
    // isRequired: Boolean(activityData.isRequired),
  };

  challenge.activities.push(newActivity);
  await challenge.save();

  return challenge.activities;
};

/**
 * Remove an activity from a Challenge
 */
const deleteActivityFromChallengeService = async (challengeId, activityId) => {
  if (!mongoose.Types.ObjectId.isValid(challengeId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid challenge ID format.');
  }

  const challenge = await Challenge.findById(challengeId);
  if (!challenge) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Challenge not found.');
  }

  challenge.activities = challenge.activities.filter(
    (act) => act._id.toString() !== activityId && act.title !== activityId
  );

  await challenge.save();
  return challenge.activities;
};

/**
 * Add an Athlete participant to a Challenge
 */
const addParticipantToChallengeService = async (challengeId, athleteId) => {
  if (!mongoose.Types.ObjectId.isValid(challengeId) || !mongoose.Types.ObjectId.isValid(athleteId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid challenge ID or athlete ID.');
  }

  const challenge = await Challenge.findById(challengeId);
  if (!challenge) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Challenge not found.');
  }

  const athlete = await User.findById(athleteId);
  if (!athlete) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Athlete not found.');
  }

  // Add to challenge assignedAthletes if not already there
  const alreadyAssigned = challenge.assignedAthletes.some((id) => id.toString() === athleteId.toString());
  if (!alreadyAssigned) {
    challenge.assignedAthletes.push(athleteId);
    await challenge.save();
  }

  // Create or return participant record
  const participant = await ChallengeParticipant.findOneAndUpdate(
    { challenge: challengeId, athlete: athleteId },
    { $setOnInsert: { earnedXp: 0, completedActivities: [], isGoalReached: false } },
    { upsert: true, new: true }
  ).populate('athlete', 'fullName email image position currentClub xp');

  return participant;
};

/**
 * Remove an Athlete participant from a Challenge
 */
const removeParticipantFromChallengeService = async (challengeId, athleteId) => {
  if (!mongoose.Types.ObjectId.isValid(challengeId) || !mongoose.Types.ObjectId.isValid(athleteId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid challenge ID or athlete ID.');
  }

  const challenge = await Challenge.findById(challengeId);
  if (!challenge) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Challenge not found.');
  }

  challenge.assignedAthletes = challenge.assignedAthletes.filter(
    (id) => id.toString() !== athleteId.toString()
  );
  await challenge.save();

  await ChallengeParticipant.findOneAndDelete({ challenge: challengeId, athlete: athleteId });
  return { challengeId, athleteId, removed: true };
};

/**
 * Award XP to an athlete for a Challenge
 * Used by the "Award XP" action in Manage Challenge
 */
const awardXpService = async (challengeId, { athleteId, xpAmount, activityTitle = '' }) => {
  if (!mongoose.Types.ObjectId.isValid(challengeId) || !mongoose.Types.ObjectId.isValid(athleteId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid challenge ID or athlete ID.');
  }

  const numericXp = Number(xpAmount);
  if (isNaN(numericXp) || numericXp <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'XP amount must be a positive number.');
  }

  const challenge = await Challenge.findById(challengeId);
  if (!challenge) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Challenge not found.');
  }

  let participant = await ChallengeParticipant.findOne({ challenge: challengeId, athlete: athleteId });
  if (!participant) {
    participant = new ChallengeParticipant({
      challenge: challengeId,
      athlete: athleteId,
      earnedXp: 0,
      completedActivities: [],
    });
  }

  participant.earnedXp += numericXp;

  if (activityTitle && activityTitle.trim()) {
    participant.completedActivities.push({
      activityTitle: activityTitle.trim(),
      xpEarned: numericXp,
      completedAt: new Date(),
    });
  }

  if (participant.earnedXp >= challenge.xpGoal && !participant.isGoalReached) {
    participant.isGoalReached = true;
    participant.completedAt = new Date();
  }

  await participant.save();

  // Also update athlete user total XP
  await User.findByIdAndUpdate(athleteId, {
    $inc: { xp: numericXp },
  });

  return await getChallengeByIdService(challengeId);
};

/**
 * Unified Community Challenges Page Overview (Figma node 33299:22507)
 * Returns top metrics (Active challenges, participants, XP this month) + list of challenges
 */
const getCommunityChallengesOverviewService = async (query = {}) => {
  const stats = await getChallengeOverviewStatsService();
  const challenges = await getChallengesService(query);
  return {
    stats,
    challenges,
  };
};

module.exports = {
  getChallengeOverviewStatsService,
  getCommunityChallengesOverviewService,
  createChallengeService,
  getChallengesService,
  getChallengeByIdService,
  updateChallengeService,
  deleteChallengeService,
  addActivityToChallengeService,
  deleteActivityFromChallengeService,
  addParticipantToChallengeService,
  removeParticipantFromChallengeService,
  awardXpService,
};
