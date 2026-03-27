import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from "@google/genai";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { fileURLToPath } from 'node:url';

dotenv.config();

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const PORT = process.env.PORT || 3000;

// Initialize the AI client once (Singleton) to prevent recreation on every request
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const EXTRACTION_PROMPT = `
  You will receive images of three types of receipts: 'Distributor's Summary', 'Distributor's Gross Profit', and 'Payments Received'.
  
  Extract the data into the following JSON format. Ensure all currency values are Numbers (not strings) and dates are MM/DD/YYYY.

  JSON Structure:
  {
    "distributor_summary": {
      "date": "MM/DD/YYYY",
      "gst_hst_charged": 0.0,
      "total_absorptions_odf": 0.0, 
      "total_absorptions_dist": 0.0,
      "total_old_dutch_credits": 0.0
    },
    "gross_profit": {
      "date": "MM/DD/YYYY",
      "distributor_gross_profit": 0.0
    },
    "payments_received": {
      "date": "MM/DD/YYYY",
      "total_cash": 0.0,
      "total_check": 0.0
    },
    "metadata": {
      "dates_consistent": boolean
    }
  }

  Specific Extraction Rules:
  1. For 'Distributor's Summary':
     - 'total_absorptions_odf' is the value in the 'TOTAL' row under the 'ODF' column.
     - 'total_absorptions_dist' is the value in the 'TOTAL' row under the 'DIST' column.
     - 'total_old_dutch_credits' is found next to 'TOTAL OLD DUTCH CREDITS'.
  2. For 'Distributor's Gross Profit':
     - 'distributor_gross_profit' is the final value labeled 'DISTRIBUTOR'S GROSS PROFIT'.
  3. Date Validation:
     - Compare the dates across all provided receipts. 
     - Set 'dates_consistent' to true only if all extracted dates match exactly.
     - If dates do NOT match, set 'dates_consistent' to false and return null for ALL other fields.
  4. General:
     - If a receipt type or specific field is not found, return null for that field.
`;

// ============================================================================
// CORE SERVICE LOGIC
// ============================================================================

/**
 * Processes an array of base64 images through the Gemini API for data extraction.
 * @param {Array<{base64: string, mimeType: string}>} images 
 * @returns {Promise<Object>} Extracted JSON data
 */
async function processReceipts(images) {
  if (!images || !Array.isArray(images) || images.length === 0) {
    throw new Error("Invalid input: An array of images is required.");
  }

  const imageParts = images.map(img => ({
    inlineData: { data: img.base64, mimeType: img.mimeType }
  }));

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      config: { 
        responseMimeType: "application/json",
        temperature: 0.1 // Added for more deterministic, factual extraction
      },
      contents: [
        {
          role: "user",
          parts: [{ text: EXTRACTION_PROMPT }, ...imageParts]
        }
      ]
    });

    return JSON.parse(response.text);
    
  } catch (error) {
    console.error("[OCR Service Error]:", error);
    throw new Error("Failed to process receipts or parse AI response.");
  }
}

// ============================================================================
// EXPRESS SERVER SETUP
// ============================================================================

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Crucial for handling large base64 arrays

// Routes
app.post('/api/ocr', async (req, res) => {
  try {
    const { images } = req.body;
    const data = await processReceipts(images);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// Health check endpoint for deployment monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ============================================================================
// INITIALIZATION (SERVER OR CLI)
// ============================================================================

// Check if the file is being run directly (e.g., node ocr.js path/to/image.jpg)
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
const hasCliArgs = process.argv.length > 2;

if (isMainModule && hasCliArgs) {
  // --- TERMINAL TESTING MODE ---
  const filePaths = process.argv.slice(2);
  console.log(`\n--- Testing OCR Extraction on ${filePaths.length} files ---\n`);

  const imagesForAI = filePaths.map(filePath => {
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).replace('.', '').toLowerCase();
    const mimeType = (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : 'image/png';

    return { base64: buffer.toString('base64'), mimeType };
  });

  // Use top-level await for CLI mode
  try {
    const data = await processReceipts(imagesForAI);
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }

} else if (isMainModule) {
  // --- SERVER MODE ---
  app.listen(PORT, () => {
    console.log(`🚀 OCR API Server running on http://localhost:${PORT}`);
    console.log(`Test health at http://localhost:${PORT}/health`);
  });
}