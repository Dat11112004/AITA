import 'dotenv/config';

// Test with a large prompt to reproduce the 400 error
const key = (process.env.GEMINI_API_KEYS || '').split(',')[0].trim();
const model = 'gemini-2.5-flash';

// Simulate a large prompt (~500KB like extracted doc text)
const largeText = 'This is a test assignment requirement. '.repeat(15000);
console.log(`Prompt size: ${largeText.length} chars (~${Math.round(largeText.length/1024)}KB)`);

const body = {
  model: model,
  messages: [
    { role: "system", content: "Extract requirements from this document. Return JSON." },
    { role: "user", content: largeText }
  ],
  temperature: 0
};

const bodyStr = JSON.stringify(body);
console.log(`Request body size: ${bodyStr.length} chars (~${Math.round(bodyStr.length/1024)}KB)`);

async function test() {
  // Use raw fetch to see the ACTUAL error body
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: bodyStr
  });

  console.log(`\nStatus: ${resp.status}`);
  const text = await resp.text();
  console.log(`Response body:\n${text.substring(0, 2000)}`);
}

test().catch(console.error);
