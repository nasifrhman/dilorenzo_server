const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const mongoose = require('mongoose');
require('../modules/User/user.model');
const User = require('../modules/User/user.model');
const Task = require('../modules/Coach/task.model');
const Habit = require('../modules/Habit/habit.model');
const HabitLog = require('../modules/Habit/habitLog.model');
const CoachFeedback = require('../modules/Coach/coachFeedback.model');

async function testCleanService() {
  await mongoose.connect(process.env.MONGODB_CONNECTION);
  const athleteId = '6acc80dca1df2a2ed315c20e';
  const userDoc = await User.findById(athleteId).populate('assignedCoach', 'fullName').lean();
  
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - dayOfWeek);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);

  const [completedTasks, completedHabits, totalAssignedHabits] = await Promise.all([
    Task.find({
      athlete: userDoc._id,
      status: 'completed',
      $or: [
        { completedAt: { $gte: startDate, $lte: endDate } },
        { updatedAt: { $gte: startDate, $lte: endDate } },
      ],
    }).lean(),
    HabitLog.find({
      athlete: userDoc._id,
      status: 'completed',
      date: { $gte: startDate, $lte: endDate },
    }).populate('habit', 'category title').lean(),
    Habit.countDocuments({
      $or: [{ assignedAthletes: userDoc._id }, { isMasterLibrary: true }],
      isActive: { $ne: false },
    }),
  ]);

  // 1. Daily scores
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const dailyTarget = 2;
  const scores = dayLabels.map((day, idx) => {
    const curDay = new Date(startDate);
    curDay.setDate(startDate.getDate() + idx);
    const dayTasks = completedTasks.filter(t => {
      const d = new Date(t.completedAt || t.updatedAt);
      return d.toDateString() === curDay.toDateString();
    }).length;
    const dayHabits = completedHabits.filter(h => {
      const d = new Date(h.date || h.createdAt);
      return d.toDateString() === curDay.toDateString();
    }).length;
    const totalDone = dayTasks + dayHabits;
    const score = curDay <= now ? Math.min(100, Math.round((totalDone / dailyTarget) * 100)) : 0;
    return { day, score };
  });

  // 2. Average score for days up to today
  const elapsedDays = dayOfWeek + 1;
  const elapsedScores = scores.slice(0, elapsedDays);
  const average = elapsedDays > 0 ? Math.round(elapsedScores.reduce((acc, s) => acc + s.score, 0) / elapsedDays) : 0;

  // 3. Consistency (% of elapsed days with at least 1 completed activity)
  const activeDays = elapsedScores.filter(s => s.score > 0).length;
  const consistency = elapsedDays > 0 ? Math.round((activeDays / elapsedDays) * 100) : 0;

  // 4. Focus Rating & Resilience from completed items
  const countCategory = (patterns) => {
    const habitsCount = completedHabits.filter(h => {
      const cat = (h.habit?.category || '').toLowerCase();
      const title = (h.habit?.title || '').toLowerCase();
      return patterns.some(p => cat.includes(p) || title.includes(p));
    }).length;
    const tasksCount = completedTasks.filter(t => {
      const cat = (t.category || '').toLowerCase();
      const title = (t.title || '').toLowerCase();
      return patterns.some(p => cat.includes(p) || title.includes(p));
    }).length;
    return habitsCount + tasksCount;
  };

  const focusCount = countCategory(['focus', 'mindset', 'breath', 'visual']);
  const resilienceCount = countCategory(['resilience', 'recovery', 'reset', 'journal']);
  
  // Real scores based on activity
  const focusRating = elapsedDays > 0 ? Math.min(100, Math.round((focusCount / elapsedDays) * 100)) : 0;
  const resilience = elapsedDays > 0 ? Math.min(100, Math.round((resilienceCount / elapsedDays) * 100)) : 0;
  
  const metricList = [consistency, focusRating, resilience].filter(v => typeof v === 'number' && v > 0);
  const mentalScore = metricList.length > 0 ? Math.round(metricList.reduce((a, b) => a + b, 0) / metricList.length) : 0;

  // 5. Coach Evaluation
  const latestFeedback = await CoachFeedback.findOne({ athlete: userDoc._id })
    .sort({ createdAt: -1 })
    .populate('coach', 'fullName')
    .lean();

  const coachEvaluation = latestFeedback ? {
    coachName: latestFeedback.coach?.fullName || userDoc.assignedCoach?.fullName || null,
    rating: latestFeedback.rating || null,
    message: latestFeedback.message || null,
    date: latestFeedback.date || latestFeedback.createdAt || null,
  } : null;

  const result = {
    timeframe: 'week',
    dateRange: 'Mon – Sun',
    performanceScore: {
      average,
      scores,
    },
    keyMetrics: {
      mentalScore,
      consistency,
      focusRating,
      resilience,
    },
    coachEvaluation,
  };

  console.log('Result:', JSON.stringify(result, null, 2));
  process.exit(0);
}
testCleanService();
