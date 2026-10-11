const mongoose = require('mongoose');

const habitLogSchema = new mongoose.Schema(
  {
    athlete: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    habit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Habit',
      required: true,
      index: true,
    },
    coach: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    }, // Date of the habit completion
    status: {
      type: String,
      enum: ['completed', 'missed', 'skipped'],
      default: 'completed',
    },
    notes: { type: String, default: '' },
    xpAwarded: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate completions for the same athlete, habit, and calendar date
habitLogSchema.index({ athlete: 1, habit: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('HabitLog', habitLogSchema);
