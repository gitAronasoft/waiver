// utils/sendRatingEmail.js
const nodemailer = require("nodemailer");

async function sendRatingEmail(customer) {
  const ratingLink = `${process.env.REACT_LINK_BASE || "http://localhost:3000"}/rate/${customer.id}`;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

  const emailBase = process.env.REACT_LINK_BASE || "http://localhost:3000";
  
  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>How Was Your Visit?</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; margin:0; padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #fff; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
              <tr>
                <td style="background-color: #002244; color: white; padding: 30px 20px; text-align: center;">
                  <img src="${emailBase}/assets/img/SKATE_AND_PLAY_V08_Full_Transparency (2) 1.png" alt="Skate & Play Logo" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
                  <h2 style="margin: 10px 0 0 0;">We'd Love Your Feedback!</h2>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px;">
                  <p>Hi ${customer.first_name} ${customer.last_name},</p>
                  <p>Thanks again for visiting Skate & Play (and EXIT Lounge if you stopped by)! We'd love to know how your experience was.</p>
                  <p style="text-align: center; margin: 30px 0;">
                    <a href="${ratingLink}" target="_blank" style="background-color: #007bff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">⭐ Rate Your Visit</a>
                  </p>
                  <p>It only takes a moment and really helps us improve.</p>
                  <p>Thanks for being part of the fun — we hope to see you again soon!</p>
                  <p style="margin-top: 30px;">Cheers,<br/><strong>The Skate & Play Team</strong></p>
                  <p style="color: #666; font-size: 14px;">info@skate-play.com | www.skate-play.com</p>
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
    from: process.env.EMAIL_USER,
    to: customer.email,
    subject: "How Was Your Visit? ⭐",
    html: htmlTemplate,
  });

  console.log(`✅ Rating email sent to ${customer.email}`);
}

module.exports = sendRatingEmail;
