const express = require("express");
const router = express.Router();
const { tokenCheck, auth, resetTokenCheck } = require("../../middlewares/auth");

const userFileUploadMiddleware = require("../../middlewares/fileUpload");
const UPLOADS_FOLDER_USERS = "./public/uploads/users";
const uploadUsers = userFileUploadMiddleware(UPLOADS_FOLDER_USERS);
const convertHeicToPng = require('../../middlewares/converter');
const ensureUploadFolderExists = require('../../helpers/fileExists');
const parseData = require('../../middlewares/parseData');
const {
  localAuth,
  userDetailsByID,
  forgetPassword,
  resendOTP,
  resetPassword,
  changePassword,
  updateProfile,
  otpVerification,
  signUp,
  deleteAccountController
} = require("./auth.controller");
ensureUploadFolderExists(UPLOADS_FOLDER_USERS);



router.post("/signin", localAuth);
router.get('/my-profile', auth(['user','instructor','admin']), userDetailsByID);
router.post(
  "/sign-up",
  uploadUsers.fields([
    { name: "image", maxCount: 1 },
  ]),
  
  convertHeicToPng(UPLOADS_FOLDER_USERS),
  parseData(),
  signUp
);
router.post("/forget-password", forgetPassword);
router.post("/verify-otp", tokenCheck, otpVerification);
router.post("/resend-otp", resendOTP);
router.post("/reset-password", resetTokenCheck, resetPassword);
router.patch("/change-password", auth(['user','instructor','admin']), changePassword);
router.patch("/delete-account", auth(['user','instructor','admin']), deleteAccountController);
router.put('/update-profile', uploadUsers.single('image'),convertHeicToPng(UPLOADS_FOLDER_USERS),
auth(['user','instructor','admin']), parseData(), updateProfile);


module.exports = router

