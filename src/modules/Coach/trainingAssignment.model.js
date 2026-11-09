const mongoose = require('mongoose');

const trainingAssignmentSchema = new mongoose.Schema(
  {
    athlete: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    coach: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    videoUrl: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      default: 'Technical', // e.g. Technical, Tactical, Physical, Mental
    },
    duration: {
      type: String,
      default: '15 min', // e.g. "16 min", "20 min"
    },
    week: {
      type: Number,
      default: 1, // e.g. 1, 2, 3
    },
    xpReward: {
      type: Number,
      default: 70, // XP earned upon drill completion
    },
    status: {
      type: String,
      enum: ['assigned', 'in-progress', 'completed'],
      default: 'assigned',
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
      index: true,
    },
    libraryItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LibraryItem',
      default: null,
    },
    drillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LibraryItem',
      default: null,
    },
    instructor: {
      type: String,
      default: '',
    },
    phase: {
      type: String,
      default: '',
    },
    teachingPoints: [{ type: String }],
    notes: {
      type: String,
      default: '',
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('TrainingAssignment', trainingAssignmentSchema);
