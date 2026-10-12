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
  getLibraryItemByIdController,
  updateLibraryItemController,
  deleteLibraryItemController,
  uploadLibraryFileController,
} = require('./library.controller');

// Upload fields for video file (bundle upload)
const uploadFields = uploadLibrary.fields([
  { name: 'video', maxCount: 1 },
  { name: 'file', maxCount: 1 },
]);

router.get('/overview', getLibraryOverviewController);
router.get('/', getLibraryOverviewController);

// Dedicated standalone file upload endpoints
router.post('/upload', uploadLibrary.any(), uploadLibraryFileController);
router.post('/upload-file', uploadLibrary.any(), uploadLibraryFileController);

// Library Item CRUD with bundled 'data' + separate file fields
router.post('/', uploadFields, parseData(), createLibraryItemController);
router.get('/:id', getLibraryItemByIdController);
router.put('/:id', uploadFields, parseData(), updateLibraryItemController);
router.patch('/:id', uploadFields, parseData(), updateLibraryItemController);
router.delete('/:id', deleteLibraryItemController);

module.exports = router;
