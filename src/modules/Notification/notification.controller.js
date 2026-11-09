const { default: status } = require('http-status');
const catchAsync = require('../../helpers/catchAsync');
const response = require('../../helpers/response');
const {
  getCoachNotificationsService,
  getUserNotificationsService,
  markNotificationAsReadService,
  markAllNotificationsAsReadService,
  deleteNotificationService,
  getNotificationBadgeCountService,
  createNotificationService,
} = require('./notification.service');

/**
 * Coach Side Notifications (Figma Node 33102:1009)
 */
const getCoachNotificationsController = catchAsync(async (req, res) => {
  const isPrivileged = req.user && ['admin', 'super_admin', 'sub_admin'].includes(req.user.role);
  const coachId = isPrivileged
    ? req.query.coachId
    : (req.query.coachId || req.user?._id || req.User?._id);
  const result = await getCoachNotificationsService({
    coachId,
    query: req.query,
  });

  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'CoachNotifications',
      message: 'Coach notifications retrieved successfully',
      data: result,
    })
  );
});

/**
 * User / Athlete Notifications (Figma Node 32761:3698)
 */
const getUserNotificationsController = catchAsync(async (req, res) => {
  const userId = req.user?._id || req.User?._id || req.query.userId || req.query.athleteId;
  const result = await getUserNotificationsService({
    userId,
    query: req.query,
  });

  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'UserNotifications',
      message: 'User notifications retrieved successfully',
      data: result,
    })
  );
});

/**
 * Mark a single notification as read
 */
const markNotificationAsReadController = catchAsync(async (req, res) => {
  const userId = req.user?._id || req.User?._id;
  const notificationId = req.params.id;

  const result = await markNotificationAsReadService({
    notificationId,
    userId,
  });

  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'Notification',
      message: 'Notification marked as read',
      data: result,
    })
  );
});

/**
 * Mark all notifications as read ("Mark all read" button in Figma)
 */
const markAllNotificationsAsReadController = catchAsync(async (req, res) => {
  const userId = req.user?._id || req.User?._id || req.body?.userId || req.query?.userId || req.query?.coachId;
  const category = req.query.category || req.body?.category || null;

  const result = await markAllNotificationsAsReadService({
    userId,
    category,
  });

  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'Notification',
      message: 'All notifications marked as read',
      data: result,
    })
  );
});

/**
 * Delete / dismiss a notification
 */
const deleteNotificationController = catchAsync(async (req, res) => {
  const userId = req.user?._id || req.User?._id || req.body?.userId || req.query?.userId || req.query?.coachId;
  const notificationId = req.params.id;

  const result = await deleteNotificationService({
    notificationId,
    userId,
  });

  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'Notification',
      message: 'Notification dismissed successfully',
      data: result,
    })
  );
});

/**
 * Get badge count for notification bell / sidebar badge
 */
const getNotificationBadgeCountController = catchAsync(async (req, res) => {
  const userId = req.user?._id || req.User?._id || req.query.userId || req.query.coachId;
  const category = req.query.category || null;

  const result = await getNotificationBadgeCountService({
    userId,
    category,
  });

  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'NotificationBadge',
      message: 'Notification badge count retrieved',
      data: result,
    })
  );
});

/**
 * Create a new notification (API trigger)
 */
const createNotificationController = catchAsync(async (req, res) => {
  const sender = req.user?._id || req.User?._id || req.body.sender || null;
  const result = await createNotificationService({
    ...req.body,
    sender,
  });

  return res.status(status.CREATED).json(
    response({
      status: 'success',
      statusCode: status.CREATED,
      type: 'Notification',
      message: 'Notification created and emitted successfully',
      data: result,
    })
  );
});

module.exports = {
  getCoachNotificationsController,
  getUserNotificationsController,
  markNotificationAsReadController,
  markAllNotificationsAsReadController,
  deleteNotificationController,
  getNotificationBadgeCountController,
  createNotificationController,
};
