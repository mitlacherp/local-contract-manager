// Logic to determine backend URL based on current window location
// This ensures LAN access works without recompiling
let protocol = window.location.protocol;
let hostname = window.location.hostname;
const port = 3001; // Backend port

// Handle edge cases where code is run from file:// or blob: (preview environments)
// or when hostname is empty
if (!hostname || protocol === 'blob:' || protocol === 'file:') {
  protocol = 'http:';
  hostname = 'localhost';
}

export const API_BASE_URL = `${protocol}//${hostname}:${port}`;

export const CATEGORIES = [
  'Software License',
  'Consulting',
  'Lease/Rent',
  'Service Agreement',
  'NDA',
  'Employment',
  'Other'
];

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'];