const express = require('express');
const router = express.Router();
const parentController = require('./parent.controller');
const { auth } = require('../../middlewares/auth');

// Parent Homepage & Dashboard (Figma node 32910-4742)
router.get('/home', auth(['parent', 'admin', 'user'], { optional: true }), parentController.getParentHomepageController);
router.get('/dashboard', auth(['parent', 'admin', 'user'], { optional: true }), parentController.getParentHomepageController);
router.get('/overview', auth(['parent', 'admin', 'user'], { optional: true }), parentController.getParentHomepageController);
router.get('/child/:athleteId', auth(['parent', 'admin', 'user'], { optional: true }), parentController.getParentHomepageController);

// Parent Progress (Figma nodes 32917-6566, 32917-7202, 32917-7790)
// Single unified endpoint supporting query filters: ?athleteId=...&tab=week|month|academy
router.get('/progress', auth(['parent', 'admin', 'user'], { optional: true }), parentController.getParentProgressController);
router.get('/progress/:athleteId', auth(['parent', 'admin', 'user'], { optional: true }), parentController.getParentProgressController);

router.get('/', auth(['parent', 'admin', 'user'], { optional: true }), parentController.getParentHomepageController);

module.exports = router;
