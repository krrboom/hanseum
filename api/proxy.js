// Simple in-memory rate limiting (per IP, resets on cold start)
const rateMap = new Map();
const RATE_LIMIT = 30; // max requests per window
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRate(ip) {
  const now = Date.now();
  const record = rateMap.get(ip);
  if (!record || now - record.start > RATE_WINDOW) {
    rateMap.set(ip, { start: now, count: 1 });
    return true;
  }
  record.count++;
  return record.count <= RATE_LIMIT;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rate limiting
  const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
  if (!checkRate(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('NO API KEY');
      return res.status(500).json({ error: 'API key not configured' });
    }

    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic error:', JSON.stringify(data));
    }

    return res.status(response.status).json(data);

  } catch (err) {
    console.error('Proxy error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
