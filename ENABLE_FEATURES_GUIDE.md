# 🎯 Enable Optional Features Guide

This guide explains how to enable the optional automated features in your Skate & Play Waiver System.

---

## 📧 Automated Rating Emails & SMS

After customers complete their waiver, the system can automatically send them a rating request via email and SMS **3 hours later**.

### Current Status
✅ Code is ready and tested  
⚠️ Disabled by default (requires API credentials)

### How to Enable

#### Step 1: Configure Environment Variables
Make sure your `backend/.env` file has all these values:

```env
# Twilio for SMS
TWILIO_ACCOUNT_SID=ACxxxxx...
TWILIO_AUTH_TOKEN=xxxxx...
TWILIO_MESSAGING_SERVICE_SID=MGxxxxx...

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=yourapp@gmail.com
SMTP_PASS=your_app_password

# Your website URL (for rating links)
REACT_LINK_BASE=https://yourdomain.com
```

#### Step 2: Enable the Scheduler in Backend

Edit `backend/server.js`:

**Find this line (around line 13):**
```javascript
// Rating Email/SMS Scheduler - Uncomment when credentials are ready
// require('./ratingEmailScheduler');
```

**Change to:**
```javascript
// Rating Email/SMS Scheduler
require('./ratingEmailScheduler');
```

#### Step 3: Enable Email Sending

Edit `backend/ratingEmailScheduler.js`:

**Find this section (lines 32-61):**
```javascript
// 📧 EMAIL SENDING - Uncomment when SMTP credentials are added
// if (!waiver.rating_email_sent) {
//   try {
//     if (waiver.email && waiver.email.trim() !== "") {
//       await sendRatingEmail(waiver);
```

**Remove the `//` comments to enable** (keep the code, just remove comment markers)

#### Step 4: Enable SMS Sending

In the same file `backend/ratingEmailScheduler.js`:

**Find this section (lines 63-90):**
```javascript
// 📲 SMS SENDING - Uncomment when Twilio credentials are added
// if (!waiver.rating_sms_sent) {
//   try {
//     if (waiver.cell_phone && waiver.cell_phone.trim() !== "") {
//       await sendRatingSMS(waiver);
```

**Remove the `//` comments to enable**

#### Step 5: Restart Backend
```bash
pm2 restart waiver-backend
# or
sudo systemctl restart waiver-backend
```

### How It Works
1. Customer completes waiver at 2:00 PM
2. System marks the completion time
3. At 5:00 PM (3 hours later), the scheduler runs
4. System sends email AND/OR SMS with rating link
5. Customer clicks link → rates their visit
6. Rating is saved in database

### Monitoring
Check if it's working:
```bash
pm2 logs waiver-backend
```

You should see:
```
🔍 Checking for waivers that need rating messages...
Found X waivers pending rating messages
📧 Email sent to customer@email.com
📲 SMS sent to +1234567890
```

---

## 📮 Mailchimp Auto-Subscribe

Automatically add customers to your Mailchimp email list when they sign a waiver.

### Current Status
✅ Code is ready and tested  
⚠️ Disabled by default (requires Mailchimp API key)

### How to Enable

#### Step 1: Set Up Mailchimp
1. Create a Mailchimp account: https://mailchimp.com
2. Create an Audience
3. Add custom merge fields:
   - PHONE (Phone Number)
   - FNAME (First Name)
   - LNAME (Last Name)
   - DOB (Date of Birth - text field)
   - CITY (City - text field)
   - ADDRESS (Address - text field)

#### Step 2: Get Mailchimp Credentials

**API Key:**
1. Account → Extras → API keys
2. Create A Key → Copy it

**List ID:**
1. Audience → Settings → Audience name and defaults
2. Find "Audience ID" → Copy it

**Data Center:**
- Look at your API key ending: `xxxxx-us1` → DC is `us1`

#### Step 3: Add to Environment Variables

Edit `backend/.env`:
```env
MAILCHIMP_API_KEY=xxxxxxxxxxxxxxxx-us1
MAILCHIMP_LIST_ID=xxxxxxxxxx
MAILCHIMP_DC=us1
```

#### Step 4: Enable in Code

Edit `backend/controllers/waiverController.js`:

**Find line 2:**
```javascript
// const addToMailchimp = require('../utils/mailchimp');
```

**Change to:**
```javascript
const addToMailchimp = require('../utils/mailchimp');
```

**Find lines 375-391 (around there):**
```javascript
// MAILCHIMP INTEGRATION - Uncomment when credentials are added
// Get customer info for Mailchimp
//   try {
//     const [customerInfo] = await db.query(
//       'SELECT * FROM customers WHERE id = ?',
//       [userId]
//     );
//     await addToMailchimp(
//       customerInfo[0].email,
//       customerInfo[0].cell_phone,
//       customerInfo[0].first_name,
//       customerInfo[0].last_name,
//       customerInfo[0].birth_date,
//       customerInfo[0].city,
//       customerInfo[0].address
//     );
//   } catch (mailchimpError) {
//     console.error('Mailchimp integration error:', mailchimpError.message);
//   }
```

**Remove the `//` comments** (uncomment the entire block)

#### Step 5: Restart Backend
```bash
pm2 restart waiver-backend
```

### How It Works
1. Customer completes waiver form
2. System automatically adds them to Mailchimp
3. Customer is tagged with "waiver-visit" and today's date
4. You can now send marketing emails via Mailchimp

### Testing
Complete a test waiver, then check:
1. Mailchimp dashboard → Audience → View contacts
2. Backend logs: `pm2 logs waiver-backend`

You should see:
```
✅ Mailchimp success: [member_id]
```

---

## 🔄 Quick Enable Checklist

### For Email/SMS Rating System:
- [ ] Add Twilio credentials to `.env`
- [ ] Add SMTP credentials to `.env`
- [ ] Set `REACT_LINK_BASE` in `.env`
- [ ] Uncomment `require('./ratingEmailScheduler')` in `server.js`
- [ ] Uncomment email sending code in `ratingEmailScheduler.js`
- [ ] Uncomment SMS sending code in `ratingEmailScheduler.js`
- [ ] Restart backend

### For Mailchimp:
- [ ] Create Mailchimp account and audience
- [ ] Add custom merge fields (PHONE, FNAME, LNAME, DOB, CITY, ADDRESS)
- [ ] Add Mailchimp credentials to `.env`
- [ ] Uncomment `const addToMailchimp = require...` in `waiverController.js`
- [ ] Uncomment Mailchimp integration code in `waiverController.js`
- [ ] Restart backend

---

## ⚠️ Important Notes

1. **Test in Development First**
   - Use test email/phone numbers
   - Check Twilio trial limitations
   - Verify Mailchimp test audience

2. **Cost Considerations**
   - Twilio: ~$0.0075 per SMS (charges apply after free trial)
   - Email: Free with Gmail (limited), SendGrid has free tier
   - Mailchimp: Free up to 500 contacts

3. **Privacy Compliance**
   - Ensure customers consent to marketing emails
   - Add unsubscribe link (Mailchimp does this automatically)
   - Follow GDPR/CAN-SPAM regulations

4. **Monitoring**
   - Check logs daily: `pm2 logs waiver-backend`
   - Monitor Twilio usage: https://console.twilio.com
   - Monitor email delivery rates

---

## 🐛 Troubleshooting

### Emails Not Sending
- Check SMTP credentials
- Verify SMTP port isn't blocked
- Check backend logs for errors
- Try SendGrid instead of Gmail

### SMS Not Sending
- Verify Twilio credentials
- Check phone number format (+1XXXXXXXXXX)
- Ensure you're not in trial mode (trial only sends to verified numbers)
- Check Twilio console for error messages

### Mailchimp Not Working
- Verify API key and List ID
- Check data center matches API key
- Ensure merge fields are created in Mailchimp
- Check backend logs for specific errors

---

## ✅ Verification

After enabling, test each feature:

1. **Complete a test waiver**
2. **Check immediate Mailchimp sync** (should be instant)
3. **Wait 3 hours** (or adjust the time in scheduler for testing)
4. **Check for rating email** in test inbox
5. **Check for rating SMS** on test phone
6. **Review logs:** `pm2 logs waiver-backend`

---

**All features are production-ready when you're ready to enable them! 🎉**
