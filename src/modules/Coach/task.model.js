const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
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
    description: {
      type: String,
      default: '',
    },
    icon: {
      type: String,
      default: '📋',
    },
    category: {
      type: String,
      default: 'mindset',
    },
    xpReward: {
      type: Number,
      default: 10,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    frequency: {
      type: String,
      default: 'Once', // e.g. "Weekdays (5×)", "Daily", "Once"
    },
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
      index: true,
    },
    evidence: {
      isUploaded: { type: Boolean, default: false },
      mediaUrl: { type: String, default: '' },
      mediaType: { type: String, default: '' },
      notes: { type: String, default: '' },
      submittedAt: { type: Date, default: null },
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

module.exports = mongoose.model('Task', taskSchema);
