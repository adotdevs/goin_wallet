const nodemailer = require("nodemailer");
const User = require("../models/userModel");
const SystemSettings = require("../models/systemSettingsModel");

function brandName() {
  return process.env.WebName || "GOin SAS";
}

async function getEffectiveSmtpConfig(customSmtp) {
  let effective = null;
  if (customSmtp && customSmtp.host && customSmtp.user && (customSmtp.pass || customSmtp.password)) {
    effective = {
      ...customSmtp,
      pass: customSmtp.pass || customSmtp.password,
    };
  }

  if (!effective) {
    try {
      const superadmin = await User.findOne({ role: "superadmin" }).lean();
      const smtp = superadmin?.smtpConfig;
      if (
        smtp &&
        smtp.enabled !== false &&
        smtp.host &&
        smtp.user &&
        (smtp.password || smtp.pass)
      ) {
        effective = {
          ...smtp,
          pass: smtp.password || smtp.pass,
        };
      }
      if (!effective) {
        const settings = await SystemSettings.findOne().lean();
        const globalSmtp = settings?.smtpConfig;
        if (
          globalSmtp &&
          globalSmtp.enabled !== false &&
          globalSmtp.host &&
          globalSmtp.user &&
          globalSmtp.pass
        ) {
          effective = globalSmtp;
        }
      }
    } catch (error) {
      effective = null;
    }
  }

  const host = (effective?.host || process.env.EMAILHOST || "smtp.hostinger.com").trim();
  const port = Number(effective?.port || process.env.EMAIL_PORT || 465);
  const secure = typeof effective?.secure === "boolean" ? effective.secure : port === 465;
  const user = (effective?.user || process.env.EMAILUSER || "").trim();
  const pass = effective?.pass || process.env.EMAILPASS || "";
  const fromEmail = (effective?.fromEmail || process.env.HOST_EMAIL || user).trim();
  const fromName = (effective?.fromName || brandName()).trim();
  const adminAlertEmail = (
    effective?.adminAlertEmail ||
    process.env.ADMIN_ALERT_EMAIL ||
    "info@goin-in-vest.com"
  ).trim();

  return { host, port, secure, user, pass, fromEmail, fromName, adminAlertEmail };
}

async function sendEmail(to, subject, text, html, customSmtp, extraOptions) {
  const emailContent = html || String(text || "").replace(/\n/g, "<br>");
  const { host, port, secure, user, pass, fromEmail, fromName } =
    await getEffectiveSmtpConfig(customSmtp);

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 12000,
      });
      const result = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        replyTo: extraOptions?.replyTo || undefined,
        subject,
        text,
        html: emailContent,
        attachments: extraOptions?.attachments,
      });
      return { success: true, provider: "smtp", messageId: result.messageId, fromEmail };
    } catch (smtpError) {
      console.warn("KYC portal SMTP warning:", smtpError?.message);
    }
  }

  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = require("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromAddress =
        process.env.RESEND_FROM || `${fromName} <noreply@betabase.pro>`;
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to,
        replyTo: extraOptions?.replyTo || undefined,
        subject,
        text,
        html: emailContent,
      });
      if (!error) {
        return { success: true, provider: "resend", id: data?.id, fromEmail };
      }
    } catch (resendError) {
      console.warn("KYC portal Resend warning:", resendError?.message);
    }
  }

  return { success: false, provider: "none", fromEmail };
}

function buildBrandedEmailHtml({ title, greeting, bodyLines, ctaLabel, ctaUrl, footerNote }) {
  return `
    <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 32px 16px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background: #07111F; padding: 24px 32px; color: #ffffff; border-bottom: 2px solid #159BFA;">
          <div style="font-size: 20px; font-weight: 700; color: #F5F8FD;">GOin <span style="color: #9CCBFA; font-size: 16px;">SAS</span></div>
          <div style="font-size: 13px; color: #A0B0C6; margin-top: 4px;">Institutional Digital Asset Safekeeping & KYC Compliance</div>
        </div>
        <div style="padding: 32px;">
          <h2 style="margin: 0 0 16px; color: #0f172a; font-size: 20px;">${title}</h2>
          <p style="margin: 0 0 16px; color: #334155; font-size: 15px; line-height: 1.6;">${greeting}</p>
          ${(bodyLines || [])
            .map(
              (line) =>
                `<p style="margin: 0 0 14px; color: #475569; font-size: 14px; line-height: 1.6;">${line}</p>`
            )
            .join("")}
          ${
            ctaLabel && ctaUrl
              ? `<div style="margin: 28px 0;"><a href="${ctaUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 10px;">${ctaLabel}</a></div>`
              : ""
          }
          ${
            footerNote
              ? `<p style="margin: 24px 0 0; padding-top: 16px; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 12px;">${footerNote}</p>`
              : ""
          }
        </div>
      </div>
    </div>
  `;
}

async function sendAdminAlertEmail({
  subject,
  title,
  bodyLines,
  extraDetails,
  ctaLabel,
  ctaUrl,
  replyTo,
  customSmtp,
}) {
  const config = await getEffectiveSmtpConfig(customSmtp);
  const targetEmail = config.adminAlertEmail || "info@goin-in-vest.com";
  const extraLinesHtml =
    extraDetails && extraDetails.length
      ? `<div style="margin: 20px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;"><table style="width: 100%; border-collapse: collapse; font-size: 13px;">${extraDetails
          .map(
            (item) =>
              `<tr><td style="padding: 6px 8px; color: #64748b; font-weight: 600; width: 38%;">${item.label}</td><td style="padding: 6px 8px; color: #0f172a;">${item.value}</td></tr>`
          )
          .join("")}</table></div>`
      : "";
  const html = `
    <div style="font-family: Inter, sans-serif; background-color: #f1f5f9; padding: 32px 16px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background: #07111F; padding: 24px 32px; color: #ffffff; border-bottom: 3px solid #159BFA;">
          <span style="font-size: 18px; font-weight: 800;">GOin SAS · Compliance Alert</span>
        </div>
        <div style="padding: 32px;">
          <h2 style="margin: 0 0 14px; color: #0f172a; font-size: 19px;">${title}</h2>
          ${(bodyLines || [])
            .map(
              (line) =>
                `<p style="margin: 0 0 12px; color: #334155; font-size: 14px; line-height: 1.6;">${line}</p>`
            )
            .join("")}
          ${extraLinesHtml}
          ${
            ctaLabel && ctaUrl
              ? `<div style="margin: 28px 0 10px;"><a href="${ctaUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 13px; padding: 12px 24px; border-radius: 10px;">${ctaLabel}</a></div>`
              : ""
          }
        </div>
      </div>
    </div>
  `;
  const plainText = [
    title,
    ...(bodyLines || []),
    ...(extraDetails || []).map((d) => `${d.label}: ${d.value}`),
    ctaUrl ? `Review in Portal: ${ctaUrl}` : "",
  ].join("\n");
  return sendEmail(targetEmail, subject, plainText, html, config, { replyTo });
}

async function testSmtpConnectionAndSend({ smtpConfig, testRecipient }) {
  const host = (smtpConfig.host || "").trim();
  const port = Number(smtpConfig.port || 465);
  const secure = typeof smtpConfig.secure === "boolean" ? smtpConfig.secure : port === 465;
  const user = (smtpConfig.user || "").trim();
  const pass = smtpConfig.pass || smtpConfig.password || "";
  const fromEmail = (smtpConfig.fromEmail || user).trim();
  const fromName = (smtpConfig.fromName || brandName()).trim();
  if (!host || !user || !pass) {
    throw new Error("SMTP Host, Username, and Password are required.");
  }
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 12000,
  });
  await transporter.verify();
  const html = buildBrandedEmailHtml({
    title: "SMTP Configuration Verified",
    greeting: "Hello Administrator,",
    bodyLines: [
      `This is a live test email confirming that your SMTP server (${host}:${port}) is properly configured.`,
      `Authenticated User: ${user}`,
      `From Address: ${fromName} <${fromEmail}>`,
    ],
    footerNote: `Sent at ${new Date().toUTCString()}`,
  });
  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: testRecipient,
    subject: `${fromName} — SMTP Test Successful`,
    text: `Your SMTP configuration (${host}:${port}) is working properly.`,
    html,
  });
  return { messageId: info.messageId };
}

module.exports = {
  getEffectiveSmtpConfig,
  sendEmail,
  buildBrandedEmailHtml,
  sendAdminAlertEmail,
  testSmtpConnectionAndSend,
};
