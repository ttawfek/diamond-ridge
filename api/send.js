// Vercel serverless function: delivers the site's two forms (showing request,
// register / contact us) through Resend, then sends the visitor a short confirmation.
//
// Environment variables (Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY  required. Never exposed to the browser.
//   LEADS_TO        where leads go (comma-separated). Default info@diamondridgeliving.ca
//   SHOWINGS_TO     showing requests only, if they belong in a different inbox. Default LEADS_TO
//   MAIL_FROM       sender; its domain must be verified in Resend.
//                   Default "Diamond Ridge <website@diamondridgeliving.ca>"
//
// Browsers with JS post JSON and get JSON back. Without JS, the register form posts
// here directly and is redirected back to the page's #form-sent / #form-error.

const SITE = {
  name: 'Diamond Ridge',
  phone: '1 (403) 636-1855',
  address: '460 Main Street, Diamond Valley, AB T0L 2A0',
};
const LEADS_TO = process.env.LEADS_TO || 'info@diamondridgeliving.ca';
const SHOWINGS_TO = process.env.SHOWINGS_TO || LEADS_TO;
const MAIL_FROM = process.env.MAIL_FROM || 'Diamond Ridge <website@diamondridgeliving.ca>';

const SLOTS = ['10:00 AM', '11:30 AM', '1:00 PM', '2:30 PM', '4:00 PM'];
const PAGES = { register: '/register.html' };
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MIN_FILL_MS = 2500; // humans don't fill a form faster than this; scripted posts often do

// single-line text: no control characters, trimmed, capped
const line = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max);
// multi-line text: keep newlines, drop other control characters
const block = (v, max) => String(v == null ? '' : v).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, ' ').trim().slice(0, max);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const list = s => s.split(',').map(x => x.trim()).filter(Boolean);

// The confirmation goes to an address the visitor typed, so it must not carry their
// free text: only a cleaned first name (letters only) and server-formatted values.
const firstName = name => (name.split(/\s+/)[0] || '').replace(/[^\p{L}'-]/gu, '').slice(0, 40);

// "2026-11-03" → "Tuesday, November 3, 2026" (null if not a real, near-future date)
function showingDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCMonth() !== +m[2] - 1) return null; // e.g. 2026-02-31
  const year = new Date().getUTCFullYear();
  if (+m[1] < year - 1 || +m[1] > year + 2) return null;
  return d.toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

// Validates one submission and builds both emails. Returns { error } or { lead, confirm }.
function compose(form, b) {
  const name = form === 'register'
    ? line(`${line(b.first_name, 60)} ${line(b.last_name, 60)}`, 120)
    : line(b.name, 120);
  const email = line(b.email, 200);
  const phone = line(b.phone, 40);
  if (!name || !email) return { error: 'missing_fields' };
  if (!EMAIL_RE.test(email)) return { error: 'bad_email' };

  const hi = firstName(name);
  const greeting = hi ? `Hi ${hi},` : 'Hello,';

  if (form === 'showing') {
    const date = showingDate(b.date);
    if (!date) return { error: 'bad_date' };
    const time = SLOTS.includes(b.time) ? b.time : '';
    const when = `${date} · ${time || 'time to be confirmed'}`;
    const interest = line(b.interest, 120);
    const notes = block(b.notes, 2000);
    return {
      lead: {
        to: list(SHOWINGS_TO),
        subject: `Showing request: ${name}, ${date}`,
        rows: [['Preferred date', date], ['Preferred time', time || 'No preference'], ['Name', name], ['Email', email], ['Phone', phone || 'Not provided'], ['Interested in', interest || 'Not specified'], ['Notes', notes || 'None']],
      },
      confirm: {
        subject: 'We received your Diamond Ridge showing request',
        paras: [greeting, `Thanks for requesting a showing at Diamond Ridge. You asked for ${when}.`, 'This isn’t confirmed yet: our team will be in touch within one business day to confirm a time that works.'],
      },
    };
  }

  // register
  const interest = line(b.interest, 120);
  const message = block(b.message, 4000);
  return {
    lead: {
      to: list(LEADS_TO),
      subject: `New registration: ${name}${interest ? `, ${interest}` : ''}`,
      rows: [['Name', name], ['Email', email], ['Phone', phone || 'Not provided'], ['Interested in', interest || 'Not specified'], ['Message', message || 'None']],
    },
    confirm: {
      subject: 'Thanks for registering with Diamond Ridge',
      paras: [greeting, 'Thanks for registering your interest in Diamond Ridge. We’ll send you the Phase 1 details and follow up within one business day.'],
    },
  };
}

const leadText = rows => rows.map(([k, v]) => (v.includes('\n') ? `${k}:\n${v}` : `${k}: ${v}`)).join('\n');
const leadHtml = rows =>
  '<table cellpadding="6" style="border-collapse:collapse;font:14px/1.5 Arial,sans-serif;color:#1a1814">' +
  rows.map(([k, v]) => `<tr><td style="vertical-align:top;color:#6b6457;white-space:nowrap"><strong>${esc(k)}</strong></td><td>${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('') +
  '</table><p style="font:12px Arial,sans-serif;color:#6b6457">Sent from the diamondridgeliving.ca website. Reply to this email to answer the visitor directly.</p>';

const signoff = ['Questions in the meantime? Call or WhatsApp ' + SITE.phone + ', or just reply to this email.', '— The Diamond Ridge team'];
const confirmText = paras => [...paras, ...signoff, `${SITE.name} · ${SITE.address}`].join('\n\n');
const confirmHtml = paras =>
  '<div style="font:15px/1.6 Georgia,serif;color:#1a1814;max-width:560px">' +
  [...paras, ...signoff].map(p => `<p>${esc(p)}</p>`).join('') +
  `<p style="font:12px Arial,sans-serif;color:#6b6457">${esc(SITE.name)} · ${esc(SITE.address)}</p></div>`;

async function resend(msg) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: MAIL_FROM, ...msg }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 300)}`);
}

module.exports = async function handler(req, res) {
  const wantsJson = String(req.headers['content-type'] || '').includes('application/json');
  let body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const form = String(body.form || '');

  const reply = (status, out) => {
    if (wantsJson) return res.status(status).json(out);
    // no-JS form post: back to the page, where :target shows the matching message
    res.setHeader('Location', `${PAGES[form] || '/register.html'}#${out.ok ? 'form-sent' : 'form-error'}`);
    return res.status(303).end();
  };

  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'method_not_allowed' }); }

  // only accept posts from this site's own pages (works on preview deployments too)
  const origin = req.headers.origin;
  if (origin) {
    let host = '';
    try { host = new URL(origin).host; } catch (e) {}
    if (host !== req.headers.host) return reply(403, { ok: false, error: 'bad_origin' });
  }

  if (!['showing', 'register'].includes(form)) return reply(400, { ok: false, error: 'unknown_form' });

  // bots: a filled honeypot or an instant submit look successful but send nothing
  const elapsed = Number(body.elapsed);
  if (body.company || (wantsJson && Number.isFinite(elapsed) && elapsed < MIN_FILL_MS)) return reply(200, { ok: true });

  const built = compose(form, body);
  if (built.error) return reply(400, { ok: false, error: built.error });

  if (!process.env.RESEND_API_KEY) {
    console.error('send: RESEND_API_KEY is not set');
    return reply(500, { ok: false, error: 'not_configured' });
  }

  const visitor = line(body.email, 200);
  const { lead, confirm } = built;
  try {
    await resend({ to: lead.to, reply_to: visitor, subject: lead.subject, text: leadText(lead.rows), html: leadHtml(lead.rows) });
  } catch (e) {
    console.error('send: lead email failed', e.message);
    return reply(502, { ok: false, error: 'send_failed' });
  }

  // the lead is safe at this point; a failed confirmation shouldn't make the visitor retry
  try {
    await resend({ to: [visitor], reply_to: lead.to[0], subject: confirm.subject, text: confirmText(confirm.paras), html: confirmHtml(confirm.paras) });
  } catch (e) {
    console.error('send: confirmation email failed', e.message);
  }

  return reply(200, { ok: true });
};

// exposed for local tests
module.exports.compose = compose;
