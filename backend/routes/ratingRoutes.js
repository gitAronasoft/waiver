const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');

// Validate token and get waiver/customer info
router.get('/validate-token/:token', ratingController.validateToken);

// Submit 5-star rating
router.post('/submit-five-star', ratingController.submitFiveStar);

// Submit rating with detailed feedback (<5 stars)
router.post('/submit-feedback', ratingController.submitFeedback);

module.exports = router;
