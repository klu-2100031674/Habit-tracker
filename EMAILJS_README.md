EmailJS template

This repo includes `emailjs-template.html` — paste this HTML into your EmailJS template (Templates → New Template) so emails show a clear Download button and the Google Sheets link.

Template variables used (must match exactly):
- `{{buyer_name}}`
- `{{pdf_url}}`
- `{{sheet_url}}`
- `{{payment_id}}`
- `{{amount}}`

Quick steps:
1. Open EmailJS dashboard → Templates → Create new template.
2. Paste the contents of `emailjs-template.html` into the template body (HTML tab).
3. Save and confirm the `template_id` matches the one used in `script.js` (currently: `habit`).
4. Confirm `service_id` in EmailJS matches `track-daily` (or update `script.js` to use your service id).
5. Verify `emailjs.init("uz8hiD8fUS8fBs46x")` in `script.js` matches your EmailJS Public Key.

Testing locally:
- Complete a payment and let the frontend call `emailjs.send(...)` as implemented in `script.js`.
- Check the received email — click the "Download PDF Guide" button to confirm the `pdf_url` link works.

If you want attachments instead of a link:
- Use a server-side provider (SendGrid/Mailgun/SMTP via `nodemailer`) and attach the PDF as base64. Contact me if you want that implemented.
