const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config({ path: 'e:/dilorenzo/.env' });
const mongoose = require('mongoose');
const CurriculumMission = require('../modules/Curriculum/curriculumMission.model');

const initialMissions = [
  {
    dayNumber: 1,
    taskNumber: 1,
    icon: '🧠',
    title: 'Mindset Foundation & Core Mission',
    category: 'Mental',
    xpReward: 50,
    instructions: 'Define your core athletic intention and 3 foundational habits for the next 90 days.',
    status: 'completed',
    isLiveNow: false,
  },
  {
    dayNumber: 2,
    taskNumber: 1,
    icon: '🎯',
    title: 'Pre-Training Mental Warmup',
    category: 'Focus',
    xpReward: 50,
    instructions: 'Perform a 5-minute mental priming session before your touches today.',
    status: 'completed',
    isLiveNow: false,
  },
  {
    dayNumber: 3,
    taskNumber: 1,
    icon: '🫁',
    title: 'Box Breathing & Heart Rate Control',
    category: 'Pressure',
    xpReward: 60,
    instructions: 'Practice 4-4-4-4 box breathing before entering high-stress training scenarios.',
    status: 'completed',
    isLiveNow: false,
  },
  {
    dayNumber: 4,
    taskNumber: 1,
    icon: '⚡',
    title: 'Emotional Agility on Errors',
    category: 'Resilience',
    xpReward: 60,
    instructions: 'Recognize frustration immediately, breathe, and reset within 5 seconds.',
    status: 'completed',
    isLiveNow: false,
  },
  {
    dayNumber: 5,
    taskNumber: 1,
    icon: '🔮',
    title: 'Visualization of Match Climax',
    category: 'Mental',
    xpReward: 50,
    instructions: 'Visualize completing 3 decisive plays with precision in slow motion.',
    status: 'completed',
    isLiveNow: false,
  },
  // Day 7 (Milestone 1 - Figma Node 32975:8114)
  {
    dayNumber: 7,
    taskNumber: 1,
    icon: '🧠',
    title: 'First coaching session completed',
    category: 'Mental',
    xpReward: 50,
    instructions: 'Complete kickoff 1-on-1 video call and performance audit with your assigned mentor coach.',
    status: 'completed',
    isLiveNow: false,
    isMilestone: true,
  },
  // Day 13 (Figma Node 33304:2397)
  {
    dayNumber: 13,
    taskNumber: 1,
    icon: '🧠',
    title: 'Gratitude & Focus',
    category: 'Mental',
    xpReward: 50,
    instructions: 'Reflect on 3 physical strengths and 1 area you will master in training today.',
    status: 'completed',
    isLiveNow: false,
  },
  // Day 14 Task 1 (Milestone 2 - Figma Node 32975:8114)
  {
    dayNumber: 14,
    taskNumber: 1,
    icon: '🎯',
    title: 'Foundation habits established',
    category: 'Habits',
    xpReward: 50,
    instructions: 'Lock in your 3 non-negotiable daily habits across training, hydration, and sleep.',
    status: 'completed',
    isLiveNow: false,
    isMilestone: true,
  },
  // Day 14 Task 2 (LIVE NOW Hero - Figma Node 33304:2397 & User Hero 32682:3299)
  {
    dayNumber: 14,
    taskNumber: 2,
    icon: '🧠',
    title: 'Morning Mindset Journal',
    category: 'Mental',
    xpReward: 50,
    instructions:
      "Write 3 things you're grateful for and set one focus goal for today. Journaling primes your brain for high performance before the session even starts.",
    status: 'live',
    isLiveNow: true,
    isMilestone: false,
  },
  // Day 15 (Figma Node 33304:2397)
  {
    dayNumber: 15,
    taskNumber: 1,
    icon: '🫁',
    title: 'Pre-Match Breathing Anchor',
    category: 'Pressure',
    xpReward: 60,
    instructions:
      'Complete a 4-7-8 breathing exercise to lower heart rate and reduce pre-competition anxiety.',
    status: 'queued',
    isLiveNow: false,
  },
  // Day 16 (Figma Node 33304:2397)
  {
    dayNumber: 16,
    taskNumber: 1,
    icon: '🎯',
    title: 'Tunnel Vision & Visual Cue',
    category: 'Focus',
    xpReward: 70,
    instructions:
      'Anchor your visual focus on the center circle before kickoff to eliminate crowd and sideline distractions.',
    status: 'queued',
    isLiveNow: false,
  },
  // Day 17 (Figma Node 33304:2397)
  {
    dayNumber: 17,
    taskNumber: 1,
    icon: '🐟',
    title: 'Goldfish Reset (10s Rule)',
    category: 'Resilience',
    xpReward: 75,
    instructions:
      'Adopt the 10-second rule. Write down one recent match error, release it, and reset for the next play.',
    status: 'queued',
    isLiveNow: false,
  },
  // Day 18 (Figma Node 33304:2397)
  {
    dayNumber: 18,
    taskNumber: 1,
    icon: '⚽',
    title: 'Matchday Tactical Intention',
    category: 'Focus',
    xpReward: 80,
    instructions:
      'Define your non-negotiable physical effort goal and 1 key communication goal before the match.',
    status: 'queued',
    isLiveNow: false,
  },
  // Day 19 (Figma Node 33304:2397)
  {
    dayNumber: 19,
    taskNumber: 1,
    icon: '🎬',
    title: 'Post-Match Video & Gratitude',
    category: 'Mental',
    xpReward: 50,
    instructions:
      'Review 2 positive highlights from your last match and write what you will repeat next weekend.',
    status: 'queued',
    isLiveNow: false,
  },
  // Day 20 (Modal Sample Figma 34010:5098)
  {
    dayNumber: 20,
    taskNumber: 1,
    icon: '🧠',
    title: 'Clutch Penalty Focus & Cardiac Calm',
    category: 'Focus',
    xpReward: 60,
    instructions:
      'Lock down your cardiac calm routine when stepping up to penalty or high-stakes set pieces.',
    status: 'queued',
    isLiveNow: false,
  },
  // Day 30 (Milestone 3 - Figma Node 32975:8114)
  {
    dayNumber: 30,
    taskNumber: 1,
    icon: '⚡',
    title: 'Pre-game routine locked in',
    category: 'Focus',
    xpReward: 75,
    instructions:
      'Execute your personalized 15-minute priming sequence before match kickoff.',
    status: 'queued',
    isLiveNow: false,
    isMilestone: true,
  },
  // Day 60 (Milestone 4 - Figma Node 32975:8114)
  {
    dayNumber: 60,
    taskNumber: 1,
    icon: '🎬',
    title: 'Development phase review',
    category: 'Tactical',
    xpReward: 80,
    instructions:
      'Analyze mid-program game tape and recalibrate tactical decision-making targets.',
    status: 'queued',
    isLiveNow: false,
    isMilestone: true,
  },
  // Day 90 (Milestone 5 - Figma Node 32975:8114)
  {
    dayNumber: 90,
    taskNumber: 1,
    icon: '🏆',
    title: 'Final 90-day review',
    category: 'Mastery',
    xpReward: 100,
    instructions:
      'Complete comprehensive exit benchmark evaluation, certify mental toughness progress.',
    status: 'queued',
    isLiveNow: false,
    isMilestone: true,
  },
];

async function seedCurriculumMissions() {
  await mongoose.connect(process.env.MONGODB_CONNECTION);
  console.log('Connected to MongoDB. Seeding clean 90-day curriculum missions...');

  // Unset legacy duplicate description field from all missions in MongoDB
  await mongoose.connection.collection('curriculummissions').updateMany(
    {},
    { $unset: { description: '' } }
  );

  for (const m of initialMissions) {
    await CurriculumMission.findOneAndUpdate(
      { dayNumber: m.dayNumber, taskNumber: m.taskNumber },
      { $set: m, $unset: { description: '' } },
      { upsert: true, new: true }
    );
    console.log(`Upserted Day ${m.dayNumber} Task ${m.taskNumber}: ${m.title} (Milestone: ${Boolean(m.isMilestone)})`);
  }

  const User = require('../modules/User/user.model');
  const UserMissionProgress = require('../modules/Curriculum/userMissionProgress.model');

  // Ensure Alex Thompson exists and has Day 7 and Day 14 completed matching Figma
  const alex = await User.findOne({ email: 'alex.thompson@example.com' });
  if (alex) {
    alex.mentorshipDay = 23;
    alex.mentorshipStartDate = new Date('2026-07-08T00:00:00.000Z');
    alex.mentorshipEndDate = new Date('2026-10-05T23:59:59.999Z');
    alex.tier = '90-day-mentorship';
    await alex.save();

    const day7Mission = await CurriculumMission.findOne({ dayNumber: 7, taskNumber: 1 });
    const day14Mission = await CurriculumMission.findOne({ dayNumber: 14, taskNumber: 1 });

    if (day7Mission) {
      await UserMissionProgress.findOneAndUpdate(
        { athlete: alex._id, mission: day7Mission._id },
        {
          $set: {
            dayNumber: 7,
            isCompleted: true,
            completedAt: new Date('2026-07-15T10:00:00.000Z'),
            earnedXp: 50,
          },
        },
        { upsert: true }
      );
      console.log('Recorded Day 7 completion for Alex Thompson');
    }

    if (day14Mission) {
      await UserMissionProgress.findOneAndUpdate(
        { athlete: alex._id, mission: day14Mission._id },
        {
          $set: {
            dayNumber: 14,
            isCompleted: true,
            completedAt: new Date('2026-07-22T10:00:00.000Z'),
            earnedXp: 50,
          },
        },
        { upsert: true }
      );
      console.log('Recorded Day 14 completion for Alex Thompson');
    }
  }

  const total = await CurriculumMission.countDocuments();
  console.log(`Curriculum Missions seed complete! Total in DB: ${total}`);
  process.exit(0);
}

seedCurriculumMissions().catch((e) => {
  console.error(e);
  process.exit(1);
});
