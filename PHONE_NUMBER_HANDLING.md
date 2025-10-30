# Phone Number Handling Documentation

## Overview
This document tracks how phone numbers are handled throughout the application to ensure consistency and prevent masking issues.

## Database Tables with Phone Numbers

### 1. `customers` Table
- **Columns**: `cell_phone`, `home_phone`, `work_phone`, `country_code`
- **Format**: Should store clean digits only (e.g., `1234567890`)
- **Note**: `country_code` stores the international prefix (e.g., `+1`)

### 2. `otps` Table
- **Column**: `phone`
- **Format**: Should store clean digits only (e.g., `1234567890`)
- **Purpose**: Temporary storage for OTP verification (5-minute expiry)

## Frontend Components with Phone Input

### Components with Phone Masking

#### 1. **NewCustomerForm.js** ✅ FIXED
- **Mask**: `(___) ___-____`
- **Library**: `@react-input/mask`
- **Strip Function**: `stripMask(val)` removes all non-digit characters
- **Sends to Backend**:
  - `cell_phone`: Clean digits (e.g., `1234567890`)
  - `cc_cell_phone`: With country code (e.g., `+11234567890`)
- **Fix Applied**: Line 206-210 strips mask before sending to `/api/waivers`

#### 2. **ExistingCustomerLogin.js** ✅ CORRECT
- **Mask**: `(___) ___-____`
- **Library**: `@react-input/mask`
- **Strip Function**: `cleanPhone = phone.replace(/\D/g, "")`
- **Sends to Backend**:
  - `phone`: Clean digits (line 116)
  - `cell_phone`: With country code (line 116)
- **Status**: Already correctly strips mask before sending

#### 3. **ConfirmCustomerInfo.js** ✅ CORRECT
- **Displays**: Formatted phone from database
- **Strip Function**: `stripMask(val)` defined inline (line 93)
- **Sends to Backend**:
  - `cell_phone`: Clean digits stripped before POST to `/api/waivers/update-customer`
- **Status**: Already correctly strips mask before sending

## Backend Endpoints Handling Phone Numbers

### 1. **POST /api/waivers** (Create Waiver)
- **Controller**: `waiverController.js::createWaiver`
- **Receives**: `cell_phone` (should be clean digits), `cc_cell_phone` (with country code)
- **Stores in DB**:
  - `customers.cell_phone`: Uses `cell_phone` parameter
  - `otps.phone`: Uses `cell_phone` when creating OTP (line 149, 155)
- **Status**: ✅ Correctly handles clean phone numbers

### 2. **POST /api/waivers/update-customer** (Update Customer)
- **Controller**: `waiverController.js::updateCustomer`
- **Receives**: `cell_phone` (should be clean digits)
- **Stores in DB**: `customers.cell_phone` (line 327, 338)
- **Status**: ✅ Correctly handles clean phone numbers

### 3. **POST /api/auth/send-otp** (Send OTP)
- **Controller**: `authController.js::sendOtp`
- **Receives**: `phone` (should be clean digits)
- **Queries DB**: Checks `customers.cell_phone = phone` (line 33-34)
- **Stores in DB**: `otps.phone` (line 55-56)
- **Status**: ✅ Correctly handles clean phone numbers

### 4. **POST /api/auth/verify-otp** (Verify OTP)
- **Controller**: `authController.js::verifyOtp`
- **Receives**: `phone` (should be clean digits), `otp`
- **Queries DB**: Checks `otps.phone = phone AND otp = otp` (line 132-135)
- **Status**: ✅ Correctly handles clean phone numbers

### 5. **GET /api/waivers/customer-info** (Get Customer Info)
- **Controller**: `waiverController.js::getCustomerInfo`
- **Receives**: `phone` query parameter (clean digits)
- **Queries DB**: `customers.cell_phone = phone` (line 248-249)
- **Returns**: Phone numbers from database (may be formatted by frontend)
- **Status**: ✅ Correctly handles clean phone numbers

## Best Practices

### Frontend Guidelines
1. **Always use mask for user input** - Improves UX with formatted display
2. **Always strip mask before API calls** - Use `stripMask()` or `.replace(/\D/g, "")`
3. **Store masked values in component state** - For display purposes only
4. **Send clean digits to backend** - Never send formatted strings like `(123) 456-7890`

### Backend Guidelines
1. **Store phone numbers as clean digits** - No formatting characters
2. **Validate phone number length** - Should be exactly 10 digits for US numbers
3. **Use regex validation** - `if (!/^\d{10}$/.test(phone))` for clean numbers
4. **Store country codes separately** - Use `country_code` column for international prefix

### Example Code Pattern

```javascript
// Frontend - Component State
const [phone, setPhone] = useState("");  // Stores masked: "(123) 456-7890"

// Frontend - Sending to API
const cleanPhone = phone.replace(/\D/g, "");  // Clean: "1234567890"
await axios.post('/api/endpoint', { 
  cell_phone: cleanPhone  // ✅ Send clean digits only
});

// Backend - Storing in Database
const { cell_phone } = req.body;  // Should be: "1234567890"
await db.query(
  'INSERT INTO customers (cell_phone) VALUES (?)',
  [cell_phone]  // ✅ Store clean digits only
);
```

## Known Issues (RESOLVED)

### Issue #1: OTP Verification Failed for New Customers ✅ FIXED
- **Date**: October 27, 2025
- **Problem**: NewCustomerForm was sending masked phone numbers to backend
- **Symptom**: OTP stored as `(123) 456-7890` but verification looked for `1234567890`
- **Root Cause**: `fullData` spread included masked `cell_phone` from `formData`
- **Fix**: Added `cell_phone: cleanPhone` to `fullData` object (line 210)
- **Status**: RESOLVED - All new waivers now store clean phone numbers

## Testing Checklist

When testing phone number functionality:

- [ ] New customer waiver creates OTP with clean phone number
- [ ] OTP verification matches phone numbers correctly
- [ ] Existing customer login sends clean phone to OTP
- [ ] Customer info update strips mask before sending
- [ ] Phone numbers display formatted in UI (with mask)
- [ ] Phone numbers stored without formatting in database
- [ ] Country codes stored separately in `country_code` column
- [ ] SMS/Twilio uses full phone with country code (`+11234567890`)

## Maintenance Notes

### When Adding New Phone Input Fields
1. Use `@react-input/mask` with pattern `(___) ___-____`
2. Create `stripMask` function to remove formatting
3. Strip mask before all API calls
4. Store clean digits in database
5. Format for display only

### When Querying Phone Numbers
1. Always use clean digits in WHERE clauses
2. Format for display in frontend after retrieval
3. Never query with formatted strings like `(123) 456-7890`

## Summary

✅ All frontend components correctly strip phone masking before API calls  
✅ All backend endpoints expect and store clean phone numbers  
✅ Database stores phone numbers as clean 10-digit strings  
✅ Phone masking is UI-only for better user experience  
✅ OTP verification correctly matches phone numbers  

**Status**: Phone number handling is now consistent throughout the application.
