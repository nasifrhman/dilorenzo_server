const express = require('express');
const router = express.Router();
const { auth } = require('../../middlewares/auth');
const fileUploadMiddleware = require('../../middlewares/fileUpload');
const ensureUploadFolderExists = require('../../helpers/fileExists');
const parseData = require('../../middlewares/parseData');
const coachController = require('./coach.controller');

const UPLOADS_FOLDER_EVIDENCE = './public/uploads/evidence';
ensureUploadFolderExists(UPLOADS_FOLDER_EVIDENCE);
const uploadEvidence = fileUploadMiddleware(UPLOADS_FOLDER_EVIDENCE);

// Authenticate user if Bearer token is provided (populates req.user & req.User)
router.use(auth(['coach', 'admin', 'user', 'athlete', 'parent'], { optional: true }));

// Overview Dashboard (Figma node 33026-13150)
router.get('/dashboard', coachController.getCoachDashboardOverviewController);
router.get('/overview', coachController.getCoachDashboardOverviewController);
router.get('/', coachController.getCoachDashboardOverviewController);

// Simple Coach List for Dropdowns / Library Selection (returns only name, image, id)
router.get('/list', coachController.getCoachesSimpleListController);
router.get('/dropdown', coachController.getCoachesSimpleListController);
router.get('/simple-list', coachController.getCoachesSimpleListController);

// All Players Overview for Coach (Figma nodes 33097:12108, 33097:13469, 33101:65, 33102:688)
router.get('/tasks', coachController.getCoachTasksOverviewController);
router.get('/training', coachController.getCoachTrainingOverviewController);
router.get('/feedback', coachController.getCoachFeedbackOverviewController);
router.get('/sessions', coachController.getCoachSessionsOverviewController);
router.get('/players', coachController.getCoachPlayersOverviewController);

// Player Overview (Figma node 33044-13763) - Strictly returns overview & header
router.get('/players/:athleteId', coachController.getCoachPlayerDetailController);
router.get('/players/:athleteId/overview', coachController.getCoachPlayerDetailController);

// Separate Player Sub-Resource APIs (supports :athleteId or token-based req.user)
// 1. Tasks
router.get('/players/tasks', coachController.getAthleteTasksController);
router.get('/players/:athleteId/tasks', coachController.getAthleteTasksController);
router.post('/players/tasks', coachController.createAthleteTaskController);
router.post('/players/:athleteId/tasks', coachController.createAthleteTaskController);
router.patch('/tasks/:taskId/status', coachController.toggleTaskStatusController);

// 2. Training Assignments
router.get('/players/training', coachController.getAthleteTrainingController);
router.get('/players/:athleteId/training', coachController.getAthleteTrainingController);
router.post('/players/training', coachController.assignTrainingController);
router.post('/players/:athleteId/training', coachController.assignTrainingController);

// 3. Habits
router.get('/players/habits', coachController.getAthleteHabitsController);
router.get('/players/:athleteId/habits', coachController.getAthleteHabitsController);
router.post('/players/habits', coachController.createAthleteHabitController);
router.post('/players/:athleteId/habits', coachController.createAthleteHabitController);
router.patch('/players/:athleteId/habits/:habitId', coachController.updateAthleteHabitController);
router.patch('/habits/:habitId/status', coachController.toggleHabitStatusController);
router.patch('/habits/:habitId', coachController.updateAthleteHabitController);

// 4. Action Steps (Figma nodes 33078:3424 & 33097:12107)
router.get('/players/action-steps', coachController.getAthleteActionStepsController);
router.get('/players/actionSteps', coachController.getAthleteActionStepsController);
router.get('/players/:athleteId/action-steps', coachController.getAthleteActionStepsController);
router.get('/players/:athleteId/actionSteps', coachController.getAthleteActionStepsController);
router.post('/players/action-steps', coachController.assignAthleteActionStepController);
router.post('/players/:athleteId/action-steps', coachController.assignAthleteActionStepController);
router.post('/action-steps/assign', coachController.assignAthleteActionStepController);
router.post('/action-steps', coachController.assignAthleteActionStepController);
router.post('/action-steps/:actionStepId/submit', uploadEvidence.any(), parseData(), coachController.submitAthleteActionStepController);
router.post('/action-steps/:actionStepId/complete', uploadEvidence.any(), parseData(), coachController.submitAthleteActionStepController);
router.post('/action-steps/:actionStepId/review', coachController.reviewActionStepController);
router.post('/action-steps/:actionStepId/feedback', coachController.reviewActionStepController);
router.get('/action-steps/:actionStepId', coachController.getActionStepDetailController);

// 5. Coach Feedback
router.get('/players/feedback', coachController.getAthleteFeedbackController);
router.get('/players/:athleteId/feedback', coachController.getAthleteFeedbackController);
router.get('/feedback/:feedbackId', coachController.getFeedbackDetailController);
router.post('/players/feedback', coachController.createCoachFeedbackController);
router.post('/players/:athleteId/feedback', coachController.createCoachFeedbackController);

// 6. Sessions
router.get('/players/sessions', coachController.getAthleteSessionsController);
router.get('/players/:athleteId/sessions', coachController.getAthleteSessionsController);
router.post('/players/sessions', coachController.createCoachSessionController);
router.post('/players/:athleteId/sessions', coachController.createCoachSessionController);
router.post('/sessions/:sessionId/notes', coachController.updateSessionNotesController);
router.patch('/sessions/:sessionId/notes', coachController.updateSessionNotesController);

// 7. Progress Analytics
router.get('/players/progress', coachController.getAthleteProgressController);
router.get('/players/:athleteId/progress', coachController.getAthleteProgressController);

// 8. Group 3-Way Chat
router.get('/players/group-chat', coachController.getAthleteGroupChatController);
router.get('/players/group', coachController.getAthleteGroupChatController);
router.get('/players/:athleteId/group-chat', coachController.getAthleteGroupChatController);
router.get('/players/:athleteId/group', coachController.getAthleteGroupChatController);
router.post('/players/group-message', coachController.sendAthleteGroupMessageController);
router.post('/players/:athleteId/group-message', coachController.sendAthleteGroupMessageController);

module.exports = router;
