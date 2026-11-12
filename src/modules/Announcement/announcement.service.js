const mongoose = require('mongoose');
const Announcement = require('./announcement.model');
const User = require('../User/user.model');

// Helper to format relative time ("10m ago", "2h ago", "Yesterday", "3 days ago")
const formatRelativeTime = (date) => {
  if (!date) return '';
  const diffMs = Date.now() - new Date(date).getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return '1 week ago';
  if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Helper to resolve category, icon, and dotColor
const resolveCategoryMeta = (title = '', content = '', explicitCategory = null) => {
  const combined = `${title} ${content}`.toLowerCase();

  if (explicitCategory && explicitCategory !== 'general') {
    if (explicitCategory === 'maintenance') return { category: 'maintenance', icon: 'alert', dotColor: '#EF4444' };
    if (explicitCategory === 'cup') return { category: 'cup', icon: 'trophy', dotColor: '#8B5CF6' };
    if (explicitCategory === 'drill') return { category: 'drill', icon: 'lightning', dotColor: '#3B82F6' };
    if (explicitCategory === 'feature') return { category: 'feature', icon: 'target', dotColor: '#10B981' };
  }

  if (/maintenance|offline|scheduled downtime/i.test(combined)) {
    return { category: 'maintenance', icon: 'alert', dotColor: '#EF4444' }; // Red alert
  }
  if (/cup|tournament|competition|champion/i.test(combined)) {
    return { category: 'cup', icon: 'trophy', dotColor: '#8B5CF6' }; // Purple trophy
  }
  if (/drill|pack|pressure|training|workout/i.test(combined)) {
    return { category: 'drill', icon: 'lightning', dotColor: '#3B82F6' }; // Blue lightning
  }
  if (/ai coach|enhancement|update|feature|live/i.test(combined)) {
    return { category: 'feature', icon: 'target', dotColor: '#10B981' }; // Green target
  }

  return { category: 'general', icon: 'bell', dotColor: '#F59E0B' }; // Amber bell
};

/**
 * 1. User End: User sees announcements (Profile > Announcements)
 */
const getUserAnnouncementsService = async (userId = null) => {
  // Simple: Admin creates, user sees all published announcements
  const rawList = await Announcement.find({ isPublished: { $ne: false } })
    .sort({ publishedAt: -1, createdAt: -1 })
    .lean();

  let unreadCount = 0;

  const announcements = rawList.map((a) => {
    let isRead = false;
    let readAt = null;

    if (userId && Array.isArray(a.readBy)) {
      const readEntry = a.readBy.find(r => r.user && r.user.toString() === userId.toString());
      if (readEntry) {
        isRead = true;
        readAt = readEntry.readAt;
      }
    }

    if (!isRead) {
      unreadCount++;
    }

    const meta = resolveCategoryMeta(a.title, a.content, a.category);

    return {
      _id: a._id.toString(),
      id: a._id.toString(),
      title: a.title,
      content: a.content,
      category: a.category || meta.category,
      icon: a.icon || meta.icon,
      dotColor: a.dotColor || meta.dotColor,
      isRead,
      readAt,
      timeAgo: formatRelativeTime(a.publishedAt || a.createdAt),
      createdAt: a.createdAt,
      publishedAt: a.publishedAt || a.createdAt,
    };
  });

  return {
    heading: 'ANNOUNCEMENTS',
    unreadCount,
    unreadLabel: `${unreadCount} unread`,
    total: announcements.length,
    announcements,
  };
};

/**
 * 2. Admin End: Admin creates announcement ("Publish to All Athlete Apps")
 */
const createBroadcastAnnouncementService = async (data = {}, adminId = null) => {
  const {
    title,
    content,
    headline,
    body,
    category,
  } = data;

  const announcementTitle = (title || headline || '').trim();
  const announcementContent = (content || body || '').trim();

  if (!announcementTitle) {
    const error = new Error('Headline / title is required.');
    error.statusCode = 400;
    throw error;
  }
  if (!announcementContent) {
    const error = new Error('Announcement body is required.');
    error.statusCode = 400;
    throw error;
  }

  const meta = resolveCategoryMeta(announcementTitle, announcementContent, category);

  let creator = adminId;
  if (!creator || !mongoose.isValidObjectId(creator)) {
    const defaultAdmin = await User.findOne({ role: { $in: ['admin', 'super_admin'] } });
    creator = defaultAdmin?._id || null;
  }

  const announcement = await Announcement.create({
    title: announcementTitle,
    content: announcementContent,
    category: meta.category,
    icon: meta.icon,
    dotColor: meta.dotColor,
    createdBy: creator,
    isPublished: true,
    publishedAt: new Date(),
    readBy: [],
  });

  // Real-time socket broadcast if socket server is active
  if (typeof global !== 'undefined' && global.io) {
    try {
      global.io.emit('new_announcement', {
        _id: announcement._id.toString(),
        title: announcement.title,
        content: announcement.content,
        category: announcement.category,
        icon: announcement.icon,
        dotColor: announcement.dotColor,
        timeAgo: 'Just now',
        createdAt: announcement.createdAt,
      });
    } catch (_) {}
  }

  return {
    _id: announcement._id.toString(),
    id: announcement._id.toString(),
    title: announcement.title,
    content: announcement.content,
    category: announcement.category,
    icon: announcement.icon,
    dotColor: announcement.dotColor,
    isPublished: announcement.isPublished,
    publishedAt: announcement.publishedAt,
    timeAgo: 'Just now',
    createdAt: announcement.createdAt,
  };
};

module.exports = {
  getUserAnnouncementsService,
  createBroadcastAnnouncementService,
};
