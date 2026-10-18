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
 * Seed initial Community Feed posts if none exist
 * Matches Figma node 32823:8977
 */
const ensureInitialFeedPosts = async () => {
  const count = await CommunityPost.countDocuments();
  if (count > 0) return;

  const sampleUsers = await User.find({ role: 'athlete', isDeleted: false }).limit(4).lean();
  const fallbackAuthor = sampleUsers[0]?._id || new mongoose.Types.ObjectId();

  const now = Date.now();
  const initialPosts = [
    {
      author: sampleUsers[0]?._id || fallbackAuthor,
      authorName: 'Jordan K.',
      authorEmoji: '🏆',
      category: 'Focus',
      content: 'Just crushed my focus ritual before training. Feeling locked in! 🎯',
      likesCount: 24,
      createdAt: new Date(now - 2 * 60 * 1000), // 2m ago
    },
    {
      author: sampleUsers[1]?._id || fallbackAuthor,
      authorName: 'Amara D.',
      authorEmoji: '⚽',
      category: 'Resilience',
      content: 'Day 18 of my streak! Mental training is changing how I handle pressure. Who else is grinding?',
      likesCount: 41,
      createdAt: new Date(now - 15 * 60 * 1000), // 15m ago
    },
    {
      author: sampleUsers[2]?._id || fallbackAuthor,
      authorName: 'Marcus F.',
      authorEmoji: '🔥',
      category: 'Mindset',
      content: 'Completed the Resilience Reset drill 3 days in a row. My coach noticed I\'m calmer in tight games.',
      likesCount: 33,
      createdAt: new Date(now - 60 * 60 * 1000), // 1h ago
    },
    {
      author: sampleUsers[3]?._id || fallbackAuthor,
      authorName: 'Priya S.',
      authorEmoji: '🌟',
      category: 'Achievement',
      content: 'Hit 2,000 XP milestone today! The consistency is paying off. Don\'t give up, fam 💪',
      likesCount: 33,
      createdAt: new Date(now - 2 * 60 * 60 * 1000), // 2h ago
    },
  ];

  await CommunityPost.insertMany(initialPosts);
};

/**
 * Seed initial Community Challenges if needed
 * Matches Figma node 32823:9296
 */
const ensureInitialChallenges = async () => {
  const existingCount = await Challenge.countDocuments();
  if (existingCount >= 3) return;

  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  const sixDaysLater = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);

  const initialChallenges = [
    {
      title: 'Mental Toughness Week',
      description: 'Complete 7 daily challenges and build unstoppable mental fortitude under high game pressure.',
      icon: '🏆',
      category: 'resilience',
      difficulty: 'elite',
      startDate: now,
      endDate: threeDaysLater,
      xpGoal: 2000,
      rewardBadge: 'Exclusive Badge',
      isHero: true,
      status: 'active',
      activities: [
        { title: 'Morning Mindset Primer', xpReward: 250, category: 'mindset' },
        { title: 'Pre-Game 4-7-8 Breathing Protocol', xpReward: 250, category: 'resilience' },
        { title: 'In-Game Goldfish Mistake Reset', xpReward: 300, category: 'focus' },
      ],
    },
    {
      title: 'Focus Sprint',
      description: '15-minute high intensity visual scanning and situational awareness sprint.',
      icon: '⚡',
      category: 'mental',
      difficulty: 'medium',
      startDate: now,
      endDate: oneDayLater,
      xpGoal: 500,
      rewardBadge: '',
      isHero: false,
      status: 'active',
      activities: [
        { title: 'Blindspot Scanning Drill', xpReward: 250, category: 'focus' },
        { title: 'Vision Decision Matrix', xpReward: 250, category: 'technical' },
      ],
    },
    {
      title: 'Resilience Cup',
      description: 'Squad tournament for composure, mistake bounce-backs, and clutch decision making.',
      icon: '🏆',
      category: 'resilience',
      difficulty: 'hard',
      startDate: now,
      endDate: sixDaysLater,
      xpGoal: 1000,
      rewardTrophy: 'Resilience Trophy',
      rewardBadge: 'Resilience Cup Badge',
      isHero: false,
      status: 'active',
      activities: [
        { title: 'High-Pressure Scrimmage Composure', xpReward: 500, category: 'resilience' },
        { title: 'Post-Match Mentality Reflection', xpReward: 500, category: 'mindset' },
      ],
    },
  ];

  for (const item of initialChallenges) {
    const exists = await Challenge.findOne({ title: { $regex: new RegExp(`^${item.title}$`, 'i') } });
    if (!exists) {
      await Challenge.create(item);
    }
  }
};

/**
 * Seed initial Community Teams if needed
 * Matches Figma node 32827:9607
 */
const ensureInitialTeams = async () => {
  const existingCount = await Group.countDocuments({ type: 'team' });
  if (existingCount >= 4) return;

  const sampleAthletes = await User.find({ role: 'athlete', isDeleted: false }).limit(10).select('_id').lean();
  const athleteIds = sampleAthletes.map((a) => a._id);

  const initialTeams = [
    {
      name: 'Thunder FC',
      description: 'High-intensity mental training squad pushing for elite academy contracts.',
      type: 'team',
      totalXp: 48200,
      rank: 1,
      athletes: athleteIds.slice(0, 6),
      isActive: true,
    },
    {
      name: 'Elite Minds',
      description: 'Composure and resilience specialists mastering game pressure.',
      type: 'team',
      totalXp: 41600,
      rank: 2,
      athletes: athleteIds.slice(2, 7),
      isActive: true,
    },
    {
      name: 'Focus Squad',
      description: 'Dedicated to visual scanning, tactical anticipation, and pre-match focus.',
      type: 'team',
      totalXp: 38900,
      rank: 3,
      athletes: athleteIds.slice(4, 8),
      isActive: true,
    },
    {
      name: 'Iron Will',
      description: 'Grinders building physical grit and bulletproof mental toughness.',
      type: 'team',
      totalXp: 29400,
      rank: 4,
      athletes: athleteIds.slice(6, 10),
      isActive: true,
    },
  ];

  for (const team of initialTeams) {
    const exists = await Group.findOne({ name: team.name, type: 'team' });
    if (!exists) {
      await Group.create(team);
    }
  }
};

/**
 * 1. Community Feed API (Figma Node 32823:8977)
 * List mindset win posts with optional category filter
 */
const getCommunityFeedService = async ({ category, page = 1, limit = 20, athleteId = null }) => {
  await ensureInitialFeedPosts();

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
    authorName: athlete.fullName || 'Athlete',
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
  console.log({athleteId})
  await ensureInitialChallenges();

  const challenges = await Challenge.find({ status: 'active' }).sort({ createdAt: -1 }).lean();

  const targetAthleteId = athleteId && mongoose.isValidObjectId(athleteId) ? athleteId.toString() : null;

  // Retrieve athlete's challenge participations
  const userParticipations = targetAthleteId
    ? await ChallengeParticipant.find({ athlete: targetAthleteId }).lean()
    : [];
  const joinedChallengeIds = new Set(userParticipations.map((p) => p.challenge.toString()));

  const formattedChallenges = await Promise.all(
    challenges.map(async (c) => {
      const dbParticipantCount = await ChallengeParticipant.countDocuments({ challenge: c._id });
      const participantsCount = dbParticipantCount || (Array.isArray(c.assignedAthletes) ? c.assignedAthletes.length : 0);

      const daysLeft = Math.max(0, Math.ceil((new Date(c.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      const isJoined = targetAthleteId
        ? (joinedChallengeIds.has(c._id.toString()) || (c.assignedAthletes || []).some((id) => (id?._id ? id._id.toString() : id?.toString()) === targetAthleteId))
        : false;

      let rewardDisplay = `${(c.xpGoal || 0).toLocaleString()} XP`;
      if (c.rewardTrophy) {
        rewardDisplay += ` + Trophy · ${daysLeft}d left`;
      } else if (c.rewardBadge) {
        rewardDisplay += ` + Badge · ${daysLeft}d left`;
      } else {
        rewardDisplay += ` · ${daysLeft}d left`;
      }

      return {
        id: c._id.toString(),
        _id: c._id.toString(),
        title: c.title,
        description: c.description || '',
        category: c.category || 'mental',
        difficulty: c.difficulty || 'medium',
        xpReward: typeof c.xpGoal === 'number' ? c.xpGoal : 0,
        rewardDisplay,
        rewardBadge: c.rewardBadge || '',
        rewardTrophy: c.rewardTrophy || '',
        daysLeft,
        participantsCount,
        isJoined,
        isHero: Boolean(c.isHero),
        status: c.status,
      };
    })
  );

  // Identify Hero Challenge: Strictly the most newly created active challenge (সর্বোচ্চ নতুন অ্যাক্টিভ চ্যালেঞ্জ)
  const heroChallenge = formattedChallenges.length > 0 ? formattedChallenges[0] : null;

  const heroData = heroChallenge
    ? {
        id: heroChallenge.id,
        _id: heroChallenge.id,
        badgeLabel: '🔥 Active Now',
        title: heroChallenge.title.toUpperCase(),
        statsDisplay: `${heroChallenge.participantsCount} athletes · ${heroChallenge.daysLeft} days left · Complete 7 daily challenges`,
        participantsCount: heroChallenge.participantsCount,
        daysLeft: heroChallenge.daysLeft,
        duration: 'Complete 7 daily challenges',
        xpReward: heroChallenge.xpReward,
        rewardDisplay: `+${heroChallenge.xpReward.toLocaleString()} XP · ${heroChallenge.rewardBadge || heroChallenge.rewardTrophy || 'Exclusive Badge'}`,
        rewardBadge: heroChallenge.rewardBadge || '',
        rewardTrophy: heroChallenge.rewardTrophy || '',
        isJoined: heroChallenge.isJoined,
        isHero: true,
        status: heroChallenge.status,
      }
    : null;

  const challengesWithHeroFlag = formattedChallenges.map((c, index) => ({
    ...c,
    isHero: index === 0,
  }));

  return {
    heroChallenge: heroData,
    challenges: challengesWithHeroFlag,
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
 * Team Leaderboard ranked by XP and team membership details
 */
const getCommunityTeamsService = async (athleteId = null) => {
  const teams = await Group.find({ type: 'team', isActive: true })
    .populate('athletes', 'fullName xp')
    .sort({ totalXp: -1 })
    .lean();

  const targetAthleteId = athleteId && mongoose.isValidObjectId(athleteId) ? athleteId.toString() : null;

  const leaderboard = teams.map((team, index) => {
    const rank = index + 1;
    const membersCount = Array.isArray(team.athletes) ? team.athletes.length : 0;
    const totalXp = typeof team.totalXp === 'number' ? team.totalXp : 0;

    const isMyTeam = targetAthleteId
      ? Array.isArray(team.athletes) && team.athletes.some((a) => (a?._id ? a._id.toString() : a?.toString()) === targetAthleteId)
      : false;

    return {
      rank,
      id: team._id.toString(),
      _id: team._id.toString(),
      name: team.name,
      membersCount,
      totalXp,
      isMyTeam,
    };
  });

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
    id: newTeam._id.toString(),
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
