const { default: status } = require("http-status");
const catchAsync = require("../../helpers/catchAsync");
const { suspendUserService, activeUserService, giveNoteService, giveCreditService, fcmTokenService, deleteFcmTokenService, bulkGiveFlagService, bulkGiveNoteService, bulkGiveCreditService, bulkSuspendUserService, bulkActiveUserService, togglePushNotificationService, getPushNotificationService, getUserHomeFeedService, createCoachService, getCoachesService, createAthleteService, getAthletesService, assignCoachService, getAssignedCoachesOverviewService } = require("./user.service");
const response = require("../../helpers/response");

const suspendUserController = catchAsync(async (req, res) => {
  const result = await suspendUserService(req.params.id);
  return res.status(status.OK).json(response({
    status: 'success', statusCode: status.OK, type: "User", message: "User suspended successfully", data: {name : result.fullName}
  }));
})


const bulkSuspendUserController = catchAsync(async (req, res) => {
  const { userIds } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(status.BAD_REQUEST).json(
      response({
        status: "fail",
        statusCode: status.BAD_REQUEST,
        message: "Please provide userIds.",
      })
    );
  }

  const result = await bulkSuspendUserService(userIds);

  return res.status(status.OK).json(
    response({
      status: "success",
      statusCode: status.OK,
      type: "User",
      message: `${result.modifiedCount} user(s) suspended successfully.`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
    })
  );
});

const activeUserController = catchAsync(async (req, res) => {
  const result = await activeUserService(req.params.id);
  return res.status(status.OK).json(response({
    status: 'success', statusCode: status.OK, type: "User", message: "User activated successfully", data: {name : result.fullName}
  }));
})


const togglePushNotificationController = catchAsync(async (req, res) => {
  const result = await togglePushNotificationService(req.User._id);
  return res.status(status.OK).json(response({
    status: 'success', statusCode: status.OK, type: "User", message: "notification setting updated", data: {name : result.fullName}
  }));
})


const getPushNotificationController = catchAsync(async (req, res) => {
  const result = await getPushNotificationService(req.User._id);
  return res.status(status.OK).json(response({
    status: 'success', statusCode: status.OK, type: "User", message: "fetch notification setting", data:result
  }));
})


const bulkActiveUserController = catchAsync(async (req, res) => {
  const { userIds } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(status.BAD_REQUEST).json(
      response({
        status: "fail",
        statusCode: status.BAD_REQUEST,
        message: "Please provide userIds.",
      })
    );
  }

  const result = await bulkActiveUserService(userIds);

  return res.status(status.OK).json(
    response({
      status: "success",
      statusCode: status.OK,
      type: "User",
      message: `${result.modifiedCount} user(s) activated successfully.`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
    })
  );
});

const addFlagController = catchAsync(async (req, res) => {
  await bulkGiveFlagService(req.params.id);
  return res.status(status.OK).json(response({
    status: 'success', statusCode: status.OK, type: "User", message: "one flag added"
  }));
})

const bulkAddFlagController = catchAsync(async (req, res) => {
  const { userIds } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(status.BAD_REQUEST).json(
      response({
        status: "fail",
        statusCode: status.BAD_REQUEST,
        message: "Please provide userIds.",
      })
    );
  }

  const result = await bulkGiveFlagService(userIds);

  return res.status(status.OK).json(
    response({
      status: "success",
      statusCode: status.OK,
      type: "User",
      message: `${result.modifiedCount} user(s)updated successfully.`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
    })
  );
});

const addNoteController = catchAsync(async (req, res) => {
  await giveNoteService(req.params.id, req.body.note);
  return res.status(status.OK).json(response({
    status: 'success', statusCode: status.OK, type: "User", message: "note added"
  }));
})


const bulkAddNoteController = catchAsync(async (req, res) => {
  const { userIds, note } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(status.BAD_REQUEST).json(
      response({
        status: "fail",
        statusCode: status.BAD_REQUEST,
        message: "Please provide userIds.",
      })
    );
  }

  if (!note || !note.trim()) {
    return res.status(status.BAD_REQUEST).json(
      response({
        status: "fail",
        statusCode: status.BAD_REQUEST,
        message: "Please provide a note.",
      })
    );
  }

  const result = await bulkGiveNoteService(userIds, note);

  return res.status(status.OK).json(
    response({
      status: "success",
      statusCode: status.OK,
      type: "User",
      message: `${result.modifiedCount} user(s) updated successfully.`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
    })
  );
});


const addCreditController = catchAsync(async (req, res) => {
  await giveCreditService(req.params.id, req.body.credit);
  return res.status(status.OK).json(response({
    status: 'success', statusCode: status.OK, type: "User", message: "credit added"
  }));
})




const bulkAddCreditController = catchAsync(async (req, res) => {
  const { userIds, credit } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(status.BAD_REQUEST).json(
      response({
        status: "fail",
        statusCode: status.BAD_REQUEST,
        message: "Please provide userIds.",
      })
    );
  }

  if (credit === undefined || credit === null || isNaN(Number(credit))) {
    return res.status(status.BAD_REQUEST).json(
      response({
        status: "fail",
        statusCode: status.BAD_REQUEST,
        message: "Please provide a valid credit amount.",
      })
    );
  }

  const result = await bulkGiveCreditService(userIds, Number(credit));

  return res.status(status.OK).json(
    response({
      status: "success",
      statusCode: status.OK,
      type: "User",
      message: `${result.modifiedCount} user(s) updated successfully.`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
    })
  );
});


const checkServiceAvailability = catchAsync(async (req, res) => {
  const result = await checkServiceAvailabilityService(req.User._id);
  return res.status(status.OK).json(response({
    status: 'success', statusCode: status.OK, type: "Service", message: "Service is available", data: result
  }));
})


const fcmTokenController = catchAsync(async (req, res) => {
  const data = await fcmTokenService(req.User._id, req.body.fcmToken);
  return res.status(status.OK).json(response({ statusCode: status.OK, message:'fcm-token-updated', status: "OK" }));
})


const deleteFcmTokenController = catchAsync(async (req, res) => {
  const data = await deleteFcmTokenService(req.User._id);
  return res.status(status.OK).json(response({ statusCode: status.OK, message:'fcm-token-deleted', status: "OK" }));
})

// Instructors List (Top Rated Instructors Near You - Figma 40012130:6616)
const getUserHomeController = catchAsync(async (req, res) => {
  const userId = req.User ? req.User._id : null;
  const result = await getUserHomeFeedService(userId, req.query);
  return res.status(status.OK).json(
    response({
      status: 'OK',
      statusCode: status.OK,
      type: 'Instructors',
      message: 'Instructors fetched successfully',
      data: result
    })
  );
});

const createCoachController = catchAsync(async (req, res) => {
  const result = await createCoachService(req.body);
  return res.status(status.CREATED).json(
    response({
      status: 'success',
      statusCode: status.CREATED,
      type: 'Coach',
      message: 'Coach account provisioned and staff access granted successfully',
      data: result,
    })
  );
});

const getCoachesController = catchAsync(async (req, res) => {
  const result = await getCoachesService();
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'Coaches',
      message: 'Coaches retrieved successfully',
      data: result,
    })
  );
});

const createAthleteController = catchAsync(async (req, res) => {
  const result = await createAthleteService(req.body);
  return res.status(status.CREATED).json(
    response({
      status: 'success',
      statusCode: status.CREATED,
      type: 'Athlete',
      message: 'Athlete intake completed and member enrolled successfully',
      data: result,
    })
  );
});

const getAthletesController = catchAsync(async (req, res) => {
  const result = await getAthletesService();
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'Athletes',
      message: 'Athletes retrieved successfully',
      data: result,
    })
  );
});

const assignCoachController = catchAsync(async (req, res) => {
  const result = await assignCoachService(req.body);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'CoachAssignment',
      message: 'Dedicated coach and mentorship program assigned successfully',
      data: result,
    })
  );
});

const getAssignedCoachesOverviewController = catchAsync(async (req, res) => {
  const result = await getAssignedCoachesOverviewService();
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'Overview',
      message: 'Assignment overview retrieved successfully',
      data: result,
    })
  );
});

module.exports = {
  suspendUserController,
  fcmTokenController,
  deleteFcmTokenController,
  addFlagController,
  bulkAddFlagController,
  addNoteController,
  activeUserController,
  addCreditController,
  checkServiceAvailability,
  bulkAddNoteController,
  bulkAddCreditController,
  bulkSuspendUserController,
  bulkActiveUserController,
  togglePushNotificationController,
  getPushNotificationController,
  getUserHomeController,
  createCoachController,
  getCoachesController,
  createAthleteController,
  getAthletesController,
  assignCoachController,
  getAssignedCoachesOverviewController,
};