const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: [
        'habit-reminder',
        'feedback-received',
        'session-scheduled',
        'challenge-update',
        'xp-earned',
        'invoice-issued',
        'announcement',
        'chat-message',
        'general',
      ],
      default: 'general',
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null }, // Target entity ID
    entityType: { type: String, default: '' }, // Model name for deep linking
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
