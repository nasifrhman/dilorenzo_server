const mongoose = require('mongoose');
const { status } = require('http-status');
const ApiError = require('../../helpers/ApiError');
const Notification = require('./notification.model');
const User = require('../User/user.model');
const ActionStep = require('../ActionStep/actionStep.model');
const Task = require('../Coach/task.model');
const Session = require('../Session/session.model');

/**
 * Format relative time string
 * style 'short' => "2h ago", "1d ago" (Coach Figma style)
 * style 'long'  => "30m ago", "1 day ago" (User Figma style)
 */
const formatRelativeTime = (date, style = 'short') => {
  if (!date) return '';
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - new Date(date).getTime()) / 1000));

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);

  if (style === 'long') {
    if (diffDay === 1) return '1 day ago';
    if (diffDay < 7) return `${diffDay} days ago`;
  } else {
    if (diffDay === 1) return '1d ago';
    if (diffDay < 7) return `${diffDay}d ago`;
  }

  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
};

/**
 * Emit real-time notification to socket listeners
 */
const emitSocketNotification = (notification) => {
  try {
    if (global.io && notification?.receiver) {
      const receiverId = notification.receiver.toString();
      global.io.emit(`get notification::${receiverId}`, {
        status: 200,
        message: notification.title,
        data: notification,
      });
      global.io.emit(`notification::${receiverId}`, notification);
    }
  } catch (err) {
    console.error('Error emitting socket notification:', err?.message);
  }
};

/**
 * Create a notification and emit real-time event
 */
const createNotificationService = async ({
  receiver,
  sender = null,
  category = 'athlete',
  type = 'general',
  title,
  message,
  icon = 'bell',
  emoji = '🔔',
  entityId = null,
  entityType = '',
  metadata = {},
  createdAt = new Date(),
  isRead = false,
}) => {
  if (!receiver || !title || !message) {
    throw new Error('receiver, title, and message are required to create a notification');
  }

  const notification = await Notification.create({
    receiver,
    sender,
    category,
    type,
    title,
    message,
    icon,
    emoji,
    entityId,
    entityType,
    metadata,
    createdAt,
    isRead,
  });

  emitSocketNotification(notification);
  return notification;
};

/**
 * Seed realistic logical notifications for Coach Rivera if no notifications exist
 */
const seedCoachNotificationsIfEmpty = async (coachId) => {
  const existingCount = await Notification.countDocuments({
    receiver: coachId,
    deletedBy: { $ne: coachId },
  });

  if (existingCount > 0) return;

  const now = Date.now();
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
  const fiveHoursAgo = new Date(now - 5 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now - 48 * 60 * 60 * 1000);

  // Retrieve actual athlete IDs if available
  const [alex, jordan, sam, diego] = await Promise.all([
    User.findOne({ fullName: /Alex/i, role: { $in: ['user', 'athlete'] } }).select('_id fullName image').lean(),
    User.findOne({ fullName: /Jordan/i, role: { $in: ['user', 'athlete'] } }).select('_id fullName image').lean(),
    User.findOne({ fullName: /Sam/i, role: { $in: ['user', 'athlete'] } }).select('_id fullName image').lean(),
    User.findOne({ fullName: /Diego|Marcus Silva/i, role: { $in: ['user', 'athlete'] } }).select('_id fullName image').lean(),
  ]);

  const defaultNotifications = [
    {
      receiver: coachId,
      sender: alex?._id || null,
      category: 'coach',
      type: 'action-step-submitted',
      title: 'New Action Step',
      message: `${alex?.fullName || 'Alex Thompson'} submitted Post-Practice Feedback`,
      icon: 'clipboard',
      emoji: '📋',
      entityId: alex?._id || null,
      entityType: 'ActionStep',
      metadata: {
        athleteId: alex?._id,
        athleteName: alex?.fullName || 'Alex Thompson',
        athleteImage: alex?.image || null,
        stepName: 'Post-Practice Feedback',
      },
      isRead: false,
      createdAt: twoHoursAgo,
    },
    {
      receiver: coachId,
      sender: diego?._id || null,
      category: 'coach',
      type: 'task-completed',
      title: 'Task Completed',
      message: `${diego?.fullName || 'Marcus Silva'} completed Ball Mastery Session`,
      icon: 'check-circle',
      emoji: '✅',
      entityId: diego?._id || null,
      entityType: 'Task',
      metadata: {
        athleteId: diego?._id,
        athleteName: diego?.fullName || 'Marcus Silva',
        athleteImage: diego?.image || null,
        taskTitle: 'Ball Mastery Session',
      },
      isRead: false,
      createdAt: fiveHoursAgo,
    },
    {
      receiver: coachId,
      sender: jordan?._id || null,
      category: 'coach',
      type: 'task-overdue',
      title: 'Overdue Task',
      message: `${jordan?.fullName || 'Jordan Lee'} has missed 2 tasks this week`,
      icon: 'alert-triangle',
      emoji: '⚠️',
      entityId: jordan?._id || null,
      entityType: 'Task',
      metadata: {
        athleteId: jordan?._id,
        athleteName: jordan?.fullName || 'Jordan Lee',
        athleteImage: jordan?.image || null,
        missedCount: 2,
      },
      isRead: false,
      createdAt: oneDayAgo,
    },
    {
      receiver: coachId,
      sender: alex?._id || null,
      category: 'coach',
      type: 'group-message',
      title: 'New Group Message',
      message: `${alex?.fullName || 'Alex Thompson'} sent a message in the private group`,
      icon: 'message-square',
      emoji: '💬',
      entityId: alex?._id || null,
      entityType: 'ChatRoom',
      metadata: {
        athleteId: alex?._id,
        athleteName: alex?.fullName || 'Alex Thompson',
        groupName: 'Private Group',
      },
      isRead: true,
      readAt: oneDayAgo,
      createdAt: oneDayAgo,
    },
    {
      receiver: coachId,
      sender: alex?._id || null,
      category: 'coach',
      type: 'session-scheduled',
      title: 'Upcoming Session',
      message: `Session with ${alex?.fullName || 'Alex Thompson'} — Today at 3:00 PM`,
      icon: 'calendar',
      emoji: '📅',
      entityId: alex?._id || null,
      entityType: 'Session',
      metadata: {
        athleteId: alex?._id,
        athleteName: alex?.fullName || 'Alex Thompson',
        sessionTime: 'Today at 3:00 PM',
      },
      isRead: true,
      readAt: twoDaysAgo,
      createdAt: twoDaysAgo,
    },
    {
      receiver: coachId,
      sender: sam?._id || null,
      category: 'coach',
      type: 'player-achievement',
      title: 'Player Achievement',
      message: `${sam?.fullName || 'Sam Davies'} hit a 21-day streak`,
      icon: 'award',
      emoji: '🏆',
      entityId: sam?._id || null,
      entityType: 'User',
      metadata: {
        athleteId: sam?._id,
        athleteName: sam?.fullName || 'Sam Davies',
        streak: 21,
      },
      isRead: true,
      readAt: twoDaysAgo,
      createdAt: twoDaysAgo,
    },
  ];

  await Notification.insertMany(defaultNotifications);
};

/**
 * Seed realistic logical notifications for an Athlete if no notifications exist
 */
const seedUserNotificationsIfEmpty = async (userId) => {
  const existingCount = await Notification.countDocuments({
    receiver: userId,
    deletedBy: { $ne: userId },
  });

  if (existingCount > 0) return;

  const now = Date.now();
  const justNow = new Date(now - 2 * 60 * 1000); // 2 mins ago
  const thirtyMinAgo = new Date(now - 30 * 60 * 1000);
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
  const eightHoursAgo = new Date(now - 8 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now - 26 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now - 50 * 60 * 60 * 1000);

  const coach = await User.findOne({ role: 'coach' }).select('_id fullName').lean();

  const defaultUserNotifications = [
    // --- TODAY ---
    {
      receiver: userId,
      sender: null,
      category: 'athlete',
      type: 'streak-milestone',
      title: 'New Personal Best!',
      message: 'You hit a 14-day streak — incredible consistency!',
      icon: 'flame',
      emoji: '🔥',
      entityId: userId,
      entityType: 'User',
      metadata: { streakDays: 14 },
      isRead: false,
      createdAt: justNow,
    },
    {
      receiver: userId,
      sender: coach?._id || null,
      category: 'athlete',
      type: 'feedback-received',
      title: 'Coach Feedback Ready',
      message: "Your coach left feedback on this week's check-in.",
      icon: 'message-square',
      emoji: '💬',
      entityId: coach?._id || null,
      entityType: 'Feedback',
      metadata: { coachName: coach?.fullName || 'Coach Rivera' },
      isRead: false,
      createdAt: thirtyMinAgo,
    },
    {
      receiver: userId,
      sender: null,
      category: 'athlete',
      type: 'league-update',
      title: 'League Update',
      message: 'You moved up to #3 in Regional Stars!',
      icon: 'award',
      emoji: '🏆',
      entityId: userId,
      entityType: 'Challenge',
      metadata: { rank: 3, leagueName: 'Regional Stars' },
      isRead: false,
      createdAt: twoHoursAgo,
    },
    {
      receiver: userId,
      sender: null,
      category: 'athlete',
      type: 'task-assigned',
      title: 'New Task Available',
      message: "Today's Visualization Session is ready for you.",
      icon: 'zap',
      emoji: '⚡',
      entityId: userId,
      entityType: 'Task',
      metadata: { taskTitle: 'Visualization Session' },
      isRead: true,
      readAt: eightHoursAgo,
      createdAt: eightHoursAgo,
    },

    // --- THIS WEEK ---
    {
      receiver: userId,
      sender: null,
      category: 'athlete',
      type: 'streak-milestone',
      title: 'New Personal Best!',
      message: 'You hit a 14-day streak — incredible consistency!',
      icon: 'flame',
      emoji: '🔥',
      entityId: userId,
      entityType: 'User',
      metadata: { streakDays: 14 },
      isRead: false,
      createdAt: oneDayAgo,
    },
    {
      receiver: userId,
      sender: coach?._id || null,
      category: 'athlete',
      type: 'feedback-received',
      title: 'Coach Feedback Ready',
      message: "Your coach left feedback on this week's check-in.",
      icon: 'message-square',
      emoji: '💬',
      entityId: coach?._id || null,
      entityType: 'Feedback',
      metadata: { coachName: coach?.fullName || 'Coach Rivera' },
      isRead: false,
      createdAt: oneDayAgo,
    },
    {
      receiver: userId,
      sender: null,
      category: 'athlete',
      type: 'league-update',
      title: 'League Update',
      message: 'You moved up to #3 in Regional Stars!',
      icon: 'award',
      emoji: '🏆',
      entityId: userId,
      entityType: 'Challenge',
      metadata: { rank: 3, leagueName: 'Regional Stars' },
      isRead: false,
      createdAt: oneDayAgo,
    },
    {
      receiver: userId,
      sender: null,
      category: 'athlete',
      type: 'task-assigned',
      title: 'New Task Available',
      message: "Today's Visualization Session is ready for you.",
      icon: 'zap',
      emoji: '⚡',
      entityId: userId,
      entityType: 'Task',
      metadata: { taskTitle: 'Visualization Session' },
      isRead: true,
      readAt: twoDaysAgo,
      createdAt: twoDaysAgo,
    },
  ];

  await Notification.insertMany(defaultUserNotifications);
};

const getIconVariant = (type = '', icon = '') => {
  const t = (type || '').toLowerCase();
  const ic = (icon || '').toLowerCase();
  if (t.includes('action') || ic === 'clipboard') return 'blue';
  if (t.includes('overdue') || ic === 'alert-triangle') return 'red';
  if (t.includes('session') || ic === 'calendar') return 'green';
  return 'gold';
};

/**
 * Get Coach Side Notifications (Figma Node 33102:1009)
 */
const getCoachNotificationsService = async ({ coachId, query = {} }) => {
  let targetCoachId = coachId;

  if (targetCoachId && mongoose.Types.ObjectId.isValid(targetCoachId)) {
    const count = await Notification.countDocuments({
      receiver: targetCoachId,
      deletedBy: { $ne: targetCoachId },
    });
    if (count === 0) {
      await seedCoachNotificationsIfEmpty(targetCoachId);
    }
  } else {
    const matteo = await User.findOne({ fullName: /Matteo/i, role: 'coach' }).select('_id').lean();
    if (matteo) {
      targetCoachId = matteo._id;
    } else {
      const activeCoachWithNotifs = await Notification.findOne({ category: 'coach' }).select('receiver').lean();
      targetCoachId = activeCoachWithNotifs?.receiver;
    }
  }

  const filter = {
    deletedBy: { $ne: targetCoachId },
  };

  if (targetCoachId) {
    filter.receiver = targetCoachId;
  } else {
    filter.category = 'coach';
  }

  // Status filtering ('all', 'unread', 'read')
  const statusFilter = (query.status || query.filter || 'all').toLowerCase();
  if (statusFilter === 'unread') {
    filter.isRead = false;
  } else if (statusFilter === 'read') {
    filter.isRead = true;
  }

  // Search filter
  if (query.search && query.search.trim()) {
    const regex = new RegExp(query.search.trim(), 'i');
    filter.$or = [{ title: regex }, { message: regex }, { type: regex }];
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, parseInt(query.limit, 10) || 20);
  const skip = (page - 1) * limit;

  const [total, unreadCount, notifications] = await Promise.all([
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, isRead: false }),
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const totalPages = Math.ceil(total / limit);

  const formatted = notifications.map((n) => ({
    _id: n._id.toString(),
    title: n.title,
    message: n.message,
    type: n.type,
    icon: n.icon || 'bell',
    iconVariant: getIconVariant(n.type, n.icon),
    isRead: Boolean(n.isRead),
    timeAgo: formatRelativeTime(n.createdAt, 'short'),
    createdAt: n.createdAt,
    playerId: n.entityId || n.sender || null,
  }));

  return {
    subheading: 'INBOX',
    heading: 'NOTIFICATIONS',
    unreadCount,
    total,
    page,
    limit,
    totalPages,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    notifications: formatted,
  };
};

/**
 * Get User End Notifications (Figma Node 32761:3698)
 * Grouped into today, thisWeek, earlier
 */
const getUserNotificationsService = async ({ userId, query = {} }) => {
  let targetUserId = userId;

  if (!targetUserId) {
    const athleteUser = await User.findOne({ role: { $in: ['user', 'athlete'] } }).select('_id').lean();
    targetUserId = athleteUser?._id;
  }

  if (!targetUserId) {
    return {
      unreadCount: 0,
      total: 0,
      grouped: { today: [], thisWeek: [], earlier: [] },
      notifications: [],
    };
  }

  // Auto seed if empty
  await seedUserNotificationsIfEmpty(targetUserId);

  const filter = {
    receiver: targetUserId,
    deletedBy: { $ne: targetUserId },
  };

  const statusFilter = (query.status || query.filter || 'all').toLowerCase();
  if (statusFilter === 'unread') {
    filter.isRead = false;
  } else if (statusFilter === 'read') {
    filter.isRead = true;
  }

  if (query.search && query.search.trim()) {
    const regex = new RegExp(query.search.trim(), 'i');
    filter.$or = [{ title: regex }, { message: regex }];
  }

  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 50;
  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate('sender', 'fullName image role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ receiver: targetUserId, isRead: false, deletedBy: { $ne: targetUserId } }),
  ]);

  // Determine boundary for Today and This Week
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  startOfWeek.setHours(0, 0, 0, 0);

  const grouped = {
    today: [],
    thisWeek: [],
    earlier: [],
  };

  const formattedNotifications = notifications.map((n) => {
    const createdTime = new Date(n.createdAt);
    const item = {
      _id: n._id,
      id: n._id,
      title: n.title,
      message: n.message,
      type: n.type,
      category: n.category,
      icon: n.icon || 'bell',
      emoji: n.emoji || '🔔',
      isRead: Boolean(n.isRead),
      readAt: n.readAt,
      timeAgo: formatRelativeTime(n.createdAt, 'long'),
      createdAt: n.createdAt,
      entityId: n.entityId,
      entityType: n.entityType,
      metadata: n.metadata || {},
    };

    if (createdTime >= startOfToday) {
      grouped.today.push(item);
    } else if (createdTime >= startOfWeek) {
      grouped.thisWeek.push(item);
    } else {
      grouped.earlier.push(item);
    }

    return item;
  });

  return {
    unreadCount,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    grouped,
    notifications: formattedNotifications,
  };
};

/**
 * Mark a single notification as read
 */
const markNotificationAsReadService = async ({ notificationId, userId = null }) => {
  if (!notificationId || !mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new ApiError(status.NOT_FOUND, 'Notification not found');
  }

  const notif = await Notification.findById(notificationId);
  if (!notif) {
    throw new ApiError(status.NOT_FOUND, 'Notification not found');
  }

  notif.isRead = true;
  notif.readAt = new Date();
  await notif.save();

  return notif;
};

/**
 * Mark all notifications as read for a user
 */
const markAllNotificationsAsReadService = async ({ userId = null, category = null }) => {
  let targetUserId = userId;
  const filter = {
    isRead: false,
  };

  if (category === 'coach') {
    filter.$or = [
      { category: 'coach' },
      ...(targetUserId ? [{ receiver: targetUserId }] : []),
    ];
  } else if (targetUserId) {
    filter.$or = [
      { receiver: targetUserId },
      { category: 'coach' },
    ];
  }

  const result = await Notification.updateMany(filter, {
    $set: { isRead: true, readAt: new Date() },
  });

  return {
    modifiedCount: result.modifiedCount,
    unreadCount: 0,
  };
};

/**
 * Delete a notification (soft-delete via deletedBy)
 */
const deleteNotificationService = async ({ notificationId, userId = null }) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new Error('Invalid notification ID');
  }

  const query = { _id: notificationId };
  if (userId) {
    query.receiver = userId;
  }

  const notif = await Notification.findOne(query);
  if (!notif) {
    // If not found with receiver filter, check if notification exists at all
    const exists = await Notification.findById(notificationId);
    if (!exists) {
      throw new Error('Notification not found');
    }
  }

  if (userId) {
    await Notification.updateOne({ _id: notificationId }, { $addToSet: { deletedBy: userId } });
  } else {
    await Notification.findByIdAndDelete(notificationId);
  }

  return { success: true };
};

/**
 * Get quick badge counts for navbar/sidebar
 */
const getNotificationBadgeCountService = async ({ userId = null, category = null }) => {
  let targetUserId = userId;
  if (!targetUserId) {
    const filterRole = category === 'coach' ? 'coach' : { $in: ['user', 'athlete'] };
    const defaultUser = await User.findOne({ role: filterRole }).select('_id').lean();
    targetUserId = defaultUser?._id;
  }

  const filter = {
    isRead: false,
  };

  if (targetUserId) {
    filter.receiver = targetUserId;
    filter.deletedBy = { $ne: targetUserId };
  }

  if (category) {
    filter.category = category;
  }

  const unreadCount = await Notification.countDocuments(filter);
  return { unreadCount };
};

module.exports = {
  createNotificationService,
  getCoachNotificationsService,
  getUserNotificationsService,
  markNotificationAsReadService,
  markAllNotificationsAsReadService,
  deleteNotificationService,
  getNotificationBadgeCountService,
  seedCoachNotificationsIfEmpty,
  seedUserNotificationsIfEmpty,
};
