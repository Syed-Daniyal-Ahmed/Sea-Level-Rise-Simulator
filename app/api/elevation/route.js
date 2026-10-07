const GOOGLE_ELEVATION_URL = 'https://maps.googleapis.com/maps/api/elevation/json';
const GOOGLE_MAX_LOCATIONS = 512;

function providerError(status, providerMessage, apiKey) {
  const guidance = {
    REQUEST_DENIED: 'Check that Elevation API is enabled and the server key is permitted to use it.',
    OVER_QUERY_LIMIT: 'Google reports that the request quota or rate limit has been exceeded.',
    INVALID_REQUEST: 'Google rejected the locations parameter as invalid.',
    ZERO_RESULTS: 'Google returned no elevation results for these locations.',
    UNKNOWN_ERROR: 'Google encountered a temporary error. Try again.',
  };

  const safeProviderMessage = typeof providerMessage === 'string'
    ? providerMessage.replaceAll(apiKey, '[redacted]').slice(0, 300)
    : undefined;

  return {
    error: `Google Elevation API returned ${status}. ${guidance[status] || 'Check the Google Cloud API status and key configuration.'}`,
    providerStatus: status,
    ...(safeProviderMessage ? { details: safeProviderMessage } : {}),
  };
}

function isValidLocation(location) {
  return (
    location &&
    typeof location.lat === 'number' &&
    Number.isFinite(location.lat) &&
    location.lat >= -90 &&
    location.lat <= 90 &&
    typeof location.lng === 'number' &&
    Number.isFinite(location.lng) &&
    location.lng >= -180 &&
    location.lng <= 180
  );
}

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const { locations } = body ?? {};
  if (!Array.isArray(locations) || locations.length === 0) {
    return Response.json({ error: 'Provide a non-empty locations array.' }, { status: 400 });
  }

  if (!locations.every(isValidLocation)) {
    return Response.json(
      { error: 'Each location must contain valid latitude and longitude values.' },
      { status: 400 },
    );
  }

  const apiKey = process.env.GOOGLE_ELEVATION_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Elevation service is not configured.' }, { status: 500 });
  }

  const results = [];

  try {
    for (let start = 0; start < locations.length; start += GOOGLE_MAX_LOCATIONS) {
      const batch = locations.slice(start, start + GOOGLE_MAX_LOCATIONS);
      const params = new URLSearchParams({
        locations: batch
          .map(({ lat, lng }) => `${lat.toFixed(8)},${lng.toFixed(8)}`)
          .join('|'),
        key: apiKey,
      });
      const response = await fetch(`${GOOGLE_ELEVATION_URL}?${params}`);

      if (!response.ok) {
        return Response.json(providerError(`HTTP_${response.status}`, null, apiKey), { status: 502 });
      }

      const data = await response.json();
      if (data.status !== 'OK' || !Array.isArray(data.results)) {
        return Response.json(
          providerError(data.status || 'INVALID_RESPONSE', data.error_message, apiKey),
          { status: 502 },
        );
      }

      results.push(...data.results.map(({ elevation, location, resolution }) => ({
        elevation,
        location,
        resolution,
      })));
    }
  } catch {
    return Response.json({ error: 'Unable to reach the elevation provider.' }, { status: 502 });
  }

  return Response.json({ results });
}