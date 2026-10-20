const mongoose = require('mongoose');

const videoProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    drill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Drill',
      required: true,
      index: true,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    lastWatchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

videoProgressSchema.index({ user: 1, drill: 1 }, { unique: true });

module.exports = mongoose.model('VideoProgress', videoProgressSchema);
