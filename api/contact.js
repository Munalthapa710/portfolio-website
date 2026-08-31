const nodemailer = require("nodemailer");

const DEFAULT_TO_EMAIL = "thapamunal710@gmail.com";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readJsonBody(req) {
  if (typeof req.body === "string") {
    return Promise.resolve(JSON.parse(req.body));
  }

  if (req.body && typeof req.body === "object") {
    return Promise.resolve(req.body);
  }

  return new Promise((resolve, reject) => {
    let rawBody = "";

    req.on("data", (chunk) => {
      rawBody += chunk;
    });

    req.on("end", () => {
      try {
        resolve(rawBody ? JSON.parse(rawBody) : {});
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function sanitizeValue(value) {
  return String(value || "").trim();
}

function sanitizeHeaderValue(value) {
  return sanitizeValue(value).replace(/[\r\n]+/g, " ");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Allow", "POST, OPTIONS");
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    json(res, 405, { message: "Method not allowed." });
    return;
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure =
    process.env.SMTP_SECURE === "true" || smtpPort === 465;
  const toEmail = process.env.CONTACT_TO_EMAIL || DEFAULT_TO_EMAIL;
  const fromEmail =
    process.env.CONTACT_FROM_EMAIL || smtpUser || DEFAULT_TO_EMAIL;

  if (!smtpHost || !smtpUser || !smtpPass) {
    json(res, 500, {
      message: "SMTP is not configured on the server yet.",
    });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const fromName = sanitizeHeaderValue(body.from_name);
    const fromEmailInput = sanitizeValue(body.from_email).toLowerCase();
    const subject = sanitizeHeaderValue(body.subject);
    const message = sanitizeValue(body.message);
    const safeFromName = escapeHtml(fromName);
    const safeFromEmail = escapeHtml(fromEmailInput);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message);

    if (!fromName || !fromEmailInput || !subject || !message) {
      json(res, 400, { message: "Please fill in all fields before sending." });
      return;
    }

    if (!EMAIL_PATTERN.test(fromEmailInput)) {
      json(res, 400, { message: "Please enter a valid email address." });
      return;
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      replyTo: fromEmailInput,
      subject: `Portfolio contact: ${subject}`,
      text: [
        `Name: ${fromName}`,
        `Email: ${fromEmailInput}`,
        `Subject: ${subject}`,
        "",
        message,
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <h2 style="margin-bottom: 16px;">New Portfolio Contact Message</h2>
          <p><strong>Name:</strong> ${safeFromName}</p>
          <p><strong>Email:</strong> ${safeFromEmail}</p>
          <p><strong>Subject:</strong> ${safeSubject}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${safeMessage}</p>
        </div>
      `,
    });

    json(res, 200, { message: "Message sent successfully." });
  } catch (error) {
    console.error("SMTP contact form error:", error);
    json(res, 500, {
      message:
        "Message could not be sent right now. Please email thapamunal710@gmail.com directly.",
    });
  }
};
