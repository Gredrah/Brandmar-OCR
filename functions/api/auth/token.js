// webapp/functions/api/auth/token.js
import './authHelpers.js';

// Token Endpoint: GET /api/auth/token
// Usage: Called by the frontend to retrieve the Google API access token for the current session. 
// This token is required to initialize the Google Picker and make authorized API calls.
// Description: Validates the session cookie, retrieves the associated access token from Cloudflare KV, and returns it to the frontend.
// Security: This endpoint checks for a valid session cookie and returns a 401 Unauthorized response if the session is invalid or expired. 
// The access token is never stored in a client-accessible cookie and is only returned in the response body if the session is valid.
export async function onRequestGet(context) {
    const sessionId = getCookie(context.request, 'session_id');
    if (!sessionId) {
        return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
    }

    const accessToken = await context.env.AUTH_KV.get(`session:${sessionId}`);
    if (!accessToken) {
        return new Response(JSON.stringify({ error: "session expired" }), { status: 401 });
    }

    return new Response(JSON.stringify({ access_token: accessToken }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}