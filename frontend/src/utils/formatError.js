/**
 * Safely extracts human-readable error text string from API responses, objects, or errors
 * to prevent React Error #31 (rendering objects as React children).
 */
export function formatError(err, defaultMsg = 'An unexpected error occurred. Please try again.') {
  if (!err) return '';
  if (typeof err === 'string') return err;
  
  // Extract response data from Axios errors
  const data = err.response?.data || err.data || err;
  
  if (typeof data === 'string') return data;
  if (data?.error && typeof data.error === 'string') return data.error;
  if (data?.message && typeof data.message === 'string') return data.message;
  if (data?.error?.message && typeof data.error.message === 'string') return data.error.message;
  if (err.message && typeof err.message === 'string') return err.message;
  
  return defaultMsg;
}
