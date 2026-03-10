import { getApiKey } from '../storage/settings';
import { SYSTEM_PROMPT } from './prompts';

export const generateFlowchartFromText = async (text) => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('API_KEY_MISSING');
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: SYSTEM_PROMPT }]
                },
                contents: [{
                    role: 'user',
                    parts: [{ text: text }]
                }],
                generationConfig: {
                    responseMimeType: 'application/json',
                    temperature: 0.2
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 400) throw new Error('API_KEY_INVALID');
            if (response.status === 429) throw new Error('RATE_LIMIT');
            throw new Error(`Gemini API Error: ${response.statusText}`);
        }

        const data = await response.json();
        const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!contentText) {
             throw new Error('INVALID_JSON_RESPONSE');
        }

        let jsonResult = null;
        try {
            jsonResult = JSON.parse(contentText);
        } catch (e) {
            throw new Error('INVALID_JSON_RESPONSE');
        }

        return validateApiResponse(jsonResult);
    } catch (error) {
        console.error("Gemini Client Error", error);
        throw error;
    }
};

const validateApiResponse = (json) => {
    if (!json.nodes || !Array.isArray(json.nodes)) {
         throw new Error('JSON validation failed: missing nodes array');
    }
    
    // Ensure minimal viable graph
    const hasStart = json.nodes.some(n => n.type === 'start');
    if (!hasStart && json.nodes.length > 0) {
        json.nodes[0].type = 'start';
    }

    // Filter out bad edges
    if (json.edges && Array.isArray(json.edges)) {
        json.edges = json.edges.filter(edge => {
            const hasSource = json.nodes.some(n => n.id === edge.from);
            const hasTarget = json.nodes.some(n => n.id === edge.to);
            return hasSource && hasTarget;
        });
    }

    return json;
};
