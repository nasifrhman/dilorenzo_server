const mongoose = require('mongoose');

const challengeParticipantSchema = new mongoose.Schema(
  {
    challenge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge',
      required: true,
      index: true,
    },
    athlete: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    earnedXp: { type: Number, default: 0 },
    completedActivities: [
      {
        activityTitle: { type: String, required: true },
        completedAt: { type: Date, default: Date.now },
        xpEarned: { type: Number, default: 0 },
      },
    ],
    isGoalReached: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

challengeParticipantSchema.index({ challenge: 1, athlete: 1 }, { unique: true });

module.exports = mongoose.model('ChallengeParticipant', challengeParticipantSchema);
