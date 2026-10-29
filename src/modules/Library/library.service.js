const mongoose = require('mongoose');
const httpStatus = require('http-status').default;
const ApiError = require('../../helpers/ApiError');
const LibraryItem = require('./library.model');
const User = require('../User/user.model');

// Parse helper for arrays (handling string with newlines, bullet points, or comma arrays)
const parseLines = (input) => {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter(Boolean);
  if (typeof input === 'string') {
    return input
      .split('\n')
      .map((l) => l.trim().replace(/^[-*•\d.]+\s*/, ''))
      .filter(Boolean);
  }
  return [];
};

/**
 * Format an item cleanly based on its contentType
 */
const formatLibraryItem = (item) => {
  const base = {
    _id: item._id,
    contentType: item.contentType,
    title: item.title,
    createdAt: item.createdAt,
  };

  const coachId = item.coachId?._id
    ? item.coachId._id.toString()
    : item.coachId
    ? item.coachId.toString()
    : item.coach?._id
    ? item.coach._id.toString()
    : item.coach
    ? item.coach.toString()
    : null;
  const coachName =
    (item.coachId && (item.coachId.fullName || `${item.coachId.firstName || ''} ${item.coachId.lastName || ''}`.trim() || item.coachId.name)) ||
    (item.coach && (item.coach.fullName || `${item.coach.firstName || ''} ${item.coach.lastName || ''}`.trim() || item.coach.name)) ||
    '';

  if (item.contentType === 'habit') {
    return {
      ...base,
      category: item.category || 'Mindset',
      frequency: item.frequency || 'Daily (7x a week)',
      checkInWindow: item.checkInWindow || 'Morning (8:00 AM)',
      xpReward: item.xpReward || 0,
      instructions: item.instructions || '',
    };
  }

  if (item.contentType === 'video-drill') {
    return {
      _id: item._id,
      contentType: 'video-drill',
      title: item.title,
      videoUrl: item.videoUrl || item.video || '',
      category: item.category || 'Mindset',
      xpReward: item.xpReward || 0,
      coachId: coachId,
      coachName: coachName,
      teachingPoints: item.teachingPoints || [],
      createdAt: item.createdAt,
    };
  }

  if (item.contentType === 'reflection') {
    const promptList =
      item.prompt && item.prompt.length > 0
        ? item.prompt
        : item.questions && item.questions.length > 0
        ? item.questions
        : [];
    return {
      ...base,
      formType: item.formType || 'Match Audit',
      completionTime: item.completionTime || '5 min',
      prompt: promptList,
      autoPostToChat: Boolean(item.autoPostToChat),
    };
  }

  if (item.contentType === 'curriculum') {
    const phases = item.phases || [];
    return {
      ...base,
      curriculumType: item.curriculumType || 'Flagship 90-Day',
      duration: item.duration || '12 Weeks (90 Days)',
      tier: item.tier || 'Mentorship 90 Tier',
      phases,
      phaseCount: phases.length,
      moduleCount: item.moduleCount || 24,
    };
  }

  return base;
};

/**
 * Get Master Libraries Overview (Figma nodes 33302:24339, 33304:673, 33304:1357, 33304:2397)
 */
const getLibraryOverviewService = async (query = {}) => {
  // Live dynamic count queries
  const [habitsCount, videoDrillsCount, reflectionsCount, curriculumsCount] = await Promise.all([
    LibraryItem.countDocuments({ contentType: 'habit', isActive: true }),
    LibraryItem.countDocuments({ contentType: 'video-drill', isActive: true }),
    LibraryItem.countDocuments({ contentType: 'reflection', isActive: true }),
    LibraryItem.countDocuments({ contentType: 'curriculum', isActive: true }),
  ]);

  const filterCounts = {
    habits: habitsCount,
    videoDrills: videoDrillsCount,
    reflections: reflectionsCount,
    curriculums: curriculumsCount,
  };

  const filter = { isActive: true };

  // Filter by category tab
  if (query.type && query.type !== 'all') {
    const qType = query.type.toLowerCase().trim();
    if (qType.includes('habit')) {
      filter.contentType = 'habit';
    } else if (qType.includes('video') || qType.includes('drill')) {
      filter.contentType = 'video-drill';
    } else if (qType.includes('reflect')) {
      filter.contentType = 'reflection';
    } else if (qType.includes('curricul')) {
      filter.contentType = 'curriculum';
    }
  }

  if (query.search && query.search.trim()) {
    filter.title = { $regex: query.search.trim(), $options: 'i' };
  }

  const rawItems = await LibraryItem.find(filter)
    .populate('coachId', '_id fullName firstName lastName name image')
    .populate('coach', '_id fullName firstName lastName name image')
    .sort({ createdAt: -1 });
  const items = rawItems.map(formatLibraryItem);

  return {
    filterCounts,
    items,
  };
};

/**
 * Create New Master Library Item (Figma nodes 33302:25759, 33304:569, 33304:2141, 33304:3116)
 */
const createLibraryItemService = async (payload) => {
  const {
    contentType,
    title,
    category,
    xpReward,
    video,
    image,
    thumbnail,
    coachId,
    coach,
    // Habit
    frequency,
    checkInWindow,
    instructions,
    // Video Drill
    videoUrl,
    phase,
    duration,
    teachingPoints,
    // Reflection
    formType,
    completionTime,
    prompt,
    prompts,
    questions,
    autoPostToChat,
    // Curriculum
    curriculumType,
    tier,
    phases,
    moduleCount,
    createdBy,
  } = payload;

  if (!title || !title.trim()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Title is required.');
  }

  let inferredType = (contentType || '').toString().trim().toLowerCase();
  if (!inferredType) {
    if (coachId || coach || video || payload.videoUrl || payload.teachingPoints) {
      inferredType = 'video-drill';
    } else if (payload.formType || payload.prompt || payload.questions) {
      inferredType = 'reflection';
    } else if (payload.curriculumType || payload.phases) {
      inferredType = 'curriculum';
    } else {
      inferredType = 'habit';
    }
  }

  // Normalize contentType
  const rawType = inferredType;
  let normalizedType = 'habit';
  if (rawType.includes('video') || rawType.includes('drill')) {
    normalizedType = 'video-drill';
  } else if (rawType.includes('reflect')) {
    normalizedType = 'reflection';
  } else if (rawType.includes('curricul')) {
    normalizedType = 'curriculum';
  }

  // Take coachId (Coach ID is required for video drills)
  const targetCoachId =
    coachId ||
    (coach && typeof coach === 'string' && mongoose.Types.ObjectId.isValid(coach)
      ? coach
      : null) ||
    (coach && coach._id ? coach._id : null);

  if (normalizedType === 'video-drill' && !targetCoachId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'coachId is required for video drills.');
  }

  let resolvedCoach = null;

  if (targetCoachId) {
    if (!mongoose.Types.ObjectId.isValid(targetCoachId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid coachId format.');
    }
    const coachDoc = await User.findOne({ _id: targetCoachId, isDeleted: false });
    if (!coachDoc) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Coach not found with the provided coachId.');
    }
    resolvedCoach = coachDoc._id;
  }

  const itemData = {
    contentType: normalizedType,
    title: title.trim(),
    category: (category || 'Mindset').trim(),
    xpReward: Number(xpReward) || 0,
    createdBy: createdBy && mongoose.Types.ObjectId.isValid(createdBy) ? createdBy : null,
  };

  if (normalizedType === 'habit') {
    itemData.frequency = frequency || 'Daily (7x a week)';
    itemData.checkInWindow = checkInWindow || 'Morning (8:00 AM)';
    itemData.instructions = instructions || '';
  } else if (normalizedType === 'video-drill') {
    itemData.video = videoUrl || video || '';
    itemData.videoUrl = videoUrl || video || '';
    itemData.coachId = resolvedCoach;
    itemData.coach = resolvedCoach;
    itemData.teachingPoints = parseLines(teachingPoints);
  } else if (normalizedType === 'reflection') {
    itemData.formType = formType || 'Match Audit';
    itemData.completionTime = completionTime || '5 min';
    const parsedPrompts = parseLines(prompt || prompts || questions);
    itemData.prompt = parsedPrompts;
    itemData.questions = parsedPrompts;
    itemData.autoPostToChat = autoPostToChat !== undefined ? Boolean(autoPostToChat) : true;
  } else if (normalizedType === 'curriculum') {
    itemData.curriculumType = curriculumType || 'Flagship 90-Day';
    itemData.duration = duration || '12 Weeks (90 Days)';
    itemData.tier = tier || 'Mentorship 90 Tier';
    itemData.moduleCount = Number(moduleCount) || 24;

    if (Array.isArray(phases)) {
      itemData.phases = phases;
    } else if (typeof phases === 'string') {
      const parsedPhases = parseLines(phases).map((p, idx) => ({
        phaseNumber: idx + 1,
        title: p,
        description: '',
      }));
      itemData.phases = parsedPhases;
    }
  }

  const libraryItem = new LibraryItem(itemData);
  await libraryItem.save();
  await libraryItem.populate('coachId', '_id fullName firstName lastName name image');
  await libraryItem.populate('coach', '_id fullName firstName lastName name image');

  return formatLibraryItem(libraryItem);
};

/**
 * Get Library Item By ID
 */
const getLibraryItemByIdService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid item ID format.');
  }

  const item = await LibraryItem.findById(id)
    .populate('coachId', '_id fullName firstName lastName name image')
    .populate('coach', '_id fullName firstName lastName name image');
  if (!item || !item.isActive) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Library item not found.');
  }

  return formatLibraryItem(item);
};

/**
 * Update Library Item
 */
const updateLibraryItemService = async (id, updateData) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid item ID format.');
  }

  const item = await LibraryItem.findById(id);
  if (!item || !item.isActive) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Library item not found.');
  }

  const allowedFields = [
    'title',
    'category',
    'xpReward',
    'video',
    'image',
    'thumbnail',
    'frequency',
    'checkInWindow',
    'instructions',
    'videoUrl',
    'phase',
    'duration',
    'coachId',
    'coach',
    'teachingPoints',
    'formType',
    'completionTime',
    'prompt',
    'prompts',
    'questions',
    'autoPostToChat',
    'curriculumType',
    'tier',
    'phases',
    'moduleCount',
  ];

  if (updateData.coachId !== undefined || updateData.coach !== undefined) {
    const targetCoachId = updateData.coachId !== undefined ? updateData.coachId : updateData.coach;
    if (targetCoachId) {
      if (!mongoose.Types.ObjectId.isValid(targetCoachId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid coachId format.');
      }
      const coachDoc = await User.findOne({ _id: targetCoachId, isDeleted: false });
      if (!coachDoc) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Coach not found with the provided coachId.');
      }
      item.coachId = coachDoc._id;
      item.coach = coachDoc._id;
    } else if (targetCoachId === null || targetCoachId === '') {
      item.coachId = null;
      item.coach = null;
    }
  }

  allowedFields.forEach((field) => {
    if (field === 'coach' || field === 'coachId') return;
    if (updateData[field] !== undefined) {
      if (field === 'prompt' || field === 'prompts' || field === 'questions') {
        const parsed = parseLines(updateData[field]);
        item.prompt = parsed;
        item.questions = parsed;
      } else {
        item[field] = updateData[field];
      }
    }
  });

  await item.save();
  await item.populate('coachId', '_id fullName firstName lastName name image');
  await item.populate('coach', '_id fullName firstName lastName name image');
  return formatLibraryItem(item);
};

/**
 * Delete Library Item (Soft delete or remove)
 */
const deleteLibraryItemService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid item ID format.');
  }

  const item = await LibraryItem.findByIdAndDelete(id);
  if (!item) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Library item not found.');
  }

  return { id, deleted: true };
};

module.exports = {
  getLibraryOverviewService,
  createLibraryItemService,
  getLibraryItemByIdService,
  updateLibraryItemService,
  deleteLibraryItemService,
};
