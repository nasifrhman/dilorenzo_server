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
    },
    videoUrl: {
      type: String,
    },
    image: {
      type: String,
    },
    thumbnail: {
      type: String,
    },

    // Coach reference for video drill (coach name dynamically populated from User)
    coachId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    coach: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    teachingPoints: {
      type: [String],
    },

    // Habit specific fields
    frequency: {
      type: String,
    },
    checkInWindow: {
      type: String,
    },
    instructions: {
      type: String,
    },

    // Optional drill metadata
    phase: {
      type: String,
    },
    duration: {
      type: String,
    },

    // Reflection specific fields
    formType: {
      type: String,
    },
    completionTime: {
      type: String,
    },
    prompt: {
      type: [String],
    },
    questions: {
      type: [String],
    },
    autoPostToChat: {
      type: Boolean,
    },
    isPrivateToCoach: {
      type: Boolean,
    },

    // Curriculum specific fields
    curriculumType: {
      type: String,
    },
    tier: {
      type: String,
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
