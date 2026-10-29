const express = require('express');
const router = express.Router();
const fileUploadMiddleware = require('../../middlewares/fileUpload');
const ensureUploadFolderExists = require('../../helpers/fileExists');
const parseData = require('../../middlewares/parseData');

const UPLOADS_FOLDER_LIBRARY = './public/uploads/library';
ensureUploadFolderExists(UPLOADS_FOLDER_LIBRARY);
const uploadLibrary = fileUploadMiddleware(UPLOADS_FOLDER_LIBRARY);

const {
  getLibraryOverviewController,
  createLibraryItemController,
  createDrillVideoController,
  getLibraryItemByIdController,
  updateLibraryItemController,
  deleteLibraryItemController,
  uploadLibraryFileController,
} = require('./library.controller');

const { getCoachesSimpleListController } = require('../Coach/coach.controller');
const { getAdminScheduleController } = require('../Curriculum/curriculum.controller');

// Upload middleware accepting any file field (video, image, thumbnail, file) or pure JSON
const uploadAny = uploadLibrary.any();

// 90-Day Curriculum Schedule & Daily Mission Manager (Figma Node 33304:2397)
router.get('/curriculum/schedule', getAdminScheduleController);
router.get('/schedule', getAdminScheduleController);

router.get('/overview', getLibraryOverviewController);
router.get('/', getLibraryOverviewController);

// Coaches dropdown / selection list for library items (returns only name, image, id)
router.get('/coaches', getCoachesSimpleListController);
router.get('/coach/list', getCoachesSimpleListController);

// Dedicated standalone file upload endpoints
router.post('/upload', uploadAny, uploadLibraryFileController);
router.post('/upload-file', uploadAny, uploadLibraryFileController);
router.post('/upload-video', uploadAny, uploadLibraryFileController);

// Dedicated Drill Video creation endpoints (Figma Node 33304:569)
router.post('/drill-video', uploadAny, parseData(), createDrillVideoController);
router.post('/video-drill', uploadAny, parseData(), createDrillVideoController);
router.post('/create-drill-video', uploadAny, parseData(), createDrillVideoController);

// Library Item CRUD supporting pure JSON or multipart form-data
router.post('/', uploadAny, parseData(), createLibraryItemController);
router.get('/:id', getLibraryItemByIdController);
router.put('/:id', uploadAny, parseData(), updateLibraryItemController);
router.patch('/:id', uploadAny, parseData(), updateLibraryItemController);
router.delete('/:id', deleteLibraryItemController);

module.exports = router;
