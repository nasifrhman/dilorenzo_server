const catchAsync = require('../../helpers/catchAsync');
const response = require('../../helpers/response');
const { default: status } = require('http-status');
const {
  getUserAnnouncementsService,
  createBroadcastAnnouncementService,
} = require('./announcement.service');

// 1. User End: User sees announcements (Mobile App: Profile > Announcements)
const getUserAnnouncementsController = catchAsync(async (req, res) => {
  const userId = req.User?._id || req.user?._id || req.query.userId || null;
  const result = await getUserAnnouncementsService(userId);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AnnouncementsList',
      message: 'Announcements retrieved successfully',
      data: result,
    })
  );
});

// 2. Admin End: Admin creates announcement ("Publish to All Athlete Apps")
const createBroadcastAnnouncementController = catchAsync(async (req, res) => {
  const adminId = req.User?._id || req.user?._id || req.body.adminId || null;
  const result = await createBroadcastAnnouncementService(req.body, adminId);
  return res.status(status.CREATED).json(
    response({
      status: 'success',
      statusCode: status.CREATED,
      type: 'AnnouncementBroadcasted',
      message: 'Announcement published successfully to all athlete apps',
      data: result,
    })
  );
});

module.exports = {
  getUserAnnouncementsController,
  createBroadcastAnnouncementController,
};
