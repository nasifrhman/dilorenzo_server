const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true }, // e.g. "Week 4 Match Mentality Audit"
    sessionType: {
      type: String,
      enum: ['1-on-1-mentorship-call', 'screening-call', 'admission-call', 'match-audit', 'group-webinar'],
      default: '1-on-1-mentorship-call',
    },
    coach: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    athlete: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    date: { type: Date, required: true, index: true },
    startTime: { type: String, required: true }, // e.g. "14:00"
    endTime: { type: String, required: true }, // e.g. "14:45"
    duration: { type: Number, default: 45 }, // in minutes
    meetingLink: { type: String, default: '' },
    location: { type: String, default: 'Online' },
    status: {
      type: String,
      enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'rescheduled', 'no-show'],
      default: 'scheduled',
    },
    notes: { type: String, default: '' },
    calendarInviteSent: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Session', sessionSchema);
