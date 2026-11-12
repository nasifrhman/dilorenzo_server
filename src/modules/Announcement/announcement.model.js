const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    category: {
      type: String,
      enum: ['general', 'maintenance', 'cup', 'drill', 'feature', 'system'],
      default: 'general',
      index: true,
    },
    icon: { type: String, default: 'bell' }, // 'alert', 'trophy', 'lightning', 'target', 'bell'
    dotColor: { type: String, default: '#F59E0B' }, // hex color for unread dot badge
    image: { type: String, default: '' },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isPublished: { type: Boolean, default: true, index: true },
    publishedAt: { type: Date, default: Date.now },
    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now },
      },
    ],
    deletedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  {
    timestamps: true,
  }
);

announcementSchema.index({ isPublished: 1, publishedAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
