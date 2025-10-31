# Skate & Play Waiver Management System

## Overview

The Skate & Play Waiver Management System is a full-stack digital solution designed to manage customer waivers for recreational facilities. It facilitates digital waiver signing with signature capture, supports multiple waivers and minors per customer, provides customers with access to their waiver history, and offers extensive administrative tools for verification and management. The system aims to streamline the waiver process, improve compliance, and enhance operational efficiency.

## User Preferences

- Simple language in explanations
- Iterative development with frequent small updates
- Ask before major architectural changes
- Do NOT modify `Backend-old` folder or duplicate components

## System Architecture

The system utilizes a "one user per phone number" database architecture, emphasizing historical snapshot preservation for legal compliance.

**UI/UX Decisions:**
- **Frontend Framework**: React 19 with Redux Toolkit.
- **Styling**: Bootstrap 5 for responsiveness.
- **Design Language**: Modern card-based UI with a purple, yellow, and brown color scheme, featuring 20px border-radius, subtle shadows, and 3px colored bottom borders with hover effects.
- **User Dashboard**: Card-based responsive grid displaying waiver history with purple gradient headers, status badges, and interactive elements.
- **Workflow**: Guided, step-by-step customer waiver flow and intuitive admin dashboards.

**Technical Implementations:**
- **Database**: MySQL (MariaDB 11.8.3) storing user, waiver, minor, staff, OTP, and feedback data. Key tables include `users` (current customers), `waivers` (historical waiver data with `signer_*` snapshot columns and `minors_snapshot` JSON), `minors` (active minor profiles), `otps` (temporary one-time passwords), `staff` (admin accounts with role-based access), and `feedback` (customer ratings and messages).
- **Backend**: Node.js with Express 4, providing RESTful API endpoints.
- **Authentication**: JWT for staff/admin and Twilio-based OTP for customer verification.
- **State Management**: Redux Toolkit with `redux-persist` for customer waiver flow (`waiverSession`) and admin authentication (`auth`).
- **API Endpoints**: Categorized for authentication, waiver management, staff management, and feedback. Waiver flow endpoints manage customer data, minor records, signature capture, and historical snapshots. Admin tools include daily waiver verification, full waiver history, staff CRUD, and feedback review.

**Feature Specifications:**
- **Minor Management**: Minors are associated with a user; updates deactivate old records and create new ones, while historical waivers retain their `minors_snapshot`.
- **Historical Snapshotting**: User and minor data are captured and stored directly in the `waivers` table upon signature for legal immutability.
- **Signature Compression**: Digital signatures are captured and converted to JPEG (50% quality) to reduce storage.
- **OTP Security**: 4-digit OTPs expire in 5 minutes, are single-use, and invalidate previous OTPs.
- **Role-Based Access Control**: Admin functionalities are secured by JWT with roles: `staff`, `admin`, `superadmin`.
- **PDF Generation**: Optimized to generate multi-page PDFs from waiver data with reduced file sizes (50-80KB).

## External Dependencies

-   **Twilio**: Used for SMS-based One-Time Passwords (OTPs) for customer phone verification. Requires E.164 format for phone numbers.
-   **Mailchimp**: Integrates with the `createWaiver` API to add new customers to a marketing email list, with duplicate prevention using MD5 hash.
-   **Nodemailer**: Used for sending email notifications (password resets, feedback, new staff accounts).
-   **Node-Cron**: Schedules automated tasks, such as sending rating requests to customers.
-   **React Signature Canvas**: Frontend library for capturing digital signatures.
-   **Axios**: HTTP client for frontend API requests.
-   **html2canvas**: Used in PDF generation to convert HTML elements to canvas images.