#!/bin/bash

# ============================================
# Skate & Play Waiver System - Setup Script
# ============================================
# This script helps you set up the production environment

set -e  # Exit on error

echo "🚀 Skate & Play Waiver System - Production Setup"
echo "================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}❌ Please do not run this script as root${NC}"
   exit 1
fi

# Step 1: Check Node.js version
echo "📋 Step 1: Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be 18 or higher${NC}"
    echo "Current version: $(node -v)"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v) found${NC}"

# Step 2: Check MySQL
echo ""
echo "📋 Step 2: Checking MySQL/MariaDB..."
if ! command -v mysql &> /dev/null; then
    echo -e "${YELLOW}⚠️  MySQL client not found${NC}"
    echo "Install with: sudo apt install mysql-server"
else
    echo -e "${GREEN}✅ MySQL found${NC}"
fi

# Step 3: Install Dependencies
echo ""
echo "📦 Step 3: Installing dependencies..."
echo "This may take a few minutes..."

# Install backend dependencies
cd backend
echo "Installing backend dependencies..."
npm install --production
echo -e "${GREEN}✅ Backend dependencies installed${NC}"

# Install frontend dependencies
cd ..
echo "Installing frontend dependencies..."
npm install
echo -e "${GREEN}✅ Frontend dependencies installed${NC}"

# Step 4: Build Frontend
echo ""
echo "🔨 Step 4: Building frontend for production..."
npm run build
if [ -d "build" ]; then
    echo -e "${GREEN}✅ Frontend built successfully${NC}"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi

# Step 5: Setup .env file
echo ""
echo "⚙️  Step 5: Setting up environment variables..."
if [ ! -f "backend/.env" ]; then
    echo "Creating backend/.env from template..."
    cp backend/.env.example backend/.env
    echo -e "${YELLOW}⚠️  IMPORTANT: Edit backend/.env and add your credentials!${NC}"
    echo "File location: backend/.env"
else
    echo -e "${GREEN}✅ backend/.env already exists${NC}"
fi

# Step 6: Create uploads directory
echo ""
echo "📁 Step 6: Creating uploads directory..."
mkdir -p backend/uploads
chmod 755 backend/uploads
echo -e "${GREEN}✅ Uploads directory created${NC}"

# Step 7: Check PM2
echo ""
echo "📋 Step 7: Checking PM2..."
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PM2 not found${NC}"
    echo "Install with: sudo npm install -g pm2"
else
    echo -e "${GREEN}✅ PM2 found${NC}"
fi

# Step 8: Generate JWT Secret
echo ""
echo "🔐 Step 8: Generating JWT secret..."
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
echo "Your JWT Secret (add this to backend/.env):"
echo -e "${GREEN}JWT_SECRET=$JWT_SECRET${NC}"
echo ""

# Final Instructions
echo ""
echo "================================================="
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "================================================="
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Edit backend/.env with your credentials:"
echo "   nano backend/.env"
echo ""
echo "2. Set up your database:"
echo "   - Create database: waiver_db"
echo "   - Import schema (if you have a dump file)"
echo ""
echo "3. Start the application:"
echo "   cd backend && pm2 start server.js --name waiver-backend"
echo "   pm2 serve build 5000 --name waiver-frontend --spa"
echo ""
echo "4. Save PM2 configuration:"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "5. (Optional) Set up Nginx for better performance"
echo "   See DEPLOYMENT_GUIDE.md for details"
echo ""
echo "📚 Documentation:"
echo "   - DEPLOYMENT_GUIDE.md - Full deployment instructions"
echo "   - ENABLE_FEATURES_GUIDE.md - Enable email/SMS/Mailchimp"
echo "   - backend/.env.example - Environment variables reference"
echo ""
echo -e "${YELLOW}⚠️  Don't forget to configure your API keys in backend/.env!${NC}"
echo ""
