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
  if (Array.isArray(req.files) && req.files.length > 0) {
    for (const f of req.files) {
      const url = `/uploads/library/${f.filename}`;
      const isVideo = /video/i.test(f.fieldname) || (f.mimetype && f.mimetype.startsWith('video/'));
      const isImg = /image|thumb|cover/i.test(f.fieldname) || (f.mimetype && f.mimetype.startsWith('image/'));

      if (isVideo) {
        req.body.video = url;
        req.body.videoUrl = url;
      } else if (isImg) {
        req.body.image = url;
        req.body.thumbnail = url;
      } else {
        if (!req.body.video) req.body.video = url;
        if (!req.body.videoUrl) req.body.videoUrl = url;
      }
    }
  } else if (req.files && typeof req.files === 'object') {
    if (req.files.video && req.files.video[0]) {
      const url = `/uploads/library/${req.files.video[0].filename}`;
      req.body.video = url;
      req.body.videoUrl = url;
    }
    if (req.files.image && req.files.image[0]) {
      const url = `/uploads/library/${req.files.image[0].filename}`;
      req.body.image = url;
      req.body.thumbnail = url;
    }
    if (req.files.thumbnail && req.files.thumbnail[0]) {
      const url = `/uploads/library/${req.files.thumbnail[0].filename}`;
      req.body.thumbnail = url;
      if (!req.body.image) req.body.image = url;
    }
    if (req.files.file && req.files.file[0]) {
      const url = `/uploads/library/${req.files.file[0].filename}`;
      req.body.video = url;
      req.body.videoUrl = url;
    }
  }

  if (req.file) {
    const url = `/uploads/library/${req.file.filename}`;
    const isImg = /image|thumb|cover/i.test(req.file.fieldname) || (req.file.mimetype && req.file.mimetype.startsWith('image/'));
    if (isImg) {
      req.body.image = url;
      req.body.thumbnail = url;
    } else {
      req.body.video = url;
      req.body.videoUrl = url;
    }
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
      message: isVideo ? 'Video uploaded successfully' : 'File uploaded successfully',
      data: {
        url,
        videoUrl: url,
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

const createDrillVideoController = catchAsync(async (req, res) => {
  extractUploadedFiles(req);
  req.body.contentType = 'video-drill';
  const result = await createLibraryItemService(req.body);
  return res.status(status.CREATED).json(
    response({
      status: 'success',
      statusCode: status.CREATED,
      type: 'DrillVideo',
      message: 'Master drill video created successfully',
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
  createDrillVideoController,
  getLibraryItemByIdController,
  updateLibraryItemController,
  deleteLibraryItemController,
  uploadLibraryFileController,
};
