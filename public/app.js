/**
 * @file app.js
 * @description Client-side logic for the Distributor OCR Processor.
 */

// Native Image Compression for Token Reduction
async function compressImage(file, maxDimension = 1200, quality = 0.85) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > height && width > maxDimension) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                } else if (height > maxDimension) {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    }));
                }, 'image/jpeg', quality);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
}

// Helper to render compressed images to the DOM for debugging
function renderDebugImages(compressedFiles) {
    let debugContainer = document.getElementById('debug-images');
    if (!debugContainer) {
        debugContainer = document.createElement('div');
        debugContainer.id = 'debug-images';
        debugContainer.style.marginTop = '20px';
        debugContainer.style.display = 'flex';
        debugContainer.style.gap = '10px';
        debugContainer.style.overflowX = 'auto';
        document.getElementById('ocr-form').after(debugContainer);
    }
    
    debugContainer.innerHTML = '<h4>Debug: Compressed Images Sent to AI</h4>';
    
    compressedFiles.forEach(file => {
        const imgUrl = URL.createObjectURL(file);
        const imgElem = document.createElement('img');
        imgElem.src = imgUrl;
        imgElem.style.maxHeight = '200px';
        imgElem.style.border = '1px solid #ccc';
        imgElem.title = `Size: ${(file.size / 1024).toFixed(1)} KB`;
        debugContainer.appendChild(imgElem);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const ocrForm = document.getElementById('ocr-form');
    const exportBtn = document.getElementById('export-btn');
    const jsonOutput = document.getElementById('json-output');
    const statusMsg = document.getElementById('status-message');

    if (!ocrForm) return;

    // --- LISTENER 1: Handle OCR Image Submission ---
    ocrForm.addEventListener('submit', async (event) => {
        event.preventDefault(); 

        const fileInput = document.getElementById('receipts');
        const submitBtn = document.getElementById('submit-btn');
        const files = Array.from(fileInput.files);

        if (files.length === 0) {
            statusMsg.innerHTML = '<span style="color: red; font-weight: bold;">Please select at least one receipt image.</span>';
            return;
        }

        if (files.length > 3) {
            statusMsg.innerHTML = '<span style="color: red; font-weight: bold;">Too many files! Please select a maximum of 3.</span>';
            fileInput.value = ''; 
            return;
        }

        submitBtn.disabled = true;
        exportBtn.style.display = 'none'; // Hide export button during new upload
        jsonOutput.value = "Compressing images..."; // Changed to .value for textarea
        
        try {
            const formData = new FormData();
            const compressedFiles = [];

            for (const element of files) {
                const compressedFile = await compressImage(element);
                compressedFiles.push(compressedFile);
                formData.append('receipts', compressedFile); 
            }

            renderDebugImages(compressedFiles);
            statusMsg.innerText = "Sending batch to Gemini Flash...";

            const response = await fetch('/api/process', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `Server returned status ${response.status}`);
            }

            // Write results to the textarea and show the export button
            jsonOutput.value = JSON.stringify(data, null, 2);
            statusMsg.innerHTML = '<span style="color: green; font-weight: bold;">Processing Complete! Review the data below.</span>';
            exportBtn.style.display = 'block';

        } catch (error) {
            statusMsg.innerHTML = `<span style="color: red; font-weight: bold;">Error: ${error.message}</span>`;
            jsonOutput.value = "";
        } finally {
            submitBtn.disabled = false;
        }
    });

    // --- LISTENER 2: Handle Exporting to Google Sheets ---
    exportBtn.addEventListener('click', async () => {
        const rawEditedData = jsonOutput.value;

        let finalPayload;

        try {
            finalPayload = JSON.parse(rawEditedData);
        } catch (error) {
            statusMsg.innerHTML = '<span style="color: red; font-weight: bold;">Error: Invalid JSON format. Please check your edits.</span>';
            return;
        }

        exportBtn.disabled = true;
        statusMsg.innerText = "Sending to Google Sheets...";

        try {
            const response = await fetch('/api/sheets', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(finalPayload)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to push to Sheets");
            }

            statusMsg.innerHTML = '<span style="color: green; font-weight: bold;">Successfully added to Google Sheets!</span>';
            
        } catch (error) {
            statusMsg.innerHTML = `<span style="color: red; font-weight: bold;">Export Error: ${error.message}</span>`;
        } finally {
            exportBtn.disabled = false;
        }
    });
});