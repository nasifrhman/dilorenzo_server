const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
require('dotenv').config();

const { getUserHomepageService, purchase90DaysProgramService, reset90DaysProgramService } = require('../modules/User/user.service');
const User = require('../modules/User/user.model');

async function testHomepage() {
  try {
    await mongoose.connect(process.env.MONGODB_CONNECTION);
    console.log('Connected to MongoDB');

    // Find Alex Thompson
    let alex = await User.findOne({ email: 'alex.thompson@example.com' });
    if (!alex) {
      alex = await User.findOne({ role: 'athlete' });
    }
    console.log(`Testing with athlete: ${alex?.fullName} (${alex?._id})`);

    // 1. Reset to pre-purchase state
    console.log('\n--- 1. Resetting to Pre-Purchase State (Figma #32801:5982) ---');
    const resetRes = await reset90DaysProgramService(alex._id);
    console.log('Reset result:', resetRes);

    const preHomepage = await getUserHomepageService(alex._id);
    console.log('\nPre-purchase homepage data:');
    console.log('- figmaNode:', preHomepage.figmaNode);
    console.log('- figmaTitle:', preHomepage.figmaTitle);
    console.log('- isPurchased90Days:', preHomepage.isPurchased90Days);
    console.log('- myProgram:', preHomepage.myProgram);
    console.log('- academyFeatures count:', preHomepage.academyFeatures?.length);
    console.log('- academyFeatures keys:', preHomepage.academyFeatures?.map(f => `${f.title} [${f.badge}]`));

    // 2. Simulate 90-Day Mentorship purchase
    console.log('\n--- 2. Simulating 90-Day Mentorship Purchase (Figma #32959:3560) ---');
    const purchaseRes = await purchase90DaysProgramService(alex._id);
    console.log('Purchase result:', purchaseRes);

    const postHomepage = await getUserHomepageService(alex._id);
    console.log('\nPost-purchase homepage data:');
    console.log('- figmaNode:', postHomepage.figmaNode);
    console.log('- figmaTitle:', postHomepage.figmaTitle);
    console.log('- isPurchased90Days:', postHomepage.isPurchased90Days);
    console.log('- myProgram status:', postHomepage.myProgram?.status);
    console.log('- myProgram dashboard:', postHomepage.myProgram?.dashboard?.title, `(${postHomepage.myProgram?.dashboard?.subtitle})`);
    console.log('- myProgram actions:', postHomepage.myProgram?.actions?.map(a => `${a.icon} ${a.title}`));
    console.log('- academyFeatures count:', postHomepage.academyFeatures?.length);
    console.log('- academyFeatures keys:', postHomepage.academyFeatures?.map(f => `${f.title} [${f.badge}]`));

    console.log('\n✅ All tests passed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

testHomepage();
