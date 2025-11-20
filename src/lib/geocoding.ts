/**
 * Geocoding utilities using Nominatim (OpenStreetMap)
 * Free geocoding API with rate limiting (1 request per second)
 */

export type GeocodingResult = {
  lat: number
  lon: number
  display_name: string
  address?: {
    road?: string
    city?: string
    state?: string
    country?: string
  }
  place_id: string
  type: string
  importance: number
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const USER_AGENT = 'TSPFront/1.0' // Required by Nominatim

// Rate limiting: 1 request per second
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 1000

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => 
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    )
  }
  
  lastRequestTime = Date.now()
  
  return fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
    },
  })
}

/**
 * Search for locations by name/address
 * @param query - Search query (e.g., "Kathmandu", "Patan Durbar Square")
 * @param limit - Maximum number of results (default: 5)
 * @param countryCode - Optional country code to limit results (e.g., "np" for Nepal)
 */
export async function searchLocation(
  query: string,
  limit: number = 5,
  countryCode?: string
): Promise<GeocodingResult[]> {
  if (!query.trim()) {
    return []
  }

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: limit.toString(),
    addressdetails: '1',
  })

  if (countryCode) {
    params.append('countrycodes', countryCode)
  }

  try {
    const response = await rateLimitedFetch(
      `${NOMINATIM_BASE}/search?${params.toString()}`
    )
    
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.map((item: any) => ({
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      display_name: item.display_name,
      address: item.address,
      place_id: item.place_id,
      type: item.type,
      importance: item.importance,
    }))
  } catch (error) {
    console.error('Geocoding search error:', error)
    throw error
  }
}

/**
 * Reverse geocoding - get place name from coordinates
 * @param lat - Latitude
 * @param lng - Longitude
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodingResult | null> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lng.toString(),
    format: 'json',
    addressdetails: '1',
  })

  try {
    const response = await rateLimitedFetch(
      `${NOMINATIM_BASE}/reverse?${params.toString()}`
    )
    
    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.error) {
      return null
    }

    return {
      lat: parseFloat(data.lat),
      lon: parseFloat(data.lon),
      display_name: data.display_name,
      address: data.address,
      place_id: data.place_id,
      type: data.type,
      importance: data.importance || 0,
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}

/**
 * Format address for display
 */
export function formatAddress(result: GeocodingResult): string {
  if (result.address) {
    const parts = [
      result.address.road,
      result.address.city || result.address.state,
      result.address.country,
    ].filter(Boolean)
    
    if (parts.length > 0) {
      return parts.join(', ')
    }
  }
  
  return result.display_name
}
