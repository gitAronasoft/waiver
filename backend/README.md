# Waiver Management System - Backend API

## Overview
Node.js/Express backend API for the Skate & Play Waiver Management System with MySQL database.

## Requirements
- Node.js 18+ or 20+
- MySQL/MariaDB database
- npm or yarn

## Installation

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the backend directory:

```env
# Database Configuration
DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name

# JWT Secret for Authentication
JWT_SECRET=your_random_secret_key_here

# Server Configuration
PORT=8080
NODE_ENV=production

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend-domain.com
```

### 3. Database Setup
Ensure your MySQL database:
- Has the required tables (customers, waiver_forms, minors, otps, staff, feedback)
- Allows connections from your server IP
- User has proper permissions

**Grant Database Access:**
```sql
GRANT ALL ON your_database_name.* TO 'your_user'@'your_server_ip' IDENTIFIED BY 'your_password';
FLUSH PRIVILEGES;
```

Or allow from all hosts (less secure):
```sql
GRANT ALL ON your_database_name.* TO 'your_user'@'%' IDENTIFIED BY 'your_password';
FLUSH PRIVILEGES;
```

## Running the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Using PM2 (Recommended for Production)
```bash
# Install PM2 globally
npm install -g pm2

# Start server with PM2
pm2 start server.js --name waiver-backend

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

## API Endpoints

### Health Check
- `GET /api/health` - Server status
- `GET /api/test-db` - Database connection test

### Waiver Endpoints
- `POST /api/waivers` - Create new waiver
- `GET /api/waivers/customer-info?phone=` - Get customer info
- `POST /api/waivers/update-customer` - Update customer
- `POST /api/waivers/save-signature` - Save signature
- `POST /api/waivers/accept-rules` - Accept rules
- `GET /api/waivers/user-history/:phone` - User waiver history
- `GET /api/waivers/getAllCustomers` - All customers (admin)
- `POST /api/waivers/verify/:id` - Verify waiver (admin)

### Authentication
- `POST /api/auth/send-otp` - Send OTP
- `POST /api/auth/verify-otp` - Verify OTP

### Staff Management
- `POST /api/staff/login` - Staff login
- `GET /api/staff/getstaff` - Get all staff
- `POST /api/staff/addstaff` - Add staff
- `PUT /api/staff/update-staff/:id` - Update staff
- `DELETE /api/staff/delete-staff/:id` - Delete staff

### Feedback
- `POST /api/feedback/send-feedback` - Submit feedback
- `GET /api/feedback/list` - Get all feedback

## Deployment with Nginx

### 1. Install Nginx
```bash
sudo apt update
sudo apt install nginx
```

### 2. Create Nginx Configuration
Create `/etc/nginx/sites-available/waiver-api`:

```nginx
server {
    listen 80;
    server_name your-api-domain.com;

    location / {
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

### 3. Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/waiver-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Setup SSL with Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-api-domain.com
```

## Security Recommendations

1. **Use Strong JWT Secret**: Generate a random 64+ character string
2. **Enable HTTPS**: Always use SSL/TLS in production
3. **Database Access**: Restrict DB access to specific IP addresses
4. **Environment Variables**: Never commit .env files
5. **Update Dependencies**: Regularly run `npm audit` and update packages
6. **Rate Limiting**: Consider adding rate limiting for API endpoints
7. **CORS**: Update FRONTEND_URL to match your frontend domain

## Troubleshooting

### Database Connection Issues
- Verify database credentials in .env
- Check if MySQL is running
- Ensure server IP is whitelisted in MySQL
- Test connection: `mysql -h HOST -u USER -p DATABASE`

### Port Already in Use
```bash
# Find process using port 8080
sudo lsof -i :8080

# Kill the process
sudo kill -9 PID
```

### PM2 Issues
```bash
# View logs
pm2 logs waiver-backend

# Restart server
pm2 restart waiver-backend

# Stop server
pm2 stop waiver-backend
```

## File Structure
```
backend/
├── config/
│   └── database.js        # MySQL connection
├── controllers/
│   ├── waiverController.js
│   ├── authController.js
│   ├── staffController.js
│   └── feedbackController.js
├── routes/
│   ├── waiverRoutes.js
│   ├── authRoutes.js
│   ├── staffRoutes.js
│   └── feedbackRoutes.js
├── middleware/
│   └── auth.js            # JWT middleware
├── uploads/               # File uploads
├── server.js              # Main entry point
├── package.json
└── .env                   # Environment variables
```

## Support
For issues or questions, contact your system administrator.
