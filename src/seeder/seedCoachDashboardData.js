const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const User = require('../modules/User/user.model');
const Task = require('../modules/Coach/task.model');
const TrainingAssignment = require('../modules/Coach/trainingAssignment.model');
const Session = require('../modules/Session/session.model');

async function seedCoachDashboard() {
  await mongoose.connect(process.env.MONGODB_CONNECTION || process.env.DATABASE_URL);
  console.log('Connected to MongoDB Atlas');

  const coach = await User.findOne({ role: 'coach', isDeleted: { $ne: true } });
  if (!coach) {
    console.error('No coach found in DB');
    return;
  }
  const coachId = coach._id;

  // 1. Players definition matching Figma #33253:3342
  const playersData = [
    {
      _id: new mongoose.Types.ObjectId('6acc80dca1df2a2ed315c20e'),
      fullName: 'Alex Thompson',
      email: 'alex.thompson@dsmsoccer.com',
      currentClub: 'Regional Stars U18',
      mentorshipDay: 34,
      level: 12,
      streak: 7,
      highestStreak: 14,
      flagCount: 0,
      avatarInitials: 'AT',
      pendingTasksCount: 3,
      trainingWeek: 5,
    },
    {
      fullName: 'Marcus Silva',
      email: 'marcus.silva@dsmsoccer.com',
      currentClub: 'City Academy U16',
      mentorshipDay: 67,
      level: 9,
      streak: 12,
      highestStreak: 15,
      flagCount: 0,
      avatarInitials: 'MS',
      pendingTasksCount: 1,
      trainingWeek: 10,
    },
    {
      fullName: 'Jordan Lee',
      email: 'jordan.lee@dsmsoccer.com',
      currentClub: 'United Juniors U17',
      mentorshipDay: 12,
      level: 7,
      streak: 0,
      highestStreak: 4,
      flagCount: 1, // needs attention
      avatarInitials: 'JL',
      pendingTasksCount: 5,
      trainingWeek: 2,
    },
    {
      fullName: 'Sam Davies',
      email: 'sam.davies@dsmsoccer.com',
      currentClub: 'Elite Academy U15',
      mentorshipDay: 88,
      level: 15,
      streak: 21,
      highestStreak: 21,
      flagCount: 0,
      avatarInitials: 'SD',
      pendingTasksCount: 0,
      trainingWeek: 13,
    },
  ];

  for (const p of playersData) {
    let athleteDoc = p._id ? await User.findById(p._id) : await User.findOne({ email: p.email });
    if (!athleteDoc) {
      athleteDoc = await User.create({
        ...(p._id ? { _id: p._id } : {}),
        fullName: p.fullName,
        email: p.email,
        role: 'athlete',
        assignedCoach: coachId,
        currentClub: p.currentClub,
        mentorshipDay: p.mentorshipDay,
        level: p.level,
        streak: p.streak,
        highestStreak: p.highestStreak,
        flagCount: p.flagCount,
        avatarInitials: p.avatarInitials,
      });
      console.log(`Created athlete: ${p.fullName}`);
    } else {
      athleteDoc.assignedCoach = coachId;
      athleteDoc.currentClub = p.currentClub;
      athleteDoc.mentorshipDay = p.mentorshipDay;
      athleteDoc.level = p.level;
      athleteDoc.streak = p.streak;
      athleteDoc.flagCount = p.flagCount;
      await athleteDoc.save();
      console.log(`Updated athlete: ${p.fullName}`);
    }

    const athleteId = athleteDoc._id;

    // Seed tasks if fewer than expected
    const existingTasks = await Task.countDocuments({ athlete: athleteId });
    if (existingTasks === 0) {
      const tasksToCreate = [];
      const pendingCount = p.pendingTasksCount;
      const completedCount = 10; // completed historical tasks

      for (let i = 1; i <= pendingCount; i++) {
        tasksToCreate.push({
          athlete: athleteId,
          coach: coachId,
          title: `Drill & Mindset Assignment #${i}`,
          dueDate: new Date(Date.now() + i * 86400000),
          frequency: 'Daily',
          status: 'pending',
        });
      }

      for (let j = 1; j <= completedCount; j++) {
        tasksToCreate.push({
          athlete: athleteId,
          coach: coachId,
          title: `Completed Routine Workout #${j}`,
          dueDate: new Date(Date.now() - j * 86400000),
          frequency: 'Daily',
          status: 'completed',
          completedAt: new Date(Date.now() - j * 86400000),
        });
      }

      await Task.create(tasksToCreate);
      console.log(`Seeded tasks for ${p.fullName}`);
    }

    // Seed training assignments if none
    const existingTrainings = await TrainingAssignment.countDocuments({ athlete: athleteId });
    if (existingTrainings === 0) {
      await TrainingAssignment.create([
        {
          athlete: athleteId,
          coach: coachId,
          title: 'Ball Mastery & Spatial Awareness',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          category: 'Technical',
          duration: '16 min',
          week: p.trainingWeek,
          status: 'completed',
          completedAt: new Date(),
        },
        {
          athlete: athleteId,
          coach: coachId,
          title: 'First-Touch Precision in Tight Pockets',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          category: 'Technical',
          duration: '14 min',
          week: p.trainingWeek,
          status: 'completed',
          completedAt: new Date(),
        },
        {
          athlete: athleteId,
          coach: coachId,
          title: 'Scanning & Vision Drills Under Pressure',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          category: 'Tactical',
          duration: '20 min',
          week: p.trainingWeek,
          status: 'completed',
          completedAt: new Date(),
        },
        {
          athlete: athleteId,
          coach: coachId,
          title: 'High-Tempo Counter-Press Footwork',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          category: 'Physical',
          duration: '18 min',
          week: p.trainingWeek,
          status: 'assigned',
        },
        {
          athlete: athleteId,
          coach: coachId,
          title: 'Post-Match Mental Recovery Meditation',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          category: 'Mental',
          duration: '12 min',
          week: p.trainingWeek,
          status: 'assigned',
        },
      ]);
      console.log(`Seeded 5 training videos for ${p.fullName} (3 completed, 2 assigned)`);
    }
  }

  // Ensure upcoming and today sessions match Figma
  const now = new Date();
  const today3pm = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0, 0);

  const existingTodaySession = await Session.findOne({
    coach: coachId,
    date: {
      $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    },
  });

  if (!existingTodaySession) {
    const alex = await User.findOne({ email: 'alex.thompson@dsmsoccer.com' });
    if (alex) {
      await Session.create({
        title: 'Weekly Mentorship Check-in',
        athlete: alex._id,
        athleteName: 'Alex Thompson',
        coach: coachId,
        coachName: 'Coach Rivera',
        date: today3pm,
        startTime: '3:00 PM',
        endTime: '3:45 PM',
        platform: 'Google Meet',
        meetingLink: 'https://meet.google.com/dsm-coach-room',
        status: 'scheduled',
      });
      console.log('Seeded 3:00 PM session today with Alex Thompson');
    }
  }

  console.log('Coach Dashboard Seeding complete!');
  await mongoose.disconnect();
}

seedCoachDashboard().catch((err) => {
  console.error(err);
  process.exit(1);
});
