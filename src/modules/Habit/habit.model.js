const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: {
      type: String,
      enum: ['mindset', 'technical', 'physical', 'recovery', 'nutrition', 'tactical'],
      default: 'mindset',
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'match-day', 'pre-training', 'custom'],
      default: 'daily',
    },
    timesPerWeek: { type: Number, default: 7 },
    xpReward: { type: Number, default: 10 },
    icon: { type: String, default: '🔥' },
    targetPhase: {
      type: String,
      enum: ['all', 'foundation', 'acceleration', 'mastery'],
      default: 'all',
    },
    targetTier: {
      type: String,
      enum: ['all', 'free', 'premium', '90-day-mentorship'],
      default: 'all',
    },
    isMasterLibrary: { type: Boolean, default: false }, // Available across academy
    assignedCoaches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Habit', habitSchema);
