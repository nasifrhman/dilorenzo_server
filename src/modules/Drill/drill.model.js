const mongoose = require('mongoose');

const drillSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    videoUrl: { type: String, required: true },
    thumbnail: { type: String, default: '' },
    duration: { type: Number, default: 10 }, // in minutes
    category: {
      type: String,
      enum: ['ball-mastery', 'dribbling', 'passing', 'finishing', 'agility', 'mindset', 'tactical'],
      default: 'ball-mastery',
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'elite'],
      default: 'intermediate',
    },
    tierRequired: {
      type: String,
      enum: ['free', 'premium', '90-day-mentorship'],
      default: 'premium',
    },
    xpReward: { type: Number, default: 20 },
    tags: [{ type: String, trim: true }],
    isMasterLibrary: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Drill', drillSchema);
