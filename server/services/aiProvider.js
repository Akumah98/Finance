const { GoogleGenerativeAI } = require('@google/generative-ai');

const providers = [];

// Helper: parse comma-separated keys from env var
function getKeys(envVar) {
    const val = process.env[envVar];
    if (!val) return [];
    return val.split(',').map(k => k.trim()).filter(Boolean);
}

// Register all Gemini keys (GEMINI_API_KEY, GEMINI_API_KEY_2, or comma-separated)
const geminiKeys = [
    ...getKeys('GEMINI_API_KEY'),
    ...getKeys('GEMINI_API_KEY_2'),
];

for (let i = 0; i < geminiKeys.length; i++) {
    const genAI = new GoogleGenerativeAI(geminiKeys[i]);
    providers.push({
        name: `gemini-${i + 1}`,
        chat: async (systemPrompt, history, userMessage) => {
            try {
                const model = genAI.getGenerativeModel({
                    model: 'gemini-1.5-flash',
                    systemInstruction: systemPrompt,
                });
                const chat = model.startChat({ history });
                const result = await chat.sendMessage(userMessage);
                return result.response.text();
            } catch {
                const model = genAI.getGenerativeModel({
                    model: 'gemini-2.0-flash',
                    systemInstruction: systemPrompt,
                });
                const chat = model.startChat({ history });
                const result = await chat.sendMessage(userMessage);
                return result.response.text();
            }
        },
        generate: async (prompt) => {
            try {
                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                const result = await model.generateContent(prompt);
                return result.response.text();
            } catch (err) {
                // Fallback to gemini-2.0-flash if 1.5 fails
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
                const result = await model.generateContent(prompt);
                return result.response.text();
            }
        },
    });
}

// Register all Groq keys (GROQ_API_KEY, GROQ_API_KEY_2, or comma-separated)
const groqKeys = [
    ...getKeys('GROQ_API_KEY'),
    ...getKeys('GROQ_API_KEY_2'),
];

function makeGroqProvider(apiKey, index) {
    return {
        name: `groq-${index + 1}`,
        chat: async (systemPrompt, history, userMessage) => {
            const messages = [{ role: 'system', content: systemPrompt }];

            for (const msg of history) {
                const role = msg.role === 'model' ? 'assistant' : 'user';
                const content = msg.parts?.map(p => p.text).join('') || '';
                if (content) messages.push({ role, content });
            }

            messages.push({ role: 'user', content: userMessage });

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages,
                    max_tokens: 1024,
                    temperature: 0.7,
                }),
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Groq ${response.status}: ${err}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        },
        generate: async (prompt) => {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 4096,
                    temperature: 0.7,
                }),
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Groq ${response.status}: ${err}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        },
    };
}

for (let i = 0; i < groqKeys.length; i++) {
    providers.push(makeGroqProvider(groqKeys[i], i));
}

// Interleave providers: gemini-1, groq-1, gemini-2, groq-2
// This spreads load across accounts instead of exhausting one first
function interleaveProviders() {
    const geminis = providers.filter(p => p.name.startsWith('gemini'));
    const groqs = providers.filter(p => p.name.startsWith('groq'));
    const interleaved = [];
    const maxLen = Math.max(geminis.length, groqs.length);

    for (let i = 0; i < maxLen; i++) {
        if (i < geminis.length) interleaved.push(geminis[i]);
        if (i < groqs.length) interleaved.push(groqs[i]);
    }

    return interleaved;
}

const orderedProviders = interleaveProviders();

async function chatWithFallback(systemPrompt, history, userMessage) {
    for (const provider of orderedProviders) {
        try {
            const result = await provider.chat(systemPrompt, history, userMessage);
            return { text: result, provider: provider.name };
        } catch (err) {
            console.error(`${provider.name} chat failed:`, err.message);
            continue;
        }
    }
    throw new Error('All AI providers failed');
}

async function generateWithFallback(prompt) {
    for (const provider of orderedProviders) {
        try {
            const result = await provider.generate(prompt);
            return { text: result, provider: provider.name };
        } catch (err) {
            console.error(`${provider.name} generate failed:`, err.message);
            continue;
        }
    }
    throw new Error('All AI providers failed');
}

module.exports = { chatWithFallback, generateWithFallback, providers: orderedProviders };
