const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../modules/User/user.model');
const Task = require('../modules/Coach/task.model');
const { getUserProfileService } = require('../modules/User/user.service');

async function testSeed() {
  await mongoose.connect(process.env.MONGODB_CONNECTION);
  console.log('Connected to MongoDB');

  const athleteId = '6acc80dca1df2a2ed315c20e';
  const user = await User.findById(athleteId);
  if (!user) {
    console.error('Athlete not found:', athleteId);
    process.exit(1);
  }

  // 1. Award Badges for testing
  user.badges = [
    {
      badgeId: 'streak_7',
      icon: '🔥',
      title: '7-Day Streak',
      description: 'Maintained a 7-day continuous training streak',
      earnedAt: new Date(),
    },
    {
      badgeId: 'master_level',
      icon: '👑',
      title: 'MVP Leadership',
      description: 'Reached Level 10+ in elite mindset progression',
      earnedAt: new Date(),
    },
  ];
  await user.save();
  console.log('✓ Successfully awarded 2 sample badges to Alex Thompson');

  // 2. Add Completed Tasks for Today to populate Today in activityGrid
  const today = new Date();
  await Task.create([
    {
      athlete: user._id,
      coach: user.assignedCoach,
      icon: '💨',
      title: 'Morning Breathwork Drill',
      status: 'completed',
      completedAt: today,
      dueDate: today,
    },
    {
      athlete: user._id,
      coach: user.assignedCoach,
      icon: '🎯',
      title: 'Pre-Match Focus Ritual',
      status: 'completed',
      completedAt: today,
      dueDate: today,
    },
    {
      athlete: user._id,
      coach: user.assignedCoach,
      icon: '📓',
      title: 'Nightly Reflection Entry',
      status: 'completed',
      completedAt: today,
      dueDate: today,
    },
  ]);
  console.log('✓ Successfully added 3 completed tasks for Today (Level 3 activity)');

  // 3. Fetch and display updated profile
  const profile = await getUserProfileService(athleteId, { athleteId });
  console.log('\n--- UPDATED USER PROFILE RESULT ---');
  console.log('Badges:', JSON.stringify(profile.badges, null, 2));
  console.log('Stats:', profile.stats);
  const todayActivity = profile.activityGrid.find(d => d.date === today.toISOString().split('T')[0]);
  console.log('Today Activity in Grid:', todayActivity);

  await mongoose.disconnect();
  console.log('\nDone! You can now call GET {{url}}/api/v1/user/profile?athleteId=6acc80dca1df2a2ed315c20e in Postman.');
}

testSeed().catch(console.error);
