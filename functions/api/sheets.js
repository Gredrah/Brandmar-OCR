// webapp/functions/api/sheets.js

function getCookie(request, name) {
    const cookieString = request.headers.get('Cookie');
    if (!cookieString) return null;
    const match = cookieString.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}

export async function onRequestPost(context) {
    try {
        const payload = await context.request.json();
        
        const sessionId = getCookie(context.request, 'session_id');
        if (!sessionId) {
            return new Response(JSON.stringify({ error: "Unauthorized. Please log in first." }), { status: 401 });
        }

        const accessToken = await context.env.AUTH_KV.get(`session:${sessionId}`);
        if (!accessToken) {
            return new Response(JSON.stringify({ error: "Session expired. Please log in again." }), { status: 401 });
        }

        // 1. Parse the date to target the correct Monthly Sheet and Row
        // Assumes date format is MM/DD/YYYY from Gemini
        const dateStr = payload.distributor_summary?.date || payload.gross_profit?.date;
        if (!dateStr) throw new Error("No date found in OCR results.");

        const [mStr, dStr, yStr] = dateStr.split('/');
        const monthIndex = parseInt(mStr) - 1;
        const day = parseInt(dStr);
        const year = yStr;

        const monthNames = [
            "January", "Febuary", "March", "April", "May", "June", 
            "July", "August", "September", "October", "November", "December"
        ];
        
        // Construct sheet name (e.g., "March 2026")
        const sheetName = `${monthNames[monthIndex]} ${year}`;
        
        // Calculate Row: Day 1 is row 3 in your sample (after headers)
        const targetRow = day + 2; 

        // 2. Map data to your specific template columns:
        // Based on your CSV, data starts at Column K (OD Absorptions) 
        // through Column S (Cash)
        const range = `${sheetName}!K${targetRow}:S${targetRow}`;

        const rowValues = [
            payload.distributor_summary?.total_absorptions_odf || 0,   // Col K
            payload.distributor_summary?.total_absorptions_dist || 0,  // Col L
            payload.distributor_summary?.gst_hst_charged || 0,         // Col M
            "", // Col N (Cash Collected/Empty)
            payload.payments_received?.total_check || 0,               // Col O
            payload.distributor_summary?.total_old_dutch_credits || 0, // Col P
            "", // Col Q (Kristi's Magic)
            payload.gross_profit?.distributor_gross_profit || 0,       // Col R
            payload.payments_received?.total_cash || 0                 // Col S
        ];

        // 3. Update the specific row using PUT
        const spreadsheetId = context.env.TARGET_SPREADSHEET_ID;
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                values: [rowValues]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Google API Error: ${errorText}`);
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}