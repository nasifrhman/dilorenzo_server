const status = require('http-status').default;
const catchAsync = require('../../helpers/catchAsync');
const response = require('../../helpers/response');
const {
  getChallengeOverviewStatsService,
  getCommunityChallengesOverviewService,
  createChallengeService,
  getChallengesService,
  getChallengeByIdService,
  updateChallengeService,
  deleteChallengeService,
  addActivityToChallengeService,
  deleteActivityFromChallengeService,
  addParticipantToChallengeService,
  removeParticipantFromChallengeService,
  awardXpService,
} = require('./challenge.service');

const getCommunityChallengesOverviewController = catchAsync(async (req, res) => {
  const result = await getCommunityChallengesOverviewService(req.query);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'CommunityChallengesOverview',
      message: 'Community challenges page overview retrieved successfully',
      data: result,
    })
  );
});


const createChallengeController = catchAsync(async (req, res) => {
  const creatorId = req.User?._id || req.body.createdBy;
  const result = await createChallengeService(req.body, creatorId);
  return res.status(status.CREATED).json(
    response({
      status: 'success',
      statusCode: status.CREATED,
      type: 'Challenge',
      message: 'Challenge created and launched successfully',
      data: result,
    })
  );
});

const getChallengesController = catchAsync(async (req, res) => {
  const result = await getChallengesService(req.query);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'Challenges',
      message: 'Challenges retrieved successfully',
      data: result,
    })
  );
});

const getChallengeByIdController = catchAsync(async (req, res) => {
  const result = await getChallengeByIdService(req.params.id);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'ChallengeDetail',
      message: 'Challenge details retrieved successfully',
      data: result,
    })
  );
});

const updateChallengeController = catchAsync(async (req, res) => {
  const result = await updateChallengeService(req.params.id, req.body);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'Challenge',
      message: 'Challenge updated successfully',
      data: result,
    })
  );
});

const deleteChallengeController = catchAsync(async (req, res) => {
  const result = await deleteChallengeService(req.params.id);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'Challenge',
      message: 'Challenge deleted successfully',
      data: result,
    })
  );
});

const addActivityController = catchAsync(async (req, res) => {
  const result = await addActivityToChallengeService(req.params.id, req.body);
  return res.status(status.CREATED).json(
    response({
      status: 'success',
      statusCode: status.CREATED,
      type: 'Activities',
      message: 'Activity added to challenge successfully',
      data: result,
    })
  );
});

const deleteActivityController = catchAsync(async (req, res) => {
  const result = await deleteActivityFromChallengeService(req.params.id, req.params.activityId);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'Activities',
      message: 'Activity removed from challenge successfully',
      data: result,
    })
  );
});

const addParticipantController = catchAsync(async (req, res) => {
  const { athleteId } = req.body;
  const result = await addParticipantToChallengeService(req.params.id, athleteId);
  return res.status(status.CREATED).json(
    response({
      status: 'success',
      statusCode: status.CREATED,
      type: 'Participant',
      message: 'Athlete enrolled in challenge successfully',
      data: result,
    })
  );
});

const removeParticipantController = catchAsync(async (req, res) => {
  const result = await removeParticipantFromChallengeService(req.params.id, req.params.athleteId);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'Participant',
      message: 'Athlete unenrolled from challenge successfully',
      data: result,
    })
  );
});

const awardXpController = catchAsync(async (req, res) => {
  const result = await awardXpService(req.params.id, req.body);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'AwardXP',
      message: 'XP awarded successfully',
      data: result,
    })
  );
});

module.exports = {
  getCommunityChallengesOverviewController,
  createChallengeController,
  getChallengesController,
  getChallengeByIdController,
  updateChallengeController,
  deleteChallengeController,
  addActivityController,
  deleteActivityController,
  addParticipantController,
  removeParticipantController,
  awardXpController,
};
