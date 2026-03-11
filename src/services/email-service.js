// EmailJS REST API integration.
// Requires env vars: EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY

const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY;

const EMAILJS_API_URL = "https://api.emailjs.com/api/v1.0/email/send";

/**
 * Checks whether all required EmailJS env vars are configured.
 * @returns {boolean}
 */
function isConfigured() {
  return Boolean(EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY);
}

/**
 * Sends an email via the EmailJS REST API.
 * @param {object}  opts
 * @param {string}  opts.to      – recipient email address
 * @param {string}  opts.subject – email subject line
 * @param {string}  opts.body    – email body content
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendEmail({ to, subject, body }) {
  if (!isConfigured()) {
    console.warn(
      "[email-service] EmailJS env vars missing (EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY). Email not sent."
    );
    return { success: false, error: "EmailJS not configured" };
  }

  try {
    const response = await fetch(EMAILJS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: to,
          subject,
          message: body,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[email-service] EmailJS API error (${response.status}): ${text}`);
      return { success: false, error: text };
    }

    return { success: true };
  } catch (err) {
    console.error("[email-service] Failed to send email:", err.message);
    return { success: false, error: err.message };
  }
}
