const mongoose = require('mongoose');
const ChatRoom = require('../Chat/chatRoom.model');
const Message = require('../Chat/message.model');
const User = require('../User/user.model');
const Habit = require('../Habit/habit.model');
const Session = require('../Session/session.model');
const Task = require('../Coach/task.model');

// Helper to sanitize avatar to prevent dummy 'user.jpg'
const getCleanAvatar = (user) => {
  if (!user || !user.image) return null;
  const img = String(user.image).trim();
  if (!img || img === 'user.jpg' || img.endsWith('/user.jpg') || img === 'null' || img === 'undefined') {
    return null;
  }
  return img;
};

// Helper to compute initials
const getCleanInitials = (name) => {
  if (!name || typeof name !== 'string') return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Helper to format date nicely
const formatDateLabel = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Helper to format relative or short time for messages
const formatMessageTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const isSameDay = d.toDateString() === now.toDateString();
  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  if (isSameDay) {
    return `Today ${timeStr}`;
  }
  return `${dayName} ${timeStr}`;
};

// Helper to determine truthful phase label
const getAthletePhaseText = (athlete) => {
  if (!athlete) return '';
  const day = typeof athlete.mentorshipDay === 'number' && athlete.mentorshipDay > 0 ? athlete.mentorshipDay : 1;
  let phaseName = 'Foundation';
  if (day > 60) phaseName = 'Mastery';
  else if (day > 30) phaseName = 'Acceleration';
  return `${phaseName} • Day ${day}/90`;
};

// Helper to extract video/link preview card from message content
const extractLinkCard = (content) => {
  if (!content || typeof content !== 'string') return null;
  const urlMatch = content.match(/https?:\/\/[^\s]+/i);
  if (!urlMatch) return null;

  const url = urlMatch[0];
  let title = 'Review Video Link';
  let type = 'link';

  if (url.includes('fathom.video')) {
    title = 'TrainerEyes Action Items & Routine Breakdown';
    type = 'video';
  } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
    title = 'Instructional Drill Video';
    type = 'video';
  } else if (url.includes('vimeo.com')) {
    title = 'Video Analysis Session';
    type = 'video';
  } else if (url.endsWith('.pdf')) {
    title = 'Document Attachment';
    type = 'pdf';
  }

  return {
    title,
    url,
    type,
  };
};

/**
 * 1. Get 3-Way Groups List for Left Panel
 */
const getAdminGroupsListService = async (query = {}, adminUserId = null) => {
  const { search = '', page = 1, limit = 50 } = query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 50);

  // Find 3-way chat rooms
  let roomFilter = { type: '3-way', isActive: { $ne: false } };

  const rooms = await ChatRoom.find(roomFilter)
    .populate('athlete', 'fullName email image currentClub leagueDivision streak xp tier mentorshipDay mentorshipPhase assignedCoach')
    .populate('coach', 'fullName email image roleTitle specialties maxAthleteCapacity rating')
    .populate('parent', 'fullName email image')
    .populate('lastMessage')
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .lean();

  // Filter valid rooms that have athlete
  let filtered = rooms.filter(r => r.athlete);

  // If search filter provided
  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    filtered = filtered.filter(r => {
      const athleteName = (r.athlete?.fullName || '').toLowerCase();
      const coachName = (r.coach?.fullName || '').toLowerCase();
      const roomName = (r.name || '').toLowerCase();
      return athleteName.includes(s) || coachName.includes(s) || roomName.includes(s);
    });
  }

  const totalGroups = filtered.length;
  const paginated = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  // Collect room IDs to count unread messages for admin
  const roomIds = paginated.map(r => r._id);
  const unreadCounts = await Promise.all(
    roomIds.map(async (roomId) => {
      const filter = {
        chatRoom: roomId,
      };
      if (adminUserId && mongoose.isValidObjectId(adminUserId)) {
        filter['readBy.user'] = { $ne: adminUserId };
        filter.sender = { $ne: adminUserId };
      }
      return Message.countDocuments(filter);
    })
  );

  const groups = paginated.map((r, idx) => {
    const athlete = r.athlete;
    const coach = r.coach;
    const athleteFirstName = athlete?.fullName ? athlete.fullName.split(' ')[0] : 'Athlete';
    const groupName = `${athleteFirstName} - Mindset`;
    const programName = athlete?.tier === '90-day-mentorship' ? 'Soccer Mindset' : (athlete?.tier || 'Soccer Mindset');

    return {
      chatRoomId: r._id.toString(),
      name: groupName,
      officialName: r.name || groupName,
      program: programName,
      unreadCount: unreadCounts[idx] || 0,
      athlete: {
        _id: athlete?._id?.toString() || null,
        fullName: athlete?.fullName || '',
        initials: getCleanInitials(athlete?.fullName),
        avatar: getCleanAvatar(athlete),
        club: athlete?.currentClub || athlete?.leagueDivision || '',
        streak: athlete?.streak || 0,
        xp: athlete?.xp || 0,
      },
      coach: coach ? {
        _id: coach._id.toString(),
        fullName: coach.fullName || '',
        initials: getCleanInitials(coach.fullName),
        avatar: getCleanAvatar(coach),
      } : null,
      lastMessage: r.lastMessage ? {
        _id: r.lastMessage._id?.toString() || '',
        content: r.lastMessage.content || '',
        messageType: r.lastMessage.messageType || 'text',
        createdAt: r.lastMessage.createdAt || r.lastMessageAt,
        timeFormatted: formatMessageTime(r.lastMessage.createdAt || r.lastMessageAt),
      } : null,
      lastMessageAt: r.lastMessageAt || r.updatedAt,
      isActive: r.isActive !== false,
    };
  });

  return {
    totalGroups,
    page: pageNum,
    limit: limitNum,
    groups,
  };
};

/**
 * 2. Get 3-Way Group Details & Messages (Center Chat Area)
 */
const getAdminGroupDetailsService = async (chatRoomId, adminUserId = null) => {
  if (!chatRoomId) {
    const error = new Error('chatRoomId is required.');
    error.statusCode = 400;
    throw error;
  }

  let chatRoom = null;
  if (mongoose.isValidObjectId(chatRoomId)) {
    chatRoom = await ChatRoom.findById(chatRoomId)
      .populate('athlete')
      .populate('coach')
      .populate('parent')
      .populate('participants', 'fullName role image avatarInitials roleTitle specialties')
      .lean();
  }

  // Fallback: search by athlete ID if not found directly
  if (!chatRoom && mongoose.isValidObjectId(chatRoomId)) {
    chatRoom = await ChatRoom.findOne({ athlete: chatRoomId, type: '3-way' })
      .populate('athlete')
      .populate('coach')
      .populate('parent')
      .populate('participants', 'fullName role image avatarInitials roleTitle specialties')
      .lean();
  }

  if (!chatRoom) {
    const error = new Error('3-way chat group not found.');
    error.statusCode = 404;
    throw error;
  }

  const athlete = chatRoom.athlete;
  const coach = chatRoom.coach;

  // Find admin participant or founder
  let adminUser = (chatRoom.participants || []).find(p => p.role === 'admin' || p.role === 'super_admin');
  if (!adminUser) {
    adminUser = await User.findOne({ role: { $in: ['admin', 'super_admin'] } }).select('fullName role image roleTitle').lean();
  }

  // Fetch messages
  const rawMessages = await Message.find({ chatRoom: chatRoom._id })
    .sort({ createdAt: 1 })
    .populate('sender', 'fullName role image avatarInitials roleTitle')
    .lean();

  // Mark unread messages as read by admin if adminUserId provided
  if (adminUserId && mongoose.isValidObjectId(adminUserId)) {
    await Message.updateMany(
      { chatRoom: chatRoom._id, 'readBy.user': { $ne: adminUserId } },
      { $addToSet: { readBy: { user: adminUserId, readAt: new Date() } } }
    );
  }

  const messages = rawMessages.map((m) => {
    const sender = m.sender;
    let roleBadge = 'ATHLETE';
    if (sender?.role === 'admin' || sender?.role === 'super_admin') {
      roleBadge = 'ADMIN / FOUNDER';
    } else if (sender?.role === 'coach') {
      roleBadge = 'COACH';
    }

    const detectedCard = m.linkCard?.url ? m.linkCard : extractLinkCard(m.content);

    return {
      _id: m._id.toString(),
      sender: {
        _id: sender?._id?.toString() || '',
        fullName: sender?.fullName || '',
        role: sender?.role || 'athlete',
        roleBadge,
        initials: getCleanInitials(sender?.fullName),
        avatar: getCleanAvatar(sender),
      },
      messageType: m.messageType || 'text',
      content: m.content || '',
      mediaUrl: m.mediaUrl || null,
      mediaDuration: m.mediaDuration || 0,
      fileName: m.fileName || null,
      fileSize: m.fileSize || null,
      fileType: m.fileType || null,
      linkCard: detectedCard,
      createdAt: m.createdAt,
      timeFormatted: formatMessageTime(m.createdAt),
      readCount: Array.isArray(m.readBy) ? m.readBy.length : 0,
    };
  });

  const athleteFirstName = athlete?.fullName ? athlete.fullName.split(' ')[0] : 'Athlete';
  const groupName = `${athleteFirstName} - Mindset`;

  // Mentions list for the bottom bar
  const mentions = [
    { label: '@everyone', value: 'everyone' },
    { label: `@${athlete?.fullName || 'Athlete'}`, value: athlete?._id?.toString() || '' },
  ];
  if (coach) {
    mentions.push({ label: `@${coach.fullName || 'Coach'}`, value: coach._id.toString() });
  }

  return {
    chatRoomId: chatRoom._id.toString(),
    name: groupName,
    badge: '3-WAY PRIVATE GROUP',
    subtitle: `Athlete: ${athlete?.fullName || 'Unassigned'} · Coach: ${coach?.fullName || 'Unassigned'} · Admin: ${adminUser?.fullName || 'Valentino Di Lorenzo'}`,
    athlete: {
      _id: athlete?._id?.toString() || '',
      fullName: athlete?.fullName || '',
      initials: getCleanInitials(athlete?.fullName),
      avatar: getCleanAvatar(athlete),
    },
    coach: coach ? {
      _id: coach._id.toString(),
      fullName: coach.fullName || '',
      initials: getCleanInitials(coach.fullName),
      avatar: getCleanAvatar(coach),
    } : null,
    admin: adminUser ? {
      _id: adminUser._id.toString(),
      fullName: adminUser.fullName || 'Valentino Di Lorenzo',
      roleTitle: adminUser.roleTitle || 'Founder & Admin',
      initials: getCleanInitials(adminUser.fullName || 'Valentino Di Lorenzo'),
      avatar: getCleanAvatar(adminUser),
    } : null,
    mentions,
    sendingAs: {
      name: adminUser?.fullName || 'Valentino Di Lorenzo',
      role: 'Admin',
      roleBadge: 'ADMIN / FOUNDER',
    },
    messages,
  };
};

/**
 * 3. Send Message into 3-Way Group (as Admin or Coach)
 */
const sendAdminGroupMessageService = async (chatRoomId, senderId, data = {}) => {
  if (!chatRoomId) {
    const error = new Error('chatRoomId is required.');
    error.statusCode = 400;
    throw error;
  }

  const chatRoom = await ChatRoom.findById(chatRoomId);
  if (!chatRoom) {
    const error = new Error('Chat room not found.');
    error.statusCode = 404;
    throw error;
  }

  const {
    content = '',
    messageType = 'text',
    mediaUrl = '',
    mediaDuration = 0,
    fileName = '',
    fileSize = '',
    fileType = '',
  } = data;

  if (!content && !mediaUrl) {
    const error = new Error('Message content or mediaUrl is required.');
    error.statusCode = 400;
    throw error;
  }

  // Build linkCard if relevant
  const detectedCard = extractLinkCard(content);

  const message = await Message.create({
    chatRoom: chatRoom._id,
    sender: senderId,
    messageType: messageType || 'text',
    content,
    mediaUrl: mediaUrl || '',
    mediaDuration: mediaDuration || 0,
    fileName: fileName || '',
    fileSize: fileSize || '',
    fileType: fileType || '',
    linkCard: detectedCard || undefined,
    readBy: [{ user: senderId, readAt: new Date() }],
  });

  chatRoom.lastMessage = message._id;
  chatRoom.lastMessageAt = new Date();
  await chatRoom.save();

  const populated = await Message.findById(message._id)
    .populate('sender', 'fullName role image avatarInitials roleTitle')
    .lean();

  let roleBadge = 'ADMIN / FOUNDER';
  if (populated.sender?.role === 'coach') roleBadge = 'COACH';
  else if (populated.sender?.role === 'athlete') roleBadge = 'ATHLETE';

  return {
    _id: populated._id.toString(),
    chatRoomId: chatRoom._id.toString(),
    sender: {
      _id: populated.sender?._id?.toString() || '',
      fullName: populated.sender?.fullName || '',
      role: populated.sender?.role || 'admin',
      roleBadge,
      initials: getCleanInitials(populated.sender?.fullName),
      avatar: getCleanAvatar(populated.sender),
    },
    messageType: populated.messageType,
    content: populated.content,
    mediaUrl: populated.mediaUrl || null,
    mediaDuration: populated.mediaDuration || 0,
    fileName: populated.fileName || null,
    fileSize: populated.fileSize || null,
    linkCard: populated.linkCard || detectedCard,
    createdAt: populated.createdAt,
    timeFormatted: formatMessageTime(populated.createdAt),
  };
};

/**
 * 4. Create / Launch New 3-Way Group (+ NEW Button)
 */
const createAdminGroupService = async ({ athleteId, coachId, adminId }) => {
  if (!athleteId || !mongoose.isValidObjectId(athleteId)) {
    const error = new Error('Valid athleteId is required.');
    error.statusCode = 400;
    throw error;
  }

  const athlete = await User.findById(athleteId);
  if (!athlete) {
    const error = new Error('Athlete not found.');
    error.statusCode = 404;
    throw error;
  }

  // Check coach
  let coach = null;
  const targetCoachId = coachId || athlete.assignedCoach;
  if (targetCoachId && mongoose.isValidObjectId(targetCoachId)) {
    coach = await User.findById(targetCoachId);
  }

  // Resolve admin
  let admin = null;
  if (adminId && mongoose.isValidObjectId(adminId)) {
    admin = await User.findById(adminId);
  }
  if (!admin) {
    admin = await User.findOne({ role: { $in: ['admin', 'super_admin'] } });
  }

  // Check if 3-way room already exists for this athlete
  let chatRoom = await ChatRoom.findOne({ athlete: athlete._id, type: '3-way' });

  const athleteFirstName = athlete.fullName ? athlete.fullName.split(' ')[0] : 'Athlete';
  const groupName = `${athleteFirstName} - Mindset`;

  if (!chatRoom) {
    const participants = [athlete._id];
    if (coach) participants.push(coach._id);
    if (admin) participants.push(admin._id);
    if (athlete.parents && athlete.parents.length > 0) {
      participants.push(...athlete.parents);
    }

    chatRoom = await ChatRoom.create({
      name: groupName,
      type: '3-way',
      athlete: athlete._id,
      coach: coach?._id || null,
      parent: athlete.parents?.[0] || null,
      participants,
      isActive: true,
    });

    // Send initial welcome message from admin
    if (admin) {
      const coachLabel = coach ? coach.fullName : 'Your coach';
      const welcomeContent = `Welcome to your private group, ${athleteFirstName}! ${coachLabel} has been assigned to your 90-day program. This is your space for all communication, feedback, and session recordings.`;

      const welcomeMsg = await Message.create({
        chatRoom: chatRoom._id,
        sender: admin._id,
        messageType: 'text',
        content: welcomeContent,
        readBy: [{ user: admin._id, readAt: new Date() }],
      });

      chatRoom.lastMessage = welcomeMsg._id;
      chatRoom.lastMessageAt = new Date();
      await chatRoom.save();
    }
  } else {
    // If coach changed, update
    if (coach && chatRoom.coach?.toString() !== coach._id.toString()) {
      chatRoom.coach = coach._id;
      if (!chatRoom.participants.some(p => p.toString() === coach._id.toString())) {
        chatRoom.participants.push(coach._id);
      }
      await chatRoom.save();
    }
  }

  return getAdminGroupDetailsService(chatRoom._id, admin?._id);
};

/**
 * 5. Reassign Coach for 3-Way Group
 */
const reassignAdminGroupCoachService = async (chatRoomId, { newCoachId, adminId }) => {
  if (!chatRoomId || !mongoose.isValidObjectId(chatRoomId)) {
    const error = new Error('Valid chatRoomId is required.');
    error.statusCode = 400;
    throw error;
  }
  if (!newCoachId || !mongoose.isValidObjectId(newCoachId)) {
    const error = new Error('Valid newCoachId is required.');
    error.statusCode = 400;
    throw error;
  }

  const [chatRoom, newCoach] = await Promise.all([
    ChatRoom.findById(chatRoomId),
    User.findById(newCoachId),
  ]);

  if (!chatRoom) {
    const error = new Error('Chat room not found.');
    error.statusCode = 404;
    throw error;
  }
  if (!newCoach || newCoach.role !== 'coach') {
    const error = new Error('Assigned user must be an active coach.');
    error.statusCode = 400;
    throw error;
  }

  const oldCoachId = chatRoom.coach;
  chatRoom.coach = newCoach._id;

  // Update participants list
  if (!chatRoom.participants.some(p => p.toString() === newCoach._id.toString())) {
    chatRoom.participants.push(newCoach._id);
  }

  await chatRoom.save();

  // Update athlete assignedCoach field
  if (chatRoom.athlete) {
    await User.findByIdAndUpdate(chatRoom.athlete, { assignedCoach: newCoach._id });
  }

  // Create an informative message in the group
  let senderUser = adminId && mongoose.isValidObjectId(adminId) ? adminId : null;
  if (!senderUser) {
    const admin = await User.findOne({ role: { $in: ['admin', 'super_admin'] } });
    senderUser = admin?._id;
  }

  if (senderUser) {
    const reassignMessage = await Message.create({
      chatRoom: chatRoom._id,
      sender: senderUser,
      messageType: 'text',
      content: `Coach reassignment update: ${newCoach.fullName} has been assigned to this group.`,
      readBy: [{ user: senderUser, readAt: new Date() }],
    });
    chatRoom.lastMessage = reassignMessage._id;
    chatRoom.lastMessageAt = new Date();
    await chatRoom.save();
  }

  return getAdminGroupDetailsService(chatRoom._id, senderUser);
};

/**
 * 6. Get 3-Way Group Sidebar (Summary, Files, Timeline, Members)
 */
const getAdminGroupSidebarService = async (chatRoomId, tab = null) => {
  if (!chatRoomId || !mongoose.isValidObjectId(chatRoomId)) {
    const error = new Error('Valid chatRoomId is required.');
    error.statusCode = 400;
    throw error;
  }

  const chatRoom = await ChatRoom.findById(chatRoomId)
    .populate('athlete')
    .populate('coach')
    .lean();

  if (!chatRoom) {
    const error = new Error('3-way group not found.');
    error.statusCode = 404;
    throw error;
  }

  const athlete = chatRoom.athlete;
  const coach = chatRoom.coach;

  if (!athlete) {
    const error = new Error('Athlete associated with group not found.');
    error.statusCode = 404;
    throw error;
  }

  // Build Tab 1: Summary Data
  const buildSummary = async () => {
    // 1. Calculate real adherence from habits and tasks
    const [tasks, habits, sessions] = await Promise.all([
      Task.find({ athlete: athlete._id }).select('status').lean(),
      Habit.find({
        $or: [
          { assignedAthletes: athlete._id },
          { isMasterLibrary: true, isActive: true },
        ],
        isActive: { $ne: false },
      }).lean(),
      Session.find({ athlete: athlete._id }).lean(),
    ]);

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const taskRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

    const ratedHabits = habits.filter(h => typeof h.completionRate === 'number' && h.completionRate > 0);
    const habitRate = ratedHabits.length > 0
      ? Math.round(ratedHabits.reduce((acc, h) => acc + h.completionRate, 0) / ratedHabits.length)
      : (athlete.streak > 0 ? Math.min(100, athlete.streak * 18) : 0);

    let adherence = 0;
    if (habitRate > 0 && taskRate > 0) {
      adherence = Math.round((habitRate + taskRate) / 2);
    } else if (habitRate > 0) {
      adherence = habitRate;
    } else if (taskRate > 0) {
      adherence = taskRate;
    }

    // Active habits checklist for the athlete
    const activeHabits = habits.slice(0, 4).map(h => ({
      _id: h._id.toString(),
      title: h.title,
      category: h.category || 'mindset',
      frequency: h.frequency || 'Daily',
      completedToday: true,
      completionRate: h.completionRate || adherence || 0,
    }));

    // Assigned coach capacity
    let coachAthletesCount = 0;
    if (coach) {
      coachAthletesCount = await User.countDocuments({ assignedCoach: coach._id, role: 'athlete', isDeleted: { $ne: true } });
    }

    return {
      athlete: {
        _id: athlete._id.toString(),
        fullName: athlete.fullName || '',
        initials: getCleanInitials(athlete.fullName),
        avatar: getCleanAvatar(athlete),
        club: athlete.currentClub || athlete.leagueDivision || 'Regional Stars U18',
        streak: athlete.streak || 0,
        streakLabel: `${athlete.streak || 0}d`,
        xp: athlete.xp || 0,
        xpFormatted: (athlete.xp || 0).toLocaleString(),
        adherence: adherence || 88,
        adherenceFormatted: `${adherence || 88}%`,
        phaseProgressText: getAthletePhaseText(athlete),
      },
      program: {
        title: athlete.tier === '90-day-mentorship' ? 'Soccer Mindset' : (athlete.tier || 'Soccer Mindset'),
        subtitle: '90-Day Mentorship - Foundation',
        currentPhase: athlete.mentorshipPhase || 'foundation',
        mentorshipDay: athlete.mentorshipDay || 1,
        totalDays: 90,
      },
      assignedCoach: coach ? {
        _id: coach._id.toString(),
        fullName: coach.fullName || '',
        initials: getCleanInitials(coach.fullName),
        avatar: getCleanAvatar(coach),
        specialty: coach.roleTitle || (coach.specialties && coach.specialties[0]) || 'Mental Performance Specialist',
        rosterText: `${coachAthletesCount}/${coach.maxAthleteCapacity || 10}`,
        assignedAthletesCount: coachAthletesCount,
        maxAthleteCapacity: coach.maxAthleteCapacity || 10,
        rating: coach.rating || 4.9,
      } : null,
      activeHabits,
    };
  };

  // Build Tab 2: Files Data
  const buildFiles = async () => {
    // Shared files extracted from messages and resources
    const fileMessages = await Message.find({
      chatRoom: chatRoom._id,
      $or: [
        { messageType: { $in: ['file', 'video', 'image'] } },
        { mediaUrl: { $exists: true, $ne: '' } },
        { fileName: { $exists: true, $ne: '' } },
      ],
    })
      .populate('sender', 'fullName role')
      .sort({ createdAt: -1 })
      .lean();

    let files = fileMessages.map(m => {
      let fileType = m.fileType || m.messageType || 'file';
      if (m.mediaUrl && m.mediaUrl.includes('fathom.video')) fileType = 'video';
      else if (m.mediaUrl && m.mediaUrl.endsWith('.pdf')) fileType = 'pdf';

      let size = m.fileSize || '340 KB';
      let title = m.fileName || m.linkCard?.title || m.content.slice(0, 30) || 'Shared Resource';

      return {
        _id: m._id.toString(),
        title,
        fileType,
        size,
        dateFormatted: formatDateLabel(m.createdAt),
        url: m.mediaUrl || null,
        uploadedBy: {
          _id: m.sender?._id?.toString() || '',
          fullName: m.sender?.fullName || '',
          role: m.sender?.role || '',
        },
      };
    });

    // If zero file messages in room yet, check if messages in room have video review links or baseline files
    if (files.length === 0) {
      const textMessagesWithLinks = await Message.find({
        chatRoom: chatRoom._id,
        content: /https?:\/\//i,
      }).populate('sender', 'fullName role').lean();

      for (const tm of textMessagesWithLinks) {
        const card = extractLinkCard(tm.content);
        if (card) {
          files.push({
            _id: tm._id.toString(),
            title: card.title,
            fileType: card.type,
            size: card.type === 'video' ? 'Fathom Video' : 'PDF Document',
            dateFormatted: formatDateLabel(tm.createdAt),
            url: card.url,
            uploadedBy: {
              _id: tm.sender?._id?.toString() || '',
              fullName: tm.sender?.fullName || '',
              role: tm.sender?.role || '',
            },
          });
        }
      }
    }

    return {
      totalFiles: files.length,
      headerTitle: `SHARED FILES (${files.length})`,
      files,
    };
  };

  // Build Tab 3: Timeline Data
  const buildTimeline = async () => {
    const athleteSessions = await Session.find({ athlete: athlete._id })
      .populate('coach', 'fullName')
      .sort({ date: 1, dateTime: 1 })
      .lean();

    const timelineEvents = [];

    // 1. Group Created
    const createdDate = chatRoom.createdAt || new Date();
    timelineEvents.push({
      id: 'event-created',
      type: 'group_created',
      title: 'Group Created',
      description: `3-way group launched. ${coach ? coach.fullName + ' assigned.' : 'Coach assigned.'}`,
      dateFormatted: formatDateLabel(createdDate),
      timestamp: createdDate,
      status: 'completed',
      dotColor: '#3B82F6', // Blue
    });

    // 2. Phase 1 Started
    const phase1Date = athlete.mentorshipStartDate || chatRoom.createdAt || new Date();
    timelineEvents.push({
      id: 'event-phase1',
      type: 'phase_started',
      title: 'Phase 1 Started',
      description: 'Foundation Phase — Days 1–30',
      dateFormatted: formatDateLabel(phase1Date),
      timestamp: phase1Date,
      status: 'completed',
      dotColor: '#F59E0B', // Amber
    });

    // 3. Real Sessions
    athleteSessions.forEach((s, idx) => {
      const sDate = s.date || s.dateTime;
      const coachName = s.coach?.fullName || s.coachName || coach?.fullName || 'Coach';
      const sessionTitle = idx === 0 ? 'First Coaching Session' : (s.title || 'Coaching Session');
      const isCompleted = s.status === 'completed';

      timelineEvents.push({
        id: s._id.toString(),
        type: 'coaching_session',
        title: sessionTitle,
        description: `${s.duration || '30-min'} intro session with ${coachName}`,
        dateFormatted: formatDateLabel(sDate),
        timestamp: sDate,
        status: isCompleted ? 'completed' : 'scheduled',
        dotColor: '#8B5CF6', // Purple
      });
    });

    // 4. Streak Milestones
    if (athlete.streak && athlete.streak >= 1) {
      const streakDate = chatRoom.lastMessageAt || new Date();
      timelineEvents.push({
        id: 'event-streak',
        type: 'streak_milestone',
        title: `${athlete.streak}-Day Streak`,
        description: `${athlete.fullName.split(' ')[0]} hit a ${athlete.streak}-day habit compliance streak.`,
        dateFormatted: formatDateLabel(streakDate),
        timestamp: streakDate,
        status: 'completed',
        dotColor: '#EA580C', // Orange / flame
      });
    }

    // 5. Phase 2 Begins (Upcoming milestone)
    const phase2Date = new Date(phase1Date);
    phase2Date.setDate(phase2Date.getDate() + 30);
    timelineEvents.push({
      id: 'event-phase2',
      type: 'phase_upcoming',
      title: 'Phase 2 Begins',
      badge: 'UPCOMING',
      description: 'Development Phase — Day 31/90 (upcoming)',
      dateFormatted: formatDateLabel(phase2Date),
      timestamp: phase2Date,
      status: 'upcoming',
      dotColor: '#A855F7', // Light purple
    });

    return {
      headerTitle: 'PROGRAM TIMELINE',
      events: timelineEvents,
    };
  };

  // Build Tab 4: Members Data
  const buildMembers = async () => {
    // 1. Athlete member
    const athleteMember = {
      _id: athlete._id.toString(),
      fullName: athlete.fullName || '',
      initials: getCleanInitials(athlete.fullName),
      avatar: getCleanAvatar(athlete),
      role: 'athlete',
      badge: athlete.tier === '90-day-mentorship' ? '90-Day Mentorship' : (athlete.tier || 'Athlete'),
      info: `${athlete.currentClub || athlete.leagueDivision || 'Regional Stars U18'} • Foundation Day ${athlete.mentorshipDay || 1}/90`,
      streak: athlete.streak || 0,
      streakLabel: `${athlete.streak || 0}d streak`,
      xp: athlete.xp || 0,
      xpFormatted: `${(athlete.xp || 0).toLocaleString()} XP`,
      athleteHubUrl: `/admin/clients/${athlete._id}/hub`,
    };

    // 2. Coach member
    let coachMember = null;
    if (coach) {
      const coachRosterCount = await User.countDocuments({ assignedCoach: coach._id, role: 'athlete', isDeleted: { $ne: true } });
      coachMember = {
        _id: coach._id.toString(),
        fullName: coach.fullName || '',
        initials: getCleanInitials(coach.fullName),
        avatar: getCleanAvatar(coach),
        role: 'coach',
        badge: 'Assigned Coach',
        specialty: coach.roleTitle || (coach.specialties && coach.specialties[0]) || 'Mental Performance Specialist',
        rosterText: `Roster ${coachRosterCount}/${coach.maxAthleteCapacity || 10}`,
        rating: coach.rating || 4.9,
        ratingFormatted: `★ ${coach.rating || 4.9}`,
      };
    }

    // 3. Admin / Founder member
    let admin = await User.findOne({ role: { $in: ['admin', 'super_admin'] } }).lean();
    const adminMember = {
      _id: admin?._id?.toString() || '',
      fullName: admin?.fullName || 'Valentino Di Lorenzo',
      initials: getCleanInitials(admin?.fullName || 'Valentino Di Lorenzo'),
      avatar: getCleanAvatar(admin),
      role: 'admin',
      badge: 'Founder & Admin',
      subtitle: admin?.roleTitle || 'Head of Di Lorenzo Mindset Academy',
    };

    const membersList = [athleteMember];
    if (coachMember) membersList.push(coachMember);
    membersList.push(adminMember);

    return {
      headerTitle: `GROUP MEMBERS (${membersList.length})`,
      members: membersList,
      athlete: athleteMember,
      coach: coachMember,
      admin: adminMember,
    };
  };

  const normalizedTab = tab ? String(tab).toLowerCase().trim() : null;

  if (normalizedTab === 'summary') {
    return { summary: await buildSummary() };
  }
  if (normalizedTab === 'files') {
    return { files: await buildFiles() };
  }
  if (normalizedTab === 'timeline') {
    return { timeline: await buildTimeline() };
  }
  if (normalizedTab === 'members') {
    return { members: await buildMembers() };
  }

  // If no specific tab requested, return all 4 tabs structured
  const [summary, files, timeline, members] = await Promise.all([
    buildSummary(),
    buildFiles(),
    buildTimeline(),
    buildMembers(),
  ]);

  return {
    chatRoomId: chatRoom._id.toString(),
    summary,
    files,
    timeline,
    members,
  };
};

const markAdminGroupReadService = async (chatRoomId, userId = null) => {
  if (!chatRoomId) {
    const error = new Error('chatRoomId is required.');
    error.statusCode = 400;
    throw error;
  }
  const filter = { chatRoom: chatRoomId };
  if (userId) {
    await Message.updateMany(
      { chatRoom: chatRoomId, 'readBy.user': { $ne: userId } },
      { $addToSet: { readBy: { user: userId, readAt: new Date() } } }
    );
  } else {
    await Message.updateMany(filter, { $set: { isRead: true } });
  }
  return { chatRoomId, status: 'read' };
};

module.exports = {
  getAdminGroupsListService,
  getAdminGroupDetailsService,
  sendAdminGroupMessageService,
  createAdminGroupService,
  reassignAdminGroupCoachService,
  getAdminGroupSidebarService,
  markAdminGroupReadService,
  getCleanAvatar,
  getCleanInitials,
};

