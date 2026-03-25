export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.error('NO RESEND API KEY');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);

    const { email, summary, closing, theme, nickname } = body;

    if (!email || !summary) {
      return res.status(400).json({ error: 'Missing email or summary' });
    }

    // Theme emoji mapping
    const themeEmoji = { rain: '🌧️', forest: '🌲', ocean: '🌊', moon: '🌙' };
    const themeName = { rain: '비오는 밤', forest: '새벽 숲', ocean: '파도치는 밤', moon: '달빛 안개' };
    const emoji = themeEmoji[theme] || '🌧️';
    const place = themeName[theme] || '비오는 밤';

    const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0d0c0a;font-family:'Apple SD Gothic Neo','Noto Sans KR',sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:32px;margin-bottom:12px;">${emoji}</div>
      <h1 style="font-size:22px;font-weight:300;color:#d0cdc8;letter-spacing:0.25em;margin:0 0 4px;">한 숨</h1>
      <p style="font-size:11px;color:#5a5856;letter-spacing:0.3em;font-style:italic;margin:0;">a long sigh</p>
    </div>

    <div style="text-align:center;margin-bottom:28px;">
      <p style="font-size:14px;color:#9a9890;margin:0 0 4px;">${today}</p>
      <p style="font-size:12px;color:#5a5856;margin:0;">${nickname || '나그네'}님의 한숨 노트 · ${place}</p>
    </div>

    <div style="background:#161b22;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px 24px;margin-bottom:24px;">
      <div style="font-size:36px;color:rgba(255,255,255,0.08);font-family:serif;line-height:1;margin-bottom:8px;">"</div>
      <p style="font-size:14px;color:#e0ddd8;line-height:2.1;font-weight:300;margin:0 0 16px;">
        ${summary.replace(/\n/g, '<br>')}
      </p>
      ${closing ? `<p style="font-size:13px;color:#9a9890;font-style:italic;margin:0;border-top:1px solid rgba(255,255,255,0.06);padding-top:16px;">${closing}</p>` : ''}
    </div>

    <div style="text-align:center;padding:20px 0;">
      <p style="font-size:11px;color:#5a5856;font-style:italic;letter-spacing:0.1em;margin:0;">
        과거는 공(空)하니, 오직 이 순간의 울림만 남깁니다
      </p>
    </div>

    <div style="text-align:center;border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
      <p style="font-size:10px;color:#3a3836;margin:0;">이 메일은 한숨 앱에서 발송되었습니다</p>
    </div>

  </div>
</body>
</html>`;

    // Send via Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`
      },
      body: JSON.stringify({
        from: 'Hanseum <onboarding@resend.dev>',
        to: [email],
        subject: `${emoji} 한숨 노트 — ${today}`,
        html: htmlContent
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend error:', JSON.stringify(data));
      return res.status(response.status).json({ error: data.message || 'Email send failed' });
    }

    return res.status(200).json({ success: true, id: data.id });

  } catch (err) {
    console.error('Email error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
