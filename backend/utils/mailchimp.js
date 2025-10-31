const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config();

const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
const LIST_ID = process.env.MAILCHIMP_LIST_ID;
const DATACENTER = process.env.MAILCHIMP_DC;

/**
 * Generate MD5 hash of email for Mailchimp subscriber ID
 * @param {string} email
 * @returns {string} MD5 hash of lowercase email
 */
const getSubscriberHash = (email) => {
  return crypto
    .createHash("md5")
    .update(email.toLowerCase())
    .digest("hex");
};

/**
 * Check if subscriber already exists in Mailchimp
 * @param {string} email
 * @returns {boolean} true if subscriber exists
 */
const checkSubscriberExists = async (email) => {
  try {
    const subscriberHash = getSubscriberHash(email);
    await axios.get(
      `https://${DATACENTER}.api.mailchimp.com/3.0/lists/${LIST_ID}/members/${subscriberHash}`,
      {
        auth: {
          username: "anystring",
          password: MAILCHIMP_API_KEY,
        },
      }
    );
    return true; // Subscriber exists
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return false; // Subscriber doesn't exist
    }
    // For other errors, log and return true to avoid duplicate attempts
    console.error("Error checking Mailchimp subscriber:", err.message);
    return true;
  }
};

/**
 * Add a user to Mailchimp list with additional fields
 * Only subscribes if user doesn't already exist in the list
 * @param {string} email
 * @param {string} phone
 * @param {string} first_name
 * @param {string} last_name
 * @param {string} dob
 * @param {string} city
 * @param {string} address
 */
const addToMailchimp = async (
  email,
  phone,
  first_name,
  last_name,
  dob,
  city,
  address,
) => {
  try {
    // Check if subscriber already exists
    const exists = await checkSubscriberExists(email);
    
    if (exists) {
      console.log(`ℹ️ Mailchimp: ${email} already subscribed, skipping`);
      return; // Skip gracefully, no error
    }

    // Subscribe new user
    const response = await axios.post(
      `https://${DATACENTER}.api.mailchimp.com/3.0/lists/${LIST_ID}/members`,
      {
        email_address: email,
        status: "subscribed",
        merge_fields: {
          PHONE: phone,
          FNAME: first_name,
          LNAME: last_name,
          DOB: dob,
          CITY: city,
          ADDRESS: address,
        },
        tags: ["waiver-visit", new Date().toISOString().split("T")[0]],
      },
      {
        auth: {
          username: "anystring",
          password: MAILCHIMP_API_KEY,
        },
      },
    );

    console.log("✅ Mailchimp: New subscriber added:", response.data.id);
  } catch (err) {
    if (err.response && err.response.status === 400) {
      console.log("⚠️ Mailchimp Error:", err.response.data.detail);
    } else {
      console.error("⚠️ Mailchimp Sync Failed:", err.message);
    }
    // Don't throw error - let the app continue even if Mailchimp fails
  }
};

module.exports = addToMailchimp;
