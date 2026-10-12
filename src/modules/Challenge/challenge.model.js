const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    icon: { type: String, default: '🏆' }, // 🏆, ⚡, 🔥, 🎯, 💪, 🧠, 🏅
    category: {
      type: String,
      enum: ['mental', 'technical', 'resilience', 'recovery', 'tactical', 'custom'],
      default: 'mental',
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'elite'],
      default: 'medium',
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    xpGoal: { type: Number, required: true, default: 300 },
    activities: [
      {
        title: { type: String, required: true },
        description: { type: String, default: '' },
        xpReward: { type: Number, default: 50 },
        category: { type: String, default: 'mindset' },
        // isRequired: { type: Boolean, default: false },
      },
    ],
    assignedAthletes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: {
      type: String,
      enum: ['draft', 'upcoming', 'active', 'completed', 'archived'],
      default: 'active',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Challenge', challengeSchema);
