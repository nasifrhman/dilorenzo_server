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
    dueDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['assigned', 'pending', 'submitted', 'in-review', 'reviewed', 'needs-revision', 'completed'],
      default: 'assigned',
    },
    whatDidYouWorkOn: { type: String, default: '' },
    whatWentWell: { type: String, default: '' },
    areaToImprove: { type: String, default: '' },
    mentalityUsed: [{ type: String, trim: true }],
    attachments: [
      {
        type: {
          type: String,
          enum: ['video', 'audio', 'image', 'document'],
          default: 'image',
        },
        url: { type: String, required: true },
        thumbnail: { type: String, default: '' },
      },
    ],
    submissionMedia: [
      {
        type: {
          type: String,
          enum: ['video', 'audio', 'image', 'document'],
          default: 'image',
        },
        url: { type: String, required: true },
        thumbnail: { type: String, default: '' },
      },
    ],
    submittedAt: { type: Date, default: null },
    feedback: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CoachFeedback',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ActionStep', actionStepSchema);
