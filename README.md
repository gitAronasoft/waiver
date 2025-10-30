# 🎮 Skate & Play Waiver Management System

A comprehensive digital waiver management system designed for recreational facilities. Customers can sign waivers digitally, and administrators can manage customers, staff, and feedback through an intuitive dashboard.

---

## ✨ Features

### Customer Features
- 📝 Digital waiver signing with signature capture
- 👨‍👩‍👧‍👦 Support for adding multiple minors
- 📱 SMS-based OTP verification
- 📊 Personal dashboard to view waiver history
- ⭐ Star rating and feedback system
- 🔄 Unlimited waivers per phone number

### Admin Features
- 📋 Waiver verification dashboard (verified/inaccurate)
- 👥 Customer management with detailed profiles
- 👔 Staff management (add, edit, delete with roles)
- 💬 Feedback and rating management
- 🔐 Secure JWT-based authentication

### Automated Features (Optional)
- 📧 Automated rating request emails (3 hours after visit)
- 📲 Automated rating request SMS via Twilio
- 📮 Mailchimp auto-subscribe for marketing
- ⏰ Scheduled tasks via node-cron

---

## 🚀 Quick Start

### Development (Replit)
Both workflows are already configured and running:
- **Backend API**: `http://localhost:8080`
- **React App**: `http://localhost:5000`

### Production Deployment
See **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** for complete instructions.

Quick setup:
```bash
chmod +x setup-production.sh
./setup-production.sh
```

---

## 📁 Project Structure

```
.
├── backend/                    # Node.js/Express API
│   ├── config/                # Database configuration
│   ├── controllers/           # Route controllers
│   ├── middleware/            # Auth & validation
│   ├── routes/                # API routes
│   ├── utils/                 # Email, SMS, Mailchimp utilities
│   ├── .env.example           # Environment variables template
│   └── server.js              # Main server file
│
├── src/                       # React frontend
│   ├── components/            # React components
│   ├── assets/                # Images, CSS, fonts
│   ├── config.js              # Frontend configuration
│   └── App.js                 # Main app component
│
├── public/                    # Static files
├── build/                     # Production build (generated)
│
├── DEPLOYMENT_GUIDE.md        # Production deployment guide
├── ENABLE_FEATURES_GUIDE.md   # Enable optional features
├── setup-production.sh        # Automated setup script
└── README.md                  # This file
```

---

## 🔧 Technology Stack

### Frontend
- **React 19** - UI framework
- **React Router 7** - Navigation
- **Bootstrap 5** - Styling
- **Axios** - API calls
- **React Signature Canvas** - Digital signatures
- **React Toastify** - Notifications

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **MySQL** - Database
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Twilio** - SMS/OTP
- **Nodemailer** - Email
- **Mailchimp API** - Marketing
- **Node-cron** - Scheduled tasks

---

## ⚙️ Environment Configuration

All configuration is managed through `backend/.env`. Copy from template:

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

### Required Variables:
```env
# Database
DB_HOST=localhost
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=waiver_db

# JWT
JWT_SECRET=your_generated_secret

# Server
PORT=8080
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
REACT_LINK_BASE=https://yourdomain.com
```

### Optional (for automated features):
```env
# Twilio (SMS/OTP)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_MESSAGING_SERVICE_SID=MGxxxxx

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your@email.com
SMTP_PASS=your_app_password

# Mailchimp
MAILCHIMP_API_KEY=xxxxx-us1
MAILCHIMP_LIST_ID=xxxxx
MAILCHIMP_DC=us1
```

See **[backend/.env.example](backend/.env.example)** for complete list with descriptions.

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** | Complete production deployment instructions |
| **[ENABLE_FEATURES_GUIDE.md](ENABLE_FEATURES_GUIDE.md)** | How to enable email/SMS/Mailchimp features |
| **[backend/.env.example](backend/.env.example)** | All environment variables explained |
| **[replit.md](replit.md)** | Project architecture and decisions |

---

## 🔐 Security Features

- ✅ JWT-based authentication
- ✅ Bcrypt password hashing
- ✅ SQL injection prevention
- ✅ Server-side input validation
- ✅ CORS protection
- ✅ Environment variables for secrets
- ✅ .env excluded from git
- ✅ Rate limiting ready
- ✅ Error handling & logging

---

## 🚢 Deployment Options

### Option 1: PM2 (Recommended)
```bash
cd backend
pm2 start server.js --name waiver-backend
pm2 serve build 5000 --name waiver-frontend --spa
pm2 save
```

### Option 2: Nginx + PM2
```bash
# Backend with PM2
pm2 start backend/server.js --name waiver-backend

# Frontend served by Nginx
# See DEPLOYMENT_GUIDE.md for Nginx configuration
```

### Option 3: SystemD Services
See **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** for SystemD setup.

---

## 📊 Database Schema

Main tables:
- **customers** - Customer information
- **waiver_forms** - Signed waivers
- **minors** - Minor information linked to waivers
- **otps** - OTP verification codes
- **staff** - Admin users
- **feedback** - Customer ratings and feedback

See database schema file for complete structure.

---

## 🧪 Testing

### Test Backend
```bash
curl http://localhost:8080/api/health
```

### Test Database
```bash
curl http://localhost:8080/api/test-db
```

### Test Frontend
Open browser: `http://localhost:5000` (development) or `https://yourdomain.com` (production)

---

## 🔄 Automated Features

All automated features are **production-ready but disabled by default**. Enable them when you have API credentials configured.

### 1. Rating Emails (3-hour delay)
- Automatically sends rating request emails
- Includes personalized link to rating page
- HTML template with branding

### 2. Rating SMS (3-hour delay)
- Sends SMS via Twilio
- Short personalized message with link
- Cost-effective (~ $0.0075/SMS)

### 3. Mailchimp Auto-Subscribe
- Adds customers to your email list
- Tags with "waiver-visit" and date
- Syncs customer data (name, phone, DOB, etc.)

**To enable**: See **[ENABLE_FEATURES_GUIDE.md](ENABLE_FEATURES_GUIDE.md)**

---

## 📦 Installation

### For Development (Replit)
Dependencies already installed. Both workflows running automatically.

### For Production Server
```bash
# Clone/download your code
git clone your-repo-url
cd your-project

# Run automated setup
chmod +x setup-production.sh
./setup-production.sh

# Configure environment
nano backend/.env

# Set up database
# (See DEPLOYMENT_GUIDE.md)

# Start services
pm2 start backend/server.js --name waiver-backend
pm2 serve build 5000 --name waiver-frontend --spa
pm2 save
```

---

## 🐛 Troubleshooting

### Backend won't start
1. Check environment variables in `backend/.env`
2. Verify database connection
3. Check logs: `pm2 logs waiver-backend`

### Frontend shows blank page
1. Verify backend is running
2. Check browser console for errors
3. Rebuild frontend: `npm run build`

### SMS not sending
1. Verify Twilio credentials
2. Check phone number format (+1XXXXXXXXXX)
3. Ensure Twilio account is active (not trial)

### Emails not sending
1. Verify SMTP credentials
2. Check if port 465/587 is open
3. Try SendGrid instead of Gmail

**For detailed troubleshooting**: See **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**

---

## 🎯 Production Checklist

Before going live:

- [ ] Configure all environment variables in `backend/.env`
- [ ] Set up MySQL database with proper schema
- [ ] Configure SSL certificate (Let's Encrypt)
- [ ] Set up automated database backups
- [ ] Configure Nginx or reverse proxy
- [ ] Set up PM2 with startup script
- [ ] Test all features thoroughly
- [ ] Configure Twilio (if using SMS)
- [ ] Configure email service (if using email)
- [ ] Configure Mailchimp (if using marketing)
- [ ] Update CORS settings for production domain
- [ ] Set up monitoring and logging
- [ ] Configure firewall (ports 80, 443 open)

---

## 📄 License

Proprietary - All rights reserved by Skate & Play

---

## 🤝 Support

For deployment assistance or questions:
1. Check **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**
2. Review **[ENABLE_FEATURES_GUIDE.md](ENABLE_FEATURES_GUIDE.md)**
3. Check backend logs for specific errors
4. Verify environment variables are set correctly

---

## ✅ Status

**Current Status**: ✅ Production Ready

- ✅ All features implemented
- ✅ Code optimized and clean
- ✅ Security best practices applied
- ✅ Documentation complete
- ✅ Deployment guides created
- ✅ Optional features ready (email/SMS/Mailchimp)
- ✅ Both workflows running successfully

**Ready to download and deploy to your production server!** 🚀

---

**Built with ❤️ for Skate & Play**
