import fetch from 'node-fetch';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs';

const OLLAMA_URL = 'http://localhost:11434/api/chat';
const DEFAULT_MODEL = 'llama3'; 

/**
 * Extracts raw text from uploaded files (PDF/DOCX/TXT)
 */
export async function extractTextFromFile(file) {
    try {
        if (file.mimetype === 'application/pdf') {
            const dataBuffer = fs.readFileSync(file.path);
            const data = await pdf(dataBuffer);
            return data.text;
        } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ path: file.path });
            return result.value;
        } else {
            // Plain text fallback
            return fs.readFileSync(file.path, 'utf8');
        }
    } catch (error) {
        console.error("File extraction error:", error);
        throw new Error("Could not extract text from file.");
    }
}

/**
 * Robustly extracts contract data using Ollama.
 * Handles non-JSON output, markdown blocks, and connection errors.
 */
export async function extractContractData(text, modelName = DEFAULT_MODEL) {
  // 1. Performance: Truncate input to prevent context overflow (approx 15k chars)
  const truncatedText = text ? text.substring(0, 15000) : "";

  if (!truncatedText) {
      return { success: false, error: "No text provided for analysis." };
  }

  const systemPrompt = `
    You are an expert legal API assistant.
    Your task is to analyze the provided contract text and extract specific metadata into a strictly valid JSON object.
    
    Output Format: JSON ONLY. No markdown, no conversational text, no preambles.
    
    Fields to extract:
    - title (string): A short, descriptive title of the contract.
    - partner_name (string): Name of the counterparty/company.
    - start_date (string): YYYY-MM-DD format.
    - end_date (string): YYYY-MM-DD format.
    - cost_amount (number): The total value or monthly cost (numeric only).
    - cost_currency (string): ISO currency code (e.g., EUR, USD).
    - notice_period_days (number): Notice period in days.
    - responsible_person (string): Name of the internal owner.
    - category (string): Suggest one: 'Software License', 'Consulting', 'Lease/Rent', 'NDA', 'Employment', 'Other'.
    
    If a field cannot be found, use null.
  `;

  try {
    // 2. Network Call
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: truncatedText }
        ],
        stream: false, // Non-streaming for easier parsing
        options: {
            temperature: 0.1, // Low temperature for deterministic output
            num_ctx: 4096     // Ensure enough context window
        }
      })
    });

    if (!response.ok) {
        throw new Error(`Ollama API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const rawContent = data.message?.content || "";

    // 3. Robust JSON Extraction
    // Logic: Find the first '{' and the last '}' to isolate the JSON object
    // ignoring any text before or after (like "Here is your JSON: ...")
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
        throw new Error("Model did not return a valid JSON object structure.");
    }

    let cleanJsonString = jsonMatch[0];

    // 4. Parse JSON
    try {
        const parsedData = JSON.parse(cleanJsonString);
        return { success: true, data: parsedData };
    } catch (parseError) {
        // Fallback: Try to clean common trailing commas or errors if strictly necessary
        // For now, return specific error
        console.error("JSON Parse Error on:", cleanJsonString);
        return { 
            success: false, 
            error: "Failed to parse model output as JSON.", 
            rawResponse: rawContent 
        };
    }

  } catch (error) {
    console.error("AI Service Error:", error.message);
    // 5. Graceful Error Return (Never crash the server)
    return { 
        success: false, 
        error: error.message || "Unknown error during AI processing."
    };
  }
}