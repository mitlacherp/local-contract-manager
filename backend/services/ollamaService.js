import fetch from 'node-fetch';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs';

const OLLAMA_URL = 'http://localhost:11434/api/chat';
// Allow dynamic model selection later via settings, defaulting to llama3
let DEFAULT_MODEL = 'llama3'; 

export async function extractTextFromFile(file) {
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
}

export async function extractContractData(text, modelName = DEFAULT_MODEL) {
  // Truncate text if too long for simple context (approx 15000 chars ~ 4k tokens)
  // Llama3 has larger context but let's be safe for local performance
  const truncatedText = text.substring(0, 15000);

  const systemPrompt = `
    You are a legal assistant API. 
    Extract the following fields from the contract text:
    - title (a short summary title)
    - partner_name
    - start_date (YYYY-MM-DD)
    - end_date (YYYY-MM-DD)
    - cost_amount (number only)
    - cost_currency (e.g. EUR, USD)
    - notice_period_days (number)
    - responsible_person
    
    Return ONLY a valid JSON object. Do not include markdown formatting or explanations.
    If a field is not found, omit it or use null.
  `;

  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: truncatedText }
        ],
        stream: false,
        options: {
            temperature: 0.1 
        }
      })
    });

    if (!response.ok) {
        throw new Error(`Ollama Error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.message.content;
    const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Ollama Service Error:", error);
    throw error;
  }
}