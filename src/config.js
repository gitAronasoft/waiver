// Backend configuration
const getBackendURL = () => {
  // In production/Replit environment, use the same domain
  if (window.location.hostname.includes('replit.dev') || window.location.hostname.includes('repl.co')) {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  
  // For local development
  return process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';
};

export const BACKEND_URL = getBackendURL();
export const GOOGLE_REVIEW_LINK = process.env.REACT_APP_GOOGLE_REVIEW_LINK || 'https://g.page/r/YOUR_GOOGLE_REVIEW_LINK/review';
