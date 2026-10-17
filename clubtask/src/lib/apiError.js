// Turns a failed API response into a message that is safe to show to users.
// Server error bodies are never shown, so internal details and secrets stay hidden.
export function apiErrorMessage(res) {
  if (!res) return 'Could not reach the server. Check your connection and try again.'
  if (res.status === 401) return 'Your session has expired. Please log in again.'
  if (res.status === 403) return "You don't have permission to view this."
  if (res.status === 404) return 'The requested data could not be found.'
  if (res.status >= 500) return 'The server ran into a problem. Please try again in a moment.'
  return 'Something went wrong while loading. Please try again.'
}
