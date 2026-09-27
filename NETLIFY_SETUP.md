# Booking form — Netlify setup

The "Book your showing" modal submits to **Netlify Forms**, which is built into
Netlify hosting. No API key, no third-party email service, no server code.

Every request is:
- **stored** in your Netlify dashboard (so nothing is ever lost), and
- **emailed** to you automatically once you turn on the notification below.

---

## 1. Deploy the site

Drag the whole `dr-site` folder onto **app.netlify.com/drop**, or connect the repo.

Netlify scans your HTML at deploy time and finds the hidden form named
`showing-request` in `index.html`. That's what registers the form — it must stay
in the file, even though visitors never see it.

## 2. Turn on the email notification

This is the step that makes it actually email you:

1. Netlify dashboard → your site → **Forms**
2. You should see **showing-request** listed after the first deploy
3. Go to **Form notifications** → **Add notification** → **Email notification**
4. Event: **New form submission**
5. Form: **showing-request**
6. Email to notify: **tariktawfek71@hotmail.com**
7. Save

Requests now arrive in that inbox automatically, and are also listed under
**Forms → showing-request** in the dashboard.

## 3. Test it

1. Open the live Netlify URL (not the local file — Forms only works on Netlify)
2. **Book your showing** → pick a date → fill it in → submit
3. Success message reads *"your showing request has been sent"*
4. Check the inbox, and check **Forms** in the dashboard

If it instead opens your email app, the POST didn't succeed — see below.

---

## Troubleshooting

**Form not listed in the dashboard**
The hidden `<form name="showing-request" netlify hidden>` block in `index.html`
was removed or altered. It must survive the deploy for Netlify to register it.

**Submissions arrive but no email**
Step 2 hasn't been done — notifications are off by default.

**It falls back to opening the email app**
That's the built-in safety net when the POST fails: opening the file locally,
or the form not being registered yet. Deploy first, then test on the live URL.

**Submissions marked as spam**
Netlify filters with Akismet. The hidden `bot-field` honeypot is already wired
up. If a real request gets caught, mark it as not-spam in the dashboard.

---

## Notes

- **Free tier: 100 submissions/month.** Plenty for a demo; paid tiers go higher.
- **Changing the destination:** just edit the notification in the Netlify UI —
  no code change. The mailto fallback address is at the top of `booking.js`.
- **Contact and Register pages** still use `mailto:`. They can be converted to
  Netlify Forms the same way whenever you want — say the word.
- **Reply-to:** Netlify's notification email includes the visitor's address in
  the body. To reply directly, copy it from the submission.
