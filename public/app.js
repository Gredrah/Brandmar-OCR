/**
 * @file app.js
 * @description Client-side logic for the Distributor OCR Processor.
 *
 * ============================================================================
 * ATTN HTML DEVELOPER (PARTNER INSTRUCTIONS):
 * ============================================================================
 * For this script to function, your HTML MUST include the following element IDs:
 * * 1. 'ocr-form'       -> The <form> element wrapping the inputs.
 * 2. 'receipts'       -> The <input type="file" multiple> element.
 * (Tip: add the `accept="image/*"` attribute)
 * 3. 'submit-btn'     -> The <button type="submit"> element.
 * 4. 'status-message' -> A <div> or <span> to display loading/error text.
 * 5. 'json-output'    -> A <pre> or <code> block to display the formatted JSON.
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Hook into the form
    const ocrForm = document.getElementById('ocr-form');

    // Safety check to ensure the HTML partner set up the IDs correctly
    if (!ocrForm) {
        console.error("Initialization Error: Could not find form with ID 'ocr-form'. Check HTML IDs.");
        return;
    }

    // 2. Listen for the form submission
    ocrForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent standard page reload

        // Grab the rest of the required DOM elements
        const fileInput = document.getElementById('receipts');
        const submitBtn = document.getElementById('submit-btn');
        const statusMsg = document.getElementById('status-message');
        const jsonOutput = document.getElementById('json-output');

        const files = fileInput.files;

        // --- 3. Client-Side Validation (Fail Fast) ---
        if (files.length === 0) {
            statusMsg.innerHTML = '<span style="color: red; font-weight: bold;">Please select at least one receipt image.</span>';
            return;
        }

        if (files.length > 3) {
            statusMsg.innerHTML = '<span style="color: red; font-weight: bold;">Too many files! Please select a maximum of 3.</span>';
            fileInput.value = ''; // Clear the invalid selection
            return;
        }

        // --- 4. UI State Update (Loading Mode) ---
        submitBtn.disabled = true;
        statusMsg.innerText = "Uploading and processing with Vision AI... This may take a few seconds.";
        jsonOutput.innerText = "Processing...";

        // --- 5. Prepare Data for the Cloudflare API ---
        const formData = new FormData();
        for (const element of files) {
            formData.append('receipts', element);
        }

        // --- 6. Call the Backend ---
        try {
            // This calls the endpoint mapped to webapp/functions/process.js
            const response = await fetch('/api/process', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            // Catch HTTP errors from our Worker (like the 400 Bad Request)
            if (!response.ok) {
                throw new Error(data.error || `Server returned status ${response.status}`);
            }

            // --- 7. Handle Success & DOM Updates ---
            statusMsg.innerText = "Processing Complete!";

            // // Display visual warning if the backend flagged inconsistent dates
            // if (data.metadata && data.metadata.dates_consistent === false) {
            //     statusMsg.innerHTML += '<br><span style="color: red; font-weight: bold;">WARNING: Dates did not match across receipts. Financial data was nullified to prevent errors.</span>';
            // }

            // Pretty-print the JSON output into the HTML
            jsonOutput.innerText = JSON.stringify(data, null, 2);

        } catch (error) {
            // --- 8. Handle Network or Server Errors ---
            statusMsg.innerHTML = `<span style="color: red; font-weight: bold;">Error: ${error.message}</span>`;
            jsonOutput.innerText = "{}";
        } finally {
            // Always re-enable the submit button so the user can try again
            submitBtn.disabled = false;
        }
    });
});