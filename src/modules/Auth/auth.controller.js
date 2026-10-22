const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { tokenGenerator, refreshTokenGenerator, resetTokenGenerator } = require("../../helpers/tokenGenerator");
const catchAsync = require("../../helpers/catchAsync");
const response = require("../../helpers/response");
const { sendOTP, verifyOTP, checkOTPService } = require("../Otp/otp.service");
const { login, getUserByEmail, addUser, updateUserById,
   profileByIdService, getUserById, getUserByPhoneNumber,
  allUserService,
  deleteAccountService,
  socialLoginWithAppleService,
  socialLoginWithGoogleService,
  changePasswordService } = require("./auth.service");
const { default: status } = require("http-status");
const ApiError = require("../../helpers/ApiError");
const unlinkImage = require('../../helpers/unlinkImage');
const userModel = require("../User/user.model");






const socialLoginWithAppleController = catchAsync(async (req, res) => {
  const result = await socialLoginWithAppleService(req.body);
  const accessToken = await tokenGenerator(result);

  return res.status(status.OK).json(response({
    status: 'success',
    statusCode: status.OK, message: "User created successfully",
    data: result, accessToken
  }));
});




const socialLoginWithGoogleController = catchAsync(async (req, res) => {
  const result = await socialLoginWithGoogleService(req.body);
  const accessToken = await tokenGenerator(result);

  return res.status(status.OK).json(response({
    status: 'success',
    statusCode: status.OK, message: "User created successfully",
    data: result, accessToken
  }));
});



// Login
const localAuth = catchAsync(async (req, res) => {
  const {
    email,
    number,
    phoneNumber,
    countryCode,
    password,
  } = req.body;

  const phone = phoneNumber || number;
  const hasEmail = !!email;
  const hasPhone = !!phone;

  if ((hasEmail && hasPhone) || (!hasEmail && !hasPhone)) {
    throw new ApiError(
      status.BAD_REQUEST,
      "Provide either email OR phone, not both"
    );
  }

  let user;

  if (email) {
    user = await login(
      { email },
      "email",
      password
    );
  } else {
    if (!phone) {
      throw new ApiError(
        status.BAD_REQUEST,
        "Phone number is required"
      );
    }

    user = await login(
      {
        number: phone,
        countryCode: countryCode || "",
      },
      "phone",
      password
    );
  }

  // Auto-check 7-day trial expiration
  if (user.trialEndDate && new Date() > new Date(user.trialEndDate) && user.isTrialActive) {
    user.isTrialActive = false;
    await user.save();
  }

  let admin = null;
  if (['admin', 'super_admin', 'sub_admin', 'hr', 'sub_hr_admin'].includes(user.role)) {
    admin = {
      isSupperAdmin: user.role === 'admin' || user.role === 'super_admin' || user.isSuperAdmin,
      parent: null,
    };
  }
  const token = await tokenGenerator(user, admin);
  const refreshToken = refreshTokenGenerator(user);

  return res.status(status.OK).json(response({
    status: "OK",
    statusCode: status.OK,
    message: "Login successful",
    data: {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber || user.number,
      number: user.number || user.phoneNumber,
      countryCode: user.countryCode,
      role: user.role,
      image: user.image,
      isEmailVerified: user.isEmailVerified,
      isProfileCompleted: user.isProfileCompleted,
      tier: user.tier,
      isTrialActive: user.isTrialActive,
      trialStartDate: user.trialStartDate,
      trialEndDate: user.trialEndDate,
      leagueDivision: user.leagueDivision,
      currentClub: user.currentClub,
      parentFullName: user.parentFullName,
      parentEmail: user.parentEmail,
      intakeNotes: user.intakeNotes,
      focusGoals: user.focusGoals,
      mentorshipDay: user.mentorshipDay,
      mentorshipPhase: user.mentorshipPhase,
      parent: admin?.parent
    },
    accessToken: token,
    refreshToken
  }));
});


// Sign up (Step 1: Create Account - Figma Node 33768:1965)
// Account will NOT be created in the database until OTP verification (Step 3)!
const signUp = catchAsync(async (req, res) => {
  const {
    fullName,
    email,
    phoneNumber,
    number,
    countryCode,
    password,
    confirmPassword,
    role
  } = req.body;

  if (!email) {
    throw new ApiError(status.BAD_REQUEST, "Email is required!");
  }
  if (!fullName) {
    throw new ApiError(status.BAD_REQUEST, "Full Name is required!");
  }
  if (!password) {
    throw new ApiError(status.BAD_REQUEST, "Password is required!");
  }
  if (confirmPassword && password !== confirmPassword) {
    throw new ApiError(status.BAD_REQUEST, "Passwords do not match!");
  }
  if (password.length < 6) {
    throw new ApiError(status.BAD_REQUEST, "Password must be at least 6 characters long!");
  }

  const phone = phoneNumber || number || "";
  const userRole = role || "user";
  const existingUser = await getUserByEmail(email);

  if (existingUser) {
    throw new ApiError(status.CONFLICT, "This email is already registered!");
  }

  // Send 6-digit OTP
  let existingOTP = await checkOTPService(email, "email");
  let message = "";

  if (existingOTP) {
    message = "OTP already sent. Please wait for a few minutes or check your email.";
  } else {
    const otpData = await sendOTP(
      fullName,
      email,
      "email",
      "email-verification"
    );
    message = otpData.message || "Verification code sent to your email";
  }

  // Temporary signed token containing registration data (account is NOT created in DB yet)
  const tempToken = jwt.sign(
    {
      fullName,
      email,
      phoneNumber: phone,
      number: phone,
      countryCode: countryCode || "",
      password,
      role: userRole,
      purpose: "email-verification"
    },
    process.env.JWT_ACCESS_TOKEN,
    { expiresIn: "1h" }
  );

  return res.status(status.OK).json(
    response({
      status: "OK",
      statusCode: status.OK,
      type: "user",
      message: message || "Verification code sent to your email. Verify OTP to complete account creation.",
      data: {
        email,
        fullName,
        phoneNumber: phone,
      },
      tempToken,
      accessToken: tempToken,
    })
  );
});




const updateDocuments = catchAsync(async (req, res) => {
  if (req.files) {
    if (req.files.image?.[0]) {
      req.body.image = req.files.image[0].filename;
    }

    if (req.files.certificate?.[0]) {
      req.body.certificate = req.files.certificate[0].filename;
    }

    if (req.files.identityProof?.[0]) {
      req.body.identityProof = req.files.identityProof[0].filename;
    }

    if (req.files.businessCertification?.[0]) {
      req.body.businessCertification = req.files.businessCertification[0].filename;
    }

    if (req.files.bankStatement?.[0]) {
      req.body.bankStatement = req.files.bankStatement[0].filename;
    }
  }
  const result = await updateDocumentsService(req.User._id, req.body);
  return res.status(status.OK).json(response({
    status: 'OK', statusCode: status.OK,
    type: 'user', message: 'documents updated successfully'
  }));
});




const allUserController = catchAsync(async (req, res) => {
  const options = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    search: req.query.search || "",
    isBan: req.query.isBan,
    role: req.query.role
  }
  const result = await allUserService(options);
  return res.status(status.OK).json(
    response({
      status: "success",
      statusCode: status.OK,
      type: "user",
      message: "all user fetched successfully",
      data: result
    })
  );
});


// Validate OTP (Handles both Email Verification & Password Reset OTP)
const otpVerification = catchAsync(async (req, res) => {
  let userPayloadFromToken = req.User;
  if (!userPayloadFromToken) {
    const rawToken = req.body?.tempToken || req.body?.token || req.headers?.authorization?.replace("Bearer ", "") || req.headers?.token;
    if (rawToken && rawToken !== "null") {
      try {
        userPayloadFromToken = jwt.verify(rawToken, process.env.JWT_ACCESS_TOKEN);
        req.User = userPayloadFromToken;
      } catch (err) {}
    }
  }

  // Extract email strictly from the signed token (no email in request body)
  const email = userPayloadFromToken?.email;
  const purpose = userPayloadFromToken?.purpose || req.body?.purpose || "email-verification";
  const { otp } = req.body;

  if (!email) {
    throw new ApiError(
      status.UNAUTHORIZED,
      "Verification token is required. Email is securely extracted from your Bearer token, so please provide a valid Bearer token."
    );
  }
  if (!otp) {
    throw new ApiError(status.BAD_REQUEST, "6-digit OTP code is required");
  }

  const otpData = await verifyOTP(
    email,
    "email",
    purpose,
    otp
  );

  if (otpData && otpData.purpose === "email-verification") {
    let registeredUser = await getUserByEmail(email);

    if (!registeredUser) {
      // Account is created in DB ONLY upon successful OTP verification!
      const signupData = userPayloadFromToken || {};
      const passwordToSave = signupData.password;

      if (!passwordToSave) {
        throw new ApiError(
          status.BAD_REQUEST,
          "Registration session expired or password missing. Please sign up again."
        );
      }

      const trialStart = new Date();
      const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const phone = signupData.phoneNumber || signupData.number || "";

      registeredUser = await userModel.create({
        fullName: signupData.fullName || "Athlete",
        email: email,
        phoneNumber: phone,
        number: phone,
        countryCode: signupData.countryCode || "",
        password: passwordToSave,
        role: signupData.role || "user",
        isEmailVerified: true,
        isProfileCompleted: false,
        tier: "free",
        trialStartDate: trialStart,
        trialEndDate: trialEnd,
        isTrialActive: true,
      });
    } else {
      registeredUser.isEmailVerified = true;
      if (!registeredUser.trialStartDate) {
        registeredUser.trialStartDate = new Date();
        registeredUser.trialEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        registeredUser.isTrialActive = true;
      }
      await registeredUser.save();
    }

    const accessToken = await tokenGenerator(registeredUser);
    const refreshToken = refreshTokenGenerator(registeredUser);

    return res.status(status.CREATED).json(
      response({
        status: "OK",
        statusCode: status.CREATED,
        type: "user",
        message: "Account created and email verified successfully! Your 7-day free trial has begun.",
        data: {
          _id: registeredUser._id,
          fullName: registeredUser.fullName,
          email: registeredUser.email,
          phoneNumber: registeredUser.phoneNumber || registeredUser.number,
          number: registeredUser.number || registeredUser.phoneNumber,
          role: registeredUser.role,
          image: registeredUser.image,
          isEmailVerified: registeredUser.isEmailVerified,
          isProfileCompleted: registeredUser.isProfileCompleted,
          tier: registeredUser.tier,
          isTrialActive: registeredUser.isTrialActive,
          trialStartDate: registeredUser.trialStartDate,
          trialEndDate: registeredUser.trialEndDate,
          leagueDivision: registeredUser.leagueDivision,
          currentClub: registeredUser.currentClub,
          parentFullName: registeredUser.parentFullName,
          parentEmail: registeredUser.parentEmail,
          intakeNotes: registeredUser.intakeNotes,
          focusGoals: registeredUser.focusGoals,
        },
        accessToken,
        refreshToken,
      })
    );
  }

  if (otpData && otpData.purpose === "forget-password") {
    let user = await getUserByEmail(email);
    if (!user) {
      throw new ApiError(status.NOT_FOUND, "User not found");
    }

    const resetToken = resetTokenGenerator(user);

    return res.status(status.OK).json(
      response({
        status: "OK",
        statusCode: status.OK,
        message: "OTP verified successfully. You may now reset your password.",
        resetToken,
        accessToken: resetToken,
      })
    );
  }
});

// Dedicated Verify Email OTP (Step 3 / Verify Email - Figma Node 33768:2169)
const verifyEmailOtp = catchAsync(async (req, res) => {
  req.body.purpose = "email-verification";
  return otpVerification(req, res);
});

// Dedicated Verify Reset OTP (Reset Password Step 2 - Figma Node 33768:2320)
const verifyResetOtp = catchAsync(async (req, res) => {
  req.body.purpose = "forget-password";
  return otpVerification(req, res);
});

// Complete Profile (Step 2: Complete Profile - Figma Node 33768:2056)
const completeProfile = catchAsync(async (req, res) => {
  const userId = req.User?._id || req.user?._id;
  if (!userId) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized user");
  }

  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(status.NOT_FOUND, "User not found");
  }

  if (req.file) {
    const { filename } = req.file;
    if (filename && filename.length > 0) {
      const defaultPath1 = 'user.png';
      const defaultPath2 = 'user.jpg';

      if (user.image && user.image !== defaultPath1 && user.image !== defaultPath2 && !user.image.includes('default')) {
        unlinkImage(`uploads/users/${user.image}`);
      }

      req.body.image = filename;
    }
  }

  req.body.isProfileCompleted = true;
  if (!user.trialStartDate) {
    req.body.trialStartDate = new Date();
    req.body.trialEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    req.body.isTrialActive = true;
  }

  const result = await updateUserById(user._id, req.body);
  const updatedUser = result.user || result;

  return res.status(status.OK).json(
    response({
      status: "OK",
      statusCode: status.OK,
      message: "Profile completed successfully. Your 7-day free trial is active!",
      data: {
        _id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber || updatedUser.number,
        number: updatedUser.number || updatedUser.phoneNumber,
        image: updatedUser.image,
        role: updatedUser.role,
        leagueDivision: updatedUser.leagueDivision,
        currentClub: updatedUser.currentClub,
        parentFullName: updatedUser.parentFullName,
        parentEmail: updatedUser.parentEmail,
        intakeNotes: updatedUser.intakeNotes,
        focusGoals: updatedUser.focusGoals,
        isEmailVerified: updatedUser.isEmailVerified,
        isProfileCompleted: updatedUser.isProfileCompleted,
        tier: updatedUser.tier,
        isTrialActive: updatedUser.isTrialActive,
        trialStartDate: updatedUser.trialStartDate,
        trialEndDate: updatedUser.trialEndDate,
        mentorshipDay: updatedUser.mentorshipDay,
        mentorshipPhase: updatedUser.mentorshipPhase
      }
    })
  );
});

// Forget password (Step 1: Request OTP - Figma Node 33768:2270)
const forgetPassword = catchAsync(async (req, res) => {
  const { email, number, phoneNumber, countryCode } = req.body;
  const targetEmail = email;
  const phone = phoneNumber || number;

  if (!targetEmail && !phone) {
    throw new ApiError(
      status.BAD_REQUEST,
      "Email address is required"
    );
  }

  let user;
  let sentTo;
  let receiverType;

  if (targetEmail) {
    user = await getUserByEmail(targetEmail);
    if (!user) {
      throw new ApiError(status.NOT_FOUND, "No account found with this email address");
    }
    sentTo = targetEmail;
    receiverType = "email";
  } else {
    user = await getUserByPhoneNumber(phone, countryCode);
    if (!user) {
      throw new ApiError(status.NOT_FOUND, "No account found with this phone number");
    }
    sentTo = `${countryCode || ""}${phone}`;
    receiverType = "phone";
  }

  const otpData = await sendOTP(
    user.fullName || "User",
    sentTo,
    receiverType,
    "forget-password"
  );

  if (!otpData) {
    throw new ApiError(
      status.INTERNAL_SERVER_ERROR,
      "Failed to send OTP. Please try again."
    );
  }

  const message = `A 6-digit verification code has been sent to your ${receiverType}`;

  const token = jwt.sign(
    {
      _id: user._id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      purpose: "forget-password"
    },
    process.env.JWT_ACCESS_TOKEN,
    { expiresIn: "15m" }
  );

  return res.status(status.OK).json(
    response({
      status: "OK",
      statusCode: status.OK,
      type: "user",
      message,
      data: {
        email: user.email,
        purpose: "forget-password"
      },
      token,
      tempToken: token,
      accessToken: token
    })
  );
});

// Reset Password (Step 3: Set New Password - Figma Node 33768:2373)
const resetPassword = catchAsync(async (req, res) => {
  const userId = req.ResetUser?._id;
  if (!userId) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized: Valid reset token is required");
  }

  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(status.NOT_FOUND, "User not found");
  }

  const newPassword = req.body.newPassword || req.body.password;
  const confirmPassword = req.body.confirmPassword;

  if (!newPassword) {
    throw new ApiError(status.BAD_REQUEST, "New password is required");
  }

  if (confirmPassword && newPassword !== confirmPassword) {
    throw new ApiError(status.BAD_REQUEST, "Passwords do not match");
  }

  if (newPassword.length < 6) {
    throw new ApiError(status.BAD_REQUEST, "Password must be at least 6 characters long");
  }

  user.password = newPassword;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  return res.status(status.OK).json(
    response({
      status: "OK",
      statusCode: status.OK,
      type: "user",
      message: "Password reset successful. Please sign in with your new password."
    })
  );
});




const deleteAccountController = catchAsync(async (req, res) => {
  const result = await deleteAccountService(req.User._id);
  return res.status(status.OK).json(response({ status: 'OK', statusCode: status.OK, type: 'user', message: 'account deleted successfully', data: result }));
})


const changePassword = catchAsync(async (req, res) => {
  const { oldPassword, currentPassword, newPassword, confirmPassword } = req.body;
  const effectiveOldPassword = oldPassword || currentPassword;

  const user = await changePasswordService(
    req.User._id,
    effectiveOldPassword,
    newPassword,
    confirmPassword
  );

  const token = await tokenGenerator(user);

  return res.status(status.OK).json(
    response({
      status: "OK",
      statusCode: status.OK,
      type: "user",
      message: "Password changed successfully",
      accessToken: token,
    })
  );
});


const resendOTP = catchAsync(async (req, res) => {
  let userPayloadFromToken = req.User;
  if (!userPayloadFromToken) {
    const rawToken = req.body?.tempToken || req.body?.token || req.headers?.authorization?.replace("Bearer ", "") || req.headers?.token;
    if (rawToken && rawToken !== "null") {
      try {
        userPayloadFromToken = jwt.verify(rawToken, process.env.JWT_ACCESS_TOKEN);
        req.User = userPayloadFromToken;
      } catch (err) {}
    }
  }

  const email = userPayloadFromToken?.email || req.body.email;
  const phoneNumber = userPayloadFromToken?.phoneNumber || userPayloadFromToken?.number || req.body.phoneNumber || req.body.number;
  const purpose = req.body.purpose || (userPayloadFromToken?.purpose || "email-verification");

  let user;
  if (email) {
    user = await getUserByEmail(email);

    const fullName = user?.fullName || userPayloadFromToken?.fullName || "User";
    const otpData = await sendOTP(fullName, email, "email", purpose);
    if (otpData) {
      return res.status(status.OK).json(
        response({
          status: "OK",
          statusCode: status.OK,
          type: "user",
          message: 'OTP resent to email'
        })
      );
    }
  }
  if (phoneNumber) {
    user = await getUserByPhoneNumber(phoneNumber);

    const fullName = user?.fullName || userPayloadFromToken?.fullName || "User";
    const otpData = await sendOTP(fullName, phoneNumber, "phone", purpose);
    if (otpData) {
      return res.status(status.OK).json(
        response({
          status: "OK",
          statusCode: status.OK,
          type: "user",
          message: 'OTP resent to phone'
        })
      );
    }
  }

  throw new ApiError(status.BAD_REQUEST, "Email or phone number is required to resend OTP");
});




const updateProfile = catchAsync(async (req, res) => {
  const user = await getUserById(req.User._id);
  if (!user) throw new ApiError(status.NOT_FOUND, 'user not found');

  if (req.file) {
    const { filename } = req.file;

    if (filename && filename.length > 0) {
      const defaultPath1 = 'user.png';
      const defaultPath2 = 'user.jpg';

      if (user.image && user.image !== defaultPath1 && user.image !== defaultPath2 && !user.image.includes('default')) {
        unlinkImage(`uploads/users/${user.image}`);
      }

      req.body.image = filename;
    }
  }
  // console.log("controileer", req.body)

  const result = await updateUserById(user._id, req.body);

  let formattedData;

  //  ROLE BASED RESPONSE
  if (user.role === 'partner') {
    formattedData = {
      businessName: result.partner?.businessName,
      aboutUs: result.partner?.aboutUs,
      location: result.user?.location,
      address: result.user?.address,
      amenities: result.partner?.amenities,
      serviceAutoApproved: result.partner?.serviceAutoApproved,
      // whatsappNumber: result.user.whatsappNumber,
      number: result.user.number,
      countryCode: result.user.countryCode,
      image: result.user.image
    };
  }

  else if (user.role === 'admin') {
    formattedData = {
      name: result.user.fullName,
      image: result.user.image,
      email: result.user.email
    };
  }

  else if (user.role === 'hr') {
    formattedData = {
      companyName: result.company?.companyName,
      image: result.user.image,
      manager: result.company?.contactName,
      email: result.user.email,
      number: result.user.number,
      countryCode: result.user.countryCode
    };
  }

  else {
    const targetUser = result.user || result;
    formattedData = {
      _id: targetUser._id,
      name: targetUser.fullName,
      fullName: targetUser.fullName,
      email: targetUser.email,
      image: targetUser.image,
      phoneNumber: targetUser.phoneNumber || targetUser.number,
      number: targetUser.number || targetUser.phoneNumber,
      countryCode: targetUser.countryCode,
      role: targetUser.role,
      address: targetUser.address,
      location: targetUser.location,
      leagueDivision: targetUser.leagueDivision,
      currentClub: targetUser.currentClub,
      parentFullName: targetUser.parentFullName,
      parentEmail: targetUser.parentEmail,
      intakeNotes: targetUser.intakeNotes,
      focusGoals: targetUser.focusGoals,
      isEmailVerified: targetUser.isEmailVerified,
      isProfileCompleted: targetUser.isProfileCompleted,
      tier: targetUser.tier,
      isTrialActive: targetUser.isTrialActive,
      trialStartDate: targetUser.trialStartDate,
      trialEndDate: targetUser.trialEndDate,
      mentorshipDay: targetUser.mentorshipDay,
      mentorshipPhase: targetUser.mentorshipPhase,
    };
  }

  return res.status(status.OK).json(
    response({
      status: 'OK',
      statusCode: status.OK,
      type: 'user',
      message: 'profile updated successfully',
      data: formattedData
    })
  );
});




const myDocumentsController = catchAsync(async (req, res) => {
  const document = await myDocumentsService(req.User._id);
  return res.status(status.OK).json(response({ status: 'OK', statusCode: status.OK, type: 'user', message: 'documents fetched successfully', data: document }));
});


const userDetailsByID = catchAsync(async (req, res) => {
  const result = await profileByIdService(req.User._id);
  // console.log({ result });

  if (!result) {
    throw new ApiError(status.NOT_FOUND, "User not found");
  }

  let formattedData;

  if (result.user.role === 'partner') {
    formattedData = {
      businessName: result.partner?.businessName,
      aboutUs: result.partner?.aboutUs,
      location: result.user?.location,
      address: result.user?.address,
      amenities: result.partner?.amenities,
      number: result.user?.number,
      countryCode: result.user?.countryCode,
      serviceAutoApproved: result.partner?.serviceAutoApproved,
      number: result.user.number,
      countryCode: result.user.countryCode,
      image: result.user.image,
      isVerified: result.user.isVerified
    };
  }

  else if (['admin', 'super_admin', 'sub_admin'].includes(result.user.role)) {
    formattedData = {
      _id: result.user._id,
      fullName: result.user.fullName,
      name: result.user.fullName,
      email: result.user.email,
      phoneNumber: result.user.phoneNumber || result.user.number,
      countryCode: result.user.countryCode,
      image: result.user.image,
      role: result.user.role,
      roleTitle: result.user.roleTitle || 'Administrator',
      bio: result.user.bio,
      isSuperAdmin: result.user.isSuperAdmin || (result.user.role === 'admin' || result.user.role === 'super_admin'),
      createdAt: result.user.createdAt,
      updatedAt: result.user.updatedAt
    };
  }

  else if (result.user.role === 'hr') {
    formattedData = {
      companyName: result.company?.companyName,
      image: result.user.image,
      manager: result.company?.contactName,
      email: result.user.email,
      number: result.user.number,
      countryCode: result.user.countryCode
    };
  }

  else {
    const targetUser = result.user || result;
    formattedData = {
      _id: targetUser._id,
      name: targetUser.fullName,
      fullName: targetUser.fullName,
      email: targetUser.email,
      image: targetUser.image,
      phoneNumber: targetUser.phoneNumber || targetUser.number,
      number: targetUser.number || targetUser.phoneNumber,
      countryCode: targetUser.countryCode,
      role: targetUser.role,
      address: targetUser.address,
      location: targetUser.location,
      leagueDivision: targetUser.leagueDivision,
      currentClub: targetUser.currentClub,
      parentFullName: targetUser.parentFullName,
      parentEmail: targetUser.parentEmail,
      intakeNotes: targetUser.intakeNotes,
      focusGoals: targetUser.focusGoals,
      isEmailVerified: targetUser.isEmailVerified,
      isProfileCompleted: targetUser.isProfileCompleted,
      tier: targetUser.tier,
      isTrialActive: targetUser.isTrialActive,
      trialStartDate: targetUser.trialStartDate,
      trialEndDate: targetUser.trialEndDate,
      mentorshipDay: targetUser.mentorshipDay,
      mentorshipPhase: targetUser.mentorshipPhase,
    };
  }

  return res.status(status.OK).json(
    response({
      statusCode: status.OK,
      message: "User details",
      type: "user",
      data: formattedData,
      status: "OK"
    })
  );
});




// ==========================================
// ADMIN DASHBOARD AUTHENTICATION CONTROLLERS
// ==========================================

const adminSignIn = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(
      status.BAD_REQUEST,
      "Email and password are required"
    );
  }

  const user = await userModel
    .findOne({ email: email.trim().toLowerCase() })
    .select("+password");

  if (!user || user.isDeleted) {
    throw new ApiError(
      status.UNAUTHORIZED,
      "Invalid email or password"
    );
  }

  if (user.isBan) {
    throw new ApiError(
      status.FORBIDDEN,
      "This administrator account has been suspended"
    );
  }

  // Security Gate: strictly ensure user has admin role
  if (!['admin', 'super_admin', 'sub_admin'].includes(user.role)) {
    throw new ApiError(
      status.FORBIDDEN,
      "Access denied. You do not have administrator privileges to access the admin dashboard."
    );
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(
      status.UNAUTHORIZED,
      "Invalid email or password"
    );
  }

  const adminData = {
    isSupperAdmin: user.role === 'admin' || user.role === 'super_admin' || user.isSuperAdmin,
    parent: null,
  };

  const token = await tokenGenerator(user, adminData);
  const refreshToken = refreshTokenGenerator(user);

  return res.status(status.OK).json(
    response({
      status: "OK",
      statusCode: status.OK,
      type: "admin",
      message: "Admin login successful",
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber || user.number,
        image: user.image,
        role: user.role,
        roleTitle: user.roleTitle || 'Administrator',
        bio: user.bio,
        isSuperAdmin: adminData.isSupperAdmin,
      },
      accessToken: token,
      refreshToken
    })
  );
});

const adminForgetPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(status.BAD_REQUEST, "Administrator email is required");
  }

  const user = await userModel.findOne({ email: email.trim().toLowerCase() });
  if (!user || user.isDeleted) {
    throw new ApiError(status.NOT_FOUND, "No administrator account found with this email");
  }

  if (!['admin', 'super_admin', 'sub_admin'].includes(user.role)) {
    throw new ApiError(status.FORBIDDEN, "Access denied: Account is not an administrator");
  }

  await sendOTP(
    user.fullName || "Admin",
    user.email,
    "email",
    "forget-password"
  );

  const tempToken = jwt.sign(
    {
      _id: user._id,
      email: user.email,
      role: user.role,
      purpose: "forget-password"
    },
    process.env.JWT_ACCESS_TOKEN,
    { expiresIn: "15m" }
  );

  return res.status(status.OK).json(
    response({
      status: "OK",
      statusCode: status.OK,
      type: "admin",
      message: "Verification code sent to administrator email",
      data: {
        email: user.email,
        purpose: "forget-password"
      },
      token: tempToken,
      tempToken,
      accessToken: tempToken
    })
  );
});

const adminVerifyOtp = catchAsync(async (req, res) => {
  let userPayload = req.User;
  if (!userPayload) {
    const rawToken = req.body?.tempToken || req.body?.token || req.headers?.authorization?.replace("Bearer ", "");
    if (rawToken && rawToken !== "null") {
      try {
        userPayload = jwt.verify(rawToken, process.env.JWT_ACCESS_TOKEN);
        req.User = userPayload;
      } catch (err) {}
    }
  }

  // Extract email safely from token
  const email = userPayload?.email;
  const { otp } = req.body;

  if (!email) {
    throw new ApiError(
      status.UNAUTHORIZED,
      "Verification token is required. Email is extracted from the token, so please provide your Bearer token."
    );
  }

  if (!otp) {
    throw new ApiError(
      status.BAD_REQUEST,
      "6-digit OTP code is required"
    );
  }

  const user = await userModel.findOne({ email: email.trim().toLowerCase() });
  if (!user || !['admin', 'super_admin', 'sub_admin'].includes(user.role)) {
    throw new ApiError(status.FORBIDDEN, "Access denied: Account is not an administrator");
  }

  await verifyOTP(email, "email", "forget-password", otp);

  const resetToken = resetTokenGenerator(user);

  return res.status(status.OK).json(
    response({
      status: "OK",
      statusCode: status.OK,
      type: "admin",
      message: "Admin OTP verified successfully. You may now reset your password.",
      resetToken,
      accessToken: resetToken
    })
  );
});

const adminResendOtp = catchAsync(async (req, res) => {
  let email = req.User?.email;
  if (!email) {
    const rawToken = req.body?.tempToken || req.body?.token || req.headers?.authorization?.replace("Bearer ", "");
    if (rawToken && rawToken !== "null") {
      try {
        const decoded = jwt.verify(rawToken, process.env.JWT_ACCESS_TOKEN);
        email = decoded?.email;
      } catch (err) {}
    }
  }
  if (!email) {
    email = req.body.email;
  }

  if (!email) {
    throw new ApiError(status.BAD_REQUEST, "Admin email is required to resend OTP");
  }

  const user = await userModel.findOne({ email: email.trim().toLowerCase() });
  if (!user || !['admin', 'super_admin', 'sub_admin'].includes(user.role)) {
    throw new ApiError(status.FORBIDDEN, "Access denied: Account is not an administrator");
  }

  await sendOTP(user.fullName || "Admin", user.email, "email", "forget-password");

  return res.status(status.OK).json(
    response({
      status: "OK",
      statusCode: status.OK,
      type: "admin",
      message: "OTP resent to administrator email"
    })
  );
});

const adminResetPassword = catchAsync(async (req, res) => {
  const userId = req.ResetUser?._id;
  if (!userId) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized: Valid reset token is required");
  }

  const user = await userModel.findById(userId).select("+password");
  if (!user || !['admin', 'super_admin', 'sub_admin'].includes(user.role)) {
    throw new ApiError(status.FORBIDDEN, "Access denied: Account is not an administrator");
  }

  const newPassword = req.body.newPassword || req.body.password;
  const confirmPassword = req.body.confirmPassword;

  if (!newPassword) {
    throw new ApiError(status.BAD_REQUEST, "New password is required");
  }

  if (confirmPassword && newPassword !== confirmPassword) {
    throw new ApiError(status.BAD_REQUEST, "Passwords do not match");
  }

  if (newPassword.length < 8) {
    throw new ApiError(status.BAD_REQUEST, "Admin password must be at least 8 characters long");
  }

  user.password = newPassword;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  return res.status(status.OK).json(
    response({
      status: "OK",
      statusCode: status.OK,
      type: "admin",
      message: "Admin password reset successfully. Please sign in with your new password."
    })
  );
});

const adminGetProfile = catchAsync(async (req, res) => {
  const admin = await userModel.findById(req.User._id).select("-password");
  if (!admin || !['admin', 'super_admin', 'sub_admin'].includes(admin.role)) {
    throw new ApiError(status.FORBIDDEN, "Access denied: Administrator privileges required");
  }

  const [totalAthletes, totalCoaches, totalParents] = await Promise.all([
    userModel.countDocuments({ role: { $in: ['user', 'athlete'] }, isDeleted: { $ne: true } }),
    userModel.countDocuments({ role: 'coach', isDeleted: { $ne: true } }),
    userModel.countDocuments({ role: 'parent', isDeleted: { $ne: true } }),
  ]);

  return res.status(status.OK).json(
    response({
      status: "OK",
      statusCode: status.OK,
      type: "admin",
      message: "Admin profile retrieved successfully",
      data: {
        _id: admin._id,
        fullName: admin.fullName,
        name: admin.fullName,
        email: admin.email,
        phoneNumber: admin.phoneNumber || admin.number,
        countryCode: admin.countryCode,
        image: admin.image,
        role: admin.role,
        roleTitle: admin.roleTitle || 'Administrator',
        bio: admin.bio,
        isSuperAdmin: admin.isSuperAdmin || (admin.role === 'admin' || admin.role === 'super_admin'),
        stats: {
          totalAthletes,
          totalCoaches,
          totalParents,
        },
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
      }
    })
  );
});

const adminUpdateProfile = catchAsync(async (req, res) => {
  const user = await userModel.findById(req.User._id);
  if (!user || !['admin', 'super_admin', 'sub_admin'].includes(user.role)) {
    throw new ApiError(status.FORBIDDEN, "Access denied: Administrator privileges required");
  }

  if (req.file) {
    const { filename } = req.file;
    if (filename && filename.length > 0) {
      if (user.image && user.image !== 'user.png' && user.image !== 'user.jpg' && !user.image.includes('default')) {
        unlinkImage(`uploads/users/${user.image}`);
      }
      req.body.image = filename;
    }
  }

  const updated = await userModel.findByIdAndUpdate(
    user._id,
    {
      ...(req.body.fullName && { fullName: req.body.fullName }),
      ...(req.body.phoneNumber && { phoneNumber: req.body.phoneNumber }),
      ...(req.body.countryCode && { countryCode: req.body.countryCode }),
      ...(req.body.image && { image: req.body.image }),
      ...(req.body.roleTitle && { roleTitle: req.body.roleTitle }),
      ...(req.body.bio && { bio: req.body.bio }),
    },
    { new: true }
  );

  return res.status(status.OK).json(
    response({
      status: "OK",
      statusCode: status.OK,
      type: "admin",
      message: "Admin profile updated successfully",
      data: {
        _id: updated._id,
        fullName: updated.fullName,
        email: updated.email,
        phoneNumber: updated.phoneNumber,
        image: updated.image,
        role: updated.role,
        roleTitle: updated.roleTitle,
        bio: updated.bio,
      }
    })
  );
});

const adminChangePassword = catchAsync(async (req, res) => {
  const { oldPassword, currentPassword, newPassword, confirmPassword } = req.body;
  const effectiveOldPassword = oldPassword || currentPassword;

  const user = await changePasswordService(
    req.User._id,
    effectiveOldPassword,
    newPassword,
    confirmPassword
  );

  const adminData = {
    isSupperAdmin: user.role === 'admin' || user.role === 'super_admin' || user.isSuperAdmin,
    parent: null,
  };

  const token = await tokenGenerator(user, adminData);

  return res.status(status.OK).json(
    response({
      status: "OK",
      statusCode: status.OK,
      type: "admin",
      message: "Admin password changed successfully",
      accessToken: token
    })
  );
});

// Refresh Access Token using Refresh Token (For Athletes / Users)
const refreshTokenController = catchAsync(async (req, res) => {
  const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'] || req.cookies?.refreshToken;

  if (!refreshToken) {
    throw new ApiError(status.BAD_REQUEST, "Refresh token is required");
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_TOKEN);
  } catch (err) {
    throw new ApiError(status.UNAUTHORIZED, "Invalid or expired refresh token. Please log in again.");
  }

  const user = await userModel.findById(decoded._id);
  if (!user || user.isDeleted) {
    throw new ApiError(status.UNAUTHORIZED, "User account not found or deleted");
  }

  if (user.isBan) {
    throw new ApiError(status.FORBIDDEN, "User account is suspended");
  }

  // Security check: If password was changed or sessions revoked, tokenVersion will not match!
  if ((decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
    throw new ApiError(status.UNAUTHORIZED, "Session expired or revoked. Please log in again.");
  }

  const newAccessToken = await tokenGenerator(user);
  const newRefreshToken = refreshTokenGenerator(user);

  return res.status(status.OK).json(
    response({
      status: "OK",
      statusCode: status.OK,
      type: "user",
      message: "Access token refreshed successfully",
      data: {
        _id: user._id,
        email: user.email,
        role: user.role
      },
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    })
  );
});

// Admin Refresh Access Token (For Admin Dashboard)
const adminRefreshTokenController = catchAsync(async (req, res) => {
  const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'] || req.cookies?.refreshToken;

  if (!refreshToken) {
    throw new ApiError(status.BAD_REQUEST, "Admin refresh token is required");
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_TOKEN);
  } catch (err) {
    throw new ApiError(status.UNAUTHORIZED, "Invalid or expired admin refresh token. Please log in again.");
  }

  const user = await userModel.findById(decoded._id);
  if (!user || user.isDeleted) {
    throw new ApiError(status.UNAUTHORIZED, "Administrator account not found or deleted");
  }

  if (!['admin', 'super_admin', 'sub_admin'].includes(user.role)) {
    throw new ApiError(status.FORBIDDEN, "Access denied: Account is not an administrator");
  }

  if (user.isBan) {
    throw new ApiError(status.FORBIDDEN, "Administrator account is suspended");
  }

  if ((decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
    throw new ApiError(status.UNAUTHORIZED, "Admin session expired or revoked. Please log in again.");
  }

  const adminData = {
    isSupperAdmin: user.role === 'admin' || user.role === 'super_admin' || user.isSuperAdmin,
    parent: null,
  };

  const newAccessToken = await tokenGenerator(user, adminData);
  const newRefreshToken = refreshTokenGenerator(user);

  return res.status(status.OK).json(
    response({
      status: "OK",
      statusCode: status.OK,
      type: "admin",
      message: "Admin access token refreshed successfully",
      data: {
        _id: user._id,
        email: user.email,
        role: user.role,
        isSuperAdmin: adminData.isSupperAdmin
      },
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    })
  );
});

module.exports = {
  localAuth,
  signUp,
  otpVerification,
  verifyEmailOtp,
  verifyResetOtp,
  completeProfile,
  forgetPassword,
  resetPassword,
  changePassword,
  resendOTP,
  refreshTokenController,
  updateProfile,
  userDetailsByID,
  myDocumentsController,
  allUserController,
  deleteAccountController,
  updateDocuments,
  socialLoginWithAppleController,
  socialLoginWithGoogleController,
  adminSignIn,
  adminForgetPassword,
  adminVerifyOtp,
  adminResendOtp,
  adminResetPassword,
  adminGetProfile,
  adminUpdateProfile,
  adminChangePassword,
  adminRefreshTokenController,
};
