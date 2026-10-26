const express = require('express');
const router = express.Router();
const { auth } = require('../../middlewares/auth');
const fileUploadMiddleware = require('../../middlewares/fileUpload');
const ensureUploadFolderExists = require('../../helpers/fileExists');
const parseData = require('../../middlewares/parseData');

const UPLOADS_FOLDER_EVIDENCE = './public/uploads/evidence';
ensureUploadFolderExists(UPLOADS_FOLDER_EVIDENCE);
const uploadEvidence = fileUploadMiddleware(UPLOADS_FOLDER_EVIDENCE);

const {
  getTrainOverviewController,
  getCoachAssignmentsController,
  uploadAssignmentEvidenceController,
  getDrillDetailController,
  completeDrillSessionController,
  getTrainingPlannerController,
  getExclusiveContentController,
  updateExclusiveVideoProgressController,
} = require('./train.controller');

// 1. Train Screen Overview & Drills (Figma Node 32772:5327)
router.get('/', auth(['user', 'athlete', 'admin', 'coach', 'parent']), getTrainOverviewController);
router.get('/overview', auth(['user', 'athlete', 'admin', 'coach', 'parent']), getTrainOverviewController);

// 2. Training Planner (Calendar / Events) (Figma Nodes 32954:2212 & 32954:2000)
router.get('/planner', auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getTrainingPlannerController);
router.get('/calendar', auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getTrainingPlannerController);

// 3. Exclusive Content (Premium Video Library) (Figma Node 32959:2827)
router.get('/exclusive-content', auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getExclusiveContentController);
router.get('/exclusive', auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getExclusiveContentController);
router.post('/exclusive-content/:id/progress', auth(['user', 'athlete', 'admin', 'coach', 'parent']), updateExclusiveVideoProgressController);
router.post('/exclusive/:id/progress', auth(['user', 'athlete', 'admin', 'coach', 'parent']), updateExclusiveVideoProgressController);

// Drills endpoints
router.get('/drills', auth(['user', 'athlete', 'admin', 'coach', 'parent']), getTrainOverviewController);
router.get('/drills/:id', auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getDrillDetailController);
router.post('/drills/:id/complete', auth(['user', 'athlete', 'admin', 'coach', 'parent']), completeDrillSessionController);

// 4. Coach Assignments Screen (Figma Node 33000:12481) - Strictly Requires Token
router.get('/assignments', auth(['user', 'athlete', 'admin', 'coach', 'parent']), getCoachAssignmentsController);
router.get('/coach-assignments', auth(['user', 'athlete', 'admin', 'coach', 'parent']), getCoachAssignmentsController);
router.get('/assignments/:id', auth(['user', 'athlete', 'admin', 'coach', 'parent']), getCoachAssignmentsController);

// Upload Assignment Evidence / Submit Assignment (multipart or json) - Strictly Requires Token
router.post(
  '/assignments/:id/evidence',
  auth(['user', 'athlete', 'admin', 'coach', 'parent']),
  uploadEvidence.any(),
  parseData(),
  uploadAssignmentEvidenceController
);
router.post(
  '/assignments/:id/submit',
  auth(['user', 'athlete', 'admin', 'coach', 'parent']),
  uploadEvidence.any(),
  parseData(),
  uploadAssignmentEvidenceController
);
router.patch(
  '/assignments/:id/evidence',
  auth(['user', 'athlete', 'admin', 'coach', 'parent']),
  uploadEvidence.any(),
  parseData(),
  uploadAssignmentEvidenceController
);

module.exports = router;
