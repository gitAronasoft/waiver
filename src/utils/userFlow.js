
/**
 * User Flow Tracking Utility
 * Manages persistent storage for user flow (existing vs new customer)
 */

export const USER_FLOW_KEY = "userFlow";

export const UserFlowType = {
  EXISTING: "existing",
  NEW: "new"
};

/**
 * Set the current user flow type
 * @param {string} flowType - "existing" or "new"
 */
export const setUserFlow = (flowType) => {
  localStorage.setItem(USER_FLOW_KEY, flowType);
};

/**
 * Get the current user flow type
 * @returns {string|null} - "existing", "new", or null if not set
 */
export const getUserFlow = () => {
  return localStorage.getItem(USER_FLOW_KEY);
};

/**
 * Check if current flow is for existing customer
 * @returns {boolean}
 */
export const isExistingCustomerFlow = () => {
  return getUserFlow() === UserFlowType.EXISTING;
};

/**
 * Check if current flow is for new customer
 * @returns {boolean}
 */
export const isNewCustomerFlow = () => {
  return getUserFlow() === UserFlowType.NEW;
};

/**
 * Clear the user flow (call on logout)
 */
export const clearUserFlow = () => {
  localStorage.removeItem(USER_FLOW_KEY);
};

/**
 * Clear all session data including flow tracking
 */
export const clearAllSessionData = () => {
  localStorage.removeItem(USER_FLOW_KEY);
  localStorage.removeItem("signatureForm");
  localStorage.removeItem("customerForm");
};
