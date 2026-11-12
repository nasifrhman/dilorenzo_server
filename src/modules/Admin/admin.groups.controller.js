const catchAsync = require('../../helpers/catchAsync');
const response = require('../../helpers/response');
const { default: status } = require('http-status');
const {
  getAdminGroupsListService,
  getAdminGroupDetailsService,
  sendAdminGroupMessageService,
  createAdminGroupService,
  reassignAdminGroupCoachService,
  getAdminGroupSidebarService,
} = require('./admin.groups.service');

// 1. Get 3-Way Groups List (Left panel)
const getAdminGroupsListController = catchAsync(async (req, res) => {
  const adminUserId = req.User?._id || req.user?._id || null;
  const result = await getAdminGroupsListService(req.query, adminUserId);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AdminGroupsList',
      message: '3-way groups list retrieved successfully',
      data: result,
    })
  );
});

// 2. Get 3-Way Group Details & Messages Feed (Center panel)
const getAdminGroupDetailsController = catchAsync(async (req, res) => {
  const chatRoomId = req.params.chatRoomId || req.query.chatRoomId;
  const adminUserId = req.User?._id || req.user?._id || null;
  const result = await getAdminGroupDetailsService(chatRoomId, adminUserId);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AdminGroupDetails',
      message: '3-way group details retrieved successfully',
      data: result,
    })
  );
});

// 3. Send Message into 3-Way Group (Admin message input)
const sendAdminGroupMessageController = catchAsync(async (req, res) => {
  const chatRoomId = req.params.chatRoomId || req.body.chatRoomId;
  const senderId = req.User?._id || req.user?._id || req.body.senderId;
  const result = await sendAdminGroupMessageService(chatRoomId, senderId, req.body);
  return res.status(status.CREATED).json(
    response({
      status: 'success',
      statusCode: status.CREATED,
      type: 'AdminGroupMessage',
      message: 'Message sent successfully',
      data: result,
    })
  );
});

// 4. Create / Launch New 3-Way Group (+ NEW action)
const createAdminGroupController = catchAsync(async (req, res) => {
  const adminId = req.User?._id || req.user?._id || req.body.adminId;
  const result = await createAdminGroupService({
    athleteId: req.body.athleteId,
    coachId: req.body.coachId,
    adminId,
  });
  return res.status(status.CREATED).json(
    response({
      status: 'success',
      statusCode: status.CREATED,
      type: 'AdminGroupCreated',
      message: '3-way group created successfully',
      data: result,
    })
  );
});

// 5. Reassign Coach for 3-Way Group
const reassignAdminGroupCoachController = catchAsync(async (req, res) => {
  const chatRoomId = req.params.chatRoomId || req.body.chatRoomId;
  const adminId = req.User?._id || req.user?._id || null;
  const result = await reassignAdminGroupCoachService(chatRoomId, {
    newCoachId: req.body.newCoachId || req.body.coachId,
    adminId,
  });
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AdminGroupCoachReassigned',
      message: 'Coach reassigned successfully',
      data: result,
    })
  );
});

// 6. Get 3-Way Group Sidebar (Summary, Files, Timeline, Members)
const getAdminGroupSidebarController = catchAsync(async (req, res) => {
  const chatRoomId = req.params.chatRoomId || req.query.chatRoomId;
  const tab = req.query.tab || req.params.tab || null;
  const result = await getAdminGroupSidebarService(chatRoomId, tab);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AdminGroupSidebar',
      message: '3-way group sidebar retrieved successfully',
      data: result,
    })
  );
});

// Convenience controllers for individual tabs
const getAdminGroupSummaryTabController = catchAsync(async (req, res) => {
  const chatRoomId = req.params.chatRoomId;
  const result = await getAdminGroupSidebarService(chatRoomId, 'summary');
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AdminGroupSummaryTab',
      message: 'Summary tab retrieved successfully',
      data: result.summary,
    })
  );
});

const getAdminGroupFilesTabController = catchAsync(async (req, res) => {
  const chatRoomId = req.params.chatRoomId;
  const result = await getAdminGroupSidebarService(chatRoomId, 'files');
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AdminGroupFilesTab',
      message: 'Files tab retrieved successfully',
      data: result.files,
    })
  );
});

const getAdminGroupTimelineTabController = catchAsync(async (req, res) => {
  const chatRoomId = req.params.chatRoomId;
  const result = await getAdminGroupSidebarService(chatRoomId, 'timeline');
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AdminGroupTimelineTab',
      message: 'Timeline tab retrieved successfully',
      data: result.timeline,
    })
  );
});

const getAdminGroupMembersTabController = catchAsync(async (req, res) => {
  const chatRoomId = req.params.chatRoomId;
  const result = await getAdminGroupSidebarService(chatRoomId, 'members');
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AdminGroupMembersTab',
      message: 'Members tab retrieved successfully',
      data: result.members,
    })
  );
});

module.exports = {
  getAdminGroupsListController,
  getAdminGroupDetailsController,
  sendAdminGroupMessageController,
  createAdminGroupController,
  reassignAdminGroupCoachController,
  getAdminGroupSidebarController,
  getAdminGroupSummaryTabController,
  getAdminGroupFilesTabController,
  getAdminGroupTimelineTabController,
  getAdminGroupMembersTabController,
};

