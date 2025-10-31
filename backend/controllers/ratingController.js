const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Validate rating token and return waiver/customer info
 * GET /api/rating/validate-token/:token
 */
const validateToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Check if token exists and is not used
    const [tokens] = await db.query(
      'SELECT * FROM rating_tokens WHERE token = ?',
      [token]
    );

    if (tokens.length === 0) {
      return res.status(404).json({ 
        error: 'Invalid rating link',
        message: 'This rating link is not valid. Please use the link from your email or SMS.' 
      });
    }

    const tokenData = tokens[0];

    if (tokenData.used === 1) {
      return res.status(400).json({ 
        error: 'Link already used',
        message: 'You have already submitted your rating using this link. Thank you for your feedback!' 
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
        message: 'The waiver associated with this rating link could not be found.' 
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
      error: 'Unable to validate rating link',
      message: 'We encountered an error while validating your rating link. Please try again or contact support.',
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
      return res.status(400).json({ error: 'Token is required' });
    }

    // Validate token
    const [tokens] = await db.query(
      'SELECT * FROM rating_tokens WHERE token = ? AND used = 0',
      [token]
    );

    if (tokens.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid or already used token',
        message: 'This rating link is no longer valid.'
      });
    }

    const tokenData = tokens[0];

    // Get waiver info
    const [waivers] = await db.query(
      'SELECT user_id FROM waivers WHERE id = ?',
      [tokenData.waiver_id]
    );

    if (waivers.length === 0) {
      return res.status(404).json({ error: 'Waiver not found' });
    }

    const waiver = waivers[0];

    // Insert 5-star feedback with professional message
    await db.query(
      `INSERT INTO feedback (user_id, waiver_id, rating, message, issue) 
       VALUES (?, ?, 5, ?, ?)`,
      [
        waiver.user_id,
        tokenData.waiver_id,
        'Customer gave 5 stars and opted to share their positive experience on Google Reviews.',
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
      message: 'Thank you for your 5-star rating! Redirecting you to Google Reviews...'
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
        message: 'You have already submitted a rating for this visit. Thank you!'
      });
    }

    res.status(500).json({
      error: 'Unable to save rating',
      message: 'We encountered an error while saving your rating. Please try again.',
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
      return res.status(400).json({ error: 'Token is required' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Valid rating (1-5) is required' });
    }

    // Validate token
    const [tokens] = await db.query(
      'SELECT * FROM rating_tokens WHERE token = ? AND used = 0',
      [token]
    );

    if (tokens.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid or already used token',
        message: 'This rating link is no longer valid.'
      });
    }

    const tokenData = tokens[0];

    // Get waiver info
    const [waivers] = await db.query(
      'SELECT user_id FROM waivers WHERE id = ?',
      [tokenData.waiver_id]
    );

    if (waivers.length === 0) {
      return res.status(404).json({ error: 'Waiver not found' });
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
      message: 'Thank you for your valuable feedback! We appreciate your input and will use it to improve our service.'
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
        error: 'Rating already submitted',
        message: 'You have already submitted a rating for this visit. Thank you!'
      });
    }

    res.status(500).json({
      error: 'Unable to save feedback',
      message: 'We encountered an error while saving your feedback. Please try again.',
      errorId
    });
  }
};

module.exports = {
  validateToken,
  submitFiveStar,
  submitFeedback
};
