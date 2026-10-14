const status = require('http-status').default;
const catchAsync = require('../../helpers/catchAsync');
const response = require('../../helpers/response');
const { getParentHomepageService, getParentProgressService } = require('./parent.service');

const getParentHomepageController = catchAsync(async (req, res) => {
  const currentUser = req.User || req.user;
  const parentId = req.query.parentId || (currentUser?.role === 'parent' ? currentUser._id : null);
  const athleteId = req.query.athleteId || req.query.childId || req.params.athleteId || null;

  const result = await getParentHomepageService({ parentId, athleteId });

  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'ParentHomepage',
      message: 'Parent homepage retrieved successfully',
      data: result,
    })
  );
});

const getParentProgressController = catchAsync(async (req, res) => {
  const currentUser = req.User || req.user;
  const parentId = req.query.parentId || (currentUser?.role === 'parent' ? currentUser._id : null);
  const athleteId = req.query.athleteId || req.query.childId || req.params.athleteId || null;
  const tab = req.query.tab ? req.query.tab.toLowerCase().trim() : null;

  const result = await getParentProgressService({ parentId, athleteId, tab });

  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'ParentProgress',
      message: 'Parent athlete progress retrieved successfully',
      data: result,
    })
  );
});

module.exports = {
  getParentHomepageController,
  getParentProgressController,
};
