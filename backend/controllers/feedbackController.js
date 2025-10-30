const db = require('../config/database');
const nodemailer = require('nodemailer');

/**
 * Submits customer feedback and sends email notification to admin
 * 
 * Index suggestions:
 * - CREATE INDEX idx_feedback_user_id ON feedback(user_id)
 * - CREATE INDEX idx_feedback_created_at ON feedback(created_at)
 * - CREATE INDEX idx_feedback_rating ON feedback(rating)
 */
const sendFeedback = async (req, res) => {
  try {
    const { user_id, rating, message, issue, staff_name } = req.body;

    // Validate required fields
    if (!user_id || !rating) {
      return res.status(400).json({ 
        error: 'User ID and rating are required' 
      });
    }

    // Validate rating range (1-5)
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        error: 'Rating must be between 1 and 5' 
      });
    }

    // Get user info
    const [customers] = await db.query(
      'SELECT first_name, last_name, email FROM users WHERE id = ?',
      [user_id]
    );

    if (customers.length === 0) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    const customer = customers[0];

    // Insert feedback
    await db.query(
      'INSERT INTO feedback (user_id, rating, message, issue, staff_name) VALUES (?, ?, ?, ?, ?)',
      [user_id, rating, message || null, issue || null, staff_name || null]
    );

    // Send email notification to admin (if message, issue, or staff_name provided)
    if (message || issue || staff_name) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: process.env.SMTP_PORT || 587,
          secure: true,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          },
          tls: { rejectUnauthorized: false }
        });

        const htmlTemplate = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Customer Feedback</title>
          </head>
          <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 0; margin: 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding: 40px 0;">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="background-color: #002244; color: white; padding: 20px; text-align: center;">
                        <h2>Customer Feedback</h2>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 30px;">
                        <p><strong>Customer:</strong> ${customer.first_name} ${customer.last_name}</p>
                        <p><strong>Email:</strong> ${customer.email}</p>
                        <p><strong>Rating:</strong> ${rating} / 5 ⭐</p>
                        <p><strong>Feedback:</strong></p>
                        <p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; color: #333;">Issue: ${issue || "N/A"}</p>
                        <p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; color: #333;">Staff Name: ${staff_name || "N/A"}</p>
                        <p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; color: #333;">Comments: ${message || "N/A"}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="text-align: center; background-color: #f1f1f1; padding: 10px; font-size: 12px; color: #888;">
                        &copy; 2025 Skate & Play. All rights reserved.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: process.env.EMAIL_USER, 
          subject: `Customer Feedback - ${customer.first_name} ${customer.last_name}`,
          html: htmlTemplate
        });

        console.log(`Feedback email sent for customer ${user_id}`);
      } catch (emailError) {
        console.error('Feedback email error:', emailError.message);
        // Don't fail the request if email fails
      }
    }

    res.json({ 
      success: true, 
      message: 'Feedback submitted successfully' 
    });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error sending feedback:`, {
      message: error.message,
      userId: req.body.user_id
    });
    
    res.status(500).json({ 
      error: 'Failed to submit feedback',
      errorId 
    });
  }
};

/**
 * Gets customer information for rating page
 */
const getRatingInfo = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate user ID
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ 
        error: 'Valid user ID is required' 
      });
    }

    const [customers] = await db.query(
      'SELECT first_name, last_name, email FROM users WHERE id = ?',
      [userId]
    );

    if (customers.length === 0) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    res.json(customers[0]);
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error fetching rating info:`, {
      message: error.message,
      userId: req.params.userId
    });
    
    res.status(500).json({ 
      error: 'Failed to fetch customer information',
      errorId 
    });
  }
};

/**
 * Gets all feedback with customer information
 * Optimized with single JOIN query
 */
const getAllFeedback = async (req, res) => {
  try {
    const [feedback] = await db.query(`
      SELECT 
        f.id,
        f.user_id,
        f.rating,
        f.message,
        f.issue,
        f.staff_name,
        f.created_at,
        c.first_name,
        c.last_name,
        c.email,
        c.cell_phone
      FROM feedback f
      JOIN users c ON f.user_id = c.id
      ORDER BY f.created_at DESC
    `);

    res.json(feedback);
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error fetching feedback:`, {
      message: error.message
    });
    
    res.status(500).json({ 
      error: 'Failed to fetch feedback',
      errorId 
    });
  }
};

module.exports = {
  sendFeedback,
  getRatingInfo,
  getAllFeedback
};
