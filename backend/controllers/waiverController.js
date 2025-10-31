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
 * - CREATE INDEX idx_minors_user_id ON minors(user_id)
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
    
    // Handle minors for this user
    if (existingUsers.length > 0) {
      // For EXISTING users: deactivate old minors before inserting new ones
      // This prevents duplicate/obsolete minors from accumulating
      await connection.query(
        "UPDATE minors SET status = 0 WHERE user_id = ?",
        [userId]
      );
      console.log(`✅ Deactivated old minors for existing user ${userId}`);
    }
    
    // Insert new minors for this user (both new and existing users)
    if (minors && minors.length > 0) {
      const minorValues = minors.map((minor) => [
        userId,
        minor.first_name,
        minor.last_name,
        minor.dob,
        1, // status = 1 (active)
      ]);

      await connection.query(
        "INSERT INTO minors (user_id, first_name, last_name, dob, status) VALUES ?",
        [minorValues],
      );
      
      console.log(`✅ Added ${minors.length} minor(s) for user ${userId}`);
    }

    // Create waiver entry
    const [waiverResult] = await connection.query(
      "INSERT INTO waivers (user_id, signed_at, completed, verified_by_staff, staff_id) VALUES (?, NULL, 0, 0, 0)",
      [userId],
    );

    const waiverId = waiverResult.insertId;
    console.log(`✅ Created waiver (ID: ${waiverId}) for user ${userId}`)

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

    res.status(201).json({
      success: true,
      message: send_otp
        ? "Waiver created and OTP sent successfully"
        : "Waiver created successfully",
      userId,
      waiverId,
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
 * Gets customer information by phone number
 * Includes associated minors
 */
const getCustomerInfo = async (req, res) => {
  try {
    const { phone } = req.query;

    // Validate phone parameter
    if (!phone) {
      return res.status(400).json({
        error: "Phone number is required",
      });
    }

    // Order by created_at DESC to get the most recent customer record
    // This ensures that when the same phone number is used for multiple signups,
    // we return the newest customer data instead of the oldest
    const [customers] = await db.query(
      "SELECT * FROM users WHERE cell_phone = ? ORDER BY created_at DESC LIMIT 1",
      [phone],
    );

    if (customers.length === 0) {
      return res.status(404).json({
        error: "Customer not found",
      });
    }

    const customer = customers[0];

    const [minors] = await db.query(
      "SELECT * FROM minors WHERE user_id = ? AND status = 1",
      [customer.id],
    );

    res.json({ customer, minors });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error fetching customer info:`, {
      message: error.message,
      phone: req.query.phone,
    });

    res.status(500).json({
      error: "Failed to fetch customer information",
      errorId,
    });
  }
};

/**
 * Gets customer information by customer ID
 * Includes associated minors
 */
const getCustomerInfoById = async (req, res) => {
  try {
    const { customerId } = req.query;

    // Validate customerId parameter
    if (!customerId) {
      return res.status(400).json({
        error: "Customer ID is required",
      });
    }

    const [customers] = await db.query(
      "SELECT * FROM users WHERE id = ? LIMIT 1",
      [customerId],
    );

    if (customers.length === 0) {
      return res.status(404).json({
        error: "Customer not found",
      });
    }

    const customer = customers[0];

    // Get only ACTIVE minors for this customer (status = 1)
    // This ensures we show current waiver minors, not historical ones
    const [minors] = await db.query(
      "SELECT * FROM minors WHERE user_id = ? AND status = 1",
      [customer.id],
    );

    res.json({ customer, minors });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error fetching customer info by ID:`, {
      message: error.message,
      customerId: req.query.customerId,
    });

    res.status(500).json({
      error: "Failed to fetch customer information",
      errorId,
    });
  }
};

/**
 * Gets waiver snapshot data by waiver ID
 * Returns historical customer and minor data as it was when the waiver was signed
 */
const getWaiverSnapshot = async (req, res) => {
  try {
    const { waiverId } = req.query;

    // Validate waiverId parameter
    if (!waiverId) {
      return res.status(400).json({
        error: "Waiver ID is required",
      });
    }

    // Fetch waiver with snapshot data
    const [waivers] = await db.query(
      `SELECT 
        id,
        user_id,
        signer_name,
        signer_email,
        signer_address,
        signer_city,
        signer_province,
        signer_postal,
        signer_dob,
        minors_snapshot,
        signed_at,
        created_at,
        rules_accepted,
        completed
      FROM waivers 
      WHERE id = ? LIMIT 1`,
      [waiverId]
    );

    if (waivers.length === 0) {
      return res.status(404).json({
        error: "Waiver not found",
      });
    }

    const waiver = waivers[0];
    
    // Check if this is a pending waiver (no signature/snapshot yet)
    const isPending = !waiver.signed_at;

    // Get current user data for phone and other fields not in snapshot
    const [users] = await db.query(
      "SELECT * FROM users WHERE id = ?",
      [waiver.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        error: "User not found for this waiver",
      });
    }

    const user = users[0];

    // For pending waivers, use data from users table instead of snapshot
    let first_name, last_name, customer, minors;
    
    if (isPending) {
      // Pending waiver - use current user data
      first_name = user.first_name;
      last_name = user.last_name;
      
      customer = {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        dob: user.dob,
        address: user.address,
        city: user.city,
        province: user.province,
        postal_code: user.postal_code,
        country_code: user.country_code,
        cell_phone: user.cell_phone,
        home_phone: user.home_phone,
        work_phone: user.work_phone,
        can_email: user.can_email
      };
      
      // Get active minors from minors table
      const [minorsData] = await db.query(
        "SELECT * FROM minors WHERE user_id = ? AND status = 1",
        [user.id]
      );
      minors = minorsData;
      
    } else {
      // Completed waiver - use snapshot data
      const nameParts = waiver.signer_name ? waiver.signer_name.split(' ') : ['', ''];
      first_name = nameParts[0] || '';
      last_name = nameParts.slice(1).join(' ') || '';

      // Build customer object from snapshot data
      customer = {
        id: waiver.user_id,
        first_name,
        last_name,
        email: waiver.signer_email,
        dob: waiver.signer_dob,
        address: waiver.signer_address,
        city: waiver.signer_city,
        province: waiver.signer_province,
        postal_code: waiver.signer_postal,
        cell_phone: user.cell_phone,
        country_code: user.country_code,
        home_phone: user.home_phone,
        work_phone: user.work_phone,
        can_email: null,
      };

      // Parse minors from snapshot JSON
      if (waiver.minors_snapshot) {
        try {
          const parsedMinors = JSON.parse(waiver.minors_snapshot);
          minors = parsedMinors.map((m, index) => ({
            id: `snapshot_${index}`, // Temporary ID for display purposes
            first_name: m.first_name,
            last_name: m.last_name,
            dob: m.dob,
            status: 1,
            checked: true,
            isSnapshot: true, // Flag to indicate this is historical data
          }));
        } catch (parseError) {
          console.error(`Error parsing minors_snapshot for waiver ${waiverId}:`, parseError);
          minors = [];
        }
      } else {
        minors = [];
      }
    }

    res.json({ 
      customer, 
      minors,
      waiver: {
        rules_accepted: waiver.rules_accepted,
        completed: waiver.completed
      }
    });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error fetching waiver snapshot:`, {
      message: error.message,
      waiverId: req.query.waiverId,
    });

    res.status(500).json({
      error: "Failed to fetch waiver snapshot",
      errorId,
    });
  }
};

/**
 * Updates customer information and associated minors
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
      minors,
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

    // Update minors if provided
    if (minors && minors.length > 0) {
      for (const minor of minors) {
        if (minor.isNew) {
          await db.query(
            "INSERT INTO minors (user_id, first_name, last_name, dob, status) VALUES (?, ?, ?, ?, ?)",
            [
              id,
              minor.first_name,
              minor.last_name,
              minor.dob,
              minor.checked ? 1 : 0,
            ],
          );
        } else {
          await db.query(
            "UPDATE minors SET first_name = ?, last_name = ?, dob = ?, status = ? WHERE id = ?",
            [
              minor.first_name,
              minor.last_name,
              minor.dob,
              minor.checked ? 1 : 0,
              minor.id,
            ],
          );
        }
      }
    }

    // Minors are already linked to customer via user_id, no junction table needed
    console.log(`✅ Minors updated for customer ${id}`);

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
 * Saves customer signature to waiver form and updates minors
 */
const saveSignature = async (req, res) => {
  try {
    const {
      id,
      phone,
      signature,
      fullName,
      date,
      minors,
      subscribed,
      consented,
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

    // Handle minors: add, update, and remove
    // Get existing minors from database
    const [existingMinors] = await db.query(
      "SELECT id FROM minors WHERE user_id = ?",
      [id],
    );
    
    const existingMinorIds = existingMinors.map(m => m.id);
    const submittedMinorIds = [];

    // Process submitted minors (add new or update existing)
    if (minors && minors.length > 0) {
      for (const minor of minors) {
        if (minor.isNew) {
          // Insert new minor - only if all required fields are present
          if (minor.first_name && minor.last_name && minor.dob) {
            await db.query(
              "INSERT INTO minors (user_id, first_name, last_name, dob, status) VALUES (?, ?, ?, ?, ?)",
              [
                id,
                minor.first_name,
                minor.last_name,
                minor.dob,
                1, // Always set status to 1 (active) for new minors
              ],
            );
            console.log(`✅ Added new minor ${minor.first_name} ${minor.last_name} for user ${id}`);
          }
        } else if (minor.id) {
          // Update existing minor
          submittedMinorIds.push(minor.id);
          await db.query(
            "UPDATE minors SET first_name = ?, last_name = ?, dob = ?, status = ? WHERE id = ?",
            [
              minor.first_name,
              minor.last_name,
              minor.dob,
              minor.checked ? 1 : 0,
              minor.id,
            ],
          );
        }
      }
    }

    // Delete minors that were removed (exist in DB but not in submitted list)
    const minorsToDelete = existingMinorIds.filter(id => !submittedMinorIds.includes(id));
    if (minorsToDelete.length > 0) {
      await db.query(
        "DELETE FROM minors WHERE id IN (?)",
        [minorsToDelete],
      );
      console.log(`🗑️ Deleted ${minorsToDelete.length} minor(s) from user ${id}`);
    }

    // Build snapshot data using submitted minors that have all required fields
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

    // Update the existing waiver (created during user registration) with signature and snapshot
    // Find the most recent unsigned waiver for this user
    const [existingWaivers] = await db.query(
      "SELECT id FROM waivers WHERE user_id = ? AND signed_at IS NULL ORDER BY created_at DESC LIMIT 1",
      [id],
    );

    let waiverId;
    
    if (existingWaivers.length > 0) {
      // Update existing waiver with signature and snapshot data
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
      console.log(`✅ Updated waiver ${waiverId} with signature and snapshot for user ${id}`);
    } else {
      // Fallback: Create new waiver if none exists (shouldn't happen in normal flow)
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
      console.log(`✅ Created new waiver ${waiverId} with signature and snapshot for user ${id}`);
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
 * Gets customer information and associated minors by phone number
 * Used by signature page to display customer data and minors
 */
const getMinors = async (req, res) => {
  try {
    const { phone } = req.query;

    // Validate phone parameter
    if (!phone) {
      return res.status(400).json({
        error: "Phone number is required",
      });
    }

    // Fetch complete customer data
    const [customers] = await db.query(
      "SELECT * FROM users WHERE cell_phone = ? ORDER BY created_at DESC LIMIT 1",
      [phone],
    );

    if (customers.length === 0) {
      return res.status(404).json({ 
        error: "Customer not found",
        minors: [] 
      });
    }

    const customer = customers[0];

    // Fetch associated active minors (only from current waiver)
    const [minors] = await db.query(
      "SELECT * FROM minors WHERE user_id = ? AND status = 1",
      [customer.id],
    );

    // Return customer data with minors (matching what signature page expects)
    res.json({ 
      ...customer,
      minors 
    });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error fetching customer and minors:`, {
      message: error.message,
      phone: req.query.phone,
    });

    res.status(500).json({
      error: "Failed to fetch customer information",
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

    // Fetch current active minors (not from snapshot, but current state)
    const [currentMinors] = await db.query(
      `SELECT id, first_name, last_name, dob, status FROM minors WHERE user_id = ?`,
      [id]
    );

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

    const [rows] = await db.query(`
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
      WHERE w.signed_at IS NOT NULL
      ORDER BY w.signed_at DESC
    `);

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

    res.json(waivers);
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
 * Gets dashboard data for existing customer showing all their visits (waivers)
 * Returns waivers for the phone number, with customer and minor data from snapshots
 */
const getCustomerDashboard = async (req, res) => {
  try {
    const { phone } = req.query;

    // Validate phone parameter
    if (!phone) {
      return res.status(400).json({
        error: "Phone number is required",
      });
    }

    // Get all users with this phone number to find their waivers
    const [users] = await db.query(
      `SELECT id, status FROM users WHERE cell_phone = ?`,
      [phone],
    );

    if (users.length === 0) {
      return res.json({ 
        message: "No customer records found for this phone number",
        waivers: [],
        isVerified: false
      });
    }

    // Check if any user with this phone has verified via OTP
    const hasVerifiedUser = users.some(u => u.status === 1);
    const userIds = users.map(u => u.id);

    // Import timezone utility
    const { convertToEST } = require("../utils/time");

    // Fetch all waivers for these users with snapshot data
    const [waivers] = await db.query(
      `SELECT 
        w.id as waiver_id,
        w.user_id,
        w.signed_at,
        w.signature_image,
        w.rules_accepted,
        w.completed,
        w.verified_by_staff,
        w.created_at,
        w.signer_name,
        w.signer_email,
        w.signer_dob,
        w.signer_address,
        w.signer_city,
        w.signer_province,
        w.signer_postal,
        w.minors_snapshot,
        CASE 
          WHEN w.verified_by_staff > 0 THEN s.name
          ELSE NULL
        END as verified_by_name
      FROM waivers w
      LEFT JOIN staff s ON w.verified_by_staff = s.id
      WHERE w.user_id IN (?) ORDER BY w.created_at DESC`,
      [userIds],
    );

    // If user hasn't verified OTP, show only the most recent waiver
    let filteredWaivers = waivers;
    if (!hasVerifiedUser && waivers.length > 0) {
      filteredWaivers = [waivers[0]];
      console.log(`⚠️ User has not verified OTP - showing only latest waiver for phone: ${phone}`);
    } else {
      console.log(`✅ User has verified OTP - showing all ${waivers.length} waivers for phone: ${phone}`);
    }

    // Parse each waiver's snapshot data
    const waiversWithData = filteredWaivers.map(waiver => {
      // Parse minors from snapshot
      let minors = [];
      if (waiver.minors_snapshot) {
        try {
          minors = JSON.parse(waiver.minors_snapshot);
        } catch (parseError) {
          console.error(`Error parsing minors_snapshot for waiver ${waiver.waiver_id}:`, parseError);
        }
      }

      // Extract first_name and last_name from signer_name
      const nameParts = waiver.signer_name ? waiver.signer_name.split(' ') : ['', ''];
      const first_name = nameParts[0] || '';
      const last_name = nameParts.slice(1).join(' ') || '';

      return {
        waiver_id: waiver.waiver_id,
        user_id: waiver.user_id,
        first_name,
        last_name,
        email: waiver.signer_email,
        dob: waiver.signer_dob,
        address: waiver.signer_address,
        city: waiver.signer_city,
        province: waiver.signer_province,
        postal_code: waiver.signer_postal,
        cell_phone: phone,
        signed_at: waiver.signed_at ? convertToEST(waiver.signed_at, "MMM DD, YYYY [at] hh:mm A") : null,
        signature_image: waiver.signature_image,
        rules_accepted: waiver.rules_accepted,
        completed: waiver.completed,
        verified_by_staff: waiver.verified_by_staff,
        verified_by_name: waiver.verified_by_name,
        created_at: waiver.created_at,
        minors: minors
      };
    });

    res.json({
      success: true,
      phone: phone,
      totalWaivers: filteredWaivers.length,
      waivers: waiversWithData,
      isVerified: hasVerifiedUser
    });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Error fetching customer dashboard:`, {
      message: error.message,
      phone: req.query.phone,
    });

    res.status(500).json({
      error: "Failed to fetch customer dashboard",
      errorId,
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

module.exports = {
  createWaiver,
  getCustomerInfo,
  getCustomerInfoById,
  getWaiverSnapshot,
  updateCustomer,
  saveSignature,
  acceptRules,
  getMinors,
  getAllCustomers,
  verifyWaiver,
  getWaiverDetails,
  getUserHistory,
  getAllWaivers,
  deleteWaiver,
  updateWaiverStatus,
  getRatingInfo,
  saveRating,
  getCustomerDashboard,
  getSignature,
};
