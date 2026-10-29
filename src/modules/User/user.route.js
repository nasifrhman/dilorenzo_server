const express = require("express");
const router = express.Router();
const { tokenCheck, auth } = require("../../middlewares/auth");



const userFileUploadMiddleware = require("../../middlewares/fileUpload");
const UPLOADS_FOLDER_USERS = "./public/uploads/users";
const uploadUsers = userFileUploadMiddleware(UPLOADS_FOLDER_USERS);
const convertHeicToPng = require('../../middlewares/converter');
const ensureUploadFolderExists = require('../../helpers/fileExists');
const parseData = require('../../middlewares/parseData');
ensureUploadFolderExists(UPLOADS_FOLDER_USERS);

const {
  createCoachController,
  getCoachesController,
  getCoachAthleteRosterController,
  unassignCoachController,
  createAthleteController,
  getAthletesController,
  assignCoachController,
  getAssignedCoachesOverviewController,
  getUserProfileController,
  awardBadgeController,
  getAthleteProgressReviewController,
  submitCoachEvaluationController,
  getAthleteDevPlanController,
  toggleAthleteHabitTodayController,
  getUserHomepageController,
  completeHomepageMissionController,
  submitHomepageFeedbackController,
  purchase90DaysProgramController,
  reset90DaysProgramController,
  getMyProgramController,
  toggleProgramTaskController,
  getMyCoachController,
  getMentorshipGoalsHabitsController,
  getMentorshipTrainingProgramController,
  completeMentorshipTrainingDrillController,
  getMentorshipProgressController,
  completeMentorshipMilestoneController,
  getUserCompetePageController,
  joinCompeteChallengeController,
} = require("./user.controller");
const { getCoachesSimpleListController } = require('../Coach/coach.controller');

// Mentorship Dashboard / 90-Day Mentorship Overview Screen (Figma node 32960:4016)
// "after clicking 90days mentorship user will see this page"
router.get("/mentorship/overview", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getMyProgramController);
router.get("/my-program/overview", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getMyProgramController);
router.get("/90days-mentorship/overview", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getMyProgramController);
router.get("/my-program", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getMyProgramController);
router.get("/program", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getMyProgramController);
router.get("/mentorship-dashboard", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getMyProgramController);
router.post("/my-program/toggle-task", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), toggleProgramTaskController);
router.post("/my-program/task/:taskId/toggle", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), toggleProgramTaskController);
router.post("/mentorship/task/toggle", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), toggleProgramTaskController);
router.post("/mentorship/task/:taskId/toggle", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), toggleProgramTaskController);

// Goals & Habits Screen (Figma node 32966:6467)
// "when user click on goal habit"
router.get("/mentorship/goals-habits", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getMentorshipGoalsHabitsController);
router.get("/my-program/goals-habits", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getMentorshipGoalsHabitsController);
router.get("/goals-habits", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getMentorshipGoalsHabitsController);

// Training Program Screen (Figma node 32973:7799)
// "when click on training program"
router.get("/mentorship/training-program", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getMentorshipTrainingProgramController);
router.get("/my-program/training-program", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getMentorshipTrainingProgramController);
router.get("/training-program", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getMentorshipTrainingProgramController);
router.post("/mentorship/training-program/:drillId/complete", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), completeMentorshipTrainingDrillController);
router.post("/my-program/training-program/:drillId/complete", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), completeMentorshipTrainingDrillController);

// 90-Day Progress Screen (Figma node 32975:8114)
// "when click 90days progress"
router.get("/mentorship/90days-progress", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getMentorshipProgressController);
router.get("/my-program/90days-progress", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getMentorshipProgressController);
router.get("/mentorship/progress", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getMentorshipProgressController);
router.post("/mentorship/90days-progress/:milestoneId/complete", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), completeMentorshipMilestoneController);
router.post("/my-program/90days-progress/:milestoneId/complete", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), completeMentorshipMilestoneController);
router.post("/mentorship/milestone/:milestoneId/complete", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), completeMentorshipMilestoneController);

// My Coach Screen (Figma nodes 32961:4430, 32963:4767, 32963:5063)
// "when user click on coach view"
router.get("/my-coach", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getMyCoachController);
router.get("/my-coach/:coachId", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getMyCoachController);
router.get("/coach/detail", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getMyCoachController);
router.get("/coach/detail/:coachId", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getMyCoachController);

// Homepage Screen (Figma node 32801:5982 & 32959:3560)
router.get("/homepage", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getUserHomepageController);
router.get("/home", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getUserHomepageController);
router.post("/homepage/mission/:missionId/complete", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), completeHomepageMissionController);
router.post("/homepage/feedback", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), submitHomepageFeedbackController);
router.post("/homepage/purchase-90days", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), purchase90DaysProgramController);
router.post("/purchase-90days", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), purchase90DaysProgramController);
router.post("/homepage/reset-90days", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), reset90DaysProgramController);
router.post("/reset-90days", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), reset90DaysProgramController);

// Personalised Development Plan Screen (Figma node 32906:2936)
router.get("/dev-plan", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getAthleteDevPlanController);
router.get("/dev-plan/:athleteId", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getAthleteDevPlanController);
router.post("/dev-plan/toggle-habit", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), toggleAthleteHabitTodayController);

// Compete Screen & Leaderboard (Figma node 32817:6437)
router.get("/compete", auth(['user', 'athlete', 'admin', 'coach', 'parent']), getUserCompetePageController);
router.get("/leaderboard", auth(['user', 'athlete', 'admin', 'coach', 'parent']), getUserCompetePageController);
router.post("/compete/challenges/:id/join", auth(['user', 'athlete', 'admin', 'coach', 'parent']), joinCompeteChallengeController);
router.post("/compete/join/:id", auth(['user', 'athlete', 'admin', 'coach', 'parent']), joinCompeteChallengeController);

// User Profile Screen (Figma node 33253-3890 / 32827-10089)
router.get("/profile", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getUserProfileController);
router.post("/badge", auth(['admin', 'coach', 'user', 'athlete'], { optional: true }), awardBadgeController);

// Athlete Progress Review Screen (Figma nodes 32905:2100 & 32906:2338)
router.get("/progress-review", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getAthleteProgressReviewController);
router.get("/progress-review/:athleteId", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getAthleteProgressReviewController);
router.post("/progress-review/evaluation", auth(['admin', 'coach', 'user'], { optional: true }), submitCoachEvaluationController);

// Coach Provisioning & Staff Dashboard (Figma Node 33295:20111 & 33299:23600)
router.post("/coach", createCoachController);
router.get("/coach", getCoachesController);
router.get("/coaches", getCoachesController);
router.get("/coach/list", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getCoachesSimpleListController);
router.get("/coaches/list", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getCoachesSimpleListController);
router.get("/coach/dropdown", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getCoachesSimpleListController);
router.get("/coaches/dropdown", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getCoachesSimpleListController);
router.get("/coach/:coachId/roster", getCoachAthleteRosterController);
router.get("/coach/:coachId/athletes", getCoachAthleteRosterController);
router.post("/coach/unassign", unassignCoachController);
router.post("/unassign-coach", unassignCoachController);

// Athlete Intake & Registration endpoints (Figma node 33275-6181)
router.post("/athlete", createAthleteController);
router.get("/athlete", getAthletesController);

// Assign Dedicated Coach & Program endpoints (Figma node 33275-5077)
router.post("/assign-coach", assignCoachController);
router.get("/assign-coach/overview", getAssignedCoachesOverviewController);

// Assign Training Drill (Admin & Coach)
const { assignTrainingController } = require('../Coach/coach.controller');
router.post("/assign-training", auth(['admin', 'coach', 'user'], { optional: true }), assignTrainingController);
router.post("/assign-drill", auth(['admin', 'coach', 'user'], { optional: true }), assignTrainingController);
router.post("/athlete/:athleteId/training", auth(['admin', 'coach', 'user'], { optional: true }), assignTrainingController);

module.exports = router;

