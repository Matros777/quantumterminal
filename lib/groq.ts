// OpenRouter (OpenAI-compatible) via plain fetch — no extra SDK dependency.
// Model: dots-studio/dots-3-note-preview:free

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const MODEL = process.env.OPENROUTER_MODEL || 'dots-studio/dots-3-note-preview:free';

export async function analyzeChartData(formattedData: string, timeFrame: string, ticker: string): Promise<string> {
    if (!OPENROUTER_API_KEY) {
        throw new Error('OpenRouter client not initialized. Check OPENROUTER_API_KEY.');
    }

    const systemPrompt = `You are QUANTUM AI, a crypto market analyst. 
   
   Output Structure MUST be exactly like this (maintain the layout):

   ### ⚡ QUANTUM INTEL: ${ticker.toUpperCase()} [${timeFrame}]

   **🎯 SENTIMENT:** [🟢 BULLISH / 🔴 BEARISH / ⚪ NEUTRAL]
   **🔥 STRENGTH:** [Score 0-100]/100

   **🔑 KEY ZONES:**
   • 🧱 **RESISTANCE:** [Price] — [Brief Note]
   • 🛡️ **SUPPORT:** [Price] — [Brief Note]

   **💡 STRATEGY:**
   [One clear, actionable trading advice sentence.]

   **⚠️ RISK:**
   [One short warning sentence, DYOR, NFA.]`;

    const userPrompt = `Analisis data pasar berikut untuk ${ticker.toUpperCase()} pada Time Frame ${timeFrame}.

  ${formattedData}`;

    try {
        const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                // Optional: help OpenRouter attribute traffic
                'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://quantumterminal.vercel.app',
                'X-Title': 'Quantum Terminal',
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.5,
                max_tokens: 1024,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`OpenRouter API Error ${response.status}: ${errText}`);
        }

        const data = await response.json();
        return data?.choices?.[0]?.message?.content || 'No analysis generated.';
    } catch (error: any) {
        console.error('OpenRouter API Error:', error);
        throw new Error(`Failed to analyze data: ${error.message}`);
    }
}
