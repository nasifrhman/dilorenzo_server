const status = require('http-status').default;
const catchAsync = require('../../helpers/catchAsync');
const response = require('../../helpers/response');
const ApiError = require('../../helpers/ApiError');
const {
  getLibraryOverviewService,
  createLibraryItemService,
  getLibraryItemByIdService,
  updateLibraryItemService,
  deleteLibraryItemService,
} = require('./library.service');

const getLibraryOverviewController = catchAsync(async (req, res) => {
  const result = await getLibraryOverviewService(req.query);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'LibraryOverview',
      message: 'Master Libraries content retrieved successfully',
      data: result,
    })
  );
});

const extractUploadedFiles = (req) => {
  if (req.files) {
    if (req.files.video && req.files.video[0]) {
      req.body.video = `/uploads/library/${req.files.video[0].filename}`;
      req.body.videoUrl = `/uploads/library/${req.files.video[0].filename}`;
    }

    if (req.files.file && req.files.file[0]) {
      const f = req.files.file[0];
      req.body.video = `/uploads/library/${f.filename}`;
      req.body.videoUrl = `/uploads/library/${f.filename}`;
    }
  }

  if (req.file) {
    req.body.video = `/uploads/library/${req.file.filename}`;
    req.body.videoUrl = `/uploads/library/${req.file.filename}`;
  }
};

const uploadLibraryFileController = catchAsync(async (req, res) => {
  let uploadedFile = null;
  if (req.file) {
    uploadedFile = req.file;
  } else if (Array.isArray(req.files) && req.files.length > 0) {
    uploadedFile = req.files[0];
  } else if (req.files) {
    if (req.files.video && req.files.video[0]) uploadedFile = req.files.video[0];
    else if (req.files.image && req.files.image[0]) uploadedFile = req.files.image[0];
    else if (req.files.file && req.files.file[0]) uploadedFile = req.files.file[0];
  }

  if (!uploadedFile) {
    throw new ApiError(status.BAD_REQUEST, 'No file was uploaded.');
  }

  const url = `/uploads/library/${uploadedFile.filename}`;
  const isVideo = uploadedFile.mimetype.startsWith('video/') || /video/i.test(uploadedFile.fieldname);

  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'FileUpload',
      message: 'File uploaded successfully',
      data: {
        url,
        filename: uploadedFile.filename,
        originalName: uploadedFile.originalname,
        mimetype: uploadedFile.mimetype,
        size: uploadedFile.size,
        type: isVideo ? 'video' : 'image',
      },
    })
  );
});

const createLibraryItemController = catchAsync(async (req, res) => {
  extractUploadedFiles(req);
  const result = await createLibraryItemService(req.body);
  return res.status(status.CREATED).json(
    response({
      status: 'success',
      statusCode: status.CREATED,
      type: 'LibraryItem',
      message: 'Library content published successfully',
      data: result,
    })
  );
});

const getLibraryItemByIdController = catchAsync(async (req, res) => {
  const result = await getLibraryItemByIdService(req.params.id);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'LibraryItem',
      message: 'Library item retrieved successfully',
      data: result,
    })
  );
});

const updateLibraryItemController = catchAsync(async (req, res) => {
  extractUploadedFiles(req);
  const result = await updateLibraryItemService(req.params.id, req.body);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'LibraryItem',
      message: 'Library item updated successfully',
      data: result,
    })
  );
});

const deleteLibraryItemController = catchAsync(async (req, res) => {
  const result = await deleteLibraryItemService(req.params.id);
  return res.status(status.OK).json(
    response({
      status: 'success',
      statusCode: status.OK,
      type: 'LibraryItem',
      message: 'Library item deleted successfully',
      data: result,
    })
  );
});

module.exports = {
  getLibraryOverviewController,
  createLibraryItemController,
  getLibraryItemByIdController,
  updateLibraryItemController,
  deleteLibraryItemController,
  uploadLibraryFileController,
};
