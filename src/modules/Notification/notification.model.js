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
    category: {
      type: String,
      enum: ['coach', 'athlete', 'parent', 'admin', 'system'],
      default: 'athlete',
      index: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    icon: { type: String, default: 'bell' },
    emoji: { type: String, default: '🔔' },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    entityType: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    deletedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ receiver: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ receiver: 1, category: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
