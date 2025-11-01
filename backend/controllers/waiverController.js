const db = require("../config/database");
const addToMailchimp = require("../utils/mailchimp");
const twilio = require("twilio");
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

/**
 * Creates a new waiver for a customer
 * Handles both new and existing customers
 * Uses transaction to ensure data consistency
 *
 * Index suggestions:
 * - CREATE INDEX idx_users_cell_phone ON users(cell_phone)
 */
const createWaiver = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const {
      first_name,
      last_name,
      email,
      dob,     
      address,
      city,
      province,
      postal_code,
      country_code,
      cell_phone,
      cc_cell_phone,
      minors,
      send_otp,
    } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !cell_phone) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        error: "Missing required fields",
        details: "First name, last name, and cell phone are required",
      });
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        error: "Invalid email format",
      });
    }

    // Check if user exists with this phone number (ONE user per phone)
    const [existingUsers] = await connection.query(
      `SELECT id FROM users WHERE cell_phone = ?`,
      [cell_phone]
    );

    let userId;
    
    if (existingUsers.length > 0) {
      // User exists - UPDATE with latest info
      userId = existingUsers[0].id;
      await connection.query(
        `UPDATE users 
        SET first_name = ?, last_name = ?, email = ?, dob = ?, 
            address = ?, city = ?, province = ?, postal_code = ?, 
            country_code = ?, updated_at = NOW()
        WHERE id = ?`,
        [
          first_name,
          last_name,
          email,
          dob,
          address,
          city,
          province,
          postal_code,
          country_code,
          userId,
        ]
      );
      console.log(`✅ Updated existing user (ID: ${userId}) - Phone: ${cell_phone}`);
    } else {
      // User does NOT exist - INSERT new user record
      const [result] = await connection.query(
        `INSERT INTO users 
        (first_name, last_name, email, dob, address, city, 
         province, postal_code, country_code, cell_phone, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          first_name,
          last_name,
          email,
          dob,
          address,
          city,
          province,
          postal_code,
          country_code,
          cell_phone,
        ]
      );
      userId = result.insertId;
      console.log(`✅ Created new user (ID: ${userId}) - Phone: ${cell_phone}`);
    }
    
    // Prepare minors snapshot (store minors in JSON format in waiver record)
    const minorsSnapshot = minors && minors.length > 0 ? JSON.stringify(minors) : null;
    
    if (minors && minors.length > 0) {
      console.log(`✅ Prepared ${minors.length} minor(s) for waiver snapshot`);
    }

    // Prepare signer snapshot data from user data
    const signerName = `${first_name} ${last_name}`;
    const signerEmail = email;
    const signerAddress = address;
    const signerCity = city;
    const signerProvince = province;
    const signerPostal = postal_code;
    const signerDob = dob;

    // Create waiver entry with signer snapshot and minors snapshot
    const [waiverResult] = await connection.query(
      `INSERT INTO waivers 
       (user_id, signer_name, signer_email, signer_address, signer_city, 
        signer_province, signer_postal, signer_dob, minors_snapshot, 
        signed_at, completed, verified_by_staff, staff_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, 0, 0)`,
      [userId, signerName, signerEmail, signerAddress, signerCity, 
       signerProvince, signerPostal, signerDob, minorsSnapshot],
    );

    const waiverId = waiverResult.insertId;
    console.log(`✅ Created waiver (ID: ${waiverId}) with signer snapshot for user ${userId}`)

    // SEND OTP via SMS for all new customer signups
    if (send_otp) {
      try {
        // Generate 4-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

        // Delete any existing OTPs for this phone number
        await connection.query("DELETE FROM otps WHERE phone = ?", [
          cell_phone,
        ]);

        // Insert new OTP
        await connection.query(
          "INSERT INTO otps (phone, otp, expires_at) VALUES (?, ?, ?)",
          [cell_phone, otp, expiresAt],
        );

        console.log(
          `📝 OTP stored in database for user - Phone: ${cell_phone}, OTP: ${otp}`,
        );

        // Send OTP via SMS - Format phone to E.164 with leading + for Twilio
        let formattedPhone = cc_cell_phone || `${country_code}${cell_phone}`;
        if (!formattedPhone.startsWith('+')) {
          formattedPhone = `+${formattedPhone}`;
        }

        try {
          await client.messages.create({
            body: `Your verification code is ${otp} for your Skate & Play waiver. Enjoy your roller skating session.`,
            messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
            to: formattedPhone,
          });
          console.log(
            `✅ OTP SMS sent to user ${formattedPhone}: ${otp}`,
          );
        } catch (twilioError) {
          const errorId = `ERR_${Date.now()}`;
          console.error(
            `[${errorId}] Twilio SMS failed for user:`,
            twilioError.message,
          );
          
          // Check if error is due to invalid phone number
          const isInvalidPhone = twilioError.message && (
            twilioError.message.includes('not a valid phone number') ||
            twilioError.message.includes('is not a mobile number') ||
            twilioError.message.includes('invalid phone number') ||
            twilioError.code === 21211 || // Invalid 'To' Phone Number
            twilioError.code === 21614    // 'To' number is not a valid mobile number
          );
          
          if (isInvalidPhone) {
            // Rollback transaction - delete user and waiver we just created
            await connection.rollback();
            return res.status(400).json({
              error: 'Invalid phone number',
              message: 'The phone number you entered doesn\'t appear to be valid. Please double-check your phone number (including area code) and try again. If you continue to experience issues, please visit our front desk or contact us at info@skate-play.com for assistance.',
              errorId
            });
          }
          
          // For other Twilio errors, allow manual verification
          console.warn(`⚠️ OTP generated but SMS failed. User can still verify manually.`);
        }

        // Log OTP in development
        if (process.env.NODE_ENV === "development") {
          console.log(`[DEV] OTP for user ${cell_phone}: ${otp}`);
        }
      } catch (otpError) {
        console.error(
          "⚠️ Error generating OTP for user:",
          otpError.message,
        );
        // Don't fail the waiver creation if OTP fails
      }
    }

    // MAILCHIMP INTEGRATION - Auto-subscribe to mailing list on new waiver signup
    // Check if subscriber exists first, only subscribe if new
    try {
      await addToMailchimp(
        email,
        cell_phone,
        first_name,
        last_name,
        dob,
        city,
        address,
      );
      console.log(`✅ Mailchimp subscription processed for ${email}`);
    } catch (mailchimpError) {
      console.error(
        "⚠️ Mailchimp integration error:",
        mailchimpError.message,
      );
      // Don't fail the waiver creation if Mailchimp fails
    }

    await connection.commit();

    console.log(`✅ Waiver creation successful - userId: ${userId}, waiverId: ${waiverId}`);

    res.status(201).json({
      success: true,
      message: send_otp
        ? "Waiver created and OTP sent successfully"
        : "Waiver created successfully",
      userId: userId,
      waiverId: waiverId,
    });
  } catch (error) {
    await connection.rollback();

    // Log error details for debugging
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error creating waiver:`, {
      message: error.message,
      stack: error.stack,
    });

    // Send sanitized error to client
    res.status(500).json({
      error: "Failed to create waiver",
      errorId,
      message: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Updates customer information only (minors managed in Redux and submitted with waiver)
 */
const updateCustomer = async (req, res) => {
  try {
    const {
      id,
      first_name,
      last_name,
      email,
      dob,
      address,
      city,
      province,
      postal_code,
      cell_phone,
      can_email,
    } = req.body;

    // Validate required fields
    if (!id) {
      return res.status(400).json({
        error: "Customer ID is required",
      });
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: "Invalid email format",
      });
    }

    // Check if customer exists
    const [existingCustomer] = await db.query(
      "SELECT id FROM users WHERE id = ?",
      [id],
    );

    if (existingCustomer.length === 0) {
      return res.status(404).json({
        error: "Customer not found",
      });
    }

    await db.query(
      `UPDATE users SET 
        first_name = ?, last_name = ?, email = ?, dob = ?, 
        address = ?, city = ?, province = ?, postal_code = ?, 
        cell_phone = ?, updated_at = NOW()
      WHERE id = ?`,
      [
        first_name,
        last_name,
        email,
        dob,
        address,
        city,
        province,
        postal_code,
        cell_phone,       
        id,
      ],
    );

    console.log(`✅ Customer ${id} updated successfully`);

    res.json({
      success: true,
      message: "Customer updated successfully",
    });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error updating customer:`, {
      message: error.message,
      customerId: req.body.id,
    });

    res.status(500).json({
      error: "Failed to update customer",
      errorId,
    });
  }
};

/**
 * Saves customer signature to waiver form with minors snapshot
 */
const saveSignature = async (req, res) => {
  try {
    const {
      id,    
      signature,  
      minors
    } = req.body;

    // Validate required fields
    if (!id || !signature) {
      return res.status(400).json({
        error: "User ID and signature are required",
      });
    }

    // Fetch current user data for snapshot
    const [users] = await db.query(
      "SELECT first_name, last_name, email, address, city, province, postal_code, dob FROM users WHERE id = ?",
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const user = users[0];

    // Build snapshot data using submitted minors from Redux (already validated in frontend)
    // Filter out any incomplete minors before creating snapshot
    const checkedMinors = (minors || [])
      .filter(m => m.first_name && m.last_name && m.dob)
      .map(m => ({
        first_name: m.first_name,
        last_name: m.last_name,
        dob: m.dob
      }));
    
    console.log(`📸 Creating snapshot with ${checkedMinors.length} minor(s) for user ${id}`);

    const snapshotData = {
      signer_name: `${user.first_name} ${user.last_name}`,
      signer_email: user.email,
      signer_address: user.address,
      signer_city: user.city,
      signer_province: user.province,
      signer_postal: user.postal_code,
      signer_dob: user.dob,
      minors_snapshot: JSON.stringify(checkedMinors)
    };

    // Find the most recent unsigned waiver for this user
    const [existingWaivers] = await db.query(
      "SELECT id, signed_at FROM waivers WHERE user_id = ? AND signed_at IS NULL ORDER BY created_at DESC LIMIT 1",
      [id],
    );

    let waiverId;
    
    if (existingWaivers.length > 0) {
      // Update existing unsigned waiver with signature and snapshot data
      waiverId = existingWaivers[0].id;
      await db.query(
        `UPDATE waivers 
        SET signature_image = ?, signed_at = NOW(), 
            signer_name = ?, signer_email = ?, signer_address = ?, 
            signer_city = ?, signer_province = ?, signer_postal = ?, 
            signer_dob = ?, minors_snapshot = ?
        WHERE id = ?`,
        [
          signature,
          snapshotData.signer_name,
          snapshotData.signer_email,
          snapshotData.signer_address,
          snapshotData.signer_city,
          snapshotData.signer_province,
          snapshotData.signer_postal,
          snapshotData.signer_dob,
          snapshotData.minors_snapshot,
          waiverId
        ],
      );
      console.log(`✅ Updated existing unsigned waiver ${waiverId} with signature and snapshot for user ${id}`);
    } else {
      // No unsigned waiver found - check if user has any signed waivers (repeat visit)
      const [signedWaivers] = await db.query(
        "SELECT id FROM waivers WHERE user_id = ? AND signed_at IS NOT NULL ORDER BY created_at DESC LIMIT 1",
        [id],
      );

      if (signedWaivers.length > 0) {
        // User has a previous signed waiver - create new one for repeat visit
        const [result] = await db.query(
          `INSERT INTO waivers 
          (user_id, signature_image, signed_at, completed, 
           signer_name, signer_email, signer_address, 
           signer_city, signer_province, signer_postal, 
           signer_dob, minors_snapshot) 
          VALUES (?, ?, NOW(), 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id, 
            signature,
            snapshotData.signer_name,
            snapshotData.signer_email,
            snapshotData.signer_address,
            snapshotData.signer_city,
            snapshotData.signer_province,
            snapshotData.signer_postal,
            snapshotData.signer_dob,
            snapshotData.minors_snapshot
          ],
        );
        waiverId = result.insertId;
        console.log(`✅ Created new waiver ${waiverId} for repeat visit by user ${id}`);
      } else {
        // This should not happen in normal flow, but handle it
        console.error(`⚠️ No waiver found for user ${id} - this should not happen`);
        return res.status(500).json({
          error: "No waiver found to sign. Please start the process again.",
        });
      }
    }

    console.log(`✅ Signature and snapshot saved for waiver ${waiverId}`);

    res.json({
      success: true,
      message: "Signature saved successfully",
      waiverId,
    });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error saving signature:`, {
      message: error.message,
      userId: req.body.id,
    });

    res.status(500).json({
      error: "Failed to save signature",
      errorId,
    });
  }
};

/**
 * Updates only the signed_at timestamp for an existing waiver
 * Used when customer re-signs without any data modifications
 */
const updateWaiverTimestamp = async (req, res) => {
  try {
    const { waiverId } = req.body;
    
    if (!waiverId) {
      return res.status(400).json({ error: "Waiver ID is required" });
    }
    
    const now = new Date();
    await db.query(
      "UPDATE waivers SET signed_at = ? WHERE id = ?",
      [now, waiverId]
    );
    
    console.log(`✅ Updated timestamp for waiver ${waiverId}`);
    
    res.json({ success: true, message: "Waiver timestamp updated successfully" });
  } catch (error) {
    console.error("Error updating waiver timestamp:", error);
    res.status(500).json({ error: "Failed to update waiver timestamp" });
  }
};

/**
 * Marks waiver rules as accepted and completes the waiver
 */
const acceptRules = async (req, res) => {
  try {
    const { userId, waiverId } = req.body;

    // Validate userId and waiverId
    if (!userId) {
      return res.status(400).json({
        error: "User ID is required",
      });
    }

    if (!waiverId) {
      return res.status(400).json({
        error: "Waiver ID is required",
      });
    }

    // Verify that waiverId belongs to userId (prevents cross-waiver tampering)
    const [waivers] = await db.query(
      "SELECT id FROM waivers WHERE id = ? AND user_id = ?",
      [waiverId, userId],
    );

    if (waivers.length === 0) {
      return res.status(404).json({
        error: "Waiver not found or does not belong to this user",
      });
    }

    await db.query(
      "UPDATE waivers SET rules_accepted = 1, completed = 1 WHERE id = ?",
      [waiverId],
    );

    res.json({
      success: true,
      message: "Rules accepted successfully",
    });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error accepting rules:`, {
      message: error.message,
      userId: req.body.userId,
    });

    res.status(500).json({
      error: "Failed to accept rules",
      errorId,
    });
  }
};

/**
 * Gets all completed waivers with snapshot data for verification
 * Uses snapshot data for historical accuracy (shows waiver as it was at signing)
 *
 * Index suggestions:
 * - CREATE INDEX idx_waivers_completed ON waivers(completed, created_at)
 */
const getAllCustomers = async (req, res) => {
  try {
    // Fetch waivers with snapshot data (no joins with users/minors tables)
    // Filter out verified waivers (only show waivers that need verification)
    // Show waivers that have been signed (have signature_image) instead of waiting for rules acceptance
    const [waivers] = await db.query(`
      SELECT 
        w.user_id as id,
        w.signer_name,
        w.signer_email,
        w.signer_address,
        w.signer_city,
        w.signer_province,
        w.signer_postal,
        w.signer_dob,
        w.id as waiver_id,
        w.signed_at,
        w.verified_by_staff,
        w.rating_email_sent,
        w.rating_sms_sent,
        w.completed,
        w.minors_snapshot
      FROM waivers w
      WHERE w.signature_image IS NOT NULL AND (w.verified_by_staff IS NULL OR w.verified_by_staff = 0)
      ORDER BY w.created_at DESC
    `);

    // Parse snapshot data into expected format
    const result = waivers.map((waiver) => {
      // Parse minors from snapshot JSON
      let minors = [];
      if (waiver.minors_snapshot) {
        try {
          const parsedMinors = JSON.parse(waiver.minors_snapshot);
          minors = parsedMinors.map(m => ({
            first_name: m.first_name,
            last_name: m.last_name
          }));
        } catch (parseError) {
          console.error(`Error parsing minors_snapshot for waiver ${waiver.waiver_id}:`, parseError);
        }
      }

      // Extract first_name and last_name from signer_name
      const nameParts = waiver.signer_name ? waiver.signer_name.split(' ') : ['', ''];
      const first_name = nameParts[0] || '';
      const last_name = nameParts.slice(1).join(' ') || '';

      return {
        id: waiver.id,
        first_name,
        last_name,
        dob: waiver.signer_dob,
        phone_number: null,
        email: waiver.signer_email,
        address: waiver.signer_address,
        city: waiver.signer_city,
        province: waiver.signer_province,
        postal_code: waiver.signer_postal,
        waiver_id: waiver.waiver_id,
        signed_at: waiver.signed_at,
        verified_by_staff: waiver.verified_by_staff,
        rating_email_sent: waiver.rating_email_sent,
        rating_sms_sent: waiver.rating_sms_sent,
        completed: waiver.completed,
        minors
      };
    });

    res.json(result);
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error fetching customers:`, {
      message: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: "Failed to fetch customers",
      errorId,
    });
  }
};

/**
 * Updates waiver verification status
 */
const verifyWaiver = async (req, res) => {
  try {
    const { id } = req.params;
    const { staff_id, verified_by_staff } = req.body;

    // Validate required fields
    if (!id) {
      return res.status(400).json({
        error: "Waiver ID is required",
      });
    }

    // Check if waiver exists
    const [existingWaiver] = await db.query(
      "SELECT id FROM waivers WHERE id = ?",
      [id],
    );

    if (existingWaiver.length === 0) {
      return res.status(404).json({
        error: "Waiver not found",
      });
    }

    await db.query(
      "UPDATE waivers SET verified_by_staff = ?, staff_id = ? WHERE id = ?",
      [verified_by_staff, staff_id, id],
    );

    res.json({
      success: true,
      message: "Waiver verification updated",
    });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error verifying waiver:`, {
      message: error.message,
      waiverId: req.params.id,
    });

    res.status(500).json({
      error: "Failed to verify waiver",
      errorId,
    });
  }
};

/**
 * Gets detailed information about a user and all their waivers
 * Simplified to fetch by user_id instead of waiver_id
 */
const getWaiverDetails = async (req, res) => {
  try {
    const { id } = req.params; // This is now user_id

    // Validate user ID
    if (!id) {
      return res.status(400).json({
        error: "User ID is required",
      });
    }

    // Fetch user information
    const [users] = await db.query(
      `SELECT id, first_name, last_name, email, dob, address, city, province, postal_code, cell_phone, country_code 
       FROM users WHERE id = ?`,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const user = users[0];

    // Fetch current minors from latest waiver snapshot
    const [latestWaiverMinors] = await db.query(
      `SELECT minors_snapshot FROM waivers WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      [id]
    );
    
    // Parse minors from snapshot
    let currentMinors = [];
    if (latestWaiverMinors.length > 0 && latestWaiverMinors[0].minors_snapshot) {
      try {
        currentMinors = JSON.parse(latestWaiverMinors[0].minors_snapshot);
      } catch (parseError) {
        console.error('Error parsing minors_snapshot:', parseError);
      }
    }

    // Get all waivers for this user with staff verification info
    const { convertToEST } = require("../utils/time");
    
    const [waiverHistoryRaw] = await db.query(
      `
      SELECT 
        wf.id,
        wf.signed_at,
        wf.signature_image,
        wf.verified_by_staff,
        wf.rules_accepted,
        wf.signer_name as name,
        wf.minors_snapshot,
        CASE 
          WHEN wf.verified_by_staff > 0 THEN CONCAT('Marked by ', s.name)
          ELSE 'Not verified'
        END as markedBy
      FROM waivers wf
      LEFT JOIN staff s ON wf.verified_by_staff = s.id
      WHERE wf.user_id = ?
      ORDER BY wf.signed_at DESC
    `,
      [id]
    );

    // Format signed_at dates using backend timezone conversion
    const waiverHistory = waiverHistoryRaw.map(w => ({
      ...w,
      date: w.signed_at ? convertToEST(w.signed_at, "MMM DD, YYYY [at] hh:mm A") : null
    }));

    // Return data in the format expected by the frontend
    res.json({
      customer: user,
      minors: currentMinors,
      waiverHistory: waiverHistory,
    });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error fetching user details:`, {
      message: error.message,
      userId: req.params.id,
    });

    res.status(500).json({
      error: "Failed to fetch user details",
      errorId,
    });
  }
};

/**
 * Gets waiver history for a customer by phone number
 * Uses snapshot data so each waiver shows historical info from when it was signed
 */
const getUserHistory = async (req, res) => {
  try {
    const { phone } = req.params;

    // Validate phone parameter
    if (!phone) {
      return res.status(400).json({
        error: "Phone number is required",
      });
    }

    const [customers] = await db.query(
      "SELECT id FROM users WHERE cell_phone = ?",
      [phone],
    );

    if (customers.length === 0) {
      return res.json({ waivers: [] });
    }

    const customerId = customers[0].id;

    // Fetch waivers with snapshot data (no join with minors table)
    const [waivers] = await db.query(
      `
      SELECT 
        wf.id,
        wf.signed_at,
        wf.verified_by_staff,
        wf.completed,
        wf.created_at,
        wf.minors_snapshot
      FROM waivers wf
      WHERE wf.user_id = ?
      ORDER BY wf.created_at DESC
    `,
      [customerId],
    );

    // Parse minors from snapshot for each waiver
    const waiversWithMinors = waivers.map((waiver) => {
      let minors = [];
      if (waiver.minors_snapshot) {
        try {
          const parsedMinors = JSON.parse(waiver.minors_snapshot);
          minors = parsedMinors.map(m => ({
            first_name: m.first_name,
            last_name: m.last_name
          }));
        } catch (parseError) {
          console.error(`Error parsing minors_snapshot for waiver ${waiver.id}:`, parseError);
        }
      }

      return {
        id: waiver.id,
        signed_at: waiver.signed_at,
        verified_by_staff: waiver.verified_by_staff,
        completed: waiver.completed,
        created_at: waiver.created_at,
        minors
      };
    });

    res.json({ waivers: waiversWithMinors });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error fetching user history:`, {
      message: error.message,
      phone: req.params.phone,
    });

    res.status(500).json({
      error: "Failed to fetch user history",
      errorId,
    });
  }
};

/**
 * Get all waivers with customer and minor details for admin history page
 * Returns formatted data with minors from snapshot (historical data at time of signing)
 */
const getAllWaivers = async (req, res) => {
  try {
    const { convertToEST } = require("../utils/time");
    
    // Get pagination and search parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    // Build WHERE clause for search
    let whereClause = 'WHERE w.signed_at IS NOT NULL';
    const queryParams = [];
    
    if (search.trim() !== '') {
      whereClause += ' AND (w.signer_name LIKE ? OR w.signer_email LIKE ? OR w.minors_snapshot LIKE ?)';
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM waivers w
      ${whereClause}
    `;
    const [[{ total }]] = await db.query(countQuery, queryParams);

    // Get paginated data
    const dataQuery = `
      SELECT 
        w.user_id,
        w.signer_name,
        w.signer_email,
        w.id AS waiver_id, 
        w.rating_email_sent,
        w.rating_sms_sent,
        w.signed_at, 
        w.verified_by_staff AS status,
        w.minors_snapshot
      FROM waivers w
      ${whereClause}
      ORDER BY w.signed_at DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await db.query(dataQuery, [...queryParams, limit, offset]);

    // Parse minors from snapshot JSON and format signed_at using backend timezone conversion
    const waivers = rows.map(r => {
      // Parse minors_snapshot JSON
      let minors = [];
      if (r.minors_snapshot) {
        try {
          const parsedMinors = JSON.parse(r.minors_snapshot);
          minors = parsedMinors.map(m => ({
            first_name: m.first_name,
            last_name: m.last_name
          }));
        } catch (parseError) {
          console.error(`Error parsing minors_snapshot for waiver ${r.waiver_id}:`, parseError);
        }
      }

      // Extract first_name and last_name from signer_name
      const nameParts = r.signer_name ? r.signer_name.split(' ') : ['', ''];
      const first_name = nameParts[0] || '';
      const last_name = nameParts.slice(1).join(' ') || '';

      return {
        id: r.user_id,
        first_name,
        last_name,
        cell_phone: null,
        waiver_id: r.waiver_id,
        rating_email_sent: r.rating_email_sent,
        rating_sms_sent: r.rating_sms_sent,
        signed_at: r.signed_at ? convertToEST(r.signed_at, "MMM DD, YYYY [at] hh:mm A") : null,
        status: r.status,
        minors
      };
    });

    res.json({
      data: waivers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error fetching all waivers:`, {
      message: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: "Failed to fetch waivers",
      errorId,
    });
  }
};

/**
 * Delete a waiver by ID
 */
const deleteWaiver = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "Waiver ID is required" });
  }

  try {
    const [result] = await db.query('DELETE FROM waivers WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Waiver not found" });
    }

    console.log(`✅ Waiver deleted successfully: ID ${id}`);
    res.json({ message: 'Waiver deleted successfully' });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error deleting waiver:`, {
      message: error.message,
      waiverId: id,
    });

    res.status(500).json({
      error: "Failed to delete waiver",
      errorId,
    });
  }
};

/**
 * Update waiver status (confirm/unconfirm)
 */
const updateWaiverStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (![0, 1].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value. Must be 0 or 1.' });
  }

  try {
    const [result] = await db.query(
      'UPDATE waivers SET verified_by_staff = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Waiver not found" });
    }

    console.log(`✅ Waiver status updated: ID ${id}, Status ${status}`);
    res.json({ message: 'Waiver status updated successfully' });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error updating waiver status:`, {
      message: error.message,
      waiverId: id,
      status,
    });

    res.status(500).json({
      error: "Failed to update waiver status",
      errorId,
    });
  }
};

/**
 * Get customer information for rating page
 */
const getRatingInfo = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'Valid customer ID is required' });
    }

    const [customers] = await db.query(
      'SELECT first_name, last_name FROM users WHERE id = ?',
      [id]
    );

    if (customers.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json({
      first_name: customers[0].first_name,
      last_name: customers[0].last_name
    });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error fetching rating info:`, {
      message: error.message,
      customerId: req.params.id
    });

    res.status(500).json({
      error: 'Failed to fetch customer information',
      errorId
    });
  }
};

/**
 * Save customer rating
 */
const saveRating = async (req, res) => {
  try {
    const { rating } = req.body;
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'Valid customer ID is required' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Insert new feedback row
    const [result] = await db.query(
      'INSERT INTO feedback (user_id, rating) VALUES (?, ?)',
      [id, rating]
    );

    const feedbackId = result.insertId;

    res.json({
      message: 'Rating saved',
      feedbackId
    });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error saving rating:`, {
      message: error.message,
      customerId: req.params.id
    });

    res.status(500).json({
      error: 'Failed to save rating',
      errorId
    });
  }
};

/**
 * Fetches signature for a customer or specific waiver
 */
const getSignature = async (req, res) => {
  try {
    const { customerId, waiverId } = req.query;

    if (!customerId && !waiverId) {
      return res.status(400).json({
        error: "Customer ID or Waiver ID is required",
      });
    }

    let query, params;
    
    if (waiverId) {
      // Get signature from specific waiver
      query = "SELECT signature_image FROM waivers WHERE id = ? AND signature_image IS NOT NULL LIMIT 1";
      params = [waiverId];
    } else {
      // Get the most recent waiver with a signature for customer
      query = "SELECT signature_image FROM waivers WHERE user_id = ? AND signature_image IS NOT NULL ORDER BY created_at DESC LIMIT 1";
      params = [customerId];
    }

    const [waivers] = await db.query(query, params);

    if (waivers.length === 0) {
      return res.status(404).json({
        error: "No signature found",
      });
    }

    res.json({
      success: true,
      signature: waivers[0].signature_image,
    });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error fetching signature:`, {
      message: error.message,
      customerId: req.query.customerId,
      waiverId: req.query.waiverId,
    });

    res.status(500).json({
      error: "Failed to fetch signature",
      errorId,
    });
  }
};

/**
 * Gets the latest (most recent) waiver for a customer by phone number
 * Returns complete waiver data with signer snapshot and minors for existing customers
 */
const getLatestWaiver = async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({
        error: "Phone number is required",
      });
    }

    // Get user by phone
    const [users] = await db.query(
      `SELECT id, country_code FROM users WHERE cell_phone = ? LIMIT 1`,
      [phone]
    );

    if (users.length === 0) {
      return res.json({
        message: "No customer found",
        waiverId: null
      });
    }

    const userId = users[0].id;
    const countryCode = users[0].country_code || "+1";

    // Get the most recent waiver with ALL signer snapshot fields, minors_snapshot, and signature
    const [waivers] = await db.query(
      `SELECT id, user_id, signed_at, created_at,
              signer_name, signer_email, signer_address, signer_city, 
              signer_province, signer_postal, signer_dob,
              minors_snapshot, signature_image
       FROM waivers 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [userId]
    );

    if (waivers.length === 0) {
      return res.json({
        message: "No waivers found",
        waiverId: null
      });
    }

    const waiver = waivers[0];

    // Parse signer name into first_name and last_name
    const nameParts = (waiver.signer_name || "").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Parse minors_snapshot JSON
    let minors = [];
    if (waiver.minors_snapshot) {
      try {
        minors = JSON.parse(waiver.minors_snapshot);
      } catch (e) {
        console.warn("Failed to parse minors_snapshot:", e);
        minors = [];
      }
    }

    // Build customer data object from waiver signer snapshot
    const customerData = {
      id: waiver.user_id,
      first_name: firstName,
      last_name: lastName,
      email: waiver.signer_email || "",
      dob: waiver.signer_dob || "",
      address: waiver.signer_address || "",
      city: waiver.signer_city || "",
      province: waiver.signer_province || "",
      postal_code: waiver.signer_postal || "",
      cell_phone: phone,
      country_code: countryCode,
    };

    res.json({
      waiverId: waiver.id,
      signedAt: waiver.signed_at,
      createdAt: waiver.created_at,
      customer: customerData,
      minors: minors,
      signature: waiver.signature_image || null
    });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error fetching latest waiver:`, {
      message: error.message,
      phone: req.query.phone,
    });

    res.status(500).json({
      error: "Failed to fetch latest waiver",
      errorId,
    });
  }
};

module.exports = {
  createWaiver,
  updateCustomer,
  saveSignature,
  updateWaiverTimestamp,
  acceptRules,
  getAllCustomers,
  verifyWaiver,
  getWaiverDetails,
  getUserHistory,
  getAllWaivers,
  deleteWaiver,
  updateWaiverStatus,
  getRatingInfo,
  saveRating,
  getSignature,
  getLatestWaiver,
};
