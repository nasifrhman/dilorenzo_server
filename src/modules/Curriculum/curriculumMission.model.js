const mongoose = require('mongoose');

const curriculumMissionSchema = new mongoose.Schema(
  {
    dayNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 90,
      index: true,
    },
    taskNumber: {
      type: Number,
      default: 1,
    },
    icon: {
      type: String,
      default: '🧠',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    instructions: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      default: 'Mental',
      trim: true,
    },
    xpReward: {
      type: Number,
      default: 50,
    },
    isLiveNow: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ['queued', 'live', 'completed'],
      default: 'queued',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isMilestone: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

curriculumMissionSchema.index({ dayNumber: 1, taskNumber: 1 });

module.exports = mongoose.model('CurriculumMission', curriculumMissionSchema);
