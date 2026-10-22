const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // Basic Profile
    fullName: { type: String, required: false },
    email: { type: String, required: false, trim: true, lowercase: true },
    phoneNumber: { type: String, required: false, trim: true },
    countryCode: { type: String, required: false, trim: true },
    image: { type: String, required: false, default: 'user.jpg' },
    role: {
      type: String,
      enum: ['user', 'athlete', 'parent', 'coach', 'admin', 'super_admin', 'sub_admin'],
      default: 'user',
    },
    password: { type: String, required: false },

    // Status & System Controls
    isBan: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    isProfileCompleted: { type: Boolean, default: false },
    trialStartDate: { type: Date, required: false },
    trialEndDate: { type: Date, required: false },
    isTrialActive: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0 },
    enabledPushNotification: { type: Boolean, default: true },
    fcmToken: { type: String, default: '' },
    digitalWallet: { type: Number, default: 0 },
    flagCount: { type: Number, default: 0 },
    note: { type: String, default: '' },

    // Athlete / Player Fields
    age: { type: Number, required: false },
    dob: { type: Date, required: false },
    gender: { type: String, enum: ['male', 'female', 'other'], required: false },
    nationality: { type: String, required: false },
    currentClub: { type: String, required: false }, // e.g. "Regional Stars U18"
    leagueDivision: { type: String, default: '' }, // e.g. "Regional Stars U18"
    parentFullName: { type: String, default: '' },
    parentEmail: { type: String, default: '', trim: true, lowercase: true },
    intakeNotes: { type: String, default: '' },
    focusGoals: { type: String, default: '' },
    position: {
      type: String,
      enum: ['forward', 'winger', 'midfielder', 'defender', 'goalkeeper', 'other'],
      required: false,
    },
    preferredFoot: {
      type: String,
      enum: ['right', 'left', 'both'],
      required: false,
    },

    // Mentorship & Tier Access
    tier: {
      type: String,
      enum: ['free', 'premium', '90-day-mentorship'],
      default: 'free',
    },
    mentorshipPhase: {
      type: String,
      enum: ['foundation', 'acceleration', 'mastery'],
      default: 'foundation',
    },
    mentorshipDay: { type: Number, default: 1 }, // Day 1 to 90
    mentorshipStartDate: { type: Date, required: false },
    mentorshipEndDate: { type: Date, required: false },
    assignedCoach: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedHabits: [{ type: String }],
    adminWelcomeMessage: { type: String, default: '' },
    autoLaunchGroupChat: { type: Boolean, default: true },
    startingPhase: { type: String, default: 'Phase 1: Foundation (Days 1 – 30)' },
    parents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Gamification & XP System
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    streak: { type: Number, default: 0 },
    highestStreak: { type: Number, default: 0 },
    tierBadge: { type: String, default: 'Rookie' }, // e.g. Rookie, Pro, Elite
    jerseyNumber: { type: String, required: false },
    rating: { type: Number, required: false },
    badges: [
      {
        badgeId: { type: String, required: true },
        icon: { type: String, default: '🏆' },
        title: { type: String, required: true },
        description: { type: String, default: '' },
        earnedAt: { type: Date, default: Date.now },
      },
    ],

    // Parent Specific Fields
    athletes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Coach Specific Fields
    username: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    avatarColor: { type: String, default: '' },
    avatarInitials: { type: String, default: '' },
    roleTitle: { type: String, default: '' }, // e.g. "High-Performance Mindset Coach"
    bio: { type: String, default: '' },
    coachingPhilosophy: { type: String, default: '' },
    experienceYears: { type: Number, default: 0 },
    maxAthleteCapacity: { type: Number, default: 0 },
    operationalTimezone: { type: String, default: '' },
    specialties: [{ type: String }], // ['Pre-Game Routines', 'Mistake Recovery / Goldfish Reset', etc.]
    certifications: [{ type: String }],
    coachPermissions: [{ type: String }], // ['Assign Habits & Drills', '3-Way Group Voice/Chat']
    welcomeEmailSent: { type: Boolean, default: false },
    isHeadCoach: { type: Boolean, default: false },

    // Personalised Development Plan (Figma node 32906:2936)
    devPlan: {
      title: { type: String, default: 'MY DEV PLAN' },
      roadmapDuration: { type: String, default: 'Personalised 12-week roadmap' },
      currentWeek: { type: Number, default: 1 },
      totalWeeks: { type: Number, default: 12 },
      objectives: [
        {
          objectiveId: { type: String },
          title: { type: String, required: true },
          category: { type: String, default: 'Focus' },
          icon: { type: String, default: '🎯' },
          progress: { type: Number, default: 0, min: 0, max: 100 },
          targetDate: { type: Date },
        },
      ],
    },

    // Admin Specific Fields
    isSuperAdmin: { type: Boolean, default: false },

    // Stripe Billing
    stripeCustomerId: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);