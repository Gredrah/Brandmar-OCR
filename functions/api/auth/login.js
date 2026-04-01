// webapp/functions/api/auth/login.js

// Authorization Endpoint: GET /api/auth/login
// Usage: redirect user to a direct link in the HTML (e.g., <a href="/api/auth/login">). 
// Description: Initiates the Google OAuth2 flow by redirecting the user to Google's consent screen.
// Note: The actual handling of the OAuth callback and token exchange is done in /api/auth/callback.js.
// Security: We generate a random state parameter to protect against CSRF attacks and store it in an HttpOnly cookie for later verification in the callback.
// (Required for verification in Google API Console)

export async function onRequestGet(context) {
    const clientId = context.env.GOOGLE_CLIENT_ID;
    const redirectUri = context.env.GOOGLE_REDIRECT_URI;
    const state = crypto.randomUUID();
    
    const scope = 'https://www.googleapis.com/auth/drive.file';
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;
    
    const headers = new Headers();
    headers.append('Location', authUrl);
    
    // Prevent browser from caching 302 redirect responses to avoid issues with stale state parameters
    headers.append('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    headers.append('Pragma', 'no-cache');
    
    headers.append('Set-Cookie', `oauth_state=${state}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=600`);

    return new Response(null, { status: 302, headers: headers });
}