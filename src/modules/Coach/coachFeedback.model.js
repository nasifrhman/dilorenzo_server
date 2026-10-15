const mongoose = require('mongoose');

const coachFeedbackSchema = new mongoose.Schema(
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
    message: {
      type: String,
      required: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    timeframe: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('CoachFeedback', coachFeedbackSchema);
