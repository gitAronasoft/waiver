// utils/sendRatingSMS.js
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendRatingSMS(customer) {
 const ratingLink = `${process.env.REACT_LINK_BASE || 'http://localhost:3000'}/rate/${customer.ratingToken}`;


  let formattedPhone = customer.cell_phone;
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = `+1${customer.cell_phone}`;
  }

  try {
    await client.messages.create({
      body: `Hi ${customer.first_name}! Thanks for visiting Skate & Play 🎉 We'd love your feedback. Tap here to rate your visit: ${ratingLink} ⭐`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });
    console.log(`✅ Rating SMS sent to ${formattedPhone}`);
  } catch (err) {
    console.error('❌ Twilio rating SMS error:', err.message);
  }
}

module.exports = sendRatingSMS;
