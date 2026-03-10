import { getApiKey } from '../storage/settings';
import { SYSTEM_PROMPT } from './prompts';

export const generateFlowchartFromText = async (text) => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('API_KEY_MISSING');
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: text }
                ],
                temperature: 0.2
            })
        });

        if (!response.ok) {
            if (response.status === 401) throw new Error('API_KEY_INVALID');
            if (response.status === 429) throw new Error('RATE_LIMIT');
            throw new Error(`OpenAI API Error: ${response.statusText}`);
        }

        const data = await response.json();
        
        let jsonResult = null;
        try {
            jsonResult = JSON.parse(data.choices[0].message.content);
        } catch (e) {
            throw new Error('INVALID_JSON_RESPONSE');
        }

        return validateApiResponse(jsonResult);
    } catch (error) {
        console.error("OpenAI Client Error", error);
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
        // Automatically make first node a start if missing
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
