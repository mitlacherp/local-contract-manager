import fetch from 'node-fetch';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs';

const OLLAMA_URL = 'http://localhost:11434/api/chat';
let DEFAULT_MODEL = 'llama3.1'; 

export async function extractTextFromFile(file) {
    if (file.mimetype === 'application/pdf') {
        const dataBuffer = fs.readFileSync(file.path);
        const data = await pdf(dataBuffer);
        return data.text;
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ path: file.path });
        return result.value;
    } else {
        return fs.readFileSync(file.path, 'utf8');
    }
}

export async function extractContractData(text, modelName = DEFAULT_MODEL) {
    const truncatedText = text.substring(0, 15000);

    const systemPrompt = `
        You are a legal assistant API. 
        Extract the following fields from the contract text:
        - title
        - partner_name
        - start_date
        - end_date
        - cost_amount
        - cost_currency
        - notice_period_days
        - responsible_person

        Return ONLY a valid JSON object. No explanations.
        If a field is missing, return null.
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
                options: { temperature: 0.1 }
            })
        });

        const rawText = await response.text();

        // Entfernt Markdown-Formatierungen
        const cleaned = rawText
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();

        // JSON sicher parsen  
        try {
            return JSON.parse(cleaned);
        } catch (err) {
            console.warn("AI returned non-JSON output → wrapping it");
            return { text: cleaned }; // Fallback, damit nie Absturz
        }

    } catch (error) {
        console.error("Ollama Service Error:", error);
        return { error: "AI service unavailable", details: error.message };
    }
}