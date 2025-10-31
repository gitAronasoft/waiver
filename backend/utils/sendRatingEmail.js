// utils/sendRatingEmail.js
const nodemailer = require("nodemailer");

async function sendRatingEmail(customer) {
  const ratingLink = `${process.env.REACT_LINK_BASE || "http://localhost:3000"}/rate/${customer.ratingToken}`;

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

  const emailBase = process.env.REACT_LINK_BASE || "http://localhost:3000";
  
  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>How Was Your Visit? We'd Love to Know!</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; margin:0; padding:0; line-height: 1.6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.07); overflow: hidden; max-width: 100%;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #002244 0%, #003366 100%); color: white; padding: 40px 30px; text-align: center;">
                  <img src="${emailBase}/assets/img/logo.png" alt="Skate & Play Logo" style="max-width: 180px; height: auto; margin-bottom: 15px;" />
                  <h2 style="margin: 15px 0 0 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">We'd Love Your Feedback! 🌟</h2>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 35px;">
                  <p style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">
                    Hi <strong>${customer.first_name}</strong>! 👋
                  </p>
                  <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">
                    Thank you so much for visiting <strong>Skate & Play</strong>${customer.visited_exit ? ' and EXIT Lounge' : ''}! We hope you had an amazing time rolling into fun with us.
                  </p>
                  <p style="font-size: 16px; color: #374151; margin: 0 0 25px 0;">
                    We're always working to make every visit unforgettable, and your feedback helps us get better. Would you mind taking just a moment to share how your experience was?
                  </p>
                  
                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 10px 0 30px 0;">
                        <a href="${ratingLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-size: 17px; font-weight: 600; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                          ⭐ Rate Your Visit
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="font-size: 15px; color: #6b7280; margin: 0 0 15px 0; text-align: center;">
                    It only takes a few seconds and means the world to us!
                  </p>
                  
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                  
                  <p style="font-size: 16px; color: #374151; margin: 0 0 5px 0;">
                    Thanks again for being part of the fun! 🎉
                  </p>
                  <p style="font-size: 16px; color: #374151; margin: 0 0 25px 0;">
                    We can't wait to see you roll back in soon!
                  </p>
                  
                  <p style="font-size: 15px; color: #374151; margin: 0;">
                    Warm regards,<br/>
                    <strong style="color: #002244;">The Skate & Play Team</strong>
                  </p>
                  
                  <p style="font-size: 14px; color: #9ca3af; margin: 20px 0 0 0;">
                    📧 <a href="mailto:info@skate-play.com" style="color: #3b82f6; text-decoration: none;">info@skate-play.com</a><br/>
                    🌐 <a href="https://www.skate-play.com" style="color: #3b82f6; text-decoration: none;">www.skate-play.com</a>
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="text-align: center; background-color: #f9fafb; padding: 20px 30px; font-size: 13px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 5px 0;">&copy; 2025 Skate & Play. All rights reserved.</p>
                  <p style="margin: 0; font-size: 12px;">You're receiving this because you recently visited us. Thanks for being awesome!</p>
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
    from: `"Skate & Play" <${process.env.SMTP_USER}>`,
    to: customer.email,
    subject: "🌟 How Was Your Visit? We'd Love Your Feedback!",
    html: htmlTemplate,
  });

  console.log(`✅ Rating email sent to ${customer.email}`);
}

module.exports = sendRatingEmail;
