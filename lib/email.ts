import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const DEFAULT_FROM = process.env.EMAIL_FROM || 'Bah!Flow <noreply@projetos.bahtech.com.br>';
const APP_URL = 'https://projetos.bahtech.com.br';

// Cores da marca
const COLOR_BG = '#0e1117';
const COLOR_ACCENT = '#3b6cf5';
const COLOR_LIGHT = '#f5f4f0';

interface SendWelcomeEmailParams {
  to: string;
  name: string;
  workspaceName: string;
}

function buildWelcomeHtml({ name, workspaceName }: { name: string; workspaceName: string }): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bem-vindo ao Bah!Flow</title>
</head>
<body style="margin:0;padding:0;background-color:${COLOR_LIGHT};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${COLOR_BG};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${COLOR_LIGHT};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(14,17,23,0.08);">
          <tr>
            <td style="background-color:${COLOR_BG};padding:32px 32px 28px 32px;text-align:left;">
              <h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:600;color:#ffffff;letter-spacing:-0.01em;">Bem-vindo ao Bah!Flow</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.55;color:${COLOR_BG};">
                Olá <strong>${name}</strong>,
              </p>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.55;color:${COLOR_BG};">
                Seu acesso ao workspace <strong>${workspaceName}</strong> foi aprovado. Você já pode entrar e começar a trabalhar.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="border-radius:8px;background-color:${COLOR_ACCENT};">
                    <a href="${APP_URL}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Acessar agora
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0 0;font-size:13px;line-height:1.5;color:#5a6072;">
                Se o botão não funcionar, copie e cole este link no seu navegador:<br />
                <a href="${APP_URL}" style="color:${COLOR_ACCENT};text-decoration:none;">${APP_URL}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e6e4dc;text-align:center;">
              <p style="margin:0;font-size:12px;color:#7a8090;">Powered by Bah!Flow</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendWelcomeEmail({ to, name, workspaceName }: SendWelcomeEmailParams): Promise<void> {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY não setada — pulando envio de welcome email para', to);
    return;
  }

  try {
    const html = buildWelcomeHtml({ name, workspaceName });
    await resend.emails.send({
      from: DEFAULT_FROM,
      to,
      subject: `Bem-vindo ao Bah!Flow — acesso aprovado em ${workspaceName}`,
      html,
    });
  } catch (err) {
    // fire-and-forget: nunca bloqueia o fluxo de aprovação
    console.error('[email] erro ao enviar welcome email para', to, err);
  }
}
