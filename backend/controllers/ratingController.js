const db = require('../config/database');
const { randomUUID } = require('crypto');

/**
 * Validate rating token and return waiver/customer info
 * GET /api/rating/validate-token/:token
 */
const validateToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ 
        error: 'Missing token',
        message: 'No rating token was provided. Please use the link from your email or SMS.'
      });
    }

    // Check if token exists and is not used
    const [tokens] = await db.query(
      'SELECT * FROM rating_tokens WHERE token = ?',
      [token]
    );

    if (tokens.length === 0) {
      return res.status(404).json({ 
        error: 'Invalid rating link',
        message: 'This rating link is not recognized. Please check the link in your email or SMS, or contact us if you need assistance.' 
      });
    }

    const tokenData = tokens[0];

    if (tokenData.used === 1) {
      return res.status(400).json({ 
        error: 'Link already used',
        message: 'You have already submitted your rating using this link. Thank you so much for your feedback!' 
      });
    }

    // Get waiver and customer information
    const [waivers] = await db.query(`
      SELECT w.*, u.first_name, u.last_name, u.email, u.cell_phone
      FROM waivers w
      JOIN users u ON w.user_id = u.id
      WHERE w.id = ?
    `, [tokenData.waiver_id]);

    if (waivers.length === 0) {
      return res.status(404).json({ 
        error: 'Waiver not found',
        message: 'We couldn\'t find the visit associated with this rating link. Please contact us at info@skate-play.com and we\'ll help you out!' 
      });
    }

    const waiver = waivers[0];

    res.json({
      valid: true,
      waiver_id: waiver.id,
      user_id: waiver.user_id,
      customer_name: `${waiver.first_name} ${waiver.last_name}`,
      first_name: waiver.first_name,
      last_name: waiver.last_name,
      visit_date: waiver.signed_at
    });

  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error validating token:`, {
      message: error.message,
      token: req.params.token
    });

    res.status(500).json({
      error: 'Validation error',
      message: 'We encountered a technical issue while validating your rating link. Please try again in a moment, or reach out to us at info@skate-play.com if the problem persists.',
      errorId
    });
  }
};

/**
 * Submit 5-star rating (immediate submission, then redirect to Google)
 * POST /api/rating/submit-five-star
 */
const submitFiveStar = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        error: 'Missing token',
        message: 'No rating token was provided. Please use the link from your email or SMS.'
      });
    }

    // Validate token
    const [tokens] = await db.query(
      'SELECT * FROM rating_tokens WHERE token = ? AND used = 0',
      [token]
    );

    if (tokens.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid or already used token',
        message: 'This rating link has expired or has already been used. Thank you for your interest in providing feedback!'
      });
    }

    const tokenData = tokens[0];

    // Get waiver info
    const [waivers] = await db.query(
      'SELECT user_id FROM waivers WHERE id = ?',
      [tokenData.waiver_id]
    );

    if (waivers.length === 0) {
      return res.status(404).json({ 
        error: 'Waiver not found',
        message: 'We couldn\'t find the visit associated with this rating. Please contact us if you need assistance.'
      });
    }

    const waiver = waivers[0];

    // Insert 5-star feedback with professional message
    await db.query(
      `INSERT INTO feedback (user_id, waiver_id, rating, message, issue) 
       VALUES (?, ?, 5, ?, ?)`,
      [
        waiver.user_id,
        tokenData.waiver_id,
        'Customer gave 5 stars and kindly shared their positive experience on Google Reviews.',
        'No issues - Outstanding visit'
      ]
    );

    // Mark token as used
    await db.query(
      'UPDATE rating_tokens SET used = 1 WHERE token = ?',
      [token]
    );

    res.json({
      success: true,
      message: 'Thank you for the amazing 5-star rating! Redirecting you to share your experience on Google Reviews...'
    });

  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error submitting 5-star rating:`, {
      message: error.message,
      token: req.body.token
    });

    // Check for duplicate entry error
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        error: 'Rating already submitted',
        message: 'You have already submitted a rating for this visit. Thank you so much for your feedback!'
      });
    }

    res.status(500).json({
      error: 'Unable to save rating',
      message: 'We encountered a technical issue while saving your rating. Please try again in a moment, or contact us at info@skate-play.com if the problem persists.',
      errorId
    });
  }
};

/**
 * Submit rating with detailed feedback (<5 stars)
 * POST /api/rating/submit-feedback
 */
const submitFeedback = async (req, res) => {
  try {
    const { token, rating, message, issue, staff_name } = req.body;

    // Validate required fields
    if (!token) {
      return res.status(400).json({ 
        error: 'Missing token',
        message: 'No rating token was provided. Please use the link from your email or SMS.'
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        error: 'Invalid rating',
        message: 'Please provide a rating between 1 and 5 stars.'
      });
    }

    // Validate token
    const [tokens] = await db.query(
      'SELECT * FROM rating_tokens WHERE token = ? AND used = 0',
      [token]
    );

    if (tokens.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid or already used token',
        message: 'This rating link has expired or has already been used. Thank you for your interest in providing feedback!'
      });
    }

    const tokenData = tokens[0];

    // Get waiver info
    const [waivers] = await db.query(
      'SELECT user_id FROM waivers WHERE id = ?',
      [tokenData.waiver_id]
    );

    if (waivers.length === 0) {
      return res.status(404).json({ 
        error: 'Waiver not found',
        message: 'We couldn\'t find the visit associated with this feedback. Please contact us if you need assistance.'
      });
    }

    const waiver = waivers[0];

    // Insert feedback with all details
    await db.query(
      `INSERT INTO feedback (user_id, waiver_id, rating, message, issue, staff_name) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        waiver.user_id,
        tokenData.waiver_id,
        rating,
        message || null,
        issue || null,
        staff_name || null
      ]
    );

    // Mark token as used
    await db.query(
      'UPDATE rating_tokens SET used = 1 WHERE token = ?',
      [token]
    );

    res.json({
      success: true,
      message: 'Thank you so much for your valuable feedback! We genuinely appreciate you taking the time to help us improve.'
    });

  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error submitting feedback:`, {
      message: error.message,
      token: req.body.token
    });

    // Check for duplicate entry error
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        error: 'Feedback already submitted',
        message: 'You have already submitted feedback for this visit. Thank you so much for sharing your thoughts with us!'
      });
    }

    res.status(500).json({
      error: 'Unable to save feedback',
      message: 'We encountered a technical issue while saving your feedback. Please try again in a moment, or contact us at info@skate-play.com if the problem persists.',
      errorId
    });
  }
};

module.exports = {
  validateToken,
  submitFiveStar,
  submitFeedback
};
