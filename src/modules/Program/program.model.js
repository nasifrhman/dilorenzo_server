const mongoose = require('mongoose');

const programSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    thumbnail: { type: String, default: '' },
    tierRequired: {
      type: String,
      enum: ['free', 'premium', '90-day-mentorship'],
      default: '90-day-mentorship',
    },
    phase: {
      type: String,
      enum: ['foundation', 'acceleration', 'mastery', 'full-90-days', 'custom'],
      default: 'full-90-days',
    },
    totalDays: { type: Number, default: 90 },
    schedule: [
      {
        day: { type: Number, required: true },
        title: { type: String, default: '' },
        drills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Drill' }],
        habits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Habit' }],
        notes: { type: String, default: '' },
        xpTotal: { type: Number, default: 0 },
      },
    ],
    isMasterLibrary: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Program', programSchema);
