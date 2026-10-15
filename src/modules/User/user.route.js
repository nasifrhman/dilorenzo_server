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
} = require("./user.controller");

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

