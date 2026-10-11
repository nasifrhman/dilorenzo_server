const mongoose = require('mongoose');

const xpTransactionSchema = new mongoose.Schema(
  {
    athlete: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },
    source: {
      type: String,
      enum: ['habit', 'action-step', 'drill', 'challenge', 'streak-bonus', 'manual-reward', 'onboarding'],
      required: true,
    },
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null }, // e.g. HabitLogId or ActionStepId
    description: { type: String, default: '' },
    balanceAfter: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('XpTransaction', xpTransactionSchema);
