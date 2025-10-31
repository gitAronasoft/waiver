# Skate & Play Waiver Management System - Compressed Documentation

## Overview

The Skate & Play Waiver Management System is a full-stack digital solution for managing customer waivers. It enables digital waiver signing with signature capture, supports multiple waivers per phone number, handles minor management, provides customer access to their waiver history, and offers extensive administrative tools for verification and customer management. The system aims to streamline the waiver process, improve compliance, and enhance operational efficiency for recreational facilities.

**Key Capabilities:**
- Digital waiver signing with OTP-based phone verification.
- Management of multiple waivers and minors per customer.
- Customer dashboard for viewing waiver history.
- Admin dashboard for waiver verification, customer, and staff management.
- Comprehensive feedback system and automated rating requests.
- Historical data snapshotting for legal compliance.

## User Preferences

- Simple language in explanations
- Iterative development with frequent small updates
- Ask before major architectural changes
- Do NOT modify `Backend-old` folder or duplicate components

## System Architecture

The system follows a "one user per phone number" database architecture with historical snapshot preservation. This ensures unique user identification, allows for unlimited waivers per user, and maintains an immutable record of waiver data at the time of signing.

**UI/UX Decisions:**
- **Frontend Framework**: React 19 with Redux Toolkit for state management.
- **Styling**: Bootstrap 5 provides a responsive and consistent user interface.
- **Design Language**: Modern card-based UI with purple (#6C5CE7), yellow (#FFD93D), and brown (#DCC07C) color scheme. Cards feature 20px border-radius, subtle shadows (0px 4px 30px rgba(0, 0, 0, 0.06)), and 3px colored bottom borders with hover effects.
- **User Dashboard**: Card-based responsive grid layout (1 column mobile, 2 tablet, 3 desktop) displaying waiver history. Each card has purple gradient header with status badges, colored icon boxes for information sections, and interactive hover effects (lift and border color change).
- **Workflow**: Guided, step-by-step customer waiver flow; intuitive admin dashboards.

**Technical Implementations:**
- **Database**: MySQL (MariaDB 11.8.3) with a schema designed for user, waiver, minor, staff, OTP, and feedback data.
    - `users`: Stores current customer information (one per phone number).
    - `waivers`: Stores historical waiver data, including `signer_*` snapshot columns and `minors_snapshot` (JSON) to preserve data at signing time.
    - `minors`: Stores current active minor profiles linked to users; old minors are deactivated (`status=0`).
    - `otps`: Temporary storage for one-time passwords, expiring in 5 minutes and deleted after verification.
    - `staff`: Manages admin accounts with role-based access control (`staff`, `admin`, `superadmin`).
    - `feedback`: Records customer ratings and messages, linked to users.
- **Backend**: Node.js with Express 4, providing RESTful API endpoints for all functionalities.
- **Authentication**: JWT for staff/admin, Twilio-based OTP for customer verification.
- **State Management**: Redux Toolkit with `redux-persist` for customer waiver flow (`waiverSession`) and admin authentication (`auth`) state persistence.
- **API Endpoints**: Categorized for authentication, waiver management, staff management, and feedback.
    - **Waiver Flow**: Endpoints manage customer data updates, minor deactivation/insertion, signature capture, and historical snapshot creation.
    - **Admin Tools**: Endpoints for daily waiver verification, full waiver history, staff CRUD operations, and feedback review.

**Feature Specifications:**
- **Minor Management**: Minors associated with a user can be updated; the system deactivates old minor records and creates new ones to maintain data integrity for future waivers, while past waivers retain their `minors_snapshot`.
- **Historical Snapshotting**: Upon signature, current user and active minor data are captured and stored directly within the `waivers` table, ensuring legal immutability of signed documents.
- **Signature Compression**: Digital signatures are captured, converted to JPEG format with 50% quality, significantly reducing storage size.
- **OTP Security**: OTPs are 4-digit, expire in 5 minutes, are single-use, and invalidate previous OTPs upon new request.
- **Role-Based Access Control**: Admin functionalities are secured by JWT and restricted based on staff roles (`staff`, `admin`, `superadmin`).
- **PDF Generation**: Optimized to generate multi-page PDFs from waiver data with reduced file sizes (50-80KB).

## External Dependencies

-   **Twilio**: Used for sending SMS-based One-Time Passwords (OTPs) for customer phone verification. Phone numbers MUST be in E.164 format (+country_code+number) for reliable SMS delivery.
-   **Mailchimp**: Integrates with the `createWaiver` API to automatically add new customers to a marketing email list. Checks for existing subscribers using MD5 hash of lowercase email to prevent duplicates.
-   **Nodemailer**: Utilized for sending email notifications, including password reset links for staff, feedback notifications to admins, and new staff account setup emails.
-   **Node-Cron**: Schedules automated tasks, such as sending rating requests to customers 24 hours after their waiver signing.
-   **React Signature Canvas**: Frontend library for capturing digital signatures.
-   **Axios**: HTTP client for making API requests from the frontend.
-   **html2canvas**: Used in PDF generation to convert HTML elements to canvas images.

## Recent Changes

### Session 46 Continuation - October 31, 2025

**Major Refactoring - Route Naming, Flow Optimization & Modification Detection** ✅

**1. Backend Verification:**
- Verified backend already using `minors_snapshot` JSON approach (no migration needed)
- Confirmed no queries to minors table exist in codebase
- Removed outdated comments from `waiverController.js`
- **Impact**: Backend already fully optimized for minors_snapshot architecture

**2. Frontend Route Refactoring:**
- **Deleted 3 duplicate/unused files**: signature.js (807 lines), signaturePdf.js, otpverified.js (165 lines)
- **Professional route renames** (4 groups, 15+ files updated):
  - `/verify-otp` → `/verify-phone` (clearer phone verification purpose)
  - `/confirm` → `/review-information` (describes information review action)
  - `/sign` → `/sign-waiver` (explicitly states signing action)
  - `/terms` → `/rules` (matches facility rules content)
- **Impact**: Removed 1,000+ lines of duplicate code, professional descriptive URLs, cleaner routing structure

**3. Flow Optimization Verification:**
- **Existing Customer Flow**: ExistingCustomerLogin → OTP → fetches data once → stores in Redux → subsequent pages read from Redux only
- **New Customer Flow**: NewCustomerForm → creates waiver → OTP → subsequent pages read from Redux only
- **Impact**: Both flows Redux-first with minimal API calls, data fetched once and reused

**4. Modification Detection Refactoring:**
- **Problem**: ConfirmCustomerInfo was creating new waiver when user clicked Continue (inefficient, created waivers even if signature not completed)
- **Solution**:
  - Added `hasDataModifications` flag to `waiverSessionSlice` progress state
  - Refactored `ConfirmCustomerInfo.js`: Removed waiver creation logic, now only updates customer data and stores modification flag in Redux (~50 lines shorter)
  - Refactored `SignaturePage.js`: Added modification detection on signature submit, creates new waiver only when `(hasDataModifications || userModifiedSignature) && waiverId`
- **Impact**: 
  - Waiver creation only when signature actually submitted (efficient)
  - No wasted resources creating unsigned waivers
  - Better UX - users can back out without unnecessary database entries
  - Clean separation - ConfirmCustomerInfo handles data updates, SignaturePage handles waiver creation

**5. Unused Backend Endpoints Identified:**
- `/api/waivers/getminors`, `/waiver-snapshot`, `/customer-info-by-id`, `/user-history/:phone`, `/rate/:id` (GET/POST)
- **Note**: Can be removed in future cleanup if needed

**Architect Review**: Pass - All refactoring coherent, no blocking defects, improved code quality

**Files Modified**: 11 files (App.js, ConfirmCustomerInfo.js, SignaturePage.js, VerifyOtpPage.js, waiverSessionSlice.js, and 6 navigation files)
**Files Deleted**: 3 duplicate files (signature.js, signaturePdf.js, otpverified.js)

### Session 43 - October 31, 2025

**Customer Flow Streamlining:**
- **Removed UserDashboard**: Existing customers now redirect directly to `/confirm-info` after OTP verification instead of seeing dashboard
- **New Backend Endpoint**: Added `GET /api/waivers/latest-waiver` to fetch most recent waiver by phone number for pre-filling confirm-info page
- **Flow Changes**: `otpverified.js` now calls latest-waiver endpoint and pre-populates Redux state before navigating to confirm-info
- **Impact**: Faster, more streamlined experience for returning customers - one less page to navigate

**Admin Feedback Enhancement:**
- **New Columns**: Added Email and Phone Number columns to admin feedback listing page
- **Responsive Design**: Columns visible in desktop view; phone/email shown in expanded row details on mobile
- **Impact**: Admins can now quickly identify and contact customers who left feedback without opening individual records

**Database Migration Tools:**
- **Migration Script**: Created `backend/database/migrations/003_import_old_database.sql` to import legacy database structure
- **Field Mapping**: Maps old schema (`customers` → `users`, `waiver_forms` → `waivers`) with proper field transformations
- **Duplicate Handling**: Uses `ON DUPLICATE KEY UPDATE` for safe re-execution
- **Documentation**: Created `DATABASE_MIGRATION_INSTRUCTIONS.md` with step-by-step backup and execution instructions
- **Impact**: Safe migration path from old database schema to new architecture with full data preservation

**UI Polish:**
- **Logo Animation**: Simplified from complex SVG animations to clean fade transition using actual logo image (`/assets/img/logo.png`)
- **LoadingOverlay**: Simplified animations to clean fade effects
- **Accessibility**: All animations respect `prefers-reduced-motion` user preference
- **Impact**: Cleaner, more professional loading experience with better performance

### October 30, 2025

**Twilio OTP E.164 Phone Formatting Fix:**
- **waiverController.js**: Updated `createWaiver` to ensure all OTP phone numbers include country code with leading "+" (E.164 format). Uses `cc_cell_phone || ${country_code}${cell_phone}` and adds "+" if missing.
- **authController.js**: Updated `sendOtp` to fetch user's `country_code` from database, construct full phone number as `cell_phone || ${userCountryCode}${phone}`, and ensure leading "+" for Twilio compliance.
- **Impact**: Fixes OTP SMS delivery failures for both new waiver creation and existing customer login flows across all country codes.

**Mailchimp Integration Enhancement:**
- **Moved**: Mailchimp subscription moved from `acceptRules` to `createWaiver` function to ensure customers are subscribed immediately upon waiver creation.
- **Duplicate Prevention**: Added subscriber existence check using MD5 hash of lowercase email before POST to prevent "Member Exists" errors. Gracefully skips if already subscribed.
- **Impact**: Eliminates duplicate subscription errors and ensures all customers are properly added to marketing list.

**Redux State Management Standardization:**
- **Admin Pages**: Updated all admin pages (login.js, ResetPassword.js, home.js, AddStaff.js, UpdateStaff.js, ChangePassword.js) to use Redux `auth` slice via selectors instead of direct localStorage access.
- **Consistency**: All authentication state (token, staff data) now managed exclusively through Redux with `redux-persist` handling localStorage layer.
- **Impact**: Cleaner code, centralized state management, easier debugging, and consistent auth patterns across admin dashboard.

**Admin Profile Image Upload Path Fix:**
- **staffRoutes.js**: Changed multer upload path from `'uploads/profile/'` to `'public/uploads/profile'` for admin profile images.
- **Impact**: Profile images now stored in public directory for direct browser access without additional routing.