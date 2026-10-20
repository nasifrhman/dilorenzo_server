const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
require('dotenv').config();

const Drill = require('../modules/Drill/drill.model');
const Task = require('../modules/Coach/task.model');
const User = require('../modules/User/user.model');

async function seedTrainData() {
  try {
    await mongoose.connect(process.env.MONGODB_CONNECTION);
    console.log('Connected to MongoDB');

    // 1. Seed Real Mental Performance Drills (Figma Node 32772:5327)
    const drillsData = [
      {
        title: 'AI COACH SESSION',
        description: 'Personalized 15-min mental conditioning with your coach',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        duration: 15,
        category: 'focus',
        difficulty: 'intermediate',
        xpReward: 280,
        icon: '🧠',
        isFeatured: true,
      },
      {
        title: 'Pre-Match Focus Ritual',
        description: 'Deep focus ritual before matches to get into the zone and sharpen game awareness.',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        duration: 8,
        category: 'focus',
        difficulty: 'beginner',
        xpReward: 120,
        icon: '🎯',
        isFeatured: false,
      },
      {
        title: 'Pressure Breathing',
        description: 'Box breathing technique designed to lower heart rate and execute under pressure.',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        duration: 5,
        category: 'pressure',
        difficulty: 'beginner',
        xpReward: 80,
        icon: '💨',
        isFeatured: false,
      },
      {
        title: 'Resilience Reset',
        description: 'Cognitive reframing protocol to bounce back quickly after setbacks or conceding goals.',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        duration: 12,
        category: 'resilience',
        difficulty: 'intermediate',
        xpReward: 180,
        icon: '🔄',
        isFeatured: false,
      },
      {
        title: 'Confidence Power-Up',
        description: 'High-intensity self-talk and physiological priming for unstoppable matchday confidence.',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        duration: 6,
        category: 'confidence',
        difficulty: 'beginner',
        xpReward: 100,
        icon: '⚡',
        isFeatured: false,
      },
      {
        title: 'Elite Focus Flow',
        description: 'Advanced visualization and tunnel-vision drills for 90-minute sustained concentration.',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        duration: 15,
        category: 'focus',
        difficulty: 'advanced',
        xpReward: 220,
        icon: '🧠',
        isFeatured: false,
      },
      {
        title: 'Match Mindset Builder',
        description: 'Championship psychology framework to overcome self-doubt and play with freedom.',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        duration: 10,
        category: 'confidence',
        difficulty: 'intermediate',
        xpReward: 150,
        icon: '🏆',
        isFeatured: false,
      },
      {
        title: 'Calm Under Fire',
        description: 'Maintain emotional control and fast decision-making when the game gets chaotic.',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        duration: 9,
        category: 'pressure',
        difficulty: 'intermediate',
        xpReward: 140,
        icon: '🔥',
        isFeatured: false,
      },
      {
        title: 'Bounce Back Protocol',
        description: '3-step instant reset protocol after making an unforced error or losing possession.',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        duration: 7,
        category: 'resilience',
        difficulty: 'beginner',
        xpReward: 110,
        icon: '💪',
        isFeatured: false,
      },
    ];

    for (const d of drillsData) {
      await Drill.findOneAndUpdate(
        { title: d.title },
        { $set: d },
        { upsert: true, new: true }
      );
    }
    console.log(`Seeded ${drillsData.length} mental performance drills successfully.`);

    // 2. Find Coach Rivera and Athletes
    const coachRivera = await User.findOne({
      $or: [
        { fullName: /Rivera/i },
        { name: /Rivera/i },
        { email: 'test.coach@dsmsoccer.com' },
      ],
    });
    const coachId = coachRivera ? coachRivera._id : null;

    const athletes = await User.find({
      role: { $in: ['athlete', 'user'] },
    }).lean();

    console.log(`Found Coach Rivera: ${coachRivera?.fullName || coachRivera?.email} (${coachId})`);
    console.log(`Found ${athletes.length} athletes to ensure assignments for.`);

    // 3. Seed Real Coach Assignments (Figma Node 33000:12481)
    const now = new Date();
    const todayDue = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0, 0);
    const tomorrowDue = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 20, 0, 0);

    for (const athlete of athletes) {
      // Assignment 1: Pre-Match Breathing Log (Completed with Evidence)
      await Task.findOneAndUpdate(
        {
          athlete: athlete._id,
          title: 'Pre-Match Breathing Log',
        },
        {
          $set: {
            athlete: athlete._id,
            coach: coachId,
            title: 'Pre-Match Breathing Log',
            description: 'Complete 3 rounds of 4-7-8 breathing before your next training session and log how you felt before and after.',
            icon: '💨',
            category: 'mindset',
            xpReward: 80,
            dueDate: todayDue,
            frequency: 'Once',
            status: 'completed',
            completedAt: new Date(Date.now() - 3600000),
            evidence: {
              isUploaded: true,
              mediaUrl: 'https://dilorenzosoccer.com/uploads/evidence/sample-breathing-log.pdf',
              mediaType: 'document',
              notes: 'Completed 3 rounds of 4-7-8 breathing before today training. Heart rate felt significantly lower and focus was locked.',
              submittedAt: new Date(Date.now() - 3600000),
            },
          },
        },
        { upsert: true, new: true }
      );

      // Assignment 2: Resilience Journal Entry (Pending Upload)
      await Task.findOneAndUpdate(
        {
          athlete: athlete._id,
          title: 'Resilience Journal Entry',
        },
        {
          $set: {
            athlete: athlete._id,
            coach: coachId,
            title: 'Resilience Journal Entry',
            description: 'Write about a recent setback and how you responded. What would you do differently?',
            icon: '📓',
            category: 'resilience',
            xpReward: 100,
            dueDate: tomorrowDue,
            frequency: 'Once',
            status: 'pending',
            evidence: {
              isUploaded: false,
              mediaUrl: '',
              mediaType: '',
              notes: '',
              submittedAt: null,
            },
          },
        },
        { upsert: true, new: true }
      );
    }

    console.log('Successfully seeded coach assignments for all athletes.');
    await mongoose.disconnect();
    console.log('Done.');
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seedTrainData();
