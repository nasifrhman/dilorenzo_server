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
    status: {
      type: String,
      enum: ['assigned', 'in-progress', 'completed'],
      default: 'assigned',
      index: true,
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
