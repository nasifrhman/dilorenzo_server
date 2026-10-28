const mongoose = require('mongoose');

const userMissionProgressSchema = new mongoose.Schema(
  {
    athlete: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    mission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CurriculumMission',
      required: true,
      index: true,
    },
    dayNumber: {
      type: Number,
      required: true,
      index: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    earnedXp: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

userMissionProgressSchema.index({ athlete: 1, mission: 1 }, { unique: true });

module.exports = mongoose.model('UserMissionProgress', userMissionProgressSchema);
