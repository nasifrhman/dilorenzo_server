const mongoose = require('mongoose');

const libraryItemSchema = new mongoose.Schema(
  {
    contentType: {
      type: String,
      enum: ['habit', 'video-drill', 'reflection', 'curriculum'],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: 'Mindset',
    },
    xpReward: {
      type: Number,
      default: 0,
    },
    video: {
      type: String,
      default: '',
    },

    // Habit specific fields
    frequency: {
      type: String,
      default: 'Daily (7x a week)',
    },
    checkInWindow: {
      type: String,
      default: 'Morning (8:00 AM)',
    },
    instructions: {
      type: String,
      default: '',
    },

    // Video Drill specific fields
    videoUrl: {
      type: String,
      default: '',
    },
    phase: {
      type: String,
      default: 'Foundation (Phase 1)',
    },
    duration: {
      type: String,
      default: '',
    },
    coachName: {
      type: String,
      default: 'Valentino Di Lorenzo',
    },
    teachingPoints: {
      type: [String],
      default: [],
    },

    // Reflection specific fields
    formType: {
      type: String,
      default: 'Match Audit',
    },
    completionTime: {
      type: String,
      default: '5 min',
    },
    prompt: {
      type: [String],
      default: [],
    },
    questions: {
      type: [String],
      default: [],
    },
    autoPostToChat: {
      type: Boolean,
      default: true,
    },
    isPrivateToCoach: {
      type: Boolean,
      default: false,
    },

    // Curriculum specific fields
    curriculumType: {
      type: String,
      default: 'Flagship 90-Day',
    },
    tier: {
      type: String,
      default: 'Mentorship 90 Tier',
    },
    phases: [
      {
        phaseNumber: Number,
        title: String,
        description: String,
      },
    ],
    moduleCount: {
      type: Number,
      default: 24,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('LibraryItem', libraryItemSchema);
