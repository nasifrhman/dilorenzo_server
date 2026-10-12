const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true }, // e.g. "Week 4 Match Mentality Audit"
    sessionType: {
      type: String,
      default: 'admission-call',
      index: true,
    },
    dateTime: { type: Date, default: null },
    coach: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    coachName: { type: String, default: '' }, // e.g. "Coach Rivera", "Valentin Di Lorenzo (Head Coach)"
    athlete: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    athleteName: { type: String, default: '' }, // e.g. "Andrew Vasquez", "Prospect — Tyler Jackson"
    date: { type: Date, required: true, index: true }, // e.g. 2026-09-03
    startTime: { type: String, default: '10:00 AM' }, // e.g. "10:00 AM" or "All Day"
    endTime: { type: String, default: '' },
    duration: { type: String, default: '45 min' }, // e.g. "45 min", "30 min", "—", "60 min"
    platform: { type: String, default: 'Zoom' }, // e.g. "Zoom", "App Upload", "WhatsApp Call", "Google Meet"
    meetingLink: { type: String, default: '' },
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
