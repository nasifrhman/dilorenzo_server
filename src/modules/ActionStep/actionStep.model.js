const mongoose = require('mongoose');

const actionStepSchema = new mongoose.Schema(
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
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    dayNumber: { type: Number, default: 1 }, // E.g. Day 12 of 90
    phase: {
      type: String,
      enum: ['foundation', 'acceleration', 'mastery'],
      default: 'foundation',
    },
    submissionMedia: [
      {
        type: {
          type: String,
          enum: ['video', 'audio', 'image', 'document'],
          default: 'video',
        },
        url: { type: String, required: true },
        thumbnail: { type: String, default: '' },
      },
    ],
    submissionNotes: { type: String, default: '' },
    mentalityUsed: { type: String, default: '' },
    whatWentWell: { type: String, default: '' },
    areaToImprove: { type: String, default: '' },
    submittedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['pending', 'in-review', 'reviewed', 'needs-revision', 'approved', 'follow-up'],
      default: 'pending',
    },
    coachFeedback: {
      videoUrl: { type: String, default: '' },
      audioUrl: { type: String, default: '' },
      textNotes: { type: String, default: '' },
      rating: { type: Number, min: 1, max: 5, default: null },
      reviewedAt: { type: Date, default: null },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    xpAwarded: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ActionStep', actionStepSchema);
