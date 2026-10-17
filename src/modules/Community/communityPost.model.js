const mongoose = require('mongoose');

const communityPostSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorName: {
      type: String,
      required: true,
      trim: true,
    },
    authorEmoji: {
      type: String,
      default: '🏆',
    },
    category: {
      type: String,
      enum: ['Focus', 'Resilience', 'Mindset', 'Achievement', 'General'],
      default: 'Focus',
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    likesCount: {
      type: Number,
      default: 0,
    },
    isMindsetWin: {
      type: Boolean,
      default: true,
    },
    xpAwarded: {
      type: Number,
      default: 20,
    },
    status: {
      type: String,
      enum: ['active', 'hidden', 'flagged'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast feed querying
communityPostSchema.index({ status: 1, createdAt: -1 });
communityPostSchema.index({ category: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('CommunityPost', communityPostSchema);
