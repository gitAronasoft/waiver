# 🚀 Skate & Play Waiver System - Production Deployment Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Application Deployment](#application-deployment)
5. [Service Configuration](#service-configuration)
6. [Testing](#testing)
7. [Maintenance](#maintenance)

---

## 🔧 Prerequisites

### Server Requirements
- **Operating System**: Ubuntu 20.04+ or similar Linux distribution
- **Node.js**: v18.x or v20.x
- **MySQL/MariaDB**: 8.0+ or 10.5+
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: Minimum 20GB
- **Domain**: A registered domain name pointing to your server

### Required Accounts & API Keys
1. **Twilio Account** (for SMS/OTP)
   - Sign up at: https://www.twilio.com/try-twilio
   - Get: Account SID, Auth Token, Messaging Service SID

2. **Email Service** (choose one)
   - **Gmail**: Enable 2FA and create App Password
   - **SendGrid**: Free tier available at https://sendgrid.com
   - **AWS SES**: If using AWS infrastructure

3. **Mailchimp Account** (for marketing)
   - Sign up at: https://mailchimp.com
   - Get: API Key, Audience List ID, Data Center

---

## 🔐 Environment Setup

### Step 1: Download Your Code
Download your project files to your server:
```bash
# Option 1: Via Git (if you have a repository)
git clone https://your-repository-url.git
cd your-project-folder

# Option 2: Upload via SCP/SFTP
# Upload the entire project folder to your server
```

### Step 2: Install Dependencies

#### Backend Dependencies
```bash
cd backend
npm install --production
```

#### Frontend Dependencies
```bash
cd ..  # Back to project root
npm install
npm run build  # This creates optimized production build
```

### Step 3: Configure Environment Variables

Copy the example file and edit with your actual values:
```bash
cd backend
cp .env.example .env
nano .env  # or use vim, vi, or any text editor
```

**Fill in ALL values in `.env`:**

```bash
# Database
DB_HOST=localhost
DB_USER=waiver_user
DB_PASSWORD=your_secure_password
DB_NAME=waiver_db

# JWT Secret (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=abc123...your_generated_secret

# Server
PORT=8080
NODE_ENV=production

# URLs
FRONTEND_URL=https://yourdomain.com
REACT_LINK_BASE=https://yourdomain.com

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxx

# Email (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=yourapp@gmail.com
SMTP_PASS=your_app_specific_password

# Mailchimp
MAILCHIMP_API_KEY=xxxxxxxxxxxxxxxxxxxx-us1
MAILCHIMP_LIST_ID=xxxxxxxxxx
MAILCHIMP_DC=us1
```

**🔒 SECURITY NOTE**: Never commit `.env` to version control!

---

## 🗄️ Database Setup

### Step 1: Install MySQL/MariaDB
```bash
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation
```

### Step 2: Create Database and User
```bash
sudo mysql -u root -p
```

In MySQL console:
```sql
-- Create database
CREATE DATABASE waiver_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user
CREATE USER 'waiver_user'@'localhost' IDENTIFIED BY 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON waiver_db.* TO 'waiver_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 3: Import Database Schema
If you have a database dump file:
```bash
mysql -u waiver_user -p waiver_db < database_schema.sql
```

**OR** run your migration scripts if available:
```bash
cd backend
node migrations/init.js  # If you have migration scripts
```

---

## 🚀 Application Deployment

### Option A: Using PM2 (Recommended)

PM2 keeps your app running and auto-restarts on crashes.

#### Install PM2
```bash
sudo npm install -g pm2
```

#### Start Backend
```bash
cd backend
pm2 start server.js --name "waiver-backend" --env production
```

#### Serve Frontend (Static Files)
You have two options:

**Option 1: Serve via Node/Express**
Create a simple static server:
```bash
# In project root
pm2 serve build 5000 --name "waiver-frontend" --spa
```

**Option 2: Use Nginx (Better for production)**
Install Nginx:
```bash
sudo apt install nginx
```

Configure Nginx:
```bash
sudo nano /etc/nginx/sites-available/waiver
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
    location / {
        root /path/to/your/project/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/waiver /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

#### Enable PM2 to start on boot
```bash
pm2 startup
pm2 save
```

### Option B: Using SystemD

Create service files for backend:
```bash
sudo nano /etc/systemd/system/waiver-backend.service
```

Add:
```ini
[Unit]
Description=Waiver Backend API
After=network.target mysql.service

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/your/project/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Start and enable:
```bash
sudo systemctl start waiver-backend
sudo systemctl enable waiver-backend
sudo systemctl status waiver-backend
```

---

## 🔑 Service Configuration

### 1. Twilio Setup (SMS/OTP)

1. **Create Account**: https://www.twilio.com/try-twilio
2. **Get Phone Number**: Console → Phone Numbers → Buy a number
3. **Create Messaging Service**:
   - Console → Messaging → Services → Create
   - Add your phone number to the service
   - Copy the Messaging Service SID
4. **Get Credentials**:
   - Account SID: Found on dashboard
   - Auth Token: Found on dashboard (click to reveal)
5. **Add to `.env`**:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxx
   TWILIO_AUTH_TOKEN=xxxxx
   TWILIO_MESSAGING_SERVICE_SID=MGxxxxx
   ```

### 2. Email Setup (Gmail Example)

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other"
   - Copy the 16-character password
3. **Add to `.env`**:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=yourapp@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx
   ```

**Alternatives**:
- **SendGrid**: More reliable for bulk emails
- **AWS SES**: Better pricing for high volume

### 3. Mailchimp Setup

1. **Create Account**: https://mailchimp.com
2. **Create Audience**:
   - Audience → Create Audience
   - Add custom fields: PHONE, FNAME, LNAME, DOB, CITY, ADDRESS
3. **Get API Key**:
   - Account → Extras → API keys → Create A Key
4. **Get List ID**:
   - Audience → Settings → Audience name and defaults
   - Look for "Audience ID"
5. **Get Data Center**:
   - Look at your API key: if it ends in `-us1`, your DC is `us1`
6. **Add to `.env`**:
   ```
   MAILCHIMP_API_KEY=xxxxx-us1
   MAILCHIMP_LIST_ID=xxxxxxxxxx
   MAILCHIMP_DC=us1
   ```

---

## 🔒 SSL Certificate (HTTPS)

Use Let's Encrypt for free SSL:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Auto-renewal:
```bash
sudo certbot renew --dry-run
```

---

## ✅ Testing

### Test Backend
```bash
curl http://localhost:8080/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "Server is running",
  "timestamp": "2025-10-27T..."
}
```

### Test Database Connection
```bash
curl http://localhost:8080/api/test-db
```

### Test Frontend
Open browser: `https://yourdomain.com`

### Test Email Sending
Check backend logs after a waiver is signed (3 hours later):
```bash
pm2 logs waiver-backend
```

### Test SMS Sending
Same as above - check logs for SMS confirmations

---

## 📊 Monitoring & Maintenance

### View Application Logs
```bash
# PM2
pm2 logs waiver-backend
pm2 logs waiver-frontend

# SystemD
sudo journalctl -u waiver-backend -f
```

### Check Application Status
```bash
pm2 status
# or
sudo systemctl status waiver-backend
```

### Database Backups

Create automatic daily backups:
```bash
# Create backup script
sudo nano /usr/local/bin/backup-waiver-db.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/backups/waiver"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
mysqldump -u waiver_user -p'your_password' waiver_db > $BACKUP_DIR/backup_$DATE.sql
# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete
```

Make executable and schedule:
```bash
sudo chmod +x /usr/local/bin/backup-waiver-db.sh
sudo crontab -e
```

Add daily backup at 2 AM:
```
0 2 * * * /usr/local/bin/backup-waiver-db.sh
```

### Update Application

```bash
# Backup database first!
# Pull latest code
git pull origin main

# Update backend
cd backend
npm install --production
pm2 restart waiver-backend

# Update frontend
cd ..
npm install
npm run build
pm2 restart waiver-frontend  # or restart nginx
```

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
pm2 logs waiver-backend --lines 50

# Common issues:
# 1. Database connection - verify DB credentials in .env
# 2. Port already in use - check: sudo lsof -i :8080
# 3. Missing environment variables - check .env file
```

### Frontend shows blank page
```bash
# Check if backend is running
curl http://localhost:8080/api/health

# Check frontend build
npm run build

# Check nginx configuration
sudo nginx -t
```

### Emails not sending
- Verify SMTP credentials
- Check if port 465 or 587 is blocked by firewall
- Try using SendGrid instead of Gmail
- Check backend logs for specific errors

### SMS not sending
- Verify Twilio credentials
- Check phone number format (+1XXXXXXXXXX)
- Ensure Twilio account is not in trial mode (trial only sends to verified numbers)
- Check Twilio console for error messages

---

## 📞 Support

For issues:
1. Check application logs first
2. Verify all environment variables are set
3. Test database connection
4. Check service provider dashboards (Twilio, Mailchimp)

---

## 🎉 Production Checklist

- [ ] Database created and secured
- [ ] All environment variables configured in `.env`
- [ ] Backend running and healthy
- [ ] Frontend built and served
- [ ] SSL certificate installed
- [ ] Twilio configured and tested
- [ ] Email configured and tested
- [ ] Mailchimp configured
- [ ] Automatic backups scheduled
- [ ] Monitoring set up
- [ ] Firewall configured (ports 80, 443 open)
- [ ] Domain DNS pointing to server

---

**Your waiver system is now production-ready! 🚀**
