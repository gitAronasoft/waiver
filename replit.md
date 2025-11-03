# Skate & Play Waiver Management System

## Overview
A full-stack waiver management system for Skate & Play. This application allows customers to sign digital waivers with OTP verification, and provides an admin panel for managing waivers, staff, and customer feedback.

## Project Architecture

### Frontend (React)
- **Framework**: React 19.2.0 with Create React App
- **State Management**: Redux Toolkit with Redux Persist
- **Routing**: React Router DOM
- **UI Components**: Custom components with Bootstrap
- **Port**: 5000 (webview)
- **Location**: Root directory

### Backend (Node.js/Express)
- **Framework**: Express.js
- **Database**: MySQL (external hosted database)
- **Authentication**: JWT with bcrypt
- **Port**: 8080 (console)
- **Location**: `/backend` directory

### Key Features
1. **Customer Waiver Flow**
   - New customer registration with OTP verification
   - Existing customer login
   - Digital signature capture
   - Rule reminders and acknowledgment
   - Star rating and feedback system

2. **Admin Panel**
   - Staff management (add, update, list)
   - Waiver history and PDF generation
   - Client profiles
   - Feedback management
   - Authentication with password reset

3. **Integrations**
   - Twilio SMS for OTP verification and rating requests
   - Mailchimp for email list management
   - Nodemailer for email notifications
   - Scheduled rating email/SMS system

## Recent Changes (Nov 1, 2025)
- Initial GitHub import setup for Replit environment
- Configured frontend to run on port 5000 with host allowance
- Configured backend to run on port 8080
- Moved database credentials to environment variables
- Set up dual workflows for frontend and backend
- Configured deployment settings for VM (full-stack)

## Environment Setup

### Frontend Environment Variables (.env)
```
PORT=5000
HOST=0.0.0.0
DANGEROUSLY_DISABLE_HOST_CHECK=true
WDS_SOCKET_PORT=0
REACT_APP_GOOGLE_REVIEW_LINK=https://g.page/r/YOUR_GOOGLE_REVIEW_LINK/review
```

### Backend Environment Variables (backend/.env)
Required:
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` - MySQL database credentials
- `JWT_SECRET` - Secret key for JWT token signing
- `PORT` - Backend server port (default: 8080)
- `NODE_ENV` - Environment (development/production)

Optional (for full functionality):
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` - SMS/OTP services
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email notifications
- `MAILCHIMP_API_KEY`, `MAILCHIMP_LIST_ID`, `MAILCHIMP_DC` - Email marketing integration
- `FRONTEND_URL`, `REACT_LINK_BASE` - URLs for rating links in emails/SMS

## Development Workflow

### Running Locally
1. Backend automatically starts on port 8080
2. Frontend automatically starts on port 5000
3. Both workflows are configured and auto-start

### Database
- External MySQL database is pre-configured
- Connection details stored in environment variables
- Database includes tables for waivers, staff, feedback, and ratings

### Deployment
- Deployment type: VM (required for full-stack with persistent backend)
- Build command: `npm run build` (builds React production bundle)
- Run command: Starts backend server and serves frontend static files

## File Structure
```
/
├── backend/              # Express.js backend
│   ├── config/          # Database configuration
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Auth middleware
│   ├── routes/          # API routes
│   ├── utils/           # Helper utilities
│   └── server.js        # Main server file
├── src/                 # React frontend source
│   ├── components/      # Reusable components
│   ├── pages/           # Page components
│   ├── store/           # Redux store and slices
│   ├── utils/           # Frontend utilities
│   └── config.js        # Frontend configuration
├── public/              # Static assets
└── build/               # Production build (generated)
```

## API Endpoints

### Authentication (`/api/auth`)
- POST `/login` - Staff login
- POST `/forgot-password` - Request password reset
- POST `/reset-password/:token` - Reset password

### Waivers (`/api/waivers`)
- POST `/send-otp` - Send OTP for verification
- POST `/verify-otp` - Verify OTP code
- POST `/submit` - Submit new waiver
- GET `/history` - Get waiver history (admin)
- GET `/customer/:customerId` - Get customer waivers
- GET `/:id/pdf` - Generate waiver PDF

### Staff (`/api/staff`)
- GET `/` - List all staff (requires auth)
- POST `/` - Add new staff (requires auth)
- PUT `/:id` - Update staff (requires auth)
- DELETE `/:id` - Delete staff (requires auth)

### Feedback (`/api/feedback`)
- POST `/` - Submit customer feedback
- GET `/` - Get all feedback (requires auth)

### Ratings (`/api/rating`)
- POST `/submit` - Submit star rating
- GET `/:id` - Get rating details

## Notes
- The application is fully functional in the Replit environment
- Database is externally hosted and pre-configured
- Optional services (Twilio, SMTP, Mailchimp) can be configured for full functionality
- The system includes automated rating request scheduling via cron jobs
