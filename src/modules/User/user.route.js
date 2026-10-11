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
} = require("./user.controller");

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

