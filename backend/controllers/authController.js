const db = require('../config/database');
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Sends OTP to customer's phone for verification
 * 
 * Index suggestions:
 * - CREATE INDEX idx_otps_phone_otp ON otps(phone, otp, expires_at)
 * - CREATE INDEX idx_otps_phone ON otps(phone)
 */
const sendOtp = async (req, res) => {
  try {
    const { phone, cell_phone } = req.body;
    
    // Validate phone number
    if (!phone || phone.trim() === '') {
      return res.status(400).json({ 
        error: 'Phone number is required' 
      });
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ 
        error: 'Invalid phone number format' 
      });
    }

    // Check if user exists and get their country code
    const [results] = await db.query(
      'SELECT id, country_code FROM users WHERE cell_phone = ?', 
      [phone]
    );
    
    if (results.length === 0) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    const userCountryCode = results[0].country_code || '+1';

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    // Delete any existing OTPs for this phone number
    await db.query(
      'DELETE FROM otps WHERE phone = ?',
      [phone]
    );

    // Insert new OTP
    await db.query(
      'INSERT INTO otps (phone, otp, expires_at) VALUES (?, ?, ?)',
      [phone, otp, expiresAt]
    );

    // TWILIO SMS - Send OTP via SMS - Format phone to E.164 with leading + for Twilio
    let formattedPhone = cell_phone || `${userCountryCode}${phone}`;
    // Ensure leading + for E.164 compliance
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+${formattedPhone}`;
    }
    
    try {
      await client.messages.create({
        body: `Your verification code is ${otp} for your Skate & Play waiver. Enjoy your roller skating session.`,
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
        to: formattedPhone
      });
      console.log(`✅ OTP SMS sent to ${formattedPhone}`);
    } catch (twilioError) {
      const errorId = `ERR_${Date.now()}`;
      console.error(`[${errorId}] Twilio SMS failed:`, twilioError.message);
      // Don't fail the entire request if SMS fails - still allow OTP verification
      console.warn(`⚠️ OTP generated but SMS failed. User can still verify manually.`);
    }

    // Development mode logging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] OTP for ${phone}: ${otp}`);
    }

    res.json({ 
      success: true, 
      message: 'OTP sent successfully',
      // Only expose OTP in development for testing
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error sending OTP:`, {
      message: error.message,
      phone: req.body.phone
    });
    
    res.status(500).json({ 
      error: 'Failed to send OTP',
      errorId 
    });
  }
};

/**
 * Verifies OTP entered by customer
 */
const verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    console.log(`🔍 Verifying OTP - Phone: ${phone}, OTP: ${otp}`);

    // Validate required fields
    if (!phone || !otp) {
      return res.status(400).json({ 
        error: 'Phone number and OTP are required' 
      });
    }

    // Validate OTP format (4 digits)
    if (!/^\d{4}$/.test(otp)) {
      return res.status(400).json({ 
        error: 'Invalid OTP format. Must be 4 digits' 
      });
    }

    // Debug: Check all OTPs in database
    const [allOtps] = await db.query('SELECT phone, otp, expires_at FROM otps');
    console.log(`📊 All OTPs in database:`, allOtps);

    // Check OTP validity
    const [otps] = await db.query(
      'SELECT * FROM otps WHERE phone = ? AND otp = ? AND expires_at > NOW()',
      [phone, otp]
    );

    console.log(`✅ OTP match found:`, otps.length > 0 ? 'YES' : 'NO');

    if (otps.length === 0) {
      return res.status(400).json({ 
        authenticated: false, 
        error: 'Invalid or expired OTP' 
      });
    }

    // Delete used OTP
    await db.query('DELETE FROM otps WHERE phone = ?', [phone]);

    // Mark user record with this phone as verified (status = 1)
    const [updateResult] = await db.query(
      'UPDATE users SET status = 1 WHERE cell_phone = ?',
      [phone]
    );
    console.log(`✅ Updated user record to verified status`);

    res.json({ 
      authenticated: true, 
      message: 'OTP verified successfully' 
    });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error verifying OTP:`, {
      message: error.message,
      phone: req.body.phone
    });
    
    res.status(500).json({ 
      error: 'Failed to verify OTP',
      errorId 
    });
  }
};

module.exports = {
  sendOtp,
  verifyOtp
};
