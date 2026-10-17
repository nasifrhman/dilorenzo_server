const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "Regional Stars U18", "Fall 90-Day Cohort"
    description: { type: String, default: '' },
    image: { type: String, default: 'group.jpg' },
    type: {
      type: String,
      enum: ['team', 'cohort', 'private-group'],
      default: 'team',
    },
    coaches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    athletes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    icon: { type: String, default: '⚡' },
    totalXp: { type: Number, default: 0 },
    rank: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Group', groupSchema);
