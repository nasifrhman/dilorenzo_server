const mongoose = require('mongoose');
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const User = require('../src/modules/User/user.model');

mongoose.connect(process.env.MONGODB_CONNECTION).then(async () => {
  const users = await User.find({ isDeleted: false }, 'role fullName email tier currentClub leagueDivision region mentorshipDay mentorshipPhase assignedCoach').lean();
  console.log('Total users:', users.length);
  users.forEach(u => console.log(`${u.role.padEnd(8)} | ${u._id} | ${(u.fullName || '').padEnd(20)} | ${(u.tier || '').padEnd(18)} | coach: ${u.assignedCoach ? 'YES' : 'NO '} | day: ${u.mentorshipDay} | phase: ${u.mentorshipPhase}`));
  process.exit(0);
});
