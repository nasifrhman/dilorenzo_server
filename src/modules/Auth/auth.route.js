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
  completeProfile,
  otpVerification,
  verifyEmailOtp,
  verifyResetOtp,
  signUp,
  deleteAccountController,
  adminSignIn,
  adminForgetPassword,
  adminVerifyOtp,
  adminResendOtp,
  adminResetPassword,
  adminGetProfile,
  adminUpdateProfile,
  adminChangePassword,
  refreshTokenController,
  adminRefreshTokenController,
} = require("./auth.controller");
ensureUploadFolderExists(UPLOADS_FOLDER_USERS);

const ALL_ROLES = ['user', 'athlete', 'parent', 'coach', 'instructor', 'admin', 'super_admin', 'sub_admin'];
const ADMIN_ROLES = ['admin', 'super_admin', 'sub_admin'];

// 1. Sign In (Welcome Back - Figma Node 33768:2213)
router.post("/signin", localAuth);
router.post("/refresh-token", refreshTokenController);

// 2. Create Account (Step 1 - Figma Node 33768:1965)
router.post(
  "/sign-up",
  uploadUsers.fields([
    { name: "image", maxCount: 1 },
  ]),
  convertHeicToPng(UPLOADS_FOLDER_USERS),
  parseData(),
  signUp
);

// 3. Verify Email (Step 3 / Verify Email - Figma Node 33768:2169)
router.post("/verify-email-otp", tokenCheck, verifyEmailOtp);
router.post("/verify-otp", tokenCheck, otpVerification);
router.post("/resend-otp", tokenCheck, resendOTP);

// 4. Complete Profile (Step 2 - Figma Node 33768:2056)
router.post(
  "/complete-profile",
  uploadUsers.single('image'),
  convertHeicToPng(UPLOADS_FOLDER_USERS),
  auth(ALL_ROLES),
  parseData(),
  completeProfile
);
router.put(
  "/complete-profile",
  uploadUsers.single('image'),
  convertHeicToPng(UPLOADS_FOLDER_USERS),
  auth(ALL_ROLES),
  parseData(),
  completeProfile
);

// 5. Reset Password Step 1: Request OTP (Figma Node 33768:2270)
router.post("/forget-password", forgetPassword);

// 6. Reset Password Step 2: Verify Code (Figma Node 33768:2320)
router.post("/verify-reset-otp", tokenCheck, verifyResetOtp);

// 7. Reset Password Step 3: Set New Password (Figma Node 33768:2373)
router.post("/reset-password", resetTokenCheck, resetPassword);

// Profile & Account Management
router.get('/my-profile', auth(ALL_ROLES), userDetailsByID);
router.patch("/change-password", auth(ALL_ROLES), changePassword);
router.post("/change-password", auth(ALL_ROLES), changePassword);
router.patch("/delete-account", auth(ALL_ROLES), deleteAccountController);
router.put(
  '/update-profile',
  uploadUsers.single('image'),
  convertHeicToPng(UPLOADS_FOLDER_USERS),
  auth(ALL_ROLES),
  parseData(),
  updateProfile
);

// ==========================================
// ADMIN DASHBOARD AUTHENTICATION ROUTES
// ==========================================
router.post("/admin/signin", adminSignIn);
router.post("/admin/login", adminSignIn);
router.post("/admin/forget-password", adminForgetPassword);
router.post("/admin/verify-otp", tokenCheck, adminVerifyOtp);
router.post("/admin/verify-reset-otp", tokenCheck, adminVerifyOtp);
router.post("/admin/resend-otp", tokenCheck, adminResendOtp);
router.post("/admin/reset-password", resetTokenCheck, adminResetPassword);
router.get("/admin/my-profile", auth(ADMIN_ROLES), adminGetProfile);
router.get("/admin/profile", auth(ADMIN_ROLES), adminGetProfile);
router.patch(
  "/admin/update-profile",
  uploadUsers.single('image'),
  convertHeicToPng(UPLOADS_FOLDER_USERS),
  auth(ADMIN_ROLES),
  parseData(),
  adminUpdateProfile
);
router.put(
  "/admin/update-profile",
  uploadUsers.single('image'),
  convertHeicToPng(UPLOADS_FOLDER_USERS),
  auth(ADMIN_ROLES),
  parseData(),
  adminUpdateProfile
);
router.patch("/admin/change-password", auth(ADMIN_ROLES), adminChangePassword);
router.post("/admin/change-password", auth(ADMIN_ROLES), adminChangePassword);
router.post("/admin/refresh-token", adminRefreshTokenController);

module.exports = router;

