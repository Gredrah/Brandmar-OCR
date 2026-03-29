// webapp/functions/api/workbooks.js

function getCookie(request, name) {
    const cookieString = request.headers.get('Cookie');
    if (!cookieString) return null;
    const match = cookieString.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}

export async function onRequestGet(context) {
    try {
        // 1. Session & Auth Check
        const sessionId = getCookie(context.request, 'session_id');
        if (!sessionId) {
            return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
        }

        const accessToken = await context.env.AUTH_KV.get(`session:${sessionId}`);
        if (!accessToken) {
            return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
        }

        // 2. Build the Google Drive Search Query
        // We filter for spreadsheets, exclude the trash, and look for your specific naming scheme
        const searchQuery = "mimeType='application/vnd.google-apps.spreadsheet' and name contains 'Brandmar Holdings' and trashed=false";
        
        // URL encode the query so it travels safely over HTTP
        const encodedQuery = encodeURIComponent(searchQuery);
        
        // Request only the ID and Name fields to keep the payload tiny and fast, ordered newest first
        const driveApiUrl = `https://www.googleapis.com/drive/v3/files?q=${encodedQuery}&fields=files(id,name)&orderBy=createdTime desc`;

        const response = await fetch(driveApiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Google Drive API Error: ${errorText}`);
        }

        const data = await response.json();

        // 3. Return the array of files directly to the frontend
        return new Response(JSON.stringify(data.files || []), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}