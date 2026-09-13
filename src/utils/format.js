// Shared formatting utilities

export function formatPrice(price) {
  if (price == null) return '—'
  if (price >= 10_000_000) return `₹${(price / 10_000_000).toFixed(2)} Cr`
  if (price >= 100_000) return `₹${(price / 100_000).toFixed(2)} L`
  return `₹${price.toLocaleString('en-IN')}`
}

// Project price_min / price_max are NOT in rupees (docs wrong).
// Values < 15 appear to be in crores; values > 15 appear to be in lakhs.
export function formatProjectPrice(value) {
  if (!value && value !== 0) return '—'
  if (value < 15) return `₹${value.toFixed(2)} Cr`
  return `₹${value.toFixed(1)} L`
}

export function formatArea(sqft) {
  if (!sqft) return '—'
  return `${sqft.toLocaleString('en-IN')} sqft`
}

export function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
