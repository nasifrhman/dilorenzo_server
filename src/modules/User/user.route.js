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
} = require("./user.controller");

// Mentorship Dashboard / MY PROGRAM Screen (Figma node 32960:4016)
// "after clicking 90days mentorship user will see this page"
router.get("/my-program", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getMyProgramController);
router.get("/program", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getMyProgramController);
router.get("/mentorship-dashboard", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getMyProgramController);
router.post("/my-program/toggle-task", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), toggleProgramTaskController);
router.post("/my-program/task/:taskId/toggle", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), toggleProgramTaskController);

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

// User Profile Screen (Figma node 33253-3890 / 32827-10089)
router.get("/profile", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getUserProfileController);
router.post("/badge", auth(['admin', 'coach', 'user', 'athlete'], { optional: true }), awardBadgeController);

// Athlete Progress Review Screen (Figma nodes 32905:2100 & 32906:2338)
router.get("/progress-review", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getAthleteProgressReviewController);
router.get("/progress-review/:athleteId", auth(['user', 'athlete', 'admin', 'coach', 'parent'], { optional: true }), getAthleteProgressReviewController);
router.post("/progress-review/evaluation", auth(['admin', 'coach', 'user'], { optional: true }), submitCoachEvaluationController);

// Coach Provisioning endpoints
router.post("/coach", createCoachController);
router.get("/coach", getCoachesController);

// Athlete Intake & Registration endpoints (Figma node 33275-6181)
router.post("/athlete", createAthleteController);
router.get("/athlete", getAthletesController);

// Assign Dedicated Coach & Program endpoints (Figma node 33275-5077)
router.post("/assign-coach", assignCoachController);
router.get("/assign-coach/overview", getAssignedCoachesOverviewController);

module.exports = router;

