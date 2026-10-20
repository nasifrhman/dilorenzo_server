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
      enum: [
        'all',
        'focus',
        'resilience',
        'confidence',
        'pressure',
        'mindset',
        'ball-mastery',
        'dribbling',
        'passing',
        'finishing',
        'agility',
        'tactical',
      ],
      default: 'focus',
      lowercase: true,
      trim: true,
    },
    // icon: { type: String, default: '🧠' },
    isFeatured: { type: Boolean, default: false },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'elite', 'Beginner', 'Intermediate', 'Advanced', 'Elite'],
      default: 'beginner',
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
    completedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Drill', drillSchema);
