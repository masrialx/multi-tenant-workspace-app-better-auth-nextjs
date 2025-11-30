export interface EmailTemplateOptions {
  title: string
  message: string
  buttonText?: string
  buttonLink?: string
  footerText?: string
  type?: "default" | "success" | "warning" | "error"
}

export function generateEmailTemplate(options: EmailTemplateOptions): string {
  const {
    title,
    message,
    buttonText,
    buttonLink,
    footerText,
    type = "default",
  } = options

  const colors = {
    default: {
      primary: "#3b82f6",
      bg: "#f8fafc",
      text: "#1e293b",
      border: "#e2e8f0",
    },
    success: {
      primary: "#10b981",
      bg: "#f0fdf4",
      text: "#166534",
      border: "#bbf7d0",
    },
    warning: {
      primary: "#f59e0b",
      bg: "#fffbeb",
      text: "#92400e",
      border: "#fde68a",
    },
    error: {
      primary: "#ef4444",
      bg: "#fef2f2",
      text: "#991b1b",
      border: "#fecaca",
    },
  }

  const colorScheme = colors[type]

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: ${colorScheme.text};
      background-color: #f1f5f9;
      padding: 0;
      margin: 0;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .email-header {
      background: linear-gradient(135deg, ${colorScheme.primary} 0%, ${colorScheme.primary}dd 100%);
      padding: 40px 30px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .email-header h1 {
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .email-body {
      padding: 40px 30px;
      background-color: #ffffff;
      border-radius: 0 0 8px 8px;
    }
    .email-content {
      color: ${colorScheme.text};
      font-size: 16px;
      line-height: 1.8;
      margin-bottom: 30px;
    }
    .email-content p {
      margin-bottom: 16px;
    }
    .button-container {
      text-align: center;
      margin: 35px 0;
    }
    .email-button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, ${colorScheme.primary} 0%, ${colorScheme.primary}dd 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;
      letter-spacing: 0.3px;
    }
    .email-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
    .email-divider {
      height: 1px;
      background: linear-gradient(to right, transparent, ${colorScheme.border}, transparent);
      margin: 30px 0;
    }
    .security-note {
      background-color: ${colorScheme.bg};
      border-left: 4px solid ${colorScheme.primary};
      padding: 16px;
      margin: 25px 0;
      border-radius: 4px;
      font-size: 14px;
      color: #64748b;
    }
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        width: 100% !important;
      }
      .email-header,
      .email-body {
        padding: 25px 20px !important;
      }
      .email-header h1 {
        font-size: 24px !important;
      }
      .email-content {
        font-size: 15px !important;
      }
      .email-button {
        padding: 12px 24px !important;
        font-size: 15px !important;
      }
    }
  </style>
</head>
<body>
  <div style="padding: 20px 0;">
    <div class="email-wrapper">
      <!-- Header -->
      <div class="email-header">
        <h1>${title}</h1>
      </div>
      
      <!-- Body -->
      <div class="email-body">
        <div class="email-content">
          ${message.split('\n').map(line => `<p>${line}</p>`).join('')}
        </div>
        
        ${buttonText && buttonLink ? `
        <div class="button-container">
          <a href="${buttonLink}" class="email-button">${buttonText}</a>
        </div>
        ` : ''}
        
        ${footerText ? `
        <div class="email-divider"></div>
        <div class="security-note">
          ${footerText}
        </div>
        ` : ''}
      </div>
      
    </div>
  </div>
</body>
</html>
  `.trim()
}

// Specific email templates
export function getPasswordResetTemplate(resetLink: string, expiresIn: string = "7 hours"): string {
  return generateEmailTemplate({
    title: "Reset Your Password",
    message: `Hi there,

We received a request to reset your password. Click the button below to create a new password:

If you didn't request this, you can safely ignore this email. Your password will remain unchanged.`,
    buttonText: "Reset Password",
    buttonLink: resetLink,
    footerText: `This password reset link will expire in ${expiresIn}. For security reasons, please do not share this link with anyone.`,
    type: "warning",
  })
}

export function getEmailVerificationTemplate(verificationLink: string, expiresIn: string = "7 hours"): string {
  return generateEmailTemplate({
    title: "Verify Your Email",
    message: `Welcome!

Thank you for signing up. Please verify your email address by clicking the button below to complete your registration:

This helps us ensure the security of your account.`,
    buttonText: "Verify Email",
    buttonLink: verificationLink,
    footerText: `This verification link will expire in ${expiresIn}. If you didn't create an account, please ignore this email.`,
    type: "success",
  })
}

export function getJoinRequestAcceptedTemplate(organizationName: string): string {
  return generateEmailTemplate({
    title: "Join Request Accepted",
    message: `Great news!

Your request to join "${organizationName}" has been accepted. You can now access the organization and collaborate with your team.

Welcome aboard!`,
    buttonText: "Go to Workspace",
    buttonLink: `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/workspace`,
    type: "success",
  })
}

export function getJoinRequestRejectedTemplate(organizationName: string): string {
  return generateEmailTemplate({
    title: "Join Request Update",
    message: `Hello,

Your request to join "${organizationName}" was not approved at this time.

If you believe this is an error, please contact the organization owner directly.`,
    type: "default",
  })
}

export function getOrganizationInvitationTemplate(
  organizationName: string,
  invitationLink: string,
  expiresIn: string = "7 days"
): string {
  return generateEmailTemplate({
    title: "You've Been Invited!",
    message: `Hello,

You have been invited to join the organization "${organizationName}".

Click the button below to accept the invitation and start collaborating with your team.

This invitation will expire in ${expiresIn}. Please accept it before it expires.`,
    buttonText: "Accept Invitation",
    buttonLink: invitationLink,
    footerText: `This invitation will expire in ${expiresIn}. If you did not expect this invitation, you can safely ignore this email.`,
    type: "success",
  })
}

