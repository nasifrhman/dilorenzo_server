const express = require('express');
const router = express.Router();
const coachController = require('./coach.controller');

// Overview Dashboard (Figma node 33026-13150)
router.get('/dashboard', coachController.getCoachDashboardOverviewController);
router.get('/overview', coachController.getCoachDashboardOverviewController);
router.get('/', coachController.getCoachDashboardOverviewController);

// All Players Overview for Coach (Figma nodes 33097:12108, 33097:13469, 33101:65, 33102:688)
router.get('/tasks', coachController.getCoachTasksOverviewController);
router.get('/training', coachController.getCoachTrainingOverviewController);
router.get('/feedback', coachController.getCoachFeedbackOverviewController);
router.get('/sessions', coachController.getCoachSessionsOverviewController);
router.get('/players', coachController.getCoachPlayersOverviewController);

// Player Overview (Figma node 33044-13763) - Strictly returns overview & header
router.get('/players/:athleteId', coachController.getCoachPlayerDetailController);
router.get('/players/:athleteId/overview', coachController.getCoachPlayerDetailController);

// Separate Player Sub-Resource APIs
// 1. Tasks
router.get('/players/:athleteId/tasks', coachController.getAthleteTasksController);
router.post('/players/:athleteId/tasks', coachController.createAthleteTaskController);
router.patch('/tasks/:taskId/status', coachController.toggleTaskStatusController);

// 2. Training Assignments
router.get('/players/:athleteId/training', coachController.getAthleteTrainingController);
router.post('/players/:athleteId/training', coachController.assignTrainingController);

// 3. Habits
router.get('/players/:athleteId/habits', coachController.getAthleteHabitsController);
router.post('/players/:athleteId/habits', coachController.createAthleteHabitController);
router.patch('/players/:athleteId/habits/:habitId', coachController.updateAthleteHabitController);
router.patch('/habits/:habitId/status', coachController.toggleHabitStatusController);
router.patch('/habits/:habitId', coachController.updateAthleteHabitController);

// 4. Action Steps
router.get('/players/:athleteId/action-steps', coachController.getAthleteActionStepsController);
router.get('/players/:athleteId/actionSteps', coachController.getAthleteActionStepsController);
router.post('/action-steps/:actionStepId/review', coachController.reviewActionStepController);

// 5. Coach Feedback
router.get('/players/:athleteId/feedback', coachController.getAthleteFeedbackController);
router.post('/players/:athleteId/feedback', coachController.createCoachFeedbackController);

// 6. Sessions
router.get('/players/:athleteId/sessions', coachController.getAthleteSessionsController);
router.post('/players/:athleteId/sessions', coachController.createCoachSessionController);
router.post('/sessions/:sessionId/notes', coachController.updateSessionNotesController);
router.patch('/sessions/:sessionId/notes', coachController.updateSessionNotesController);

// 7. Progress Analytics
router.get('/players/:athleteId/progress', coachController.getAthleteProgressController);

// 8. Group 3-Way Chat
router.get('/players/:athleteId/group-chat', coachController.getAthleteGroupChatController);
router.get('/players/:athleteId/group', coachController.getAthleteGroupChatController);
router.post('/players/:athleteId/group-message', coachController.sendAthleteGroupMessageController);

module.exports = router;
