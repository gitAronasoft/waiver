const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');

router.post('/send-feedback', feedbackController.sendFeedback);
router.get('/rate/:userId', feedbackController.getRatingInfo);
router.get('/list', feedbackController.getAllFeedback);

module.exports = router;
