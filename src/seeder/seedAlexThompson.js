const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../modules/User/user.model');
const Habit = require('../modules/Habit/habit.model');
const Task = require('../modules/Coach/task.model');
const TrainingAssignment = require('../modules/Coach/trainingAssignment.model');
const ActionStep = require('../modules/ActionStep/actionStep.model');
const CoachFeedback = require('../modules/Coach/coachFeedback.model');
const Session = require('../modules/Session/session.model');
const ChatRoom = require('../modules/Chat/chatRoom.model');
const Message = require('../modules/Chat/message.model');

async function seed() {
  await mongoose.connect(process.env.MONGODB_CONNECTION);
  console.log('Connected to MongoDB Atlas');

  // 1. Ensure Coach exists
  let coach = await User.findOne({ role: 'coach', isDeleted: { $ne: true } });
  if (!coach) {
    coach = await User.create({
      fullName: 'Coach Rivera',
      email: 'coach.rivera@dsmsoccer.com',
      role: 'coach',
      roleTitle: 'High-Performance Mindset Coach',
      currentClub: 'DSM Soccer',
      avatarColor: '#C27AFF',
      avatarInitials: 'CR',
      isHeadCoach: false,
    });
    console.log('Created Coach Rivera');
  } else {
    // Update name/title if needed
    if (!coach.fullName || coach.fullName === 'Coach Test User') {
      coach.fullName = 'Coach Rivera';
      coach.currentClub = 'DSM Soccer';
      await coach.save();
    }
  }

  // 2. Ensure Admin / Valentino exists
  let admin = await User.findOne({ role: 'admin', isDeleted: { $ne: true } });
  if (!admin) {
    admin = await User.create({
      fullName: 'Valentino Di Lorenzo',
      email: 'valentino@dsmsoccer.com',
      role: 'admin',
    });
    console.log('Created Admin Valentino');
  }

  // 3. Ensure Alex Thompson exists
  let alex = await User.findOne({ email: 'alex.thompson@example.com', isDeleted: { $ne: true } });
  if (!alex) {
    alex = await User.create({
      fullName: 'Alex Thompson',
      email: 'alex.thompson@example.com',
      role: 'athlete',
      tier: '90-day-mentorship',
      mentorshipDay: 34,
      mentorshipPhase: 'foundation',
      currentClub: 'Regional Stars U18',
      leagueDivision: 'Regional Stars U18',
      level: 12,
      xp: 4820,
      streak: 7,
      highestStreak: 14,
      assignedCoach: coach._id,
      focusGoals: 'Mental composure, composure under pressure, pre-game visualization',
    });
    console.log('Created Athlete Alex Thompson');
  } else {
    alex.fullName = 'Alex Thompson';
    alex.mentorshipDay = 34;
    alex.mentorshipPhase = 'foundation';
    alex.level = 12;
    alex.xp = 4820;
    alex.streak = 7;
    alex.assignedCoach = coach._id;
    alex.currentClub = 'Regional Stars U18';
    await alex.save();
  }

  const athleteId = alex._id;
  const coachId = coach._id;

  // 4. Seed Habits
  const existingHabits = await Habit.countDocuments({ assignedAthletes: athleteId });
  if (existingHabits === 0) {
    await Habit.create([
      {
        title: 'Ball Mastery (20 min)',
        frequency: '5× / week',
        days: 'Mon–Fri',
        completionRate: 80,
        status: 'active',
        timesPerWeek: 5,
        xpReward: 20,
        category: 'technical',
        assignedAthletes: [athleteId],
        assignedCoaches: [coachId],
        currentStreak: 5,
        startDate: new Date('2026-07-08'),
      },
      {
        title: 'Morning Mindset Journal',
        frequency: 'Daily',
        days: 'Every day',
        completionRate: 71,
        status: 'active',
        timesPerWeek: 7,
        xpReward: 15,
        category: 'mindset',
        assignedAthletes: [athleteId],
        assignedCoaches: [coachId],
        currentStreak: 7,
        startDate: new Date('2026-07-10'),
      },
      {
        title: 'Submit Practice Feedback',
        frequency: '3× / week',
        days: 'Tue · Wed · Thu',
        completionRate: 67,
        status: 'active',
        timesPerWeek: 3,
        xpReward: 10,
        category: 'mindset',
        assignedAthletes: [athleteId],
        assignedCoaches: [coachId],
        currentStreak: 3,
        startDate: new Date('2026-07-12'),
      },
      {
        title: 'Breathing Reset',
        frequency: 'Daily',
        days: 'Pre-training',
        completionRate: 90,
        status: 'active',
        timesPerWeek: 7,
        xpReward: 10,
        category: 'recovery',
        assignedAthletes: [athleteId],
        assignedCoaches: [coachId],
        currentStreak: 9,
        startDate: new Date('2026-07-15'),
      },
      {
        title: 'Nutrition Tracking',
        frequency: 'Daily',
        days: 'Every meal',
        completionRate: 85,
        status: 'active',
        timesPerWeek: 7,
        xpReward: 10,
        category: 'nutrition',
        assignedAthletes: [athleteId],
        assignedCoaches: [coachId],
        currentStreak: 8,
        startDate: new Date('2026-07-18'),
      },
      {
        title: 'Team Strategy Session',
        frequency: 'Weekly',
        days: 'Every Monday',
        completionRate: 75,
        status: 'active',
        timesPerWeek: 1,
        xpReward: 25,
        category: 'tactical',
        assignedAthletes: [athleteId],
        assignedCoaches: [coachId],
        currentStreak: 2,
        startDate: new Date('2026-07-20'),
      },
      {
        title: 'Skill Review',
        frequency: 'Bi-weekly',
        days: 'Every other Friday',
        completionRate: 80,
        status: 'active',
        timesPerWeek: 1,
        xpReward: 20,
        category: 'technical',
        assignedAthletes: [athleteId],
        assignedCoaches: [coachId],
        currentStreak: 2,
        startDate: new Date('2026-07-22'),
      },
      {
        title: 'Cool Down Routine',
        frequency: 'Daily',
        days: 'Post-training',
        completionRate: 88,
        status: 'active',
        timesPerWeek: 7,
        xpReward: 15,
        category: 'recovery',
        assignedAthletes: [athleteId],
        assignedCoaches: [coachId],
        currentStreak: 6,
        startDate: new Date('2026-07-25'),
      },
    ]);
    console.log('Seeded 8 Figma Habits for Alex');
  }

  // 5. Seed Tasks
  const existingTasks = await Task.countDocuments({ athlete: athleteId });
  if (existingTasks === 0) {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const saturday = new Date();
    saturday.setDate(today.getDate() + 4);

    await Task.create([
      {
        athlete: athleteId,
        coach: coachId,
        title: 'Complete Ball Mastery Session',
        dueDate: today,
        frequency: 'Weekdays (5×)',
        status: 'pending',
      },
      {
        athlete: athleteId,
        coach: coachId,
        title: 'Review Match Tape vs Oakridge',
        dueDate: tomorrow,
        frequency: 'Once',
        status: 'pending',
      },
      {
        athlete: athleteId,
        coach: coachId,
        title: 'Submit Pre-Game Mental Checklist',
        dueDate: saturday,
        frequency: 'Match-day',
        status: 'completed',
        completedAt: new Date(),
      },
    ]);
    console.log('Seeded Tasks for Alex');
  }

  // 6. Seed Training Assignments
  const existingTraining = await TrainingAssignment.countDocuments({ athlete: athleteId });
  if (existingTraining === 0) {
    await TrainingAssignment.create([
      {
        athlete: athleteId,
        coach: coachId,
        title: 'Reading the Game',
        category: 'Tactical',
        duration: '16 min',
        week: 3,
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        status: 'assigned',
      },
      {
        athlete: athleteId,
        coach: coachId,
        title: 'Recovery & Reset Between Plays',
        category: 'Mental',
        duration: '11 min',
        week: 3,
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        status: 'completed',
        completedAt: new Date('2026-08-11'),
      },
      {
        athlete: athleteId,
        coach: coachId,
        title: 'Ball Mastery Phase 2',
        category: 'Technical',
        duration: '20 min',
        week: 1,
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        status: 'completed',
        completedAt: new Date('2026-07-14'),
      },
    ]);
    console.log('Seeded Training Assignments for Alex');
  }

  // 7. Seed Action Steps
  const existingActionSteps = await ActionStep.countDocuments({ athlete: athleteId });
  if (existingActionSteps === 0) {
    await ActionStep.create([
      {
        athlete: athleteId,
        coach: coachId,
        title: 'Post-Practice Feedback',
        description: 'Aug 13 · Practice',
        dayNumber: 34,
        phase: 'foundation',
        status: 'pending',
        mentalityUsed: 'Composed under pressure',
        whatWentWell: 'Stayed calm during the 2nd half press',
        areaToImprove: 'Breathing reset between plays',
        submittedAt: new Date('2026-08-13T14:30:00Z'),
      },
      {
        athlete: athleteId,
        coach: coachId,
        title: 'Pre-Game Mental Report',
        description: 'Aug 10 · Game',
        dayNumber: 31,
        phase: 'foundation',
        status: 'reviewed',
        mentalityUsed: 'Aggressive focus',
        whatWentWell: 'High pressing intensity',
        areaToImprove: 'Patience on the ball',
        coachFeedback: {
          textNotes: 'Outstanding mental composure. You stayed grounded during early pressure.',
          reviewedAt: new Date('2026-08-10T18:00:00Z'),
          reviewedBy: coachId,
        },
        submittedAt: new Date('2026-08-10T11:00:00Z'),
      },
      {
        athlete: athleteId,
        coach: coachId,
        title: 'Weekly Reflection',
        description: 'Aug 7 · Practice',
        dayNumber: 28,
        phase: 'foundation',
        status: 'needs-revision',
        mentalityUsed: 'Confidence building',
        whatWentWell: 'Good communication with center backs',
        areaToImprove: 'Second touch composure',
        coachFeedback: {
          textNotes: 'Please add 1 more reflection on how you dealt with fatigue in minute 70.',
          reviewedAt: new Date('2026-08-08T10:00:00Z'),
          reviewedBy: coachId,
        },
        submittedAt: new Date('2026-08-07T16:00:00Z'),
      },
    ]);
    console.log('Seeded Action Steps for Alex');
  }

  // 8. Seed Coach Feedback
  const existingFeedback = await CoachFeedback.countDocuments({ athlete: athleteId });
  if (existingFeedback === 0) {
    await CoachFeedback.create([
      {
        athlete: athleteId,
        coach: coachId,
        title: 'Session 3 Review',
        date: new Date('2026-08-05'),
        rating: 5,
        message: "Outstanding mental composure. Your pre-game breathing is visibly paying off — you stayed composed in tight moments during Wednesday's session.",
        tags: ['Focus', 'Composure'],
      },
      {
        athlete: athleteId,
        coach: coachId,
        title: 'Pre-Game Routine',
        date: new Date('2026-07-22'),
        rating: 4,
        message: 'Good progress on the routine. Remember to run it on non-match days too — consistency builds automaticity.',
        tags: ['Routine', 'Consistency'],
      },
      {
        athlete: athleteId,
        coach: coachId,
        title: 'Foundation Session',
        date: new Date('2026-07-08'),
        rating: 5,
        message: "Strong start. I can see your growth mindset clearly. Focus areas for month 1 have been set — let's build from here.",
        tags: ['Mindset', 'Goals'],
      },
    ]);
    console.log('Seeded Coach Feedback for Alex');
  }

  // 9. Seed Sessions
  const existingSessions = await Session.countDocuments({ athlete: athleteId });
  if (existingSessions === 0) {
    const today = new Date();
    today.setHours(15, 0, 0, 0);

    await Session.create([
      {
        title: 'Session 4 — Resilience',
        athlete: athleteId,
        athleteName: 'Alex Thompson',
        coach: coachId,
        coachName: 'Coach Rivera',
        date: today,
        dateTime: today,
        startTime: '3:00 PM',
        duration: '45 min',
        platform: 'Zoom',
        meetingLink: 'https://zoom.us/j/9082341234',
        status: 'scheduled',
        sessionType: '1-on-1 Mentorship Call',
      },
      {
        title: 'Session 3 — Focus & Flow',
        athlete: athleteId,
        athleteName: 'Alex Thompson',
        coach: coachId,
        coachName: 'Coach Rivera',
        date: new Date('2026-08-05T14:30:00Z'),
        dateTime: new Date('2026-08-05T14:30:00Z'),
        startTime: '2:30 PM',
        duration: '45 min',
        platform: 'Zoom',
        status: 'completed',
        notes: '',
        sessionType: '1-on-1 Mentorship Call',
      },
      {
        title: 'Session 2 — Pre-Game Routine',
        athlete: athleteId,
        athleteName: 'Alex Thompson',
        coach: coachId,
        coachName: 'Coach Rivera',
        date: new Date('2026-07-22T15:00:00Z'),
        dateTime: new Date('2026-07-22T15:00:00Z'),
        startTime: '3:00 PM',
        duration: '45 min',
        platform: 'Zoom',
        status: 'completed',
        notes: 'Personalized pre-game routine established. Practice daily.',
        sessionType: '1-on-1 Mentorship Call',
      },
      {
        title: 'Session 1 — Introduction',
        athlete: athleteId,
        athleteName: 'Alex Thompson',
        coach: coachId,
        coachName: 'Coach Rivera',
        date: new Date('2026-07-08T10:00:00Z'),
        dateTime: new Date('2026-07-08T10:00:00Z'),
        startTime: '10:00 AM',
        duration: '45 min',
        platform: 'Zoom',
        status: 'completed',
        notes: 'Goals and baseline established for the 90-day program.',
        sessionType: '1-on-1 Mentorship Call',
      },
    ]);
    console.log('Seeded Sessions for Alex');
  }

  // 10. Seed 3-Way Chat Room & Messages
  let chatRoom = await ChatRoom.findOne({ type: '3-way', athlete: athleteId });
  if (!chatRoom) {
    chatRoom = await ChatRoom.create({
      name: "Alex Thompson's Coaching Group",
      type: '3-way',
      participants: [coachId, athleteId, admin._id],
      athlete: athleteId,
      coach: coachId,
      parent: admin._id,
    });
    console.log('Created 3-Way Chat Room');
  }

  const existingMsgs = await Message.countDocuments({ chatRoom: chatRoom._id });
  if (existingMsgs === 0) {
    const m1 = await Message.create({
      chatRoom: chatRoom._id,
      sender: admin._id,
      messageType: 'text',
      content: "Welcome to Alex Thompson's private group! This is your coaching space.",
      createdAt: new Date('2026-07-08T09:00:00Z'),
    });
    const m2 = await Message.create({
      chatRoom: chatRoom._id,
      sender: alex._id,
      messageType: 'text',
      content: "Thank you! Can't wait.",
      createdAt: new Date('2026-07-08T09:12:00Z'),
    });
    const m3 = await Message.create({
      chatRoom: chatRoom._id,
      sender: coachId,
      messageType: 'text',
      content: 'Excited to get started on the 90-day mentorship. Reviewing your intake notes now!',
      createdAt: new Date('2026-07-08T09:15:00Z'),
    });
    chatRoom.lastMessage = m3._id;
    chatRoom.lastMessageAt = m3.createdAt;
    await chatRoom.save();
    console.log('Seeded Messages for 3-way Chat');
  }

  console.log('Alex Thompson Seed Complete! Athlete ID:', alex._id.toString());
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
