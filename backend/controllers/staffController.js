const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

/**
 * Authenticates staff member and returns JWT token
 * 
 * Index suggestions:
 * - CREATE INDEX idx_staff_email ON staff(email)
 * - CREATE INDEX idx_staff_email_status ON staff(email, status)
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }

    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      const errorId = `ERR_${Date.now()}`;
      console.error(`[${errorId}] JWT_SECRET not configured`);
      return res.status(500).json({ 
        error: 'Server configuration error',
        errorId 
      });
    }

    const [staff] = await db.query(
      'SELECT * FROM staff WHERE email = ?',
      [email]
    );

    // Use same error message for security (don't reveal if email exists)
    if (staff.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    const user = staff[0];

    // Check if account is active
    if (user.status !== 1) {
      return res.status(403).json({ 
        error: 'Account is inactive. Please contact administrator' 
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      staff: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_image: user.profile_image
      }
    });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error during login:`, {
      message: error.message,
      email: req.body.email
    });
    
    res.status(500).json({ 
      error: 'Login failed',
      errorId 
    });
  }
};

/**
 * Initiates password reset for staff member
 * Generates secure token and sends reset link via email
 */
const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({ 
        error: 'Please enter your email address' 
      });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        error: 'Please enter a valid email address' 
      });
    }

    const [staff] = await db.query(
      'SELECT id, name FROM staff WHERE email = ?',
      [email]
    );

    if (staff.length === 0) {
      return res.status(404).json({ 
        error: 'No account found with this email address' 
      });
    }

    const user = staff[0];
    
    // Generate secure random token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Set token expiry to 24 hours from now
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24);

    // Update staff with reset token
    await db.query(
      'UPDATE staff SET reset_token = ?, token_expiry = ? WHERE id = ?',
      [resetToken, tokenExpiry, user.id]
    );

    const resetBase = process.env.REACT_LINK_BASE || 'http://localhost:3000';
    const resetLink = `${resetBase}/admin/reset-password?token=${resetToken}`;

    console.log('🔐 Password reset requested for:', email);
    console.log('🔗 Reset link:', resetLink);
    console.log('⏰ Token expires:', tokenExpiry.toISOString());

    // Send password reset email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: { rejectUnauthorized: false }
    });

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reset Your Admin Password</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 0; margin: 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #fff; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background-color: #002244; color: white; padding: 30px 20px; text-align: center;">
                    <img src="${resetBase}/assets/img/logo.png" alt="Skate & Play Logo" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
                    <h2 style="margin: 10px 0 0 0;">Admin Portal</h2>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px;">
                    <h3 style="color: #002244; margin-top: 0;">Password Reset Request</h3>
                    <p>Hi ${user.name || "Admin"},</p>
                    <p>We received a request to reset your admin portal password. Click the button below to create a new password:</p>
                    <p style="text-align: center; margin: 30px 0;">
                      <a href="${resetLink}" target="_blank" style="background-color: #007bff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">Reset Your Password</a>
                    </p>
                    <p style="color: #666; font-size: 14px;"><strong>Important:</strong> This link will expire in 24 hours for security reasons.</p>
                    <p>If you didn't request this password reset, please ignore this email or contact our support team immediately.</p>
                    <p style="margin-top: 30px;">Stay safe,<br/><strong>Skate & Play Admin Team</strong></p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; background-color: #f1f1f1; padding: 15px; font-size: 12px; color: #888;">
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
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Reset Your Admin Password - Skate & Play',
      html: htmlTemplate
    });

    res.json({
      success: true,
      message: 'Password reset instructions have been sent to your email address'
    });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error in forget password:`, {
      message: error.message,
      email: req.body.email
    });
    
    res.status(500).json({ 
      error: 'Failed to send password reset email. Please try again.',
      errorId 
    });
  }
};

/**
 * Updates password using reset token from database
 */
const updatePassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Validate required fields
    if (!token || !newPassword) {
      return res.status(400).json({ 
        error: 'Token and new password are required' 
      });
    }

    // Validate password strength (minimum 6 characters)
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }

    // Query staff table using reset_token
    const [staff] = await db.query(
      'SELECT id, name, email, role, token_expiry, profile_image FROM staff WHERE reset_token = ?',
      [token]
    );

    // Check if token exists
    if (staff.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid or expired password reset link' 
      });
    }

    const user = staff[0];

    // Check if token has expired
    const now = new Date();
    const tokenExpiry = new Date(user.token_expiry);
    
    if (now > tokenExpiry) {
      return res.status(401).json({ 
        error: 'Password reset link has expired. Please request a new one.' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password, clear reset token, set status to active
    const [result] = await db.query(
      'UPDATE staff SET password = ?, reset_token = NULL, token_expiry = NULL, status = 1, updated_at = NOW() WHERE id = ?',
      [hashedPassword, user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        error: 'Failed to update password. Please try again.' 
      });
    }

    // Generate JWT token for auto-login
    const authToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ Password reset successful for:', user.email);
    console.log('🔐 Auto-login token generated');

    // Return token and staff info for auto-login
    res.json({ 
      success: true, 
      message: 'Password updated successfully',
      token: authToken,
      staff: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_image: user.profile_image
      }
    });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error updating password:`, {
      message: error.message
    });
    
    res.status(500).json({ 
      error: 'Failed to update password. Please try again.',
      errorId 
    });
  }
};

/**
 * Changes password for authenticated staff member
 */
const changePassword = async (req, res) => {
  try {
    const { id, currentPassword, newPassword } = req.body;

    // Validate required fields
    if (!id || !currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'All fields are required' 
      });
    }

    // Validate password strength (minimum 8 characters with uppercase, lowercase, number)
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long' 
      });
    }

    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ 
        error: 'Password must contain at least one uppercase letter' 
      });
    }

    if (!/[a-z]/.test(newPassword)) {
      return res.status(400).json({ 
        error: 'Password must contain at least one lowercase letter' 
      });
    }

    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ 
        error: 'Password must contain at least one number' 
      });
    }

    // Prevent using same password
    if (currentPassword === newPassword) {
      return res.status(400).json({ 
        error: 'New password must be different from current password' 
      });
    }

    const [staff] = await db.query(
      'SELECT password FROM staff WHERE id = ?', 
      [id]
    );

    if (staff.length === 0) {
      return res.status(404).json({ 
        error: 'Staff member not found' 
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, staff[0].password);

    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Current password is incorrect' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.query(
      'UPDATE staff SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, id]
    );

    console.log(`✅ Password changed successfully for staff ID: ${id}`);

    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error changing password:`, {
      message: error.message,
      staffId: req.body.id
    });
    
    res.status(500).json({ 
      error: 'Failed to change password. Please try again.',
      errorId 
    });
  }
};

/**
 * Gets list of all staff members (excludes passwords and superadmin users)
 */
const getAllStaff = async (req, res) => {
  try {
    const [staff] = await db.query(
      'SELECT id, name, email, role, status, profile_image, created_at FROM staff WHERE role != ? ORDER BY created_at DESC',
      ['superadmin']
    );

    res.json(staff);
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error fetching staff:`, {
      message: error.message
    });
    
    res.status(500).json({ 
      error: 'Failed to fetch staff list',
      errorId 
    });
  }
};

/**
 * Gets staff member by ID (excludes password)
 */
const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate staff ID
    if (!id || isNaN(id)) {
      return res.status(400).json({ 
        error: 'Valid staff ID is required' 
      });
    }

    const [staff] = await db.query(
      'SELECT id, name, email, role, status, profile_image FROM staff WHERE id = ?',
      [id]
    );

    if (staff.length === 0) {
      return res.status(404).json({ 
        error: 'Staff member not found' 
      });
    }

    res.json(staff[0]);
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error fetching staff:`, {
      message: error.message,
      staffId: req.params.id
    });
    
    res.status(500).json({ 
      error: 'Failed to fetch staff details',
      errorId 
    });
  }
};

/**
 * Adds a new staff member and sends setup email with secure token
 */
const addStaff = async (req, res) => {
  try {
    const { name, email, role } = req.body;

    // Validate required fields (password is NOT required - sent via email)
    if (!name || !email || !role) {
      return res.status(400).json({ 
        error: 'Name, email, and role are required' 
      });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    } 

    // Check if email already exists
    const [existing] = await db.query(
      'SELECT id FROM staff WHERE email = ?', 
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ 
        error: 'This email is already registered. Please use a different email address.' 
      });
    }

    // Generate secure random token for password setup
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Set token expiry to 24 hours from now
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24);

    // Insert new staff member with reset token
    const [result] = await db.query(
      'INSERT INTO staff (name, email, role, status, profile_image, password, reset_token, token_expiry) VALUES (?, ?, ?, 0, "", "", ?, ?)',
      [name, email, role, resetToken, tokenExpiry]
    );

    const insertedId = result.insertId;

    // Generate secure password setup link with token only
    const resetBase = process.env.REACT_LINK_BASE || 'http://localhost:3000';
    const setupLink = `${resetBase}/admin/reset-password?token=${resetToken}`;

    console.log('📧 Preparing to send welcome email to:', email);
    console.log('🔗 Setup link:', setupLink);
    console.log('⏰ Token expires:', tokenExpiry.toISOString());

    // Setup nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: { rejectUnauthorized: false },
    });

    // HTML email template with logo and "Set Up Your Account" link
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Welcome to Skate & Play</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 0; margin: 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #fff; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background-color: #002244; color: white; padding: 30px 20px; text-align: center;">
                    <img src="${resetBase}/assets/img/logo.png" alt="Skate & Play Logo" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
                    <h2 style="margin: 10px 0 0 0;">Admin Portal</h2>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px;">
                    <h3 style="color: #002244; margin-top: 0;">Welcome to the Team, ${name}!</h3>
                    <p>You have been invited to join the Skate & Play admin portal as <b>${role == 1 ? "Admin" : "Staff"}</b>.</p>
                    <p>To get started, please set up your account password by clicking the button below:</p>
                    <p style="text-align: center; margin: 30px 0;">
                      <a href="${setupLink}" target="_blank" style="background-color: #f19d39; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">
                        Set Up Your Account
                      </a>
                    </p>
                    <p style="color: #666; font-size: 14px;"><strong>Important:</strong> This link will expire in 24 hours for security reasons.</p>
                    <p>If you did not expect this invitation, please ignore this email or contact our support team.</p>
                    <p style="margin-top: 30px;">Welcome aboard!<br/><strong>Skate & Play Admin Team</strong></p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; background-color: #f1f1f1; padding: 15px; font-size: 12px; color: #888;">
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

    try {
      console.log('📤 Attempting to send email...');
      const info = await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: "Welcome to Skate & Play - Set Up Your Account",
        html: htmlTemplate,
      });

      console.log('✅ Email sent successfully!', info.messageId);
      res.status(201).json({
        success: true,
        message: 'Staff member added successfully! A setup email has been sent to their email address.',
        staffId: insertedId
      });
    } catch (emailError) {
      console.error("❌ Email sending failed:", {
        error: emailError.message,
        code: emailError.code,
        command: emailError.command,
        response: emailError.response,
        responseCode: emailError.responseCode
      });
      // Rollback inserted staff
      await db.query("DELETE FROM staff WHERE id = ?", [insertedId]);
      return res.status(500).json({ 
        error: 'Failed to send setup email. Please check the email address and try again.',
        details: emailError.message
      });
    }
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error adding staff:`, {
      message: error.message,
      email: req.body.email
    });
    
    res.status(500).json({ 
      error: 'Failed to add staff member. Please try again.',
      errorId 
    });
  }
};

/**
 * Updates staff member information
 */
const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, password } = req.body;

    // Validate staff ID
    if (!id || isNaN(id)) {
      return res.status(400).json({ 
        error: 'Valid staff ID is required' 
      });
    }

    // Validate required fields
    if (!name || !email || !role) {
      return res.status(400).json({ 
        error: 'Name, email, and role are required' 
      });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }

    // Check if email already exists for different staff member
    const [existing] = await db.query(
      'SELECT id FROM staff WHERE email = ? AND id != ?',
      [email, id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ 
        error: 'Email already exists' 
      });
    }

    // Update with or without password
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ 
          error: 'Password must be at least 6 characters long' 
        });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE staff SET name = ?, email = ?, role = ?, password = ?, updated_at = NOW() WHERE id = ?',
        [name, email, role, hashedPassword, id]
      );
    } else {
      await db.query(
        'UPDATE staff SET name = ?, email = ?, role = ?, updated_at = NOW() WHERE id = ?',
        [name, email, role, id]
      );
    }

    res.json({ 
      success: true, 
      message: 'Staff member updated successfully' 
    });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error updating staff:`, {
      message: error.message,
      staffId: req.params.id
    });
    
    res.status(500).json({ 
      error: 'Failed to update staff member',
      errorId 
    });
  }
};

/**
 * Updates staff member's own profile (name, email, and profile image)
 */
const updateProfile = async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const { id, name, email } = req.body;

    // Validate required fields
    if (!id || !name || !email) {
      return res.status(400).json({ 
        error: 'Staff ID, name, and email are required' 
      });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }

    // Check if email already exists for different staff member
    const [existing] = await db.query(
      'SELECT id FROM staff WHERE email = ? AND id != ?',
      [email, id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ 
        error: 'Email already exists' 
      });
    }

    // Get current profile image before update (to delete it later)
    let oldProfileImage = null;
    if (req.file) {
      const [currentStaff] = await db.query(
        'SELECT profile_image FROM staff WHERE id = ?',
        [id]
      );
      if (currentStaff.length > 0) {
        oldProfileImage = currentStaff[0].profile_image;
      }
    }

    // Build update query dynamically based on whether image was uploaded
    let query = 'UPDATE staff SET name = ?, email = ?';
    const params = [name, email];

    if (req.file) {
      const imagePath = `uploads/profile/${req.file.filename}`;
      query += ', profile_image = ?';
      params.push(imagePath);
    }

    query += ', updated_at = NOW() WHERE id = ?';
    params.push(id);

    // Update profile
    const [result] = await db.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        error: 'Staff member not found' 
      });
    }

    // Delete old profile image from server if new image was uploaded
    if (req.file && oldProfileImage) {
      const oldImagePath = path.join(__dirname, '../public', oldProfileImage);
      
      // Check if file exists before attempting to delete
      if (fs.existsSync(oldImagePath)) {
        fs.unlink(oldImagePath, (err) => {
          if (err) {
            console.log('⚠️ Could not delete old profile image:', err.message);
          } else {
            console.log('✅ Old profile image deleted:', oldProfileImage);
          }
        });
      } else {
        console.log('ℹ️ Old profile image not found (already deleted or moved):', oldProfileImage);
      }
    }

    // Fetch updated staff data
    const [updatedStaff] = await db.query(
      'SELECT id, name, email, role, profile_image FROM staff WHERE id = ?',
      [id]
    );

    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      staff: updatedStaff[0]
    });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error updating profile:`, {
      message: error.message,
      staffId: req.body.id
    });
    
    res.status(500).json({ 
      error: 'Failed to update profile',
      errorId 
    });
  }
};

/**
 * Updates staff member's status (active/inactive)
 */
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate staff ID
    if (!id || isNaN(id)) {
      return res.status(400).json({ 
        error: 'Valid staff ID is required' 
      });
    }

    // Validate status
    if (status === undefined || status === null) {
      return res.status(400).json({ 
        error: 'Status is required' 
      });
    }

    if (![0, 1, '0', '1'].includes(status)) {
      return res.status(400).json({ 
        error: 'Status must be 0 (inactive) or 1 (active)' 
      });
    }

    // Update status
    const [result] = await db.query(
      'UPDATE staff SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        error: 'Staff member not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Status updated successfully' 
    });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error updating status:`, {
      message: error.message,
      staffId: req.params.id
    });
    
    res.status(500).json({ 
      error: 'Failed to update status',
      errorId 
    });
  }
};

/**
 * Deletes a staff member
 * Note: Consider soft delete instead of hard delete for audit purposes
 */
const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate staff ID
    if (!id || isNaN(id)) {
      return res.status(400).json({ 
        error: 'Valid staff ID is required' 
      });
    }

    // Check if staff member exists
    const [existing] = await db.query(
      'SELECT id FROM staff WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ 
        error: 'Staff member not found' 
      });
    }

    // Delete staff member
    await db.query('DELETE FROM staff WHERE id = ?', [id]);

    res.json({ 
      success: true, 
      message: 'Staff member deleted successfully' 
    });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error deleting staff:`, {
      message: error.message,
      staffId: req.params.id
    });
    
    res.status(500).json({ 
      error: 'Failed to delete staff member',
      errorId 
    });
  }
};

module.exports = {
  login,
  forgetPassword,
  updatePassword,
  changePassword,
  getAllStaff,
  getStaffById,
  addStaff,
  updateStaff,
  updateProfile,
  updateStatus,
  deleteStaff
};
