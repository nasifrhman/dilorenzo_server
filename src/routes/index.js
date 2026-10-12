const express = require('express');
const router = express.Router();
const authRoutes = require('../modules/Auth/auth.route');
const staticContentRoutes = require('../modules/StaticContent/staticContent.route');
const userRoutes = require('../modules/User/user.route');
const challengeRoutes = require('../modules/Challenge/challenge.route');
const sessionRoutes = require('../modules/Session/session.route');
const libraryRoutes = require('../modules/Library/library.route');


const moduleRoutes = [
  {
    path: '/auth',
    route: authRoutes,
  },
  {
    path: '/user',
    route: userRoutes
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
  }
];


moduleRoutes.forEach((route) => router.use(route.path, route.route));

module.exports = router;