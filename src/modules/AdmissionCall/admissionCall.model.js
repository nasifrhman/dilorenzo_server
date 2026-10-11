const mongoose = require('mongoose');

const admissionCallSchema = new mongoose.Schema(
  {
    athleteName: { type: String, required: true, trim: true },
    parentName: { type: String, default: '', trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phoneNumber: { type: String, default: '', trim: true },
    athleteAge: { type: Number, default: null },
    currentClub: { type: String, default: '' },
    goals: { type: String, default: '' },
    requestedTier: {
      type: String,
      enum: ['90-day-mentorship', 'academy-pro'],
      default: '90-day-mentorship',
    },
    scheduledDate: { type: Date, required: true },
    assignedReviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    }, // E.g., Valentin Di Lorenzo (Head Coach)
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed', 'intake-completed'],
      default: 'pending',
    },
    meetingLink: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AdmissionCall', admissionCallSchema);
