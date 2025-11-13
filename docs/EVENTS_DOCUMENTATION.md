# Events System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Backend API Endpoints](#backend-api-endpoints)
4. [Admin Interface](#admin-interface)
5. [User Showcase Flow](#user-showcase-flow)
6. [Recurring Events Logic](#recurring-events-logic)
7. [Testing Guide](#testing-guide)

---

## Overview

The Events System allows facility administrators to create, manage, and showcase events to customers. Events can be one-time or recurring (weekly), and are displayed to users after they accept the facility rules during the waiver sign-up flow.

### Key Features
- **Create & Manage Events**: Admin interface for CRUD operations
- **Recurring Events**: Support for weekly recurring events with end dates
- **Image Upload**: Event images (1:1 aspect ratio recommended)
- **Payment Integration**: External payment URL support (Stripe/PayPal/etc)
- **User Showcase**: Beautiful carousel display for customers
- **Status Management**: Active/Expired event filtering
- **Public/Private Toggle**: Control event visibility
- **Sort Ordering**: Custom ordering for event display

---

## Database Schema

### Events Table
```sql
CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_at DATETIME NOT NULL,
  end_at DATETIME,
  image_url VARCHAR(500),
  payment_url VARCHAR(500),
  button_label VARCHAR(40),
  recurrence_rule VARCHAR(50) DEFAULT 'none',
  recurrence_day_of_week INT,
  recurrence_until DATE,
  is_public TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | INT | Primary key, auto-increment |
| `title` | VARCHAR(255) | Event title (required) |
| `description` | TEXT | Event description (optional) |
| `start_at` | DATETIME | Event start date/time (required) |
| `end_at` | DATETIME | Event end date/time (optional) |
| `image_url` | VARCHAR(500) | Path to event image (e.g., `/uploads/events/filename.jpg`) |
| `payment_url` | VARCHAR(500) | External payment/registration link (must start with http:// or https://) |
| `button_label` | VARCHAR(40) | Custom button text (max 40 chars, defaults to "Register") |
| `recurrence_rule` | VARCHAR(50) | Recurrence type: `'none'` or `'weekly'` |
| `recurrence_day_of_week` | INT | Day of week for weekly events (0=Sunday, 6=Saturday) |
| `recurrence_until` | DATE | End date for recurring events (optional) |
| `is_public` | TINYINT(1) | Visibility flag (1=public, 0=private) |
| `sort_order` | INT | Display order (lower numbers first) |
| `created_at` | TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | Record last update time |

---

## Backend API Endpoints

### Base Path: `/api/events`

#### 1. Get Public Events
**Endpoint**: `GET /api/events/public`

**Query Parameters**:
- `horizon_days` (optional): Number of days ahead to generate recurring events (default: 60, max: 365)

**Description**: Fetches all public events with generated occurrences for recurring events.

**Response**:
```json
[
  {
    "id": 1,
    "title": "Test Event",
    "description": "Event description",
    "start_at": "2025-11-15T19:00:00.000Z",
    "end_at": "2025-11-15T21:00:00.000Z",
    "image_url": "/uploads/events/event-123.jpg",
    "payment_url": "https://stripe.com/...",
    "button_label": "Register Now",
    "recurrence_rule": "weekly",
    "recurrence_day_of_week": 5,
    "recurrence_until": "2026-01-01",
    "is_public": 1,
    "sort_order": 0
  }
]
```

**Logic**:
- Filters events where `is_public = 1`
- Includes events where `end_at >= NOW()` OR event is recurring
- For recurring events, generates future occurrences based on `horizon_days`
- Sorts by `sort_order` ASC, then `start_at` ASC

---

#### 2. Get All Events (Admin)
**Endpoint**: `GET /api/events`

**Authentication**: Required (Admin only)

**Description**: Fetches all events (public and private) for admin management.

**Response**: Same structure as public endpoint but includes private events.

---

#### 3. Create Event
**Endpoint**: `POST /api/events`

**Authentication**: Required (Admin only)

**Content-Type**: `multipart/form-data`

**Request Body**:
```javascript
{
  title: "Event Title",              // Required
  description: "Event description",   // Optional
  start_at: "2025-11-20T18:00",      // Required (datetime-local format)
  end_at: "2025-11-20T21:00",        // Optional
  payment_url: "https://...",         // Optional (must start with http:// or https://)
  button_label: "Register Now",       // Optional (max 40 chars)
  recurrence_rule: "weekly",          // Optional: "none" or "weekly"
  recurrence_day_of_week: 5,          // Optional: 0-6 (if weekly)
  recurrence_until: "2026-01-01",     // Optional (if recurring)
  is_public: 1,                       // Optional: 1 or 0
  sort_order: 0,                      // Optional: integer
  image: <File>                       // Optional: image file (1:1 aspect ratio recommended)
}
```

**Response**:
```json
{
  "id": 2,
  "message": "Event created",
  "image_url": "/uploads/events/event-456.jpg",
  "payment_url": "https://...",
  "button_label": "Register Now"
}
```

**Validation**:
- `title` and `start_at` are required
- `payment_url` must start with `http://` or `https://`
- `button_label` is trimmed and limited to 40 characters
- Image is stored in `backend/public/uploads/events/`

---

#### 4. Update Event
**Endpoint**: `PUT /api/events/:id`

**Authentication**: Required (Admin only)

**Content-Type**: `multipart/form-data`

**Request Body**: Same as Create Event (all fields optional)

**Response**:
```json
{
  "affected": 1,
  "message": "Event updated"
}
```

**Note**: If a new image is uploaded, it replaces the old image (old image is NOT automatically deleted).

---

#### 5. Delete Event
**Endpoint**: `DELETE /api/events/:id`

**Authentication**: Required (Admin only)

**Description**: Deletes event and associated image file.

**Response**:
```json
{
  "affected": 1,
  "message": "Event deleted"
}
```

**Logic**:
- Retrieves image URL from database
- Deletes image file from filesystem if it exists
- Deletes event record from database

---

## Admin Interface

### Location: `/admin/events`

### Features

#### Two-Column Layout
- **Left Column (5/12)**: Event form for create/edit
- **Right Column (7/12)**: Events list with filtering

#### Form Fields

1. **Title*** (required)
   - Text input
   - Event display name

2. **Description**
   - Textarea (3 rows)
   - Event details

3. **Start*** & **End**
   - DateTime pickers (datetime-local)
   - Start is required, End is optional

4. **Payment URL**
   - URL input
   - Must start with http:// or https://
   - Opens in new tab when clicked

5. **Button Label**
   - Text input (max 40 characters)
   - Appears on event card button
   - Defaults to "Register" if empty

6. **Recurrence**
   - Dropdown: None / Weekly
   - Enables day selection and end date

7. **Day (if weekly)**
   - Dropdown: Sunday - Saturday (0-6)
   - Only enabled if Recurrence = Weekly

8. **Until (optional)**
   - Date picker
   - End date for recurring events
   - Only enabled if Recurrence ≠ None

9. **Image (1:1 aspect ratio)**
   - File input (accepts image/*)
   - Shows preview thumbnail (96x96px)
   - Recommended: Square images

10. **Public**
    - Checkbox
    - Controls visibility to users

11. **Sort Order**
    - Number input
    - Lower numbers appear first

#### Event List

**Filter Tabs**:
- **All**: Shows all events
- **Active**: Shows non-expired events
- **Expired**: Shows past/expired events

**Event Cards Display**:
- Title with status badges (Active/Expired/Recurring/Private)
- Description
- Start and End times
- Public/Private status and sort order
- Button label
- Payment link (if applicable)
- Recurrence details (rule, day, until date)
- Event image thumbnail (72x72px) or default icon
- Edit and Delete buttons

**Edit Mode**:
- Clicking "Edit" loads event into form
- Card highlights with blue border
- Form shows "Editing" badge
- "Cancel" button appears to reset form

---

## User Showcase Flow

### Location: `/events`

### When It Appears
Users are redirected to `/events` immediately after accepting facility rules during waiver sign-up:

**Flow**: Welcome → Register/Login → Sign Waiver → **Rules** → **Events** → Complete

### UI Components

#### 1. Progress Indicator
Shows current step in the process:
- ✓ Rules (completed - green)
- **2 Events (current - blue)**
- 3 Complete (pending - gray)

#### 2. Header Section
- Facility logo
- "Upcoming Events" heading
- Subtitle: "Check out what's happening and register for events"

#### 3. Events Display

**Loading State**:
- Animated spinner
- "Loading events..." message

**Empty State**:
- Calendar emoji (📅)
- "No Active Events" heading
- Message: "There are no events scheduled at this time. Check back soon for upcoming events and activities!"

**Events Available**:
- Carousel/slider of event cards
- Arrow buttons for navigation (if multiple events)
- Swipe gesture support on mobile
- Dot indicators for current slide

#### 4. Event Cards
- Square event image (or "No image" placeholder)
- Event title
- Event description
- Start date & time
- End date & time (if applicable)
- Action button with custom label (or "Register")
  - Yellow background if payment URL exists
  - Gray if no payment URL (disabled)
  - Opens payment URL in new tab

#### 5. Continue Button
- Fixed at bottom of screen
- Blue background (#1E66FF)
- Navigates to `/complete` when clicked

### Event Filtering Logic

Events are shown if they meet these criteria:

**For Recurring Events** (weekly):
- `start_at` date matches today's date
- Example: Weekly Friday event only shows on Fridays

**For One-Time Events**:
- `end_at` is in the future, OR
- `end_at` is null/missing, OR
- `start_at` is today or in the future

**Sorting**:
1. By `start_at` (earliest first)
2. By `sort_order` (lower numbers first)

---

## Recurring Events Logic

### How It Works

Recurring events use a generation algorithm to create virtual "occurrences" from a template event.

### Weekly Recurrence

**Parameters**:
- `recurrence_rule`: `"weekly"`
- `recurrence_day_of_week`: 0-6 (0=Sunday, 6=Saturday)
- `recurrence_until`: Optional end date
- `start_at`: Template start time
- `end_at`: Template end time (duration is preserved)

**Generation Algorithm** (`generateWeeklyOccurrences`):

1. **Horizon Calculation**:
   - Default: 60 days from now
   - Max: 365 days
   - Configurable via API query parameter

2. **Start Point**:
   - Begins from the later of: NOW or template `start_at`

3. **Occurrence Generation**:
   ```javascript
   For each week until horizon or recurrence_until:
     - Find next occurrence of day_of_week
     - Apply template time to that date
     - Calculate end time based on duration
     - Add to results
     - Move cursor forward 7 days
   ```

4. **Duration Preservation**:
   - Calculates duration: `end_at - start_at`
   - Applies same duration to all occurrences

**Example**:
```javascript
Template Event:
- Title: "Friday Night Skate"
- Start: 2025-01-05 19:00 (Friday)
- End: 2025-01-05 21:00 (2 hour duration)
- Recurrence: Weekly, Friday (day 5)
- Until: 2025-12-31

Generated Occurrences:
- 2025-01-05 19:00 - 21:00
- 2025-01-12 19:00 - 21:00
- 2025-01-19 19:00 - 21:00
- ... every Friday until 2025-12-31
```

### Backend Processing (`backend/controllers/eventController.js`)

**Function**: `getPublicEvents()`

```javascript
For each event in database:
  If recurrence_rule === 'weekly':
    - Generate occurrences for next N days
    - Each occurrence is a separate object with adjusted dates
  Else:
    - Include if end_at >= NOW
```

### Frontend Filtering (`src/pages/EventsShowcase.jsx`)

**Function**: `shouldShow(event, now)`

```javascript
If event is recurring (weekly):
  - Check if event.start_at is TODAY (same day/month/year)
  - Return true only for today's date
Else:
  - Check if event.end_at is in future
  - Or event.start_at is today or future
```

This ensures:
- Recurring events only show on their designated day
- One-time events show until they expire
- Past events are automatically hidden

---

## Testing Guide

### Test Scenarios

#### 1. Create One-Time Event

**Steps**:
1. Navigate to `/admin/events`
2. Fill in the form:
   - Title: "Test Event"
   - Description: "Test description"
   - Start: Tomorrow at 18:00
   - End: Tomorrow at 20:00
   - Payment URL: https://example.com/pay
   - Button Label: "Buy Tickets"
   - Upload an image
   - Check "Public"
   - Sort Order: 0
3. Click "Save Event"

**Expected Result**:
- Success toast appears
- Event appears in "Active" tab
- Event card shows title, description, times
- Event image appears
- Payment link is clickable
- Badge shows "Active"

**Test User View**:
1. Complete waiver flow up to Rules
2. Accept rules
3. Should see event in `/events` showcase
4. Event card should display correctly
5. "Buy Tickets" button should open payment URL
6. "Continue" button should navigate to `/complete`

---

#### 2. Create Weekly Recurring Event

**Steps**:
1. Navigate to `/admin/events`
2. Fill in the form:
   - Title: "Friday Skate Night"
   - Start: Next Friday at 19:00
   - End: Next Friday at 21:00
   - Recurrence: Weekly
   - Day: Friday (5)
   - Until: 3 months from now
   - Check "Public"
3. Click "Save Event"

**Expected Result**:
- Event shows "Recurring" badge in admin list
- Recurrence details displayed: "Rule: weekly · DOW 5 · until YYYY-MM-DD"

**Test User View**:
1. Check `/events` on a **Friday**:
   - Should see the event
2. Check `/events` on a **Thursday**:
   - Should NOT see the event (only shows on Fridays)
3. Check `/events` after the "Until" date:
   - Should NOT see the event (expired)

---

#### 3. Test Empty State

**Steps**:
1. Ensure no active events in database (delete all or set all to past dates)
2. Complete waiver flow to `/events`

**Expected Result**:
- Calendar emoji (📅) displays
- "No Active Events" heading
- Descriptive message shown
- "Continue" button still works

---

#### 4. Test Event Expiration

**Steps**:
1. Create event with:
   - Start: Yesterday
   - End: Yesterday
2. Check admin events list

**Expected Result**:
- Event appears in "Expired" tab
- Event has "Expired" badge
- Event appears dimmed (opacity: 0.7)

**User View**:
- Event should NOT appear in `/events` showcase

---

#### 5. Test Private Event

**Steps**:
1. Create event
2. Uncheck "Public" checkbox
3. Save event

**Expected Result**:
- Admin list shows "Private" badge
- Event does NOT appear in user `/events` showcase

---

#### 6. Test Image Upload

**Steps**:
1. Create event with square image (e.g., 500x500px)
2. Save event

**Expected Result**:
- Image preview shows in form (96x96px)
- Image appears in admin event card (72x72px)
- Image appears in user event card (full width, 1:1 ratio)
- Image stored at: `backend/public/uploads/events/`

**Test Update**:
1. Edit same event
2. Upload different image
3. Save

**Expected Result**:
- New image replaces old one
- New preview shows
- Old image file remains in uploads folder (manual cleanup required)

---

#### 7. Test Multiple Events Carousel

**Steps**:
1. Create 3-4 active events with different dates
2. Navigate to `/events` as user

**Expected Result**:
- Multiple event cards displayed
- Arrow buttons appear (< >)
- Dot indicators show (one per event)
- Clicking arrows navigates between events
- Clicking dots jumps to specific event
- Active card is larger and highlighted
- Swipe gestures work on mobile

---

#### 8. Test Sort Order

**Steps**:
1. Create Event A with sort_order: 10
2. Create Event B with sort_order: 5
3. Create Event C with sort_order: 15

**Expected Result**:
- Admin list shows: B, A, C (sorted by sort_order)
- User showcase shows: B, A, C

---

#### 9. Test Payment URL Validation

**Steps**:
1. Try to create event with payment URL: "example.com"
2. Click save

**Expected Result**:
- Error toast: "Payment URL must start with http:// or https://"
- Event NOT created

**Valid Test**:
1. Use URL: "https://example.com"
2. Save

**Expected Result**:
- Event created successfully
- Payment link works in admin and user views

---

#### 10. Test End-to-End Flow

**Complete User Journey**:
1. Start at `/` (Welcome Page)
2. Click "New Customer"
3. Register with details
4. Verify phone with OTP
5. Review information
6. Sign waiver
7. Accept rules
8. **Should land on `/events`** ← KEY TEST
9. View events (or empty state)
10. Click "Continue"
11. Should land on `/complete` (All Done page)
12. Countdown finishes
13. Returns to `/` (Welcome Page)

**Verification Points**:
- Step 7 → 8 transition works
- Events load correctly
- Progress indicator shows current step
- Navigation flows properly
- No errors in console

---

### Database Queries for Testing

**Check all events**:
```sql
SELECT id, title, start_at, end_at, recurrence_rule, is_public, sort_order 
FROM events 
ORDER BY sort_order ASC, start_at ASC;
```

**Check active events**:
```sql
SELECT * FROM events 
WHERE is_public = 1 
  AND (end_at >= NOW() OR recurrence_rule <> 'none');
```

**Check recurring events**:
```sql
SELECT * FROM events 
WHERE recurrence_rule = 'weekly';
```

**Delete all events** (for testing):
```sql
DELETE FROM events;
```

---

## Common Issues & Solutions

### Issue 1: Events Not Showing in User Showcase

**Possible Causes**:
- Event is not public (`is_public = 0`)
- Event has expired (`end_at < NOW()`)
- Recurring event doesn't match today's day of week

**Solution**:
1. Check admin interface - is event in "Active" tab?
2. Verify `is_public` checkbox is checked
3. For recurring: Is today the correct day of week?

---

### Issue 2: Image Not Displaying

**Possible Causes**:
- Image path incorrect
- Image file missing from `backend/public/uploads/events/`
- Static file serving not configured

**Solution**:
1. Check `image_url` in database (should be `/uploads/events/filename.ext`)
2. Verify file exists at `backend/public/uploads/events/`
3. Ensure backend `server.js` has:
   ```javascript
   app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
   ```

---

### Issue 3: Recurring Event Shows Every Day

**Cause**: Frontend filtering logic error

**Solution**: Verify `shouldShow()` function checks `isSameDay()` for recurring events

---

### Issue 4: "Continue" Button Not Working

**Cause**: Navigation route missing or incorrect

**Solution**: Verify `EventsShowcase.jsx` has:
```javascript
const handleComplete = () => navigate("/complete");
```

---

## File Reference

### Backend Files
- `backend/controllers/eventController.js` - API logic and recurring event generation
- `backend/routes/` - Event routes configuration (check `server.js` for route registration)
- `backend/public/uploads/events/` - Event image storage
- `backend/server.js` - Static file serving and route setup

### Frontend Files
- `src/pages/EventsShowcase.jsx` - User event showcase
- `src/pages/admin/AddEventsPage.js` - Admin event management
- `src/pages/RuleReminder.js` - Redirects to `/events` after rules acceptance
- `src/App.js` - Route configuration

### Database
- Table: `events`
- Initialization: `backend/controllers/eventController.js` → `initializeEventsTable()`

---

## Summary

The Events System provides a complete solution for managing and showcasing facility events:

✅ **Admin**: Full CRUD operations with filtering and status management  
✅ **Users**: Beautiful showcase integrated into waiver flow  
✅ **Recurring**: Automatic weekly event generation  
✅ **Flexible**: Payment integration, custom buttons, sorting  
✅ **Reliable**: Automatic expiration, public/private control

Use this documentation as a reference for understanding, testing, and maintaining the events feature.
