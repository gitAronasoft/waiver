const cron = require("node-cron");
const db = require("./config/database");
const { randomUUID } = require('crypto');
const sendRatingEmail = require("./utils/sendRatingEmail");
const sendRatingSMS = require("./utils/sendRatingSMS");

// RATING EMAIL/SMS SCHEDULER
// Runs every hour at 0 minutes to check for waivers that need rating messages
// Sends rating request 3 hours after waiver is signed

cron.schedule("0 * * * *", async () => {
  console.log("🔍 Checking for waivers that need rating messages...");

  try {
    const [waivers] = await db.query(`
      SELECT w.id AS waiver_id, w.*, u.* 
      FROM waivers w
      JOIN users u ON w.user_id = u.id
      WHERE w.signed_at IS NOT NULL
      AND TIMESTAMPDIFF(HOUR, w.signed_at, UTC_TIMESTAMP()) >= 3
      AND w.completed = 1
      AND (w.rating_email_sent = 0 OR w.rating_sms_sent = 0)
    `);

    console.log(`Found ${waivers.length} waivers pending rating messages`);

    if (waivers.length === 0) {
      console.log("✅ No waivers pending for rating messages.");
      return;
    }

    for (let waiver of waivers) {
      // Generate or get existing rating token for this waiver
      let token;
      try {
        // Check if token already exists for this waiver
        const [existingTokens] = await db.query(
          'SELECT token FROM rating_tokens WHERE waiver_id = ?',
          [waiver.waiver_id]
        );

        if (existingTokens.length > 0) {
          token = existingTokens[0].token;
          console.log(`Using existing token for waiver ID ${waiver.waiver_id}`);
        } else {
          // Generate new token
          token = randomUUID();
          await db.query(
            'INSERT INTO rating_tokens (waiver_id, token, used) VALUES (?, ?, 0)',
            [waiver.waiver_id, token]
          );
          console.log(`Generated new token for waiver ID ${waiver.waiver_id}`);
        }
      } catch (err) {
        console.error(`❌ Token generation failed for waiver ID ${waiver.waiver_id}:`, err.message);
        continue;
      }

      // Add token to waiver object for email/SMS functions
      waiver.ratingToken = token;

      // 📧 EMAIL SENDING
      if (!waiver.rating_email_sent) {
        try {
          if (waiver.email && waiver.email.trim() !== "") {
            await sendRatingEmail(waiver);
            await db.query(
              `UPDATE waivers SET rating_email_sent = 1 WHERE id = ?`,
              [waiver.waiver_id]
            );
            console.log(`📧 Email sent to ${waiver.email}`);
          } else {
            await db.query(
              `UPDATE waivers SET rating_email_sent = 2 WHERE id = ?`,
              [waiver.waiver_id]
            );
            console.warn(
              `⚠️ No valid email for waiver ID ${waiver.waiver_id}, marked as failed.`
            );
          }
        } catch (err) {
          console.error(
            `❌ Email failed for waiver ID ${waiver.waiver_id}:`,
            err.message
          );
          await db.query(
            `UPDATE waivers SET rating_email_sent = 2 WHERE id = ?`,
            [waiver.waiver_id]
          );
        }
      }

      // 📲 SMS SENDING
      if (!waiver.rating_sms_sent) {
        try {
          if (waiver.cell_phone && waiver.cell_phone.trim() !== "") {
            await sendRatingSMS(waiver);
            await db.query(
              `UPDATE waivers SET rating_sms_sent = 1 WHERE id = ?`,
              [waiver.waiver_id]
            );
            console.log(
              `📲 SMS sent to ${waiver.cell_phone} (waiver ID ${waiver.waiver_id})`
            );
          } else {
            await db.query(
              `UPDATE waivers SET rating_sms_sent = 2 WHERE id = ?`,
              [waiver.waiver_id]
            );
            console.warn(
              `⚠️ No valid phone for waiver ID ${waiver.waiver_id}, marked as failed.`
            );
          }
        } catch (err) {
          console.error(
            `❌ SMS failed for waiver ID ${waiver.waiver_id}:`,
            err.message
          );
          await db.query(
            `UPDATE waivers SET rating_sms_sent = 2 WHERE id = ?`,
            [waiver.waiver_id]
          );
        }
      }
    }
  } catch (err) {
    console.error("🚨 Rating scheduler query failed:", err);
  }
});

console.log("⏰ Rating email/SMS scheduler initialized and running - checks every hour for waivers needing rating requests");
