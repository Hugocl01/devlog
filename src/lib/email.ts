import { Resend } from "resend";

const resendKey =
  (import.meta.env?.RESEND_API_KEY as string | undefined) ??
  process.env.RESEND_API_KEY;

const siteUrl =
  (import.meta.env?.SITE_URL as string | undefined) ??
  process.env.SITE_URL ??
  "http://localhost:4321";

const emailFrom =
  (import.meta.env?.EMAIL_FROM as string | undefined) ??
  process.env.EMAIL_FROM ??
  "DevLog <noreply@localhost>";

const isDev = !resendKey || resendKey.startsWith("re_xxx");

function getResend() {
  return new Resend(resendKey);
}

// ─── Logo SVG (ChevronsLeftRightEllipsis de Lucide, igual que el header) ──────
const LOGO_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
       fill="none" stroke="#111111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
       style="display:inline-block;vertical-align:middle;">
    <path d="M12 12h.01"/>
    <path d="M16 12h.01"/>
    <path d="m17 7 5 5-5 5"/>
    <path d="m7 7-5 5 5 5"/>
    <path d="M8 12h.01"/>
  </svg>`.trim();

// ─── Template base ────────────────────────────────────────────────────────────
// Los emails usan estilos inline y tablas para máxima compatibilidad con
// clientes de email (Gmail, Outlook, Apple Mail, etc.).
// Las variables CSS y Tailwind no funcionan en emails — se usan valores hex directos.
function emailTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="background-color:#f5f5f5;padding:48px 16px 64px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:560px;width:100%;">

          <!-- Logo / cabecera -->
          <tr>
            <td align="center" style="padding:0 0 28px 0;">
              <a href="${siteUrl}" target="_blank"
                 style="display:inline-flex;align-items:center;gap:8px;text-decoration:none;color:#111111;">
                ${LOGO_SVG}
                <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
                             font-size:18px;font-weight:700;letter-spacing:-0.03em;color:#111111;
                             vertical-align:middle;line-height:1;">DevLog</span>
              </a>
            </td>
          </tr>

          <!-- Tarjeta principal -->
          <tr>
            <td style="background-color:#ffffff;border-radius:14px;border:1px solid #e5e5e5;
                       padding:40px 44px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',
                       Roboto,'Helvetica Neue',Arial,sans-serif;">
              ${content}
            </td>
          </tr>

          <!-- Pie de página -->
          <tr>
            <td align="center" style="padding:28px 0 0 0;">
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,
                        'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#9ca3af;line-height:1.6;">
                Recibiste este email porque tienes una cuenta en
                <a href="${siteUrl}" target="_blank"
                   style="color:#6b7280;text-decoration:underline;">${siteUrl.replace(/^https?:\/\//, "")}</a>.
                <br>Si no fuiste tú, ignora este mensaje — no se realizará ningún cambio.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Botón CTA ────────────────────────────────────────────────────────────────
// Se usa tabla en lugar de <a> directo para que Outlook respete el border-radius.
function ctaButton(url: string, label: string): string {
  return `
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:28px 0 24px;">
      <tr>
        <td align="center" bgcolor="#111111"
            style="border-radius:9999px;background-color:#111111;">
          <a href="${url}" target="_blank"
             style="display:inline-block;padding:13px 32px;font-family:-apple-system,
                    BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
                    font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;
                    border-radius:9999px;letter-spacing:0.01em;line-height:1;
                    background-color:#111111;">${label}</a>
        </td>
      </tr>
    </table>`;
}

// ─── Separador y enlace de respaldo ──────────────────────────────────────────
function fallbackLink(url: string): string {
  return `
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:20px 0 0;width:100%;">
      <tr>
        <td style="border-top:1px solid #f0f0f0;padding-top:20px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
            Si el botón no funciona, copia y pega este enlace en tu navegador:
            <br>
            <a href="${url}" target="_blank"
               style="color:#6b7280;text-decoration:underline;word-break:break-all;font-size:11px;">${url}</a>
          </p>
        </td>
      </tr>
    </table>`;
}

// ─── Email de verificación de cuenta ─────────────────────────────────────────
export async function sendVerificationEmail(email: string, name: string, token: string) {
  const url = `${siteUrl}/api/auth/verify-email?token=${token}`;

  if (isDev) {
    console.log(`\n[DEV] Email de verificación para ${email}`);
    console.log(`[DEV] Enlace: ${url}\n`);
    return;
  }

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111111;letter-spacing:-0.03em;line-height:1.2;">
      Verifica tu cuenta
    </h1>
    <p style="margin:0 0 4px;font-size:15px;line-height:1.7;color:#374151;">
      Hola, <strong>${name}</strong>.
    </p>
    <p style="margin:0;font-size:15px;line-height:1.7;color:#374151;">
      Gracias por registrarte en DevLog. Haz clic en el botón para confirmar tu dirección
      de email y activar tu cuenta.
    </p>
    ${ctaButton(url, "Verificar cuenta")}
    ${fallbackLink(url)}`;

  await getResend().emails.send({
    from: emailFrom,
    to: email,
    subject: "Verifica tu cuenta en DevLog",
    html: emailTemplate(content),
    text: `Hola, ${name}.\n\nGracias por registrarte en DevLog. Verifica tu cuenta en el siguiente enlace:\n\n${url}\n\nSi no creaste esta cuenta, ignora este email.`,
  });
}

// ─── Email de confirmación de cambio de email ─────────────────────────────────
export async function sendEmailChangeEmail(newEmail: string, name: string, token: string) {
  const url = `${siteUrl}/api/profile/email-confirm?token=${token}`;

  if (isDev) {
    console.log(`\n[DEV] Confirmación de cambio de email para ${newEmail}`);
    console.log(`[DEV] Enlace: ${url}\n`);
    return;
  }

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111111;letter-spacing:-0.03em;line-height:1.2;">
      Confirma tu nuevo email
    </h1>
    <p style="margin:0 0 4px;font-size:15px;line-height:1.7;color:#374151;">
      Hola, <strong>${name}</strong>.
    </p>
    <p style="margin:0;font-size:15px;line-height:1.7;color:#374151;">
      Has solicitado cambiar tu email en DevLog. Haz clic en el botón para confirmar
      esta nueva dirección. El enlace es válido durante <strong>24 horas</strong>.
    </p>
    ${ctaButton(url, "Confirmar nuevo email")}
    <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
      Si no solicitaste este cambio, ignora este email. Tu email actual no cambiará.
    </p>
    ${fallbackLink(url)}`;

  await getResend().emails.send({
    from: emailFrom,
    to: newEmail,
    subject: "Confirma tu nuevo email en DevLog",
    html: emailTemplate(content),
    text: `Hola, ${name}.\n\nHas solicitado cambiar tu email en DevLog. Confirma el cambio en el siguiente enlace (válido 24 horas):\n\n${url}\n\nSi no solicitaste este cambio, ignora este email.`,
  });
}

// ─── Email de recuperación de contraseña ─────────────────────────────────────
export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const url = `${siteUrl}/auth/reset-password?token=${token}`;

  if (isDev) {
    console.log(`\n[DEV] Email de recuperación para ${email}`);
    console.log(`[DEV] Enlace: ${url}\n`);
    return;
  }

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111111;letter-spacing:-0.03em;line-height:1.2;">
      Restablece tu contraseña
    </h1>
    <p style="margin:0 0 4px;font-size:15px;line-height:1.7;color:#374151;">
      Hola, <strong>${name}</strong>.
    </p>
    <p style="margin:0;font-size:15px;line-height:1.7;color:#374151;">
      Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en
      el botón para crear una nueva. El enlace es válido durante <strong>1 hora</strong>.
    </p>
    ${ctaButton(url, "Restablecer contraseña")}
    <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
      Si no solicitaste este cambio, ignora este email. Tu contraseña no cambiará.
    </p>
    ${fallbackLink(url)}`;

  await getResend().emails.send({
    from: emailFrom,
    to: email,
    subject: "Restablece tu contraseña en DevLog",
    html: emailTemplate(content),
    text: `Hola, ${name}.\n\nRecibimos una solicitud para restablecer tu contraseña. Usa el siguiente enlace (válido 1 hora):\n\n${url}\n\nSi no solicitaste esto, ignora este email. Tu contraseña no cambiará.`,
  });
}
