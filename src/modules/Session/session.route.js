const express = require('express');
const router = express.Router();
const {
  getSessionsOverviewController,
  createSessionController,
  getSessionByIdController,
  updateSessionController,
  deleteSessionController,
} = require('./session.controller');

// Overview list and category tabs (Figma node 33305-3332)
router.get('/overview', getSessionsOverviewController);
router.get('/', getSessionsOverviewController);

// Schedule a new coaching call / screening (Figma node 33305-4485)
router.post('/', createSessionController);

// Single session CRUD
router.get('/:id', getSessionByIdController);
router.patch('/:id', updateSessionController);
router.delete('/:id', deleteSessionController);

module.exports = router;
