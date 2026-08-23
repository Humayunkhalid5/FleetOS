const DEFAULT_FROM = 'FleetOS <onboarding@resend.dev>';

async function sendEmail({ to, subject, html }) {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    console.log(`[email preview] to=${to} subject=${subject}`);
    return { delivered: false, reason: 'RESEND_API_KEY is not configured' };
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || DEFAULT_FROM, to: [to], subject, html }),
  });
  if (!response.ok) throw new Error(`Email provider rejected the request (${response.status})`);
  return { delivered: true, provider: 'resend' };
}

async function sendCompanyDecisionEmail(company, status) {
  const approved = status === 'approved';
  const rejected = status === 'rejected';
  const subject = approved
    ? 'Your FleetOS company registration is approved'
    : rejected ? 'Update on your FleetOS company registration' : 'Your FleetOS company access was suspended';
  const headline = approved ? 'You are ready to operate on FleetOS' : rejected ? 'Your registration needs attention' : 'Company access suspended';
  const detail = approved
    ? 'Sign in with the email and password used during registration. Your approved profile is now visible to clients in your service location.'
    : rejected ? 'The Super Admin could not approve the submitted company record. Contact FleetOS support before submitting updated documents.' : 'Your company is no longer visible in client discovery and operational access has been locked.';
  return sendEmail({
    to: company.email,
    subject,
    html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#0f172a"><h1 style="font-size:24px">${headline}</h1><p>Hello ${company.name},</p><p style="line-height:1.7;color:#475569">${detail}</p><p style="margin-top:28px;color:#64748b">FleetOS Operations</p></div>`,
  });
}

module.exports = { sendEmail, sendCompanyDecisionEmail };
