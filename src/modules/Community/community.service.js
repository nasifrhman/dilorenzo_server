const mongoose = require('mongoose');
const httpStatus = require('http-status').default;
const ApiError = require('../../helpers/ApiError');
const CommunityPost = require('./communityPost.model');
const Challenge = require('../Challenge/challenge.model');
const ChallengeParticipant = require('../Challenge/challengeParticipant.model');
const Group = require('../Group/group.model');
const User = require('../User/user.model');

// Helper to format relative time ago
const formatTimeAgo = (date) => {
  if (!date) return 'just now';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${Math.max(1, seconds)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

/**
 * 1. Community Feed API (Figma Node 32823:8977)
 * List mindset win posts with optional category filter
 */
const getCommunityFeedService = async ({ category, page = 1, limit = 20, athleteId = null }) => {

  const filter = { status: 'active' };
  if (category && category.toLowerCase() !== 'all') {
    filter.category = new RegExp(`^${category}$`, 'i');
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [posts, total] = await Promise.all([
    CommunityPost.find(filter)
      .populate('author', 'fullName currentClub image role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    CommunityPost.countDocuments(filter),
  ]);

  const targetAthleteId = athleteId ? athleteId.toString() : null;

  const formattedPosts = posts.map((post) => {
    const isLiked = targetAthleteId
      ? Array.isArray(post.likes) && post.likes.some((id) => (id?._id ? id._id.toString() : id?.toString()) === targetAthleteId)
      : false;

    return {
      id: post._id.toString(),
      _id: post._id.toString(),
      author: {
        id: post.author?._id?.toString() || '',
        _id: post.author?._id?.toString() || '',
        name: post.authorName || post.author?.fullName || '',
        image: post.author?.image || '',
      },
      category: post.category || 'Focus',
      content: post.content,
      timeAgo: formatTimeAgo(post.createdAt),
      likesCount: typeof post.likesCount === 'number' ? post.likesCount : (post.likes?.length || 0),
      isLiked,
    };
  });

  return {
    actionButtonText: '+ Share Your Mindset Win',
    posts: formattedPosts,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * Create a new Mindset Win post (Figma Node 32823:8977 "+ Share Your Mindset Win")
 */
const createCommunityPostService = async (payload, currentUserId = null) => {
  const { content, category = 'Focus', athleteId = null } = payload;
  const targetAthleteId = currentUserId || athleteId;

  if (!targetAthleteId || !mongoose.isValidObjectId(targetAthleteId)) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication token required (Bearer {{token}}).');
  }

  if (!content || !content.trim()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Post content is required.');
  }

  const athlete = await User.findById(targetAthleteId);
  if (!athlete) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Athlete not found.');
  }

  const validCategory = ['Focus', 'Resilience', 'Mindset', 'Achievement', 'General'].includes(category)
    ? category
    : 'Focus';

  const newPost = await CommunityPost.create({
    author: athlete._id,
    authorName: athlete.fullName || '',
    category: validCategory,
    content: content.trim(),
    likes: [],
    likesCount: 0,
    isMindsetWin: true,
    xpAwarded: 20,
    status: 'active',
  });

  // Award athlete 20 XP for sharing a mindset win
  athlete.xp = (athlete.xp || 0) + 20;
  await athlete.save();

  return {
    id: newPost._id.toString(),
    _id: newPost._id.toString(),
    author: {
      id: athlete._id.toString(),
      _id: athlete._id.toString(),
      name: athlete.fullName,
      image: athlete.image || '',
    },
    category: newPost.category,
    content: newPost.content,
    timeAgo: 'just now',
    likesCount: 0,
    isLiked: false,
    message: 'Mindset win shared successfully! (+20 XP)',
  };
};

/**
 * Toggle like on a Community post
 */
const toggleCommunityPostLikeService = async (postId, currentUserId = null, fallbackAthleteId = null) => {
  const targetAthleteId = currentUserId || fallbackAthleteId;
  if (!targetAthleteId || !mongoose.isValidObjectId(targetAthleteId)) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication token required (Bearer {{token}}).');
  }
  if (!postId || !mongoose.isValidObjectId(postId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Valid post ID is required.');
  }

  const post = await CommunityPost.findById(postId);
  if (!post) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Community post not found.');
  }

  const alreadyLiked = post.likes.some((id) => id.toString() === targetAthleteId.toString());

  if (alreadyLiked) {
    post.likes = post.likes.filter((id) => id.toString() !== targetAthleteId.toString());
    post.likesCount = Math.max(0, (post.likesCount || 1) - 1);
  } else {
    post.likes.push(new mongoose.Types.ObjectId(targetAthleteId));
    post.likesCount = (post.likesCount || 0) + 1;
  }

  await post.save();

  return {
    postId: post._id.toString(),
    isLiked: !alreadyLiked,
    likesCount: post.likesCount,
    message: !alreadyLiked ? 'Liked post' : 'Unliked post',
  };
};

/**
 * 2. Community Challenges API (Figma Node 32823:9296)
 * Returns active challenges, featured hero challenge, and athlete join status
 */
const getCommunityChallengesService = async (athleteId = null) => {
  // Sort challenges: active ones with isHero first, then by creation date
  const challenges = await Challenge.find({ status: 'active' }).sort({ isHero: -1, createdAt: 1 }).lean();

  const targetAthleteId = athleteId && mongoose.isValidObjectId(athleteId) ? athleteId.toString() : null;

  // Retrieve athlete's challenge participations
  const userParticipations = targetAthleteId
    ? await ChallengeParticipant.find({ athlete: targetAthleteId }).lean()
    : [];
  const joinedChallengeIds = new Set(userParticipations.map((p) => p.challenge.toString()));

  // Identify Hero Challenge
  const heroDoc = challenges.find((c) => c.isHero) || (challenges.length > 0 ? challenges[0] : null);

  let heroChallenge = null;
  if (heroDoc) {
    const dbParticipantCount = await ChallengeParticipant.countDocuments({ challenge: heroDoc._id });
    const participantsCount = dbParticipantCount || (Array.isArray(heroDoc.assignedAthletes) ? heroDoc.assignedAthletes.length : 0);
    const daysLeft = Math.max(0, Math.ceil((new Date(heroDoc.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    const isHeroJoined = targetAthleteId
      ? (joinedChallengeIds.has(heroDoc._id.toString()) || (heroDoc.assignedAthletes || []).some((id) => (id?._id ? id._id.toString() : id?.toString()) === targetAthleteId))
      : false;

    let heroRewardExtra = '';
    if (heroDoc.rewardBadge) {
      heroRewardExtra = ` · ${heroDoc.rewardBadge}`;
    } else if (heroDoc.rewardTrophy) {
      heroRewardExtra = ` · ${heroDoc.rewardTrophy}`;
    }
    const heroReward = `+${(heroDoc.xpGoal || 0).toLocaleString()} XP${heroRewardExtra}`;

    const activitiesCount = Array.isArray(heroDoc.activities) && heroDoc.activities.length > 0 ? heroDoc.activities.length : 7;
    const heroSubtitle = `${participantsCount} athlete${participantsCount === 1 ? '' : 's'} · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left · Complete ${activitiesCount} daily challenges`;

    heroChallenge = {
      _id: heroDoc._id.toString(),
      badge: '🔥 ACTIVE NOW',
      title: heroDoc.title.toUpperCase(),
      subtitle: heroSubtitle,
      reward: heroReward,
      isJoined: isHeroJoined,
    };
  }

  // Format list items
  const formattedChallenges = challenges.map((c) => {
    const daysLeft = Math.max(0, Math.ceil((new Date(c.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    const isJoined = targetAthleteId
      ? (joinedChallengeIds.has(c._id.toString()) || (c.assignedAthletes || []).some((id) => (id?._id ? id._id.toString() : id?.toString()) === targetAthleteId))
      : false;

    let rewardExtra = '';
    if (c.rewardTrophy) {
      rewardExtra = ' + Trophy';
    } else if (c.rewardBadge) {
      rewardExtra = ' + Badge';
    }
    const subtitle = `${(c.xpGoal || 0).toLocaleString()} XP${rewardExtra} · ${daysLeft}d left`;

    return {
      _id: c._id.toString(),
      icon: c.icon || '🏅',
      title: c.title,
      subtitle,
      isJoined,
    };
  });

  return {
    heroChallenge,
    challenges: formattedChallenges,
  };
};

/**
 * Join a Community Challenge (Figma Node 32823:9296 "Join Now")
 */
const joinCommunityChallengeService = async (challengeId, currentUserId = null, fallbackAthleteId = null) => {
  const targetAthleteId = currentUserId || fallbackAthleteId;
  if (!targetAthleteId || !mongoose.isValidObjectId(targetAthleteId)) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication token required (Bearer {{token}}).');
  }
  if (!challengeId || !mongoose.isValidObjectId(challengeId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Valid challenge ID is required.');
  }

  const [athlete, challenge] = await Promise.all([
    User.findById(targetAthleteId),
    Challenge.findById(challengeId),
  ]);

  if (!athlete) throw new ApiError(httpStatus.NOT_FOUND, 'Athlete not found.');
  if (!challenge) throw new ApiError(httpStatus.NOT_FOUND, 'Challenge not found.');

  // Create or retrieve participant
  let participant = await ChallengeParticipant.findOne({ challenge: challenge._id, athlete: athlete._id });
  if (!participant) {
    participant = await ChallengeParticipant.create({
      challenge: challenge._id,
      athlete: athlete._id,
      earnedXp: 0,
      completedActivities: [],
      isGoalReached: false,
    });
  }

  // Ensure athlete in assignedAthletes
  if (!challenge.assignedAthletes.includes(athlete._id)) {
    challenge.assignedAthletes.push(athlete._id);
    await challenge.save();
  }

  return {
    challengeId: challenge._id.toString(),
    title: challenge.title,
    isJoined: true,
    message: `Successfully joined ${challenge.title}!`,
  };
};

/**
 * 3. Community Teams API (Figma Node 32827:9607)
 * Team Leaderboard filtered strictly to teams created by the login user or where the login user is an athlete
 */
const getCommunityTeamsService = async (athleteId = null) => {
  const targetAthleteId = athleteId && mongoose.isValidObjectId(athleteId) ? athleteId.toString() : null;

  if (!targetAthleteId) {
    return {
      title: 'Team Leaderboard',
      actionButtonText: '+ Create or Join a Team',
      leaderboard: [],
    };
  }

  const filter = {
    type: 'team',
    isActive: true,
    $or: [
      { createdBy: targetAthleteId },
      { athletes: targetAthleteId },
    ],
  };

  const teams = await Group.find(filter)
    .populate('athletes', 'fullName xp')
    .lean();

  // Calculate dynamic total XP and members count for each team based on its members
  const teamsWithScores = teams.map((team) => {
    const athletes = Array.isArray(team.athletes) ? team.athletes : [];
    const membersCount = athletes.length;
    // Calculate total XP as sum of member athlete XPs
    const membersXpSum = athletes.reduce((sum, a) => sum + (typeof a?.xp === 'number' ? a.xp : 0), 0);
    const totalXp = Math.max(team.totalXp || 0, membersXpSum);

    const isMyTeam = athletes.some((a) => (a?._id ? a._id.toString() : a?.toString()) === targetAthleteId);

    return {
      _id: team._id.toString(),
      name: team.name,
      description: team.description || '',
      membersCount,
      totalXp,
      isMyTeam,
    };
  });

  // Sort descending by totalXp, then by membersCount
  teamsWithScores.sort((a, b) => b.totalXp - a.totalXp || b.membersCount - a.membersCount);

  // Assign ranks
  const leaderboard = teamsWithScores.map((t, idx) => ({
    rank: idx + 1,
    _id: t._id,
    name: t.name,
    membersCount: t.membersCount,
    totalXp: t.totalXp,
    isMyTeam: t.isMyTeam,
  }));

  return {
    title: 'Team Leaderboard',
    actionButtonText: '+ Create or Join a Team',
    leaderboard,
  };
};

/**
 * Create a new Community Team (Figma Node 32827:9607 "+ Create or Join a Team")
 */
const createCommunityTeamService = async (payload, currentUserId = null) => {
  const { name, description = '', athleteId = null } = payload;
  const targetAthleteId = currentUserId || athleteId;

  if (!targetAthleteId || !mongoose.isValidObjectId(targetAthleteId)) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication token required (Bearer {{token}}).');
  }

  if (!name || !name.trim()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Team name is required.');
  }

  const existingTeam = await Group.findOne({ name: name.trim(), type: 'team' });
  if (existingTeam) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'A team with this name already exists.');
  }

  const creatorUser = targetAthleteId && mongoose.isValidObjectId(targetAthleteId)
    ? await User.findById(targetAthleteId)
    : null;

  const athletesList = creatorUser ? [creatorUser._id] : [];
  const initialXp = creatorUser?.xp || 0;

  const newTeam = await Group.create({
    name: name.trim(),
    description: description.trim(),
    type: 'team',
    athletes: athletesList,
    totalXp: initialXp,
    rank: 0,
    isActive: true,
    createdBy: creatorUser?._id || null,
  });

  return {
    _id: newTeam._id.toString(),
    name: newTeam.name,
    membersCount: newTeam.athletes.length,
    totalXp: newTeam.totalXp,
    isMyTeam: true,
    message: `Team "${newTeam.name}" created successfully!`,
  };
};

/**
 * Join an existing Community Team
 */
const joinCommunityTeamService = async (teamId, currentUserId = null, fallbackAthleteId = null) => {
  const targetAthleteId = currentUserId || fallbackAthleteId;
  if (!targetAthleteId || !mongoose.isValidObjectId(targetAthleteId)) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication token required (Bearer {{token}}).');
  }
  if (!teamId || !mongoose.isValidObjectId(teamId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Valid team ID is required.');
  }

  const [athlete, team] = await Promise.all([
    User.findById(targetAthleteId),
    Group.findById(teamId),
  ]);

  if (!athlete) throw new ApiError(httpStatus.NOT_FOUND, 'Athlete not found.');
  if (!team || team.type !== 'team') throw new ApiError(httpStatus.NOT_FOUND, 'Team not found.');

  // Check if already in this team
  const alreadyMember = team.athletes.some((id) => id.toString() === athlete._id.toString());
  if (!alreadyMember) {
    team.athletes.push(athlete._id);
    team.totalXp = (team.totalXp || 0) + (athlete.xp || 0);
    await team.save();
  }

  return {
    teamId: team._id.toString(),
    name: team.name,
    isMember: true,
    membersCount: team.athletes.length,
    message: `Successfully joined ${team.name}!`,
  };
};

/**
 * Combined Community Overview API (for all 3 tabs)
 */
const getCommunityOverviewService = async (athleteId = null) => {
  const [feedData, challengesData, teamsData] = await Promise.all([
    getCommunityFeedService({ page: 1, limit: 10, athleteId }),
    getCommunityChallengesService(athleteId),
    getCommunityTeamsService(athleteId),
  ]);

  return {
    title: 'COMMUNITY',
    subtitle: 'Connect · inspire · grow together',
    tabs: [
      { key: 'feed', label: '📰 Feed' },
      { key: 'challenges', label: '🏅 Challenges' },
      { key: 'teams', label: '👥 Teams' },
    ],
    feed: feedData,
    challenges: challengesData,
    teams: teamsData,
  };
};

module.exports = {
  getCommunityOverviewService,
  getCommunityFeedService,
  createCommunityPostService,
  toggleCommunityPostLikeService,
  getCommunityChallengesService,
  joinCommunityChallengeService,
  getCommunityTeamsService,
  createCommunityTeamService,
  joinCommunityTeamService,
};
