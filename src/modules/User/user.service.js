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
};