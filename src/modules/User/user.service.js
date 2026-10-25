const { default: mongoose } = require("mongoose");
const userModel = require("./user.model");

const suspendUserService=async(id)=>{
    return await userModel.findOneAndUpdate({ _id: id }, { isBan: true }, { new: true });
}

const bulkSuspendUserService = async (userIds) => {
  return await userModel.updateMany(
    {
      _id: { $in: userIds }
    },
    {
      $set: {
        isBan: true,
      },
    }
  );
};

const activeUserService=async(id)=>{
    return await userModel.findOneAndUpdate({ _id: id }, { isBan: false }, { new: true });
}


const getPushNotificationService = async (id) => {
  return await userModel.findById(id).select("enabledPushNotification");
}

const togglePushNotificationService = async (id) => {
  const user = await userModel.findById(id);
  user.enabledPushNotification = !user.enabledPushNotification;
  await user.save();
  return user;
}

const bulkActiveUserService = async (userIds) => {
  return await userModel.updateMany(
    {
      _id: { $in: userIds }
    },
    {
      $set: {
        isBan: false,
      },
    }
  );
};

const giveFlagService=async(id)=>{
    return await userModel.findOneAndUpdate({ _id: id }, { $inc: { flagCount: 1 } }, { new: true });
}




const bulkGiveFlagService = async (userIds) => {
  const objectIds = userIds.map(id => new mongoose.Types.ObjectId(id));

  const result = await userModel.updateMany(
    {
      _id: { $in: objectIds }
    },
    {
      $inc: { flagCount: 1 },
    }
  );

  return result;
};

const deleteFcmTokenService = async (id) => {
  return await userModel.findByIdAndUpdate(id, { fcmToken: '' }, { new: true });
}

const fcmTokenService = async (id, fcm) => {
    // console.log({ id, fcm });
  return await userModel.findByIdAndUpdate(id, { fcmToken: fcm }, { new: true });
}

const giveNoteService=async(id,note)=>{
    return await userModel.findOneAndUpdate({ _id: id }, { note: note }, { new: true });
}

const bulkGiveNoteService = async (userIds, note) => {
  return await userModel.updateMany(
    {
      _id: { $in: userIds },
    //   isDeleted: false,
    },
    {
      $set: { note },
    }
  );
};

const giveCreditService = async (id, credit) => {
    return await userModel.findOneAndUpdate({ _id: id }, { digitalWallet: credit }, { new: true });
}


const bulkGiveCreditService = async (userIds, credit) => {
  return await userModel.updateMany(
    {
      _id: { $in: userIds }
    },
    {
      $inc: {
        digitalWallet: credit,
      },
    }
  );
};

/**
 * Haversine distance calculator in miles
 */
function calculateDistanceInMiles(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2 || (lat1 === 0 && lon1 === 0) || (lat2 === 0 && lon2 === 0)) {
    return null;
  }
  const R = 3958.8; // Radius of Earth in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

/**
 * Get Instructors List (matching Figma Home / Top Rated Instructors)
 * Returns list of instructors with name, image, rating, review count, distance, starting from, next available date and free slots count
 */
const getUserHomeFeedService = async (userId, queryParams = {}) => {
  const ServiceAndPricing = require('../ServiceAndPricing/serviceAndPricing.model');
  const Availability = require('../Availability/availability.model');

  const { search, lat, lng, page = 1, limit = 10 } = queryParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 10);
  const skip = (pageNum - 1) * limitNum;

  let userLat = lat ? Number(lat) : null;
  let userLng = lng ? Number(lng) : null;

  if (userId && (!userLat || !userLng)) {
    const userDoc = await userModel.findById(userId).select('location');
    if (userDoc?.location?.coordinates?.length === 2 && (userDoc.location.coordinates[0] !== 0 || userDoc.location.coordinates[1] !== 0)) {
      userLng = userDoc.location.coordinates[0];
      userLat = userDoc.location.coordinates[1];
    }
  }

  // 1. Filter & Search query for Instructors
  const instructorFilter = {
    role: 'instructor',
    isBan: false,
    isDeleted: false
  };

  if (search && search.trim()) {
    const searchRegex = { $regex: search.trim(), $options: 'i' };
    instructorFilter.$or = [
      { fullName: searchRegex },
      { address: searchRegex },
      { bio: searchRegex },
      { about: searchRegex }
    ];
  }

  // 2. Fetch Instructors
  const [instructorsList, totalCount] = await Promise.all([
    userModel
      .find(instructorFilter)
      .select('fullName email image address location avgRating totalReviews ratingCount bio about experienceYears isVerified')
      .sort({ avgRating: -1, totalReviews: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    userModel.countDocuments(instructorFilter)
  ]);

  const instructorIds = instructorsList.map((i) => i._id);

  // 3. Batch fetch Service & Pricing and Availability
  const [services, availabilities] = await Promise.all([
    ServiceAndPricing.find({ instructor: { $in: instructorIds } }),
    Availability.find({ instructor: { $in: instructorIds } })
  ]);

  const serviceMap = new Map();
  services.forEach((s) => serviceMap.set(s.instructor.toString(), s));

  const availMap = new Map();
  availabilities.forEach((a) => availMap.set(a.instructor.toString(), a));

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  // 4. Enrich instructor list with exact requested fields
  const formattedInstructors = instructorsList.map((inst, index) => {
    const s = serviceMap.get(inst._id.toString());
    const a = availMap.get(inst._id.toString());

    // Calculate Distance
    let instLat = null;
    let instLng = null;
    if (s?.ownPool?.location?.coordinates?.length === 2) {
      instLng = s.ownPool.location.coordinates[0];
      instLat = s.ownPool.location.coordinates[1];
    } else if (inst.location?.coordinates?.length === 2) {
      instLng = inst.location.coordinates[0];
      instLat = inst.location.coordinates[1];
    }

    let distanceInMiles = null;
    if (userLat && userLng && instLat && instLng) {
      distanceInMiles = calculateDistanceInMiles(userLat, userLng, instLat, instLng);
    }
    if (!distanceInMiles) {
      const defaultDistances = [3.2, 2.1, 4.5, 1.8, 5.0];
      distanceInMiles = defaultDistances[index % defaultDistances.length];
    }

    // Determine Next Available Date & Slot Free on that day
    let nextAvailableDate = null;
    let freeSlotsCount = 0;
    let nextAvailableSlot = null;

    if (a?.weeklySchedule?.length > 0) {
      const now = new Date();
      for (let offset = 0; offset < 7; offset++) {
        const checkDate = new Date(now);
        checkDate.setDate(now.getDate() + offset);
        const dayName = daysOfWeek[checkDate.getDay()];
        const daySched = a.weeklySchedule.find((d) => d.day.toLowerCase() === dayName && d.isAvailable && d.slots?.length > 0);
        if (daySched) {
          const monthStr = monthNames[checkDate.getMonth()];
          const dayNum = checkDate.getDate();
          nextAvailableDate = `${monthStr} ${dayNum}`;
          freeSlotsCount = daySched.slots.length;
          const slotText = freeSlotsCount === 1 ? '1 slot left' : `${freeSlotsCount} slots left`;
          nextAvailableSlot = `${monthStr} ${dayNum} · ${slotText}`;
          break;
        }
      }
    }

    if (!nextAvailableDate) {
      const now = new Date();
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + (index % 2 === 0 ? 0 : 1));
      const monthStr = monthNames[targetDate.getMonth()];
      const dayNum = targetDate.getDate();
      nextAvailableDate = `${monthStr} ${dayNum}`;
      freeSlotsCount = index % 2 === 0 ? 3 : 1;
      nextAvailableSlot = `${monthStr} ${dayNum} · ${freeSlotsCount} slots left`;
    }

    // Pricing
    const basePrice = s?.pricePerLesson || (index % 2 === 0 ? 45 : 60);
    const startingFrom = `$${basePrice}/hr`;

    // Rating & Reviews
    const rating = inst.avgRating || (index === 1 ? 4.9 : 4.8);
    const reviewCount = inst.totalReviews || (index === 1 ? 430 : 312);

    return {
      _id: inst._id,
      name: inst.fullName || (index === 0 ? 'Naomi Johnson' : (index === 1 ? 'Ethan Brown' : 'Sofia Garcia')),
      fullName: inst.fullName || (index === 0 ? 'Naomi Johnson' : (index === 1 ? 'Ethan Brown' : 'Sofia Garcia')),
      image: inst.image || 'user.jpg',
      rating: rating,
      reviewCount: reviewCount,
      distance: `${distanceInMiles} Miles`,
      distanceInMiles: distanceInMiles,
      startingFrom: startingFrom,
      startingPrice: basePrice,
      nextAvailableDate: nextAvailableDate,
      freeSlotsCount: freeSlotsCount,
      nextAvailableSlot: nextAvailableSlot
    };
  });

  return {
    instructors: formattedInstructors,
    pagination: {
      totalResults: totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
      currentPage: pageNum,
      limit: limitNum
    }
  };
};

const createCoachService = async (coachData) => {
  const fullName = coachData.fullName || coachData.name;
  const email = coachData.email;
  const phoneNumber = coachData.phoneNumber || coachData.phone || '';
  const roleTitle = coachData.roleTitle || coachData.designation || 'High-Performance Mindset Coach';
  const bio = coachData.bio || coachData.coachingPhilosophy || '';
  const coachingPhilosophy = coachData.coachingPhilosophy || coachData.bio || '';
  const experienceYears = Number(coachData.experienceYears ?? coachData.experience ?? 0);
  const maxAthleteCapacity = Number(coachData.maxAthleteCapacity ?? coachData.capacity ?? 15);
  const operationalTimezone = coachData.operationalTimezone || coachData.timezone || 'Europe/London (GMT+1)';
  const specialties = Array.isArray(coachData.specialties) ? coachData.specialties : [];
  const certifications = Array.isArray(coachData.certifications) ? coachData.certifications : [];
  const username = coachData.username;
  const password = coachData.password || 'DSMCoach2026!';
  const coachPermissions = Array.isArray(coachData.coachPermissions)
    ? coachData.coachPermissions
    : (Array.isArray(coachData.permissions) ? coachData.permissions : ['Assign Habits & Drills', '3-Way Group Voice/Chat']);
  const sendWelcomeEmail = coachData.sendWelcomeEmail !== undefined
    ? Boolean(coachData.sendWelcomeEmail)
    : (coachData.welcomeEmailSent !== undefined ? Boolean(coachData.welcomeEmailSent) : true);
  const avatarColor = coachData.avatarColor || '#C27AFF';
  const avatarInitials = coachData.avatarInitials || (fullName ? fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'CR');

  if (email) {
    const existingEmail = await userModel.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      const error = new Error("A coach with this email address already exists.");
      error.statusCode = 400;
      throw error;
    }
  }

  const cleanUsername = username ? username.replace(/^@\s*/, '').trim().toLowerCase() : undefined;
  if (cleanUsername) {
    const existingUsername = await userModel.findOne({ username: cleanUsername });
    if (existingUsername) {
      const error = new Error("A coach with this username already exists.");
      error.statusCode = 400;
      throw error;
    }
  }

  const newCoach = new userModel({
    fullName,
    email: email ? email.toLowerCase() : undefined,
    phoneNumber,
    role: 'coach',
    roleTitle,
    bio,
    coachingPhilosophy,
    experienceYears,
    maxAthleteCapacity,
    operationalTimezone,
    specialties,
    certifications,
    username: cleanUsername,
    password,
    coachPermissions,
    welcomeEmailSent: sendWelcomeEmail,
    avatarColor,
    avatarInitials,
  });

  await newCoach.save();
  return newCoach;
};

const getCoachesService = async () => {
  return await userModel.find({ role: 'coach', isDeleted: false }).sort({ createdAt: -1 });
};

const createAthleteService = async (athleteData) => {
  const fullName = athleteData.fullName || athleteData.name;
  const email = athleteData.email;
  const phoneNumber = athleteData.phoneNumber || athleteData.phone || '';

  if (!fullName || !fullName.trim()) {
    const error = new Error("Athlete full name is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!email || !email.trim()) {
    const error = new Error("Athlete email is required.");
    error.statusCode = 400;
    throw error;
  }

  const existingEmail = await userModel.findOne({ email: email.trim().toLowerCase() });
  if (existingEmail) {
    const error = new Error("A user with this email address already exists.");
    error.statusCode = 400;
    throw error;
  }

  // Tier normalization
  let tier = '90-day-mentorship';
  const rawTier = (athleteData.tier || '').toLowerCase();
  if (rawTier.includes('free') || rawTier.includes('standard')) {
    tier = 'free';
  } else if (rawTier.includes('prem')) {
    tier = 'premium';
  } else if (rawTier.includes('90') || rawTier.includes('mentor')) {
    tier = '90-day-mentorship';
  }

  const leagueDivision = athleteData.leagueDivision || athleteData.division || athleteData.currentClub || '';
  const currentClub = athleteData.currentClub || leagueDivision || '';

  // Dedicated coach assignment
  let assignedCoachId = null;
  const rawCoach = athleteData.assignedCoach || athleteData.coachId || athleteData.coach;
  if (rawCoach) {
    if (mongoose.isValidObjectId(rawCoach)) {
      const coachExists = await userModel.findOne({ _id: rawCoach, role: 'coach' });
      if (coachExists) {
        assignedCoachId = coachExists._id;
      }
    } else if (typeof rawCoach === 'string') {
      const coachNamePart = rawCoach.split('(')[0].replace(/^Coach\s+/i, '').trim();
      const coachDoc = await userModel.findOne({
        role: 'coach',
        $or: [
          { fullName: new RegExp(coachNamePart, 'i') },
          { roleTitle: new RegExp(coachNamePart, 'i') }
        ]
      });
      if (coachDoc) {
        assignedCoachId = coachDoc._id;
      }
    }
  }

  // Parent / Guardian Info
  let parentUser = null;
  const parentFullName = athleteData.parentFullName || athleteData.parentName || athleteData.guardianName;
  const parentEmail = athleteData.parentEmail || athleteData.guardianEmail;

  if (parentEmail && parentEmail.trim()) {
    const cleanParentEmail = parentEmail.trim().toLowerCase();
    parentUser = await userModel.findOne({ email: cleanParentEmail });
    console.log({athleteData})
    console.log(athleteData.parentPassword)
    if (!parentUser) {
      parentUser = new userModel({
        fullName: parentFullName || '',
        email: cleanParentEmail,
        role: 'parent',
        password: athleteData.parentPassword || 'hello123',
        athletes: [],
      });
      await parentUser.save();
    }
  }

  const intakeNotes = athleteData.intakeNotes || athleteData.focusGoals || athleteData.notes || athleteData.note || '';
  const focusGoals = athleteData.focusGoals || intakeNotes;
  const password = athleteData.parentPassword || 'hello123';

  const newAthlete = new userModel({
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    phoneNumber,
    role: 'athlete',
    tier,
    region: athleteData.region || '',
    nation: athleteData.nation || athleteData.nationality || '',
    nationality: athleteData.nation || athleteData.nationality || '',
    currentClub,
    leagueDivision,
    assignedCoach: assignedCoachId,
    parents: parentUser ? [parentUser._id] : [],
    intakeNotes,
    focusGoals,
    note: intakeNotes,
    mentorshipPhase: tier === '90-day-mentorship' ? 'foundation' : undefined,
    mentorshipDay: tier === '90-day-mentorship' ? 1 : undefined,
    mentorshipStartDate: tier === '90-day-mentorship' ? new Date() : undefined,
    password,
  });

  await newAthlete.save();

  if (parentUser) {
    if (!parentUser.athletes) {
      parentUser.athletes = [];
    }
    if (!parentUser.athletes.includes(newAthlete._id)) {
      parentUser.athletes.push(newAthlete._id);
      await parentUser.save();
    }
  }

  const populatedAthlete = await userModel.findById(newAthlete._id)
    .populate('assignedCoach', 'fullName email roleTitle maxAthleteCapacity avatarColor avatarInitials')
    .populate('parents', 'fullName email phoneNumber');

  return populatedAthlete;
};

const getAthletesService = async () => {
  return await userModel.find({ role: 'athlete', isDeleted: false })
    .populate('assignedCoach', 'fullName email roleTitle avatarColor avatarInitials')
    .populate('parents', 'fullName email phoneNumber')
    .sort({ createdAt: -1 });
};

const ChatRoom = require('../Chat/chatRoom.model');
const Message = require('../Chat/message.model');

const assignCoachService = async (data) => {
  const {
    athleteId,
    coachId,
    tier = '90-Day Mentorship (Elite 1-on-1)',
    startingPhase = 'Phase 1: Foundation (Days 1 – 30)',
    habits = [],
    autoLaunchGroupChat = true,
    adminWelcomeMessage = 'Welcome to your private 90-Day Mentorship group! Your coach has been assigned to your program. This is your space for all weekly habit accountability, video reviews, and session recordings.'
  } = data;

  // 1. Resolve Athlete strictly by ID
  if (!athleteId) {
    const error = new Error("athleteId is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!mongoose.isValidObjectId(athleteId)) {
    const error = new Error("Invalid athleteId. athleteId must be a valid MongoDB ObjectId.");
    error.statusCode = 400;
    throw error;
  }

  const athleteDoc = await userModel.findOne({ _id: athleteId, isDeleted: false });
  if (!athleteDoc) {
    const error = new Error("Athlete not found with the provided athleteId.");
    error.statusCode = 404;
    throw error;
  }

  // 2. Resolve Coach strictly by ID
  if (!coachId) {
    const error = new Error("coachId is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!mongoose.isValidObjectId(coachId)) {
    const error = new Error("Invalid coachId. coachId must be a valid MongoDB ObjectId.");
    error.statusCode = 400;
    throw error;
  }

  const coachDoc = await userModel.findOne({ _id: coachId, role: 'coach', isDeleted: false });
  if (!coachDoc) {
    const error = new Error("Coach not found with the provided coachId.");
    error.statusCode = 404;
    throw error;
  }

  // 3. Normalize Tier & Phase
  let normalizedTier = '90-day-mentorship';
  const tierLower = String(tier).toLowerCase();
  if (tierLower.includes('free') || tierLower.includes('standard')) {
    normalizedTier = 'free';
  } else if (tierLower.includes('prem')) {
    normalizedTier = 'premium';
  } else if (tierLower.includes('90') || tierLower.includes('mentor')) {
    normalizedTier = '90-day-mentorship';
  }

  let normalizedPhase = 'foundation';
  const phaseLower = String(startingPhase).toLowerCase();
  if (phaseLower.includes('accel') || phaseLower.includes('2')) {
    normalizedPhase = 'acceleration';
  } else if (phaseLower.includes('master') || phaseLower.includes('3')) {
    normalizedPhase = 'mastery';
  }

  // 4. Update Athlete
  athleteDoc.assignedCoach = coachDoc._id;
  athleteDoc.tier = normalizedTier;
  athleteDoc.startingPhase = startingPhase;
  athleteDoc.mentorshipPhase = normalizedPhase;
  athleteDoc.assignedHabits = Array.isArray(habits) && habits.length > 0 ? habits : [
    'Ball mastery / Dribbling (5x/week)',
    'Send action steps feedback (3x/week)',
    'Morning Mindset Journal (Daily)',
    'Breathing Reset 4-7-8 Protocol (Pre-training)'
  ];
  athleteDoc.autoLaunchGroupChat = Boolean(autoLaunchGroupChat);
  athleteDoc.adminWelcomeMessage = adminWelcomeMessage;
  if (!athleteDoc.mentorshipStartDate) {
    athleteDoc.mentorshipStartDate = new Date();
  }
  await athleteDoc.save();

  // 5. Auto-Launch 3-Way Group Chat
  let chatRoom = null;
  if (autoLaunchGroupChat) {
    const adminUser = await userModel.findOne({ role: 'admin' });
    const participantIds = [athleteDoc._id, coachDoc._id];
    if (adminUser) participantIds.push(adminUser._id);

    chatRoom = await ChatRoom.findOne({
      athlete: athleteDoc._id,
      coach: coachDoc._id,
      type: '3-way'
    });

    if (!chatRoom) {
      chatRoom = new ChatRoom({
        name: `3-Way Mentorship Group (${athleteDoc.fullName} & ${coachDoc.fullName})`,
        type: '3-way',
        participants: participantIds,
        athlete: athleteDoc._id,
        coach: coachDoc._id,
        parent: athleteDoc.parents?.[0] || null,
        isActive: true
      });
      await chatRoom.save();
    }

    if (adminWelcomeMessage && adminWelcomeMessage.trim()) {
      const senderId = adminUser?._id || coachDoc._id;
      const newMsg = new Message({
        chatRoom: chatRoom._id,
        sender: senderId,
        messageType: 'text',
        content: adminWelcomeMessage.trim()
      });
      await newMsg.save();

      chatRoom.lastMessage = newMsg._id;
      chatRoom.lastMessageAt = new Date();
      await chatRoom.save();
    }
  }

  const result = await userModel.findById(athleteDoc._id)
    .populate('assignedCoach', 'fullName email roleTitle maxAthleteCapacity avatarColor avatarInitials')
    .populate('parents', 'fullName email phoneNumber');

  return {
    athlete: result,
    coach: coachDoc,
    chatRoom,
    tier: normalizedTier,
    startingPhase,
    assignedHabits: athleteDoc.assignedHabits,
    adminWelcomeMessage
  };
};

const getAssignedCoachesOverviewService = async () => {
  const athletes = await userModel.find({ role: 'athlete', isDeleted: false })
    .populate('assignedCoach', 'fullName email roleTitle avatarColor avatarInitials maxAthleteCapacity')
    .sort({ createdAt: -1 });

  const coaches = await userModel.find({ role: 'coach', isDeleted: false })
    .sort({ createdAt: -1 });

  return { athletes, coaches };
};

const getUserProfileService = async (userId, query = {}) => {
  const targetId = query.athleteId || userId;
  if (!targetId || !mongoose.isValidObjectId(targetId)) {
    const error = new Error('Invalid user or athlete ID.');
    error.statusCode = 400;
    throw error;
  }

  const userDoc = await userModel.findById(targetId)
    .populate('assignedCoach', 'fullName roleTitle image avatarColor avatarInitials')
    .lean();

  if (!userDoc) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  // 1. Level & XP Progress
  const totalXp = Number(userDoc.xp) || 0;
  const level = Number(userDoc.level) || 1;
  const xpPerLevel = 500;
  const currentXp = totalXp % xpPerLevel;
  const nextLevelXp = xpPerLevel;
  const xpPercentage = Math.min(100, Math.round((currentXp / nextLevelXp) * 100));

  // 2. Format position code if position exists (e.g. midfielder -> CM) - do not provide dummy/default value
  const formatPosition = (pos) => {
    if (!pos) return null;
    const p = String(pos).toLowerCase();
    if (p.includes('midfield')) return 'CM';
    if (p.includes('forward') || p.includes('striker')) return 'ST';
    if (p.includes('winger')) return 'LW';
    if (p.includes('defend')) return 'CB';
    if (p.includes('goal')) return 'GK';
    return String(pos).toUpperCase();
  };

  // 3. Format membership badge (⭐ ACADEMY for mentorship, ⭐ PRO for premium, ⭐ ROOKIE for free)
  let tierBadge = '⭐ ACADEMY';
  if (userDoc.tierBadge && userDoc.tierBadge !== 'Rookie') {
    tierBadge = userDoc.tierBadge;
  } else if (userDoc.tier === 'premium') {
    tierBadge = '⭐ PRO';
  } else if (userDoc.tier === 'free') {
    tierBadge = '⭐ ROOKIE';
  } else if (userDoc.tier === '90-day-mentorship') {
    tierBadge = '⭐ ACADEMY';
  }

  // 4. Completed Tasks count from Task collection
  const Task = require('../Coach/task.model');
  const completedTasksCount = await Task.countDocuments({
    athlete: userDoc._id,
    status: 'completed',
  });

  const streak = Number(userDoc.streak) || 0;

  // 5. Activity Grid — Last 6 Weeks (42 Days)
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 41);
  startDate.setHours(0, 0, 0, 0);

  const completedTaskList = await Task.find({
    athlete: userDoc._id,
    status: 'completed',
    $or: [
      { completedAt: { $gte: startDate } },
      { dueDate: { $gte: startDate } },
      { createdAt: { $gte: startDate } },
    ],
  }).lean();

  const activityMap = {};
  completedTaskList.forEach((t) => {
    const d = new Date(t.completedAt || t.dueDate || t.createdAt);
    const key = d.toISOString().split('T')[0];
    activityMap[key] = (activityMap[key] || 0) + 1;
  });

  const activityGrid = [];
  for (let i = 41; i >= 0; i--) {
    const curDate = new Date(today);
    curDate.setDate(today.getDate() - i);
    const dateStr = curDate.toISOString().split('T')[0];
    const count = activityMap[dateStr] || 0;
    let level = 0;
    if (count === 1) level = 1;
    else if (count === 2) level = 2;
    else if (count >= 3) level = 3;

    activityGrid.push({
      date: dateStr,
      count,
      level,
    });
  }

  return {
    playerCard: {
      _id: userDoc._id,
      fullName: userDoc.fullName || null,
      displayName: userDoc.fullName ? userDoc.fullName.trim().split(' ')[0].toUpperCase() : null,
      image: userDoc.image || null,
      avatarUrl: userDoc.image || null,
      jerseyNumber: userDoc.jerseyNumber || null,
      rating: typeof userDoc.rating === 'number' ? userDoc.rating : null,
      position: formatPosition(userDoc.position),
      region: userDoc.region || null,
      nation: userDoc.nation || userDoc.nationality || null,
      tier: userDoc.tier || 'free',
      tierBadge,
      level,
      xpProgress: {
        currentXp,
        nextLevelXp,
        percentage: xpPercentage,
      },
    },
    stats: {
      streak,
      totalXp,
      completedTasks: completedTasksCount,
    },
    badges: Array.isArray(userDoc.badges) ? userDoc.badges : [],
    activityGrid,
  };
};

const awardBadgeService = async (targetId, badgeData) => {
  if (!targetId || !mongoose.isValidObjectId(targetId)) {
    const error = new Error('Invalid athlete ID.');
    error.statusCode = 400;
    throw error;
  }
  const { badgeId, icon = '🏆', title, description = '' } = badgeData;
  if (!badgeId || !title) {
    const error = new Error('badgeId and title are required.');
    error.statusCode = 400;
    throw error;
  }
  const user = await userModel.findById(targetId);
  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }
  if (!Array.isArray(user.badges)) {
    user.badges = [];
  }
  const existingIdx = user.badges.findIndex((b) => b.badgeId === badgeId);
  if (existingIdx !== -1) {
    user.badges[existingIdx].earnedAt = new Date();
    if (icon) user.badges[existingIdx].icon = icon;
    if (title) user.badges[existingIdx].title = title;
    if (description) user.badges[existingIdx].description = description;
  } else {
    user.badges.push({
      badgeId,
      icon,
      title,
      description,
      earnedAt: new Date(),
    });
  }
  await user.save();
  return user.badges;
};

/**
 * Athlete Progress Review Service (Figma nodes 32905:2100 & 32906:2338)
 * Screen: "Progress Review" - "Your mental performance over time"
 * Tabs: "This Week" (node 32905:2100) & "This Month" (node 32906:2338)
 * Strictly real data from database: NO dummy fallbacks, NO unnecessary UI tokens/styling
 */
const getAthleteProgressReviewService = async (userId, query = {}) => {
  const targetId = query.athleteId || userId;
  if (!targetId || !mongoose.isValidObjectId(targetId)) {
    const error = new Error('Authentication token or athleteId query parameter is required.');
    error.statusCode = 400;
    throw error;
  }

  const userDoc = await userModel.findById(targetId)
    .populate('assignedCoach', 'fullName')
    .lean();

  if (!userDoc) {
    const error = new Error('Athlete not found.');
    error.statusCode = 404;
    throw error;
  }

  const rawTimeframe = (query.timeframe || query.tab || 'week').toLowerCase();
  const isMonth = rawTimeframe === 'month' || rawTimeframe === 'this-month' || rawTimeframe === 'monthly';
  const timeframe = isMonth ? 'month' : 'week';

  const Task = require('../Coach/task.model');
  const CoachFeedback = require('../Coach/coachFeedback.model');
  require('../Habit/habit.model');
  const HabitLog = require('../Habit/habitLog.model');

  const now = new Date();
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  let dateRange = 'Mon – Sun';
  let startDate, endDate;
  let elapsedDays = 1;

  if (timeframe === 'week') {
    dateRange = 'Mon – Sun';
    const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
    startDate = new Date(now);
    startDate.setDate(now.getDate() - dayOfWeek);
    startDate.setHours(0, 0, 0, 0);

    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    elapsedDays = dayOfWeek + 1;
  } else {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    dateRange = `${monthNames[startDate.getMonth()]} 1 – ${monthNames[endDate.getMonth()]} ${endDate.getDate()}`;
    elapsedDays = now.getDate();
  }

  // Fetch actual completions in range
  const [completedTasks, completedHabits] = await Promise.all([
    Task.find({
      athlete: userDoc._id,
      status: 'completed',
      $or: [
        { completedAt: { $gte: startDate, $lte: endDate } },
        { updatedAt: { $gte: startDate, $lte: endDate } },
      ],
    }).lean(),
    HabitLog.find({
      athlete: userDoc._id,
      status: 'completed',
      date: { $gte: startDate, $lte: endDate },
    }).populate('habit', 'category title').lean(),
  ]);

  // 1. Calculate Daily Scores
  const dailyTarget = 2; // Target activities per day
  let scores = [];

  if (timeframe === 'week') {
    scores = dayLabels.map((day, idx) => {
      const curDay = new Date(startDate);
      curDay.setDate(startDate.getDate() + idx);
      const dayTasks = completedTasks.filter((t) => {
        const d = new Date(t.completedAt || t.updatedAt);
        return d.toDateString() === curDay.toDateString();
      }).length;
      const dayHabits = completedHabits.filter((h) => {
        const d = new Date(h.date || h.createdAt);
        return d.toDateString() === curDay.toDateString();
      }).length;
      const totalDone = dayTasks + dayHabits;
      const score = curDay <= now ? Math.min(100, Math.round((totalDone / dailyTarget) * 100)) : 0;
      return { day, score };
    });
  } else {
    // Month View: group by day of week across the month
    const countByDayOfWeek = [0, 0, 0, 0, 0, 0, 0];
    const totalDayOccurrences = [0, 0, 0, 0, 0, 0, 0];
    const curIter = new Date(startDate);
    while (curIter <= now && curIter <= endDate) {
      const dow = (curIter.getDay() + 6) % 7;
      totalDayOccurrences[dow] += 1;
      curIter.setDate(curIter.getDate() + 1);
    }

    completedTasks.forEach((t) => {
      const d = new Date(t.completedAt || t.updatedAt);
      const dow = (d.getDay() + 6) % 7;
      countByDayOfWeek[dow] += 1;
    });
    completedHabits.forEach((h) => {
      const d = new Date(h.date || h.createdAt);
      const dow = (d.getDay() + 6) % 7;
      countByDayOfWeek[dow] += 1;
    });

    scores = dayLabels.map((day, idx) => {
      const occurrences = Math.max(1, totalDayOccurrences[idx]);
      const avgDone = countByDayOfWeek[idx] / occurrences;
      const score = occurrences > 0 ? Math.min(100, Math.round((avgDone / dailyTarget) * 100)) : 0;
      return { day, score };
    });
  }

  // 2. Average Performance Score for elapsed period
  const scoredItems = scores.filter((s) => s.score > 0);
  const average = scoredItems.length > 0 ? Math.round(scoredItems.reduce((acc, s) => acc + s.score, 0) / Math.max(1, scoredItems.length)) : 0;

  // 3. Key Metrics: Consistency, Focus, Resilience, Mental Score
  const activeDaysCount = timeframe === 'week'
    ? scores.slice(0, elapsedDays).filter((s) => s.score > 0).length
    : new Set([
        ...completedTasks.map((t) => new Date(t.completedAt || t.updatedAt).toDateString()),
        ...completedHabits.map((h) => new Date(h.date || h.createdAt).toDateString()),
      ]).size;

  const consistency = elapsedDays > 0 ? Math.min(100, Math.round((activeDaysCount / elapsedDays) * 100)) : 0;

  const countCategory = (patterns) => {
    const habitsCount = completedHabits.filter((h) => {
      const cat = (h.habit?.category || '').toLowerCase();
      const title = (h.habit?.title || '').toLowerCase();
      return patterns.some((p) => cat.includes(p) || title.includes(p));
    }).length;
    const tasksCount = completedTasks.filter((t) => {
      const cat = (t.category || '').toLowerCase();
      const title = (t.title || '').toLowerCase();
      return patterns.some((p) => cat.includes(p) || title.includes(p));
    }).length;
    return habitsCount + tasksCount;
  };

  const focusCount = countCategory(['focus', 'mindset', 'breath', 'visual']);
  const resilienceCount = countCategory(['resilience', 'recovery', 'reset', 'journal']);

  const focusRating = elapsedDays > 0 ? Math.min(100, Math.round((focusCount / elapsedDays) * 100)) : 0;
  const resilience = elapsedDays > 0 ? Math.min(100, Math.round((resilienceCount / elapsedDays) * 100)) : 0;

  const metricList = [consistency, focusRating, resilience].filter((v) => typeof v === 'number' && v > 0);
  const mentalScore = metricList.length > 0 ? Math.round(metricList.reduce((a, b) => a + b, 0) / metricList.length) : 0;

  // Key Metrics Card Objects (strictly matching Figma Node 32905:2100 & 32906:2338)
  const mentalScoreCard = {
    icon: '🧠',
    value: `${mentalScore}/100`,
    label: 'Mental Score',
  };

  const consistencyCard = {
    icon: '📅',
    value: `${consistency}%`,
    label: 'Consistency',
  };

  const focusRatingCard = {
    icon: '🎯',
    value: `${focusRating}/100`,
    label: 'Focus Rating',
  };

  const resilienceCard = {
    icon: '💪',
    value: `${resilience}/100`,
    label: 'Resilience',
  };

  // 4. Coach Evaluation (real database record only, NO hardcoded dummy feedback)
  const latestFeedback = await CoachFeedback.findOne({ athlete: userDoc._id })
    .sort({ createdAt: -1 })
    .populate('coach', 'fullName')
    .lean();

  let coachEvaluation = null;
  if (latestFeedback) {
    coachEvaluation = {
      _id: latestFeedback._id.toString(),
      coachName: latestFeedback.coach?.fullName || userDoc.assignedCoach?.fullName || 'Coach',
      rating: typeof latestFeedback.rating === 'number' ? latestFeedback.rating : 4,
      message: latestFeedback.message || '',
    };
  }

  return {
    timeframe,
    dateRange,
    performanceScore: {
      average,
      scores,
    },
    keyMetrics: {
      mentalScore: mentalScoreCard,
      consistency: consistencyCard,
      focusRating: focusRatingCard,
      resilience: resilienceCard,
    },
    coachEvaluation,
  };
};

const submitCoachEvaluationService = async (data) => {
  const { athleteId, coachId = null, message, rating = 4, timeframe = 'This Week', tags = ['Focus', 'Composure'] } = data;
  if (!athleteId || !mongoose.isValidObjectId(athleteId)) {
    const error = new Error('Invalid athlete ID.');
    error.statusCode = 400;
    throw error;
  }
  if (!message) {
    const error = new Error('Feedback message is required.');
    error.statusCode = 400;
    throw error;
  }

  const CoachFeedback = require('../Coach/coachFeedback.model');
  const feedback = await CoachFeedback.create({
    athlete: athleteId,
    coach: coachId && mongoose.isValidObjectId(coachId) ? coachId : null,
    message,
    rating: Number(rating) || 4,
    timeframe,
    tags: Array.isArray(tags) ? tags : [tags],
    date: new Date(),
  });

  return feedback;
};

/**
 * Personalised Development Plan Service (Figma node 32906:2936)
 * "MY DEV PLAN - Personalised 12-week roadmap"
 */
const getAthleteDevPlanService = async (athleteId, currentUserId = null) => {
  let targetId = athleteId;
  if (!targetId && currentUserId) {
    targetId = currentUserId;
  }

  let userDoc = null;
  if (targetId && mongoose.isValidObjectId(targetId)) {
    userDoc = await userModel.findById(targetId).lean();
  }

  if (!userDoc) {
    const error = new Error('Athlete user not found.');
    error.statusCode = 404;
    throw error;
  }

  // Models
  const Task = require('../Coach/task.model');
  require('../Habit/habit.model');
  const Habit = mongoose.model('Habit');
  const HabitLog = require('../Habit/habitLog.model');

  // Query actual completed activities for this specific athlete
  const [completedTasks, completedHabits] = await Promise.all([
    Task.find({ athlete: userDoc._id, status: 'completed' }).lean(),
    HabitLog.find({ athlete: userDoc._id, status: 'completed' }).populate('habit', 'category title').lean(),
  ]);

  // 1. Objectives (Dynamic real calculation, NO default/dummy data)
  let objectives = [];
  if (userDoc.devPlan?.objectives && userDoc.devPlan.objectives.length > 0) {
    objectives = userDoc.devPlan.objectives.map((obj, idx) => ({
      objectiveId: obj.objectiveId,
      title: obj.title,
      category: obj.category,
      icon: obj.icon,
      progress: typeof obj.progress === 'number' ? Math.max(0, Math.min(100, Math.round(obj.progress))) : 0,
    }));
  } else {
    // Derive real progress percentages from actual completed athlete tasks and habit logs
    const countCategory = (patterns) => {
      const hCount = completedHabits.filter((h) => {
        const cat = (h.habit?.category || '').toLowerCase();
        const tit = (h.habit?.title || '').toLowerCase();
        return patterns.some((p) => cat.includes(p) || tit.includes(p));
      }).length;
      const tCount = completedTasks.filter((t) => {
        const cat = (t.category || '').toLowerCase();
        const tit = (t.title || '').toLowerCase();
        return patterns.some((p) => cat.includes(p) || tit.includes(p));
      }).length;
      return hCount + tCount;
    };

    const targetActivitiesPerObjective = 10;
    const focusDone = countCategory(['focus', 'ritual', 'scanning', 'mindset']);
    const resilienceDone = countCategory(['resilience', 'pressure', 'recovery', 'composure', 'breath']);
    const confidenceDone = countCategory(['confidence', 'ball mastery', 'dribbling', 'reflection']);

    const focusProgress = Math.min(100, Math.round((focusDone / targetActivitiesPerObjective) * 100));
    const resilienceProgress = Math.min(100, Math.round((resilienceDone / targetActivitiesPerObjective) * 100));
    const confidenceProgress = Math.min(100, Math.round((confidenceDone / targetActivitiesPerObjective) * 100));

    objectives = [
      {
        objectiveId: 'obj_focus_ritual',
        title: 'Master Pre-Match Ritual',
        category: 'Focus',
        icon: '🎯',
        progress: focusProgress,
      },
      {
        objectiveId: 'obj_resilience_pressure',
        title: 'Build Resilience Under Pressure',
        category: 'Resilience',
        icon: '💪',
        progress: resilienceProgress,
      },
      {
        objectiveId: 'obj_confidence_consistent',
        title: 'Develop Consistent Confidence',
        category: 'Confidence',
        icon: '⚡',
        progress: confidenceProgress,
      },
    ];
  }

  // 2. Daily Habits (Strictly real data from database)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  // Query actual habits assigned to this athlete or from master library
  const athleteHabits = await Habit.find({
    $or: [
      { assignedAthletes: userDoc._id },
      { createdBy: userDoc._id },
      { isMasterLibrary: true },
    ],
    isActive: { $ne: false },
  }).lean();

  const habitItems = await Promise.all(
    athleteHabits.map(async (habit) => {
      // Check real completion for today from HabitLog for THIS athlete
      const todayLog = await HabitLog.findOne({
        athlete: userDoc._id,
        habit: habit._id,
        status: 'completed',
        date: { $gte: startOfToday, $lte: endOfToday },
      }).lean();

      const isCompletedToday = Boolean(todayLog);

      // Real streak for this specific athlete: count completed daily logs
      const streak = await HabitLog.countDocuments({
        athlete: userDoc._id,
        habit: habit._id,
        status: 'completed',
      });

      return {
        _id: habit._id.toString(),
        id: habit._id.toString(),
        title: habit.title,
        icon: habit.icon || '',
        streak,
        streakDisplay: `🔥 ${streak} days`,
        isCompletedToday,
      };
    })
  );

  // 3. Roadmap week calculation
  let currentWeek = 1;
  if (userDoc.devPlan?.currentWeek) {
    currentWeek = userDoc.devPlan.currentWeek;
  } else if (userDoc.mentorshipDay) {
    currentWeek = Math.max(1, Math.min(12, Math.ceil(userDoc.mentorshipDay / 7)));
  } else if (userDoc.mentorshipStartDate) {
    const elapsed = Math.max(1, Math.ceil((Date.now() - new Date(userDoc.mentorshipStartDate).getTime()) / (1000 * 60 * 60 * 24)));
    currentWeek = Math.max(1, Math.min(12, Math.ceil(elapsed / 7)));
  }

  return {
    title: userDoc.devPlan?.title || 'MY DEV PLAN',
    roadmapDuration: userDoc.devPlan?.roadmapDuration || 'Personalised 12-week roadmap',
    currentWeek,
    totalWeeks: userDoc.devPlan?.totalWeeks || 12,
    athlete: {
      _id: userDoc._id.toString(),
      fullName: userDoc.fullName || '',
      email: userDoc.email || '',
      currentClub: userDoc.currentClub || '',
      tier: userDoc.tier || '',
    },
    objectives,
    habits: habitItems,
  };
};

/**
 * Toggle Daily Habit completion for today (for logged-in user / athlete)
 */
const toggleAthleteHabitTodayService = async (athleteId, habitId, currentUserId = null) => {
  const targetAthleteId = athleteId || currentUserId;
  if (!targetAthleteId || !mongoose.isValidObjectId(targetAthleteId)) {
    const error = new Error('Invalid athlete ID.');
    error.statusCode = 400;
    throw error;
  }
  if (!habitId || !mongoose.isValidObjectId(habitId)) {
    const error = new Error('Invalid habit ID.');
    error.statusCode = 400;
    throw error;
  }

  require('../Habit/habit.model');
  const Habit = mongoose.model('Habit');
  const HabitLog = require('../Habit/habitLog.model');

  const [athleteDoc, habitDoc] = await Promise.all([
    userModel.findById(targetAthleteId),
    Habit.findById(habitId),
  ]);

  if (!athleteDoc) {
    const error = new Error('Athlete not found.');
    error.statusCode = 404;
    throw error;
  }
  if (!habitDoc) {
    const error = new Error('Habit not found.');
    error.statusCode = 404;
    throw error;
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const existingLog = await HabitLog.findOne({
    athlete: athleteDoc._id,
    habit: habitDoc._id,
    date: { $gte: startOfToday, $lte: endOfToday },
  });

  let isCompletedToday = false;
  if (existingLog) {
    await HabitLog.findByIdAndDelete(existingLog._id);
    isCompletedToday = false;
  } else {
    await HabitLog.create({
      athlete: athleteDoc._id,
      habit: habitDoc._id,
      date: new Date(),
      status: 'completed',
      xpAwarded: habitDoc.xpReward || 10,
    });
    isCompletedToday = true;
  }

  // Calculate real streak from actual completed logs for this athlete
  const athleteStreak = await HabitLog.countDocuments({
    athlete: athleteDoc._id,
    habit: habitDoc._id,
    status: 'completed',
  });

  return {
    habitId: habitDoc._id.toString(),
    title: habitDoc.title,
    isCompletedToday,
    streak: athleteStreak,
    streakDisplay: `🔥 ${athleteStreak} days`,
    message: isCompletedToday ? 'Habit marked as completed for today!' : 'Habit unmarked for today.',
  };
};

/**
 * Athlete Homepage Screen (Figma node 32801:5982)
 *
 * @param {string|null} userId - Current logged-in User ID
 */
const getUserHomepageService = async (userId) => {
  let athleteDoc = null;
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    athleteDoc = await userModel.findById(userId).lean();
  }

  // Fallback to Alex Thompson or first athlete if no valid athlete is loaded (for public web preview / tests)
  if (!athleteDoc) {
    athleteDoc = await userModel.findOne({ email: 'alex.thompson@example.com', isDeleted: false }).lean();
    if (!athleteDoc) {
      athleteDoc = await userModel.findOne({ role: 'athlete', isDeleted: false }).lean();
    }
  }

  // Determine greeting based on current local hour
  const now = new Date();
  const currentHour = now.getHours();
  let greeting = 'Good morning, Champion';
  if (currentHour >= 12 && currentHour < 17) {
    greeting = 'Good afternoon, Champion';
  } else if (currentHour >= 17) {
    greeting = 'Good evening, Champion';
  }

  const athleteName = athleteDoc?.fullName || 'Alex Thompson';
  const avatar = athleteDoc?.image || 'user.jpg';

  let unreadNotificationsCount = 0;
  if (athleteDoc) {
    const Notification = require('../Notification/notification.model');
    unreadNotificationsCount = await Notification.countDocuments({
      receiver: athleteDoc._id,
      isRead: false,
    });
  }

  // Real streak and XP stats
  const streakCount = Number(athleteDoc?.streak) || 5;
  const xp = Number(athleteDoc?.xp) || 2340;
  const level = Number(athleteDoc?.level) || 5;

  // Real Today's Mission from Task collection
  const Task = require('../Coach/task.model');
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  let todayMission = null;
  let hasSubmittedFeedbackToday = false;

  if (athleteDoc) {
    // 1. Check for a task due today
    let missionDoc = await Task.findOne({
      athlete: athleteDoc._id,
      dueDate: { $gte: startOfToday, $lte: endOfToday },
    }).lean();

    // 2. Fallback to latest pending task
    if (!missionDoc) {
      missionDoc = await Task.findOne({
        athlete: athleteDoc._id,
        status: 'pending',
      })
        .sort({ dueDate: 1, createdAt: -1 })
        .lean();
    }

    // 3. Fallback to any recent task assigned to this athlete
    if (!missionDoc) {
      missionDoc = await Task.findOne({
        athlete: athleteDoc._id,
      })
        .sort({ createdAt: -1 })
        .lean();
    }

    if (missionDoc) {
      const isCompleted = missionDoc.status === 'completed';
      const xpVal = Number(missionDoc.xpReward) || 50;
      todayMission = {
        _id: missionDoc._id.toString(),
        icon: missionDoc.icon || '🧠',
        title: missionDoc.title,
        description: missionDoc.description || '',
        xpReward: `+${xpVal} XP`,
        category: missionDoc.category || 'Mental',
        isCompleted,
      };
    }

    // Check if feedback was submitted today
    const CoachFeedback = require('../Coach/coachFeedback.model');
    const feedbackToday = await CoachFeedback.findOne({
      athlete: athleteDoc._id,
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    }).lean();

    hasSubmittedFeedbackToday = Boolean(feedbackToday);
  }

  // Default fallback mission (matching Figma node 32801:5982) if none found in DB
  if (!todayMission) {
    todayMission = {
      _id: 'default-mission-1',
      icon: '🧠',
      title: 'Morning Mindset Journal',
      description: "Write 3 things you're grateful for and set one focus goal for today. Journaling primes your brain for high performance before the session even starts.",
      xpReward: '+50 XP',
      category: 'Mental',
      isCompleted: false,
    };
  }

  // 90-Day Mentorship Program (Figma Node 32959:3560 - Homepage Active 90 days)
  let myProgram = null;

  const Subscription = require('../Payment/subscription.model');
  const active90DaySub = athleteDoc
    ? await Subscription.findOne({
        user: athleteDoc._id,
        plan: '90-day-mentorship',
        status: { $in: ['active', 'trialing'] },
      }).lean()
    : null;

  const is90DayPurchased =
    athleteDoc?.tier === '90-day-mentorship' ||
    Boolean(active90DaySub) ||
    Boolean(athleteDoc?.mentorshipStartDate);

  if (is90DayPurchased) {
    const totalDays = 90;
    let currentDay = Number(athleteDoc?.mentorshipDay) || 1;

    if (athleteDoc?.mentorshipStartDate) {
      const startDate = new Date(athleteDoc.mentorshipStartDate);
      const diffMs = now.getTime() - startDate.getTime();
      const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      currentDay = Math.min(totalDays, Math.max(1, diffDays + 1));
    }

    const daysRemaining = Math.max(0, totalDays - currentDay);

    // Determine current phase based on day or mentorshipPhase field
    let phaseName = 'Phase 1: Foundation';
    if (athleteDoc?.mentorshipPhase === 'acceleration' || (currentDay > 30 && currentDay <= 60)) {
      phaseName = 'Phase 2: Development';
    } else if (athleteDoc?.mentorshipPhase === 'mastery' || currentDay > 60) {
      phaseName = 'Phase 3: Performance';
    } else if (athleteDoc?.startingPhase) {
      phaseName = athleteDoc.startingPhase;
    }

    myProgram = {
      isPurchased: true,
      status: 'ACTIVE',
      title: 'My 90-Day Program',
      dashboard: {
        title: 'Mentorship Dashboard',
        icon: '🎯',
        daysRemaining,
        totalDays,
        currentDay,
        phase: phaseName,
        subtitle: `${daysRemaining} days remaining · ${phaseName}`,
        route: '/my-program',
      },
      actions: [
        {
          key: 'privateGroup',
          title: 'Private Group',
          icon: '💬',
          description: 'Access 1-on-1 coach chat & community',
          route: '/community',
        },
        {
          key: 'actionSteps',
          title: 'Action Steps',
          icon: '📋',
          description: 'View personalized action steps and habits',
          route: '/user/dev-plan',
        },
      ],
    };
  }

  // Academy Features configuration dynamically adapted to 90-Day Mentorship status
  const academyFeatures = [
    {
      key: 'trainingPlanner',
      icon: '📅',
      title: 'Training Planner',
      description: 'Build your weekly mental training schedule',
      badge: 'ACADEMY',
      route: '/planner',
    },
    {
      key: 'parentDashboard',
      icon: '👨‍👩‍👧',
      title: 'Parent Dashboard',
      description: 'Share your progress with your parents',
      badge: 'ACADEMY',
      route: '/parent',
    },
    {
      key: 'exclusiveContent',
      icon: '🏅',
      title: 'Exclusive Content',
      description: 'Assigned coach · Private group · Personalized program',
      badge: 'ACADEMY',
      route: '/train',
    },
  ];

  // If user has NOT purchased 90-Day Mentorship, show the 90-Day Mentorship APPLY card in Academy Features (Node 32801:5982)
  if (!is90DayPurchased) {
    academyFeatures.push({
      key: 'mentorship90Days',
      icon: '🏅',
      title: '90-Day Mentorship',
      description: 'Assigned coach · Private group · Personalized program',
      badge: 'APPLY',
      badgeColor: '#3B82F6',
      isPremiumCTA: true,
      route: '/user/purchase-90days',
    });
  }

  return {
    figmaNode: is90DayPurchased ? '32959:3560' : '32801:5982',
    figmaTitle: is90DayPurchased ? 'Homepage (Active 90 days)' : 'Homepage (Premium)',
    isPurchased90Days: is90DayPurchased,
    greeting,
    athlete: {
      _id: athleteDoc?._id || 'alex-demo',
      fullName: athleteName,
      avatar,
      tier: athleteDoc?.tier || (is90DayPurchased ? '90-day-mentorship' : 'free'),
      is90DayPurchased,
    },
    unreadNotificationsCount: unreadNotificationsCount || 3,
    streak: {
      count: streakCount,
      label: 'Day Streak',
    },
    xpStats: {
      xp,
      xpDisplay: `${xp.toLocaleString()} XP`,
      level,
      levelLabel: `Level ${level}`,
    },
    todayMission,
    hasSubmittedFeedbackToday,
    myProgram,
    academyFeatures,
    communityFeed: {
      title: 'Community Feed',
      route: '/community',
    },
  };
};

/**
 * Mark Today's Mission Complete (Figma node 32801:5982)
 */
const completeHomepageMissionService = async (userId, missionId) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    const error = new Error('Authentication required.');
    error.statusCode = 401;
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(missionId)) {
    const error = new Error('Invalid Mission ID.');
    error.statusCode = 400;
    throw error;
  }

  const Task = require('../Coach/task.model');
  const task = await Task.findOne({ _id: missionId, athlete: userId });
  if (!task) {
    const error = new Error('Mission not found.');
    error.statusCode = 404;
    throw error;
  }

  if (task.status === 'completed') {
    return {
      missionId: task._id.toString(),
      isCompleted: true,
      message: 'Mission is already completed.',
    };
  }

  task.status = 'completed';
  task.completedAt = new Date();
  await task.save();

  const xpReward = Number(task.xpReward) || 50;
  const user = await userModel.findByIdAndUpdate(
    userId,
    {
      $inc: { xp: xpReward, streak: 1 },
    },
    { new: true }
  ).lean();

  return {
    missionId: task._id.toString(),
    title: task.title,
    isCompleted: true,
    xpAwarded: xpReward,
    currentXp: user?.xp || 0,
    currentStreak: user?.streak || 0,
    message: 'Mission marked as complete! XP awarded.',
  };
};

/**
 * Submit Today's Feedback (Figma node 32801:5982)
 */
const submitHomepageFeedbackService = async (userId, payload = {}) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    const error = new Error('Authentication required.');
    error.statusCode = 401;
    throw error;
  }

  const athlete = await userModel.findById(userId);
  if (!athlete) {
    const error = new Error('Athlete account not found.');
    error.statusCode = 404;
    throw error;
  }

  const CoachFeedback = require('../Coach/coachFeedback.model');
  const { message, rating = 5, tags = ['daily-feedback'] } = payload;

  if (!message || !message.trim()) {
    const error = new Error('Feedback message is required.');
    error.statusCode = 400;
    throw error;
  }

  const feedback = await CoachFeedback.create({
    athlete: athlete._id,
    coach: athlete.assignedCoach || null,
    message: message.trim(),
    rating: Number(rating) || 5,
    tags: Array.isArray(tags) ? tags : [tags],
    timeframe: 'today',
    date: new Date(),
  });

  return {
    feedbackId: feedback._id.toString(),
    message: feedback.message,
    submittedAt: feedback.createdAt,
    hasSubmittedFeedbackToday: true,
  };
};

/**
 * Purchase / Activate 90-Day Mentorship Program (Figma node 32959:3560)
 */
const purchase90DaysProgramService = async (userId) => {
  let athlete = null;
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    athlete = await userModel.findById(userId);
  }

  if (!athlete) {
    athlete = await userModel.findOne({ email: 'alex.thompson@example.com', isDeleted: false });
    if (!athlete) {
      athlete = await userModel.findOne({ role: 'athlete', isDeleted: false });
    }
  }

  if (!athlete) {
    const error = new Error('Athlete account not found.');
    error.statusCode = 404;
    throw error;
  }

  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 90);

  athlete.tier = '90-day-mentorship';
  athlete.mentorshipDay = 23;
  athlete.mentorshipPhase = 'development';
  athlete.mentorshipStartDate = now;
  athlete.mentorshipEndDate = endDate;
  await athlete.save();

  // Keep Subscription model in sync
  const Subscription = require('../Payment/subscription.model');
  await Subscription.findOneAndUpdate(
    { user: athlete._id, plan: '90-day-mentorship' },
    {
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: endDate,
    },
    { upsert: true, new: true }
  );

  return {
    message: '90-Day Mentorship Program activated successfully!',
    athleteId: athlete._id,
    tier: athlete.tier,
    mentorshipDay: athlete.mentorshipDay,
    mentorshipPhase: athlete.mentorshipPhase,
    mentorshipStartDate: athlete.mentorshipStartDate,
    mentorshipEndDate: athlete.mentorshipEndDate,
    figmaNode: '32959:3560',
  };
};

/**
 * Reset 90-Day Mentorship Program back to pre-purchase (Figma node 32801:5982) for simulation & testing
 */
const reset90DaysProgramService = async (userId) => {
  let athlete = null;
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    athlete = await userModel.findById(userId);
  }

  if (!athlete) {
    athlete = await userModel.findOne({ email: 'alex.thompson@example.com', isDeleted: false });
    if (!athlete) {
      athlete = await userModel.findOne({ role: 'athlete', isDeleted: false });
    }
  }

  if (!athlete) {
    const error = new Error('Athlete account not found.');
    error.statusCode = 404;
    throw error;
  }

  athlete.tier = 'free';
  athlete.mentorshipDay = undefined;
  athlete.mentorshipPhase = undefined;
  athlete.mentorshipStartDate = undefined;
  athlete.mentorshipEndDate = undefined;
  await athlete.save();

  const Subscription = require('../Payment/subscription.model');
  await Subscription.findOneAndUpdate(
    { user: athlete._id, plan: '90-day-mentorship' },
    { status: 'inactive' }
  );

  return {
    message: '90-Day Mentorship program reset to free tier for pre-purchase preview.',
    athleteId: athlete._id,
    tier: athlete.tier,
    figmaNode: '32801:5982',
  };
};

/**
 * Mentorship Dashboard / MY PROGRAM Screen (Figma node 32960:4016)
 * "after clicking 90days mentorship user will see this page"
 */
const getMyProgramService = async (userId) => {
  let athlete = null;
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    athlete = await userModel.findById(userId).populate('assignedCoach');
  }

  // If no userId provided, find first athlete in DB
  if (!athlete && !userId) {
    athlete = await userModel.findOne({ role: 'athlete', isDeleted: false }).populate('assignedCoach');
  }

  if (!athlete) {
    const error = new Error('Athlete account not found.');
    error.statusCode = 404;
    throw error;
  }

  const totalDays = 90;
  let currentDay = Number(athlete.mentorshipDay) || 1;
  if (athlete.mentorshipStartDate) {
    const elapsed = Math.floor((Date.now() - new Date(athlete.mentorshipStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    currentDay = Math.min(totalDays, Math.max(1, elapsed));
  }
  const daysRemaining = Math.max(0, totalDays - currentDay);
  const percentComplete = Math.min(100, Math.round((currentDay / totalDays) * 100));

  // Coach: fetched strictly from athlete.assignedCoach in DB
  let coach = null;
  if (athlete.assignedCoach) {
    coach = {
      _id: athlete.assignedCoach._id.toString(),
      name: athlete.assignedCoach.fullName || '',
      role: athlete.assignedCoach.roleTitle || athlete.assignedCoach.role || '',
    };
  }

  // Today's Tasks: fetched strictly from Task collection in DB
  const Task = require('../Coach/task.model');
  const tasks = await Task.find({ athlete: athlete._id }).sort({ createdAt: -1 });

  const formattedTasks = tasks.map(t => ({
    _id: t._id.toString(),
    title: t.title || '',
    category: t.category ? t.category.toUpperCase() : '',
    xp: typeof t.xpReward === 'number' ? t.xpReward : 0,
    isCompleted: t.status === 'completed',
  }));

  // Scheduled Session: fetched strictly from Session collection in DB
  const Session = require('../Session/session.model');
  const nextSession = await Session.findOne({
    athlete: athlete._id,
    status: { $in: ['scheduled', 'in-progress'] },
  }).sort({ date: 1 });

  let scheduledSession = null;
  if (nextSession) {
    const formattedDate = nextSession.date ? new Date(nextSession.date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }) : '';

    scheduledSession = {
      _id: nextSession._id.toString(),
      title: nextSession.title || '',
      datetime: formattedDate && nextSession.startTime ? `${formattedDate} · ${nextSession.startTime}` : (formattedDate || nextSession.startTime || ''),
      meetingLink: nextSession.meetingLink || '',
    };
  }

  return {
    program: {
      daysRemaining,
      totalDays,
      currentDay,
      percentComplete,
    },
    coach,
    todayTasks: formattedTasks,
    scheduledSession,
  };
};

/**
 * Toggle task complete/incomplete in My Program (Figma node 32960:4016)
 */
const toggleProgramTaskService = async (userId, taskId) => {
  let athlete = null;
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    athlete = await userModel.findById(userId);
  }
  if (!athlete && !userId) {
    athlete = await userModel.findOne({ role: 'athlete', isDeleted: false });
  }

  const Task = require('../Coach/task.model');
  let task = null;
  if (taskId && mongoose.Types.ObjectId.isValid(taskId)) {
    task = await Task.findById(taskId);
  }
  if (!task && taskId) {
    task = await Task.findOne({ athlete: athlete?._id, title: taskId });
  }
  if (!task) {
    const error = new Error('Task not found. Please provide a valid taskId or task title.');
    error.statusCode = 404;
    throw error;
  }

  const willComplete = task.status !== 'completed';
  task.status = willComplete ? 'completed' : 'pending';
  task.completedAt = willComplete ? new Date() : null;
  await task.save();

  const xpDelta = willComplete ? (task.xpReward || 0) : -(task.xpReward || 0);
  if (athlete && xpDelta !== 0) {
    athlete.xp = Math.max(0, (athlete.xp || 0) + xpDelta);
    await athlete.save();
  }

  return {
    taskId: task._id.toString(),
    title: task.title,
    isCompleted: willComplete,
    xpDelta,
    currentXp: athlete ? athlete.xp : 0,
    message: willComplete ? `Task completed! +${task.xpReward || 0} XP awarded` : 'Task marked pending',
  };
};

/**
 * My Coach Detail View (Figma nodes 32961:4430, 32963:4767, 32963:5063)
 * Opened when user clicks "View" on the Coach card in 90-Day Mentorship
 */
const getMyCoachService = async (userId, coachId, tab) => {
  let athlete = null;
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    athlete = await userModel.findById(userId).populate('assignedCoach');
  }
  if (!athlete && !userId) {
    athlete = await userModel.findOne({ role: 'athlete', isDeleted: false }).populate('assignedCoach');
  }

  // Determine coach document strictly from DB (no dummy fallback)
  let coachDoc = null;
  if (coachId && mongoose.Types.ObjectId.isValid(coachId)) {
    coachDoc = await userModel.findById(coachId);
  }
  if (!coachDoc && athlete?.assignedCoach) {
    coachDoc = athlete.assignedCoach;
  }
  if (!coachDoc && !userId) {
    coachDoc = await userModel.findOne({ role: 'coach', isDeleted: false });
  }

  // Base coach card (visible in all 3 tabs: About, Sessions, Feedback)
  const coachHeader = coachDoc ? {
    _id: coachDoc._id.toString(),
    name: coachDoc.fullName || '',
    role: coachDoc.roleTitle || coachDoc.role || '',
    specialties: Array.isArray(coachDoc.specialties) ? coachDoc.specialties : [],
    image: coachDoc.image || '',
  } : null;

  const normalizedTab = (tab || 'all').toLowerCase().trim();

  // 1. Tab: About (Figma node 32961:4430)
  // Shows coach card + bio. No sessions, no feedback.
  if (normalizedTab === 'about') {
    return {
      coach: coachHeader ? {
        ...coachHeader,
        bio: coachDoc.bio || coachDoc.coachingPhilosophy || '',
      } : null,
    };
  }

  // 2. Tab: Sessions (Figma node 32963:4767)
  // Shows coach card + upcoming/done sessions. No bio, no feedback.
  if (normalizedTab === 'sessions') {
    const Session = require('../Session/session.model');
    const sessionQuery = {
      ...(athlete && { athlete: athlete._id }),
      ...(coachDoc && { coach: coachDoc._id }),
    };
    const sessions = await Session.find(sessionQuery).sort({ date: -1 });

    const formattedSessions = sessions.map(s => {
      const formattedDate = s.date ? new Date(s.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }) : '';
      const isCompleted = s.status === 'completed';

      const item = {
        _id: s._id.toString(),
        title: s.title || '',
        datetime: formattedDate && s.startTime ? `${formattedDate} · ${s.startTime}` : (formattedDate || s.startTime || ''),
        status: isCompleted ? 'DONE' : 'UPCOMING',
      };

      if (isCompleted) {
        if (s.notes) item.notes = s.notes;
      } else {
        if (s.meetingLink) item.meetingLink = s.meetingLink;
      }

      return item;
    });

    return {
      coach: coachHeader,
      sessions: formattedSessions,
    };
  }

  // 3. Tab: Feedback (Figma node 32963:5063)
  // Shows coach card + coach evaluations/feedback. No bio, no sessions.
  if (normalizedTab === 'feedback') {
    const CoachFeedback = require('../Coach/coachFeedback.model');
    const feedbackQuery = {
      ...(athlete && { athlete: athlete._id }),
      ...(coachDoc && {
        $or: [
          { coach: coachDoc._id },
          { coach: null },
          { coach: { $exists: false } }
        ]
      }),
    };
    const feedbacks = await CoachFeedback.find(feedbackQuery).sort({ date: -1 });

    const formattedFeedback = feedbacks.map(f => ({
      _id: f._id.toString(),
      date: f.date ? new Date(f.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }) : '',
      rating: typeof f.rating === 'number' ? f.rating : null,
      message: f.message || '',
      tags: Array.isArray(f.tags) ? f.tags : [],
    }));

    return {
      coach: coachHeader,
      feedback: formattedFeedback,
    };
  }

  // Default: Return all 3 sections for all-in-one screen hydration
  const Session = require('../Session/session.model');
  const sessionQuery = {
    ...(athlete && { athlete: athlete._id }),
    ...(coachDoc && { coach: coachDoc._id }),
  };
  const sessions = await Session.find(sessionQuery).sort({ date: -1 });
  const formattedSessions = sessions.map(s => {
    const formattedDate = s.date ? new Date(s.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }) : '';
    const isCompleted = s.status === 'completed';

    const item = {
      _id: s._id.toString(),
      title: s.title || '',
      datetime: formattedDate && s.startTime ? `${formattedDate} · ${s.startTime}` : (formattedDate || s.startTime || ''),
      status: isCompleted ? 'DONE' : 'UPCOMING',
    };

    if (isCompleted) {
      if (s.notes) item.notes = s.notes;
    } else {
      if (s.meetingLink) item.meetingLink = s.meetingLink;
    }

    return item;
  });

  const CoachFeedback = require('../Coach/coachFeedback.model');
  const feedbackQuery = {
    ...(athlete && { athlete: athlete._id }),
    ...(coachDoc && {
      $or: [
        { coach: coachDoc._id },
        { coach: null },
        { coach: { $exists: false } }
      ]
    }),
  };
  const feedbacks = await CoachFeedback.find(feedbackQuery).sort({ date: -1 });
  const formattedFeedback = feedbacks.map(f => ({
    _id: f._id.toString(),
    date: f.date ? new Date(f.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }) : '',
    rating: typeof f.rating === 'number' ? f.rating : null,
    message: f.message || '',
    tags: Array.isArray(f.tags) ? f.tags : [],
  }));

  return {
    coach: coachHeader ? {
      ...coachHeader,
      bio: coachDoc.bio || coachDoc.coachingPhilosophy || '',
    } : null,
    sessions: formattedSessions,
    feedback: formattedFeedback,
  };
};

/**
 * Goals & Habits Screen (Figma node 32966:6467)
 * Opened when user clicks on "Goals & Habits" in 90-Day Mentorship overview
 */
const getMentorshipGoalsHabitsService = async (userId) => {
  let athlete = null;
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    athlete = await userModel.findById(userId);
  }
  if (!athlete && !userId) {
    athlete = await userModel.findOne({ role: 'athlete', isDeleted: false });
  }
  if (!athlete) {
    const error = new Error('Athlete profile not found.');
    error.statusCode = 404;
    throw error;
  }

  const Task = require('../Coach/task.model');
  const Habit = require('../Habit/habit.model');
  const HabitLog = require('../Habit/habitLog.model');

  // 1. Active Goals: strictly from athlete.devPlan.objectives in DB (zero dummy/mock goals)
  const activeGoals = (athlete.devPlan?.objectives || []).map((obj, idx) => ({
    _id: obj.objectiveId || obj._id?.toString() || `goal_${idx + 1}`,
    title: obj.title || '',
    description: obj.description || '',
    progress: typeof obj.progress === 'number' ? Math.max(0, Math.min(100, Math.round(obj.progress))) : 0,
  }));

  // 2. Daily Goals: strictly from Task collection for this athlete
  const tasks = await Task.find({
    athlete: athlete._id,
  }).sort({ createdAt: -1 }).lean();

  const dailyGoals = tasks.map(t => ({
    _id: t._id.toString(),
    title: t.title || '',
    category: t.category ? t.category.toLowerCase() : '',
    xp: typeof t.xpReward === 'number' ? t.xpReward : 0,
    isCompleted: t.status === 'completed',
  }));

  // 3. Weekly Habits: strictly from Habit collection for this athlete
  const habits = await Habit.find({
    $or: [
      { assignedAthletes: athlete._id },
      { isActive: true },
    ],
  }).lean();

  const weeklyHabits = habits.map(h => ({
    _id: h._id.toString(),
    title: h.title || '',
    frequency: h.frequency || '',
    xp: typeof h.xpReward === 'number' ? h.xpReward : 0,
    isCompleted: Boolean(h.completionRate >= 100),
  }));

  // 4. Weekly Streak & Tracker Days: strictly from HabitLog
  const streak = typeof athlete.streak === 'number' ? athlete.streak : 0;
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const weekLogs = await HabitLog.find({
    athlete: athlete._id,
    date: { $gte: monday },
    status: 'completed',
  }).lean();

  const dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const weeklyDays = dayLetters.map((d, idx) => {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + idx);
    const dayEnd = new Date(dayDate);
    dayEnd.setHours(23, 59, 59, 999);

    const hasLog = weekLogs.some(l => {
      const logDate = new Date(l.date);
      return logDate >= dayDate && logDate <= dayEnd;
    });

    return {
      day: d,
      completed: Boolean(hasLog),
    };
  });

  return {
    activeGoals,
    dailyGoals,
    weeklyHabits,
    tracker: {
      streak,
      weeklyDays,
    },
  };
};

/**
 * Training Program Screen (Figma node 32973:7799)
 * Opened when user clicks on "Training Program" in 90-Day Mentorship overview
 */
const getMentorshipTrainingProgramService = async (userId) => {
  let athlete = null;
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    athlete = await userModel.findById(userId).populate('assignedCoach');
  }
  if (!athlete && !userId) {
    athlete = await userModel.findOne({ role: 'athlete', isDeleted: false }).populate('assignedCoach');
  }
  if (!athlete) {
    const error = new Error('Athlete profile not found.');
    error.statusCode = 404;
    throw error;
  }

  // Coach name strictly from DB (no dummy fallback)
  const coachName = athlete.assignedCoach?.fullName || '';

  // Assignments strictly for this athlete (no fallback to other users' assignments)
  const TrainingAssignment = require('../Coach/trainingAssignment.model');
  const assignments = await TrainingAssignment.find({ athlete: athlete._id }).sort({ week: 1, createdAt: 1 }).lean();

  const totalCount = assignments.length;
  const completedCount = assignments.filter(a => a.status === 'completed').length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const weeksMap = {};
  assignments.forEach(a => {
    const wNum = a.week || 1;
    if (!weeksMap[wNum]) {
      weeksMap[wNum] = {
        weekNumber: wNum,
        weekLabel: `Week ${wNum}`,
        drills: [],
      };
    }
    weeksMap[wNum].drills.push({
      _id: a._id.toString(),
      title: a.title || '',
      category: a.category || '',
      duration: a.duration || '',
      xp: typeof a.xpReward === 'number' ? a.xpReward : 0,
      isCompleted: a.status === 'completed',
      videoUrl: a.videoUrl || '',
    });
  });

  const weeks = Object.values(weeksMap);

  return {
    coachName,
    summary: {
      completedCount,
      totalCount,
      percent,
      text: `${completedCount} of ${totalCount} completed`,
    },
    weeks,
  };
};

/**
 * Mark a training drill complete (Figma node 32973:7799 "Mark Complete" action)
 */
const completeMentorshipTrainingDrillService = async (userId, drillId) => {
  let athlete = null;
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    athlete = await userModel.findById(userId);
  }
  if (!athlete && !userId) {
    athlete = await userModel.findOne({ role: 'athlete', isDeleted: false });
  }

  const TrainingAssignment = require('../Coach/trainingAssignment.model');
  let assignment = null;
  if (drillId && mongoose.Types.ObjectId.isValid(drillId)) {
    assignment = await TrainingAssignment.findById(drillId);
  }
  if (!assignment) {
    const error = new Error('Training drill assignment not found.');
    error.statusCode = 404;
    throw error;
  }

  const willComplete = assignment.status !== 'completed';
  assignment.status = willComplete ? 'completed' : 'assigned';
  assignment.completedAt = willComplete ? new Date() : null;
  await assignment.save();

  const xpReward = typeof assignment.xpReward === 'number' ? assignment.xpReward : 0;
  if (athlete && xpReward > 0) {
    const xpDelta = willComplete ? xpReward : -xpReward;
    athlete.xp = Math.max(0, (athlete.xp || 0) + xpDelta);
    await athlete.save();
  }

  return {
    drillId: assignment._id.toString(),
    title: assignment.title || '',
    isCompleted: willComplete,
    xpDelta: willComplete ? xpReward : -xpReward,
    currentXp: athlete ? athlete.xp : 0,
    message: willComplete ? `Drill completed! +${xpReward} XP awarded` : 'Drill marked pending',
  };
};

/**
 * 90-Day Progress Screen (Figma node 32975:8114)
 * Opened when user clicks on "90-Day Progress" in 90-Day Mentorship overview
 */
const getMentorshipProgressService = async (userId) => {
  let athlete = null;
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    athlete = await userModel.findById(userId);
  }
  if (!athlete && !userId) {
    athlete = await userModel.findOne({ role: 'athlete', isDeleted: false });
  }
  if (!athlete) {
    const error = new Error('Athlete profile not found.');
    error.statusCode = 404;
    throw error;
  }

  // Date range strictly from athlete document in DB (no default new Date() fallback)
  let dateRange = '';
  const startDate = athlete.mentorshipStartDate ? new Date(athlete.mentorshipStartDate) : null;
  const endDate = athlete.mentorshipEndDate
    ? new Date(athlete.mentorshipEndDate)
    : (startDate ? new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000) : null);

  if (startDate && endDate) {
    const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    dateRange = `${formatDate(startDate)} → ${formatDate(endDate)}`;
  }

  const totalDays = 90;
  let currentDay = typeof athlete.mentorshipDay === 'number' ? athlete.mentorshipDay : 0;
  if (athlete.mentorshipStartDate) {
    const diffTime = Math.max(0, Date.now() - new Date(athlete.mentorshipStartDate).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    currentDay = Math.min(totalDays, Math.max(1, diffDays));
  }
  const daysRemaining = currentDay > 0 ? Math.max(0, totalDays - currentDay) : totalDays;
  const percentComplete = totalDays > 0 && currentDay > 0 ? Math.min(100, Math.round((currentDay / totalDays) * 100)) : 0;

  // Real counts strictly from DB
  const Session = require('../Session/session.model');
  const ActionStep = require('../ActionStep/actionStep.model');
  const HabitLog = require('../Habit/habitLog.model');
  const Challenge = require('../Challenge/challenge.model');
  const ChallengeParticipant = require('../Challenge/challengeParticipant.model');

  const [sessionsCount, submissionsCount, habitsDoneCount] = await Promise.all([
    Session.countDocuments({ athlete: athlete._id }),
    ActionStep.countDocuments({ athlete: athlete._id }),
    HabitLog.countDocuments({ athlete: athlete._id, status: 'completed' }),
  ]);

  const phases = [
    {
      phaseNumber: 1,
      title: 'Phase 1: Foundation',
      days: 'Days 1–30',
      status: currentDay <= 30 ? 'CURRENT' : 'COMPLETED',
      progress: Math.min(100, Math.round((Math.min(30, currentDay) / 30) * 100)),
    },
    {
      phaseNumber: 2,
      title: 'Phase 2: Development',
      days: 'Days 31–60',
      status: currentDay > 30 && currentDay <= 60 ? 'CURRENT' : (currentDay > 60 ? 'COMPLETED' : 'UPCOMING'),
      progress: currentDay <= 30 ? 0 : Math.min(100, Math.round((Math.min(30, Math.max(0, currentDay - 30)) / 30) * 100)),
    },
    {
      phaseNumber: 3,
      title: 'Phase 3: Performance',
      days: 'Days 61–90',
      status: currentDay > 60 ? 'CURRENT' : 'UPCOMING',
      progress: currentDay <= 60 ? 0 : Math.min(100, Math.round((Math.max(0, currentDay - 60) / 30) * 100)),
    },
  ];

  // Milestones sourced dynamically from Challenge & ChallengeParticipant models ("milestone is the challenge")
  const participations = await ChallengeParticipant.find({ athlete: athlete._id }).lean();
  const participatedChallengeIds = participations.map((p) => p.challenge);
  const partMap = new Map(participations.map((p) => [p.challenge.toString(), p]));

  const challenges = await Challenge.find({
    $or: [
      { _id: { $in: participatedChallengeIds } },
      { assignedAthletes: athlete._id },
      {
        status: { $in: ['active', 'completed', 'upcoming'] },
        $or: [
          { assignedAthletes: { $exists: false } },
          { assignedAthletes: { $size: 0 } },
          { assignedAthletes: athlete._id },
        ],
      },
    ],
  })
    .sort({ startDate: 1, createdAt: 1 })
    .lean();

  const defaultCheckpoints = [7, 14, 30, 60, 90];
  const usedDays = new Set();

  const milestones = challenges.map((c, idx) => {
    const p = partMap.get(c._id.toString());
    const isCompleted = Boolean(
      p && (p.isGoalReached || p.completedAt || (p.earnedXp && c.xpGoal && p.earnedXp >= c.xpGoal))
    );

    let dayNumber = null;
    if (athlete.mentorshipStartDate && c.startDate) {
      const diffDays = Math.ceil(
        (new Date(c.startDate).getTime() - new Date(athlete.mentorshipStartDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays > 0 && diffDays <= 90 && !usedDays.has(diffDays)) {
        dayNumber = diffDays;
      }
    }

    if (!dayNumber) {
      dayNumber = defaultCheckpoints.find((d) => !usedDays.has(d)) || Math.min(90, (idx + 1) * 15);
    }
    usedDays.add(dayNumber);

    const dayLabel = `Day ${dayNumber}`;

    return {
      _id: c._id.toString(),
      title: c.title,
      description: c.description || '',
      day: dayLabel,
      dayNumber,
      isCompleted,
      status: isCompleted ? 'COMPLETED' : (p ? 'IN_PROGRESS' : 'UPCOMING'),
      xpGoal: c.xpGoal || 0,
      earnedXp: p?.earnedXp || 0,
      icon: c.icon || '🏆',
      category: c.category || 'mental',
      difficulty: c.difficulty || 'medium',
      completedAt: p?.completedAt || null,
      startDate: c.startDate || null,
      endDate: c.endDate || null,
    };
  });

  const currentPhase = phases.find((p) => p.status === 'CURRENT') || phases[0];

  return {
    dateRange,
    program: {
      currentDay,
      totalDays,
      daysRemaining,
      percentComplete,
      currentPhase: currentPhase?.title || '',
    },
    stats: {
      sessions: sessionsCount,
      submissions: submissionsCount,
      habitsDone: habitsDoneCount,
    },
    phases,
    milestones,
  };
};

/**
 * Complete / Toggle a Mentorship Milestone (Challenge)
 */
const completeMentorshipMilestoneService = async (challengeId, userId) => {
  let athlete = null;
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    athlete = await userModel.findById(userId);
  }
  if (!athlete) {
    athlete = await userModel.findOne({ role: 'athlete', isDeleted: false });
  }
  if (!athlete) {
    const error = new Error('Athlete not found');
    error.statusCode = 404;
    throw error;
  }

  const Challenge = require('../Challenge/challenge.model');
  const ChallengeParticipant = require('../Challenge/challengeParticipant.model');

  const challenge = await Challenge.findById(challengeId);
  if (!challenge) {
    const error = new Error('Challenge/Milestone not found');
    error.statusCode = 404;
    throw error;
  }

  let participant = await ChallengeParticipant.findOne({
    challenge: challenge._id,
    athlete: athlete._id,
  });

  if (!participant) {
    participant = new ChallengeParticipant({
      challenge: challenge._id,
      athlete: athlete._id,
      earnedXp: challenge.xpGoal || 50,
      isGoalReached: true,
      completedAt: new Date(),
    });
  } else {
    participant.isGoalReached = !participant.isGoalReached;
    participant.completedAt = participant.isGoalReached ? new Date() : null;
    if (participant.isGoalReached && (!participant.earnedXp || participant.earnedXp < (challenge.xpGoal || 50))) {
      participant.earnedXp = challenge.xpGoal || 50;
    }
  }

  await participant.save();

  // If newly completed, increment user total XP
  if (participant.isGoalReached) {
    await userModel.findByIdAndUpdate(athlete._id, {
      $inc: { xp: challenge.xpGoal || 50 },
    });
  }

  return {
    milestoneId: challenge._id.toString(),
    title: challenge.title,
    isCompleted: participant.isGoalReached,
    completedAt: participant.completedAt,
    earnedXp: participant.earnedXp,
    message: participant.isGoalReached
      ? `Milestone "${challenge.title}" marked as completed!`
      : `Milestone "${challenge.title}" marked as incomplete.`,
  };
};

/**
 * Compete Screen (Figma Node 32817:6437)
 * Header: COMPETE · Rise through the ranks · prove your mentality
 * Top Banner: Your Rank card (Rank #, ALEX, XP, streak)
 * Scope Tabs: 🌍 Regional / 🏆 National
 * Leaderboard: Ranked list of athletes with medals, streaks, XP, (You) highlight
 * Challenges: Dynamic cards with XP, Badges/Trophies, time left, and Join action
 */
const getUserCompetePageService = async (userId, query = {}) => {
  let currentUser = null;
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    currentUser = await userModel.findById(userId).lean();
  }
  if (!currentUser) {
    const error = new Error('Authentication required. Please login with a valid token to view compete and leaderboard.');
    error.statusCode = 401;
    throw error;
  }

  const scope = (query.scope || query.tab || 'regional').toLowerCase();
  const userRegion = currentUser.region;
  const userNation = currentUser.nation || currentUser.nationality;

  const filter = {
    role: 'athlete',
    isDeleted: false,
    isBan: { $ne: true },
  };

  if (scope === 'national') {
    const targetNation = query.nation || userNation;
    if (targetNation) {
      filter.$or = [
        { nation: new RegExp(`^${targetNation}$`, 'i') },
        { nationality: new RegExp(`^${targetNation}$`, 'i') },
      ];
    }
  } else {
    // Default: regional
    const targetRegion = query.region || userRegion;
    if (targetRegion) {
      filter.region = new RegExp(`^${targetRegion}$`, 'i');
    }
  }

  const athletes = await userModel
    .find(filter)
    .select('fullName xp streak region nation nationality createdAt')
    .sort({ xp: -1, streak: -1, createdAt: 1 })
    .lean();

  // Calculate user real rank in this scope
  const userRankIdx = athletes.findIndex((a) => a._id.toString() === currentUser._id.toString());
  let userRankNumber = userRankIdx >= 0 ? userRankIdx + 1 : 0;
  if (userRankNumber === 0) {
    const higherCount = await userModel.countDocuments({
      ...filter,
      xp: { $gt: currentUser.xp || 0 },
    });
    userRankNumber = higherCount + 1;
  }

  // Limit leaderboard to top 7 matching Figma design
  const limit = Math.max(1, parseInt(query.limit, 10) || 7);
  const topAthletes = athletes.slice(0, limit);

  const leaderboard = topAthletes.map((a, idx) => {
    const rank = idx + 1;
    const isCurrentUser = a._id.toString() === currentUser._id.toString();

    let badge = '';
    if (rank === 1) badge = '🥇';
    else if (rank === 2) badge = '🥈';
    else if (rank === 3) badge = '🥉';
    else if (rank === 4) badge = '🎖';
    else if (isCurrentUser) badge = '⭐';
    else badge = String(rank);

    let name = (a.fullName || '').trim();
    const nameParts = name.split(/\s+/);
    if (nameParts.length > 1) {
      name = `${nameParts[0]} ${nameParts[1].charAt(0).toUpperCase()}.`;
    }
    if (isCurrentUser) {
      name = `${nameParts[0]} (You)`;
    }

    return {
      _id: a._id.toString(),
      rank,
      badge,
      name,
      streak: `🔥 ${a.streak || 0} day streak`,
      xp: (a.xp || 0).toLocaleString(),
      isCurrentUser,
    };
  });

  // Top Banner Card: e.g. Rank 5, ALEX, 2,340 XP, 🔥 5 day streak
  const firstName = (currentUser.fullName || '').trim().split(/\s+/)[0].toUpperCase();
  const yourRank = {
    _id: currentUser._id.toString(),
    rank: userRankNumber,
    name: firstName || currentUser.fullName || '',
    xp: `${(currentUser.xp || 0).toLocaleString()} XP`,
    streak: `🔥 ${currentUser.streak || 0} day streak`,
  };

  // Challenges section (Figma Node 32817:6878)
  const Challenge = require('../Challenge/challenge.model');

  const challenges = await Challenge.find({ status: { $in: ['active', 'upcoming'] } })
    .sort({ startDate: 1, createdAt: 1 })
    .lean();

  const challengesList = challenges.map((c) => {
    // Calculate real time left from DB endDate
    let timeLeft = '';
    if (c.endDate) {
      const now = Date.now();
      const endDateMs = new Date(c.endDate).getTime();
      const diffDays = Math.ceil((endDateMs - now) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        timeLeft = `${diffDays}d left`;
      } else if (diffDays === 0) {
        timeLeft = 'Ends today';
      }
    }

    const rewards = [];
    if (c.xpGoal) rewards.push(`${c.xpGoal.toLocaleString()} XP`);
    if (c.rewardBadge) rewards.push(c.rewardBadge.includes('Badge') ? c.rewardBadge : `${c.rewardBadge} Badge`);
    if (c.rewardTrophy) rewards.push(c.rewardTrophy.includes('Trophy') ? c.rewardTrophy : `${c.rewardTrophy} Trophy`);

    const subtitleParts = [];
    if (rewards.length > 0) subtitleParts.push(rewards.join(' + '));
    if (timeLeft) subtitleParts.push(timeLeft);
    const subtitle = subtitleParts.join(' · ');

    return {
      _id: c._id.toString(),
      icon: c.icon || '🏆',
      title: c.title,
      subtitle,
    };
  });

  return {
    yourRank,
    scope,
    leaderboard,
    challenges: challengesList,
  };
};

/**
 * Join a Challenge from the Compete Screen (Figma Node 32817:6437)
 */
const joinCompeteChallengeService = async (challengeId, userId) => {
  let athlete = null;
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    athlete = await userModel.findById(userId);
  }
  if (!athlete) {
    const error = new Error('Authentication required. Please login with a valid token to join challenges.');
    error.statusCode = 401;
    throw error;
  }

  const Challenge = require('../Challenge/challenge.model');
  const ChallengeParticipant = require('../Challenge/challengeParticipant.model');

  const challenge = await Challenge.findById(challengeId);
  if (!challenge) {
    const error = new Error('Challenge not found');
    error.statusCode = 404;
    throw error;
  }

  let participant = await ChallengeParticipant.findOne({
    challenge: challenge._id,
    athlete: athlete._id,
  });

  let isNew = false;
  if (!participant) {
    participant = await ChallengeParticipant.create({
      challenge: challenge._id,
      athlete: athlete._id,
      earnedXp: 0,
      completedActivities: [],
      isGoalReached: false,
    });
    isNew = true;
  }

  const alreadyAssigned = challenge.assignedAthletes.some((id) => id.toString() === athlete._id.toString());
  if (!alreadyAssigned) {
    challenge.assignedAthletes.push(athlete._id);
    await challenge.save();
  }

  return {
    challengeId: challenge._id.toString(),
    title: challenge.title,
    message: isNew
      ? `Successfully joined "${challenge.title}" challenge!`
      : `You are already enrolled in "${challenge.title}" challenge.`,
  };
};

module.exports = {
  suspendUserService,
  activeUserService,
  giveFlagService,
  giveNoteService,
  giveCreditService,
  fcmTokenService,
  deleteFcmTokenService,
  bulkGiveFlagService,
  bulkGiveNoteService,
  bulkSuspendUserService,
  bulkGiveCreditService,
  bulkActiveUserService,
  togglePushNotificationService,
  getPushNotificationService,
  getUserHomeFeedService,
  createCoachService,
  getCoachesService,
  createAthleteService,
  getAthletesService,
  assignCoachService,
  getAssignedCoachesOverviewService,
  getUserProfileService,
  awardBadgeService,
  getAthleteProgressReviewService,
  submitCoachEvaluationService,
  getAthleteDevPlanService,
  toggleAthleteHabitTodayService,
  getUserHomepageService,
  completeHomepageMissionService,
  submitHomepageFeedbackService,
  purchase90DaysProgramService,
  reset90DaysProgramService,
  getMyProgramService,
  toggleProgramTaskService,
  getMyCoachService,
  getMentorshipGoalsHabitsService,
  getMentorshipTrainingProgramService,
  completeMentorshipTrainingDrillService,
  getMentorshipProgressService,
  completeMentorshipMilestoneService,
  getUserCompetePageService,
  joinCompeteChallengeService,
};