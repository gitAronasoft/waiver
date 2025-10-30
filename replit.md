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

-   **Twilio**: Used for sending SMS-based One-Time Passwords (OTPs) for customer phone verification.
-   **Mailchimp**: Integrates with the `createWaiver` API to automatically add new customers to a marketing email list.
-   **Nodemailer**: Utilized for sending email notifications, including password reset links for staff, feedback notifications to admins, and new staff account setup emails.
-   **Node-Cron**: Schedules automated tasks, such as sending rating requests to customers 24 hours after their waiver signing.
-   **React Signature Canvas**: Frontend library for capturing digital signatures.
-   **Axios**: HTTP client for making API requests from the frontend.
-   **html2canvas**: Used in PDF generation to convert HTML elements to canvas images.