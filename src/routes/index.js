const express = require('express');
const router = express.Router();
const authRoutes = require('../modules/Auth/auth.route');
const staticContentRoutes = require('../modules/StaticContent/staticContent.route');
const userRoutes = require('../modules/User/user.route');
const challengeRoutes = require('../modules/Challenge/challenge.route');
const sessionRoutes = require('../modules/Session/session.route');
const libraryRoutes = require('../modules/Library/library.route');
const coachRoutes = require('../modules/Coach/coach.route');
const parentRoutes = require('../modules/Parent/parent.route');
const communityRoutes = require('../modules/Community/community.route');
const trainRoutes = require('../modules/Train/train.route');
const curriculumRoutes = require('../modules/Curriculum/curriculum.route');
const adminClientRoutes = require('../modules/Admin/admin.client.route');
const adminGroupsRoutes = require('../modules/Admin/admin.groups.route');
const notificationRoutes = require('../modules/Notification/notification.route');
const announcementRoutes = require('../modules/Announcement/announcement.route');

const moduleRoutes = [
  {
    path: '/announcement',
    route: announcementRoutes,
  },
  {
    path: '/announcements',
    route: announcementRoutes,
  },
  {
    path: '/admin/announcements',
    route: announcementRoutes,
  },
  {
    path: '/admin/announcement',
    route: announcementRoutes,
  },
  {
    path: '/notification',
    route: notificationRoutes,
  },
  {
    path: '/notifications',
    route: notificationRoutes,
  },
  {
    path: '/curriculum',
    route: curriculumRoutes,
  },
  {
    path: '/90-day-curriculum',
    route: curriculumRoutes,
  },
  {
    path: '/mentorship',
    route: curriculumRoutes,
  },
  {
    path: '/train',
    route: trainRoutes,
  },
  {
    path: '/planner',
    route: trainRoutes,
  },
  {
    path: '/drills',
    route: trainRoutes,
  },
  {
    path: '/compete',
    route: userRoutes,
  },
  {
    path: '/leaderboard',
    route: userRoutes,
  },
  {
    path: '/community',
    route: communityRoutes,
  },
  {
    path: '/auth',
    route: authRoutes,
  },
  {
    path: '/user',
    route: userRoutes
  },
  {
    path: '/coach',
    route: coachRoutes
  },
  {
    path: '/parent',
    route: parentRoutes
  },
  {
    path: '/challenge',
    route: challengeRoutes
  },
  {
    path: '/session',
    route: sessionRoutes
  },
  {
    path: '/scheduling',
    route: sessionRoutes
  },
  {
    path: '/library',
    route: libraryRoutes
  },
  {
    path: '/master-libraries',
    route: libraryRoutes
  },
  {
    path: '/static-contents',
    route: staticContentRoutes
  },
  {
    path: '/admin/groups',
    route: adminGroupsRoutes
  },
  {
    path: '/admin/messages',
    route: adminGroupsRoutes
  },
  {
    path: '/admin/direct-messages',
    route: adminGroupsRoutes
  },
  {
    path: '/admin/clients',
    route: adminClientRoutes
  },
  {
    path: '/admin',
    route: adminClientRoutes
  },
  {
    path: '/clients',
    route: adminClientRoutes
  }
];


moduleRoutes.forEach((route) => router.use(route.path, route.route));

module.exports = router;