# SMTP Email Configuration Guide

This guide will help you configure SMTP settings to enable email functionality (password reset, email verification, etc.).

## Gmail Configuration

### Option 1: Using Gmail App Password (Recommended)

1. **Enable 2-Step Verification** on your Google Account
2. **Generate App Password**:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Copy the 16-character password

3. **Add to `.env.local`**:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM=your-email@gmail.com
```

### Option 2: Using OAuth2 (Advanced)

For production, consider using OAuth2 instead of app passwords.

## Other Email Providers

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_FROM=your-email@outlook.com
```

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=your-verified-sender@example.com
```

### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
SMTP_FROM=your-verified-domain@example.com
```

### AWS SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-aws-access-key
SMTP_PASS=your-aws-secret-key
SMTP_FROM=your-verified-email@example.com
```

## Testing Email Configuration

After setting up your SMTP configuration:

1. Restart your development server
2. Try the "Forgot Password" feature
3. Check your server logs for any SMTP errors
4. Check your email inbox (and spam folder)

## Deployment on Render/Serverless Platforms

The email system is now optimized for serverless and containerized environments like Render, Vercel, and AWS Lambda.

### Key Features for Production

- **Automatic environment detection**: Detects serverless/production environments and adjusts settings
- **Connection pooling disabled**: In serverless environments, connection pooling is disabled for better reliability
- **Extended timeouts**: Production environments use longer timeouts (30s) to handle network latency
- **Fresh connections**: Transporter cache is reset more frequently in serverless environments
- **Better TLS handling**: Explicit STARTTLS configuration for port 587

### Render-Specific Configuration

When deploying to Render, ensure these environment variables are set:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
NODE_ENV=production
```

**Optional environment variables for fine-tuning:**

```env
# Override default timeouts (in milliseconds)
SMTP_CONNECTION_TIMEOUT=30000
SMTP_SEND_TIMEOUT=30000

# Number of retry attempts (default: 2 for production)
SMTP_MAX_RETRIES=2

# If you have certificate issues, set this to false
SMTP_REJECT_UNAUTHORIZED=false
```

### Why Emails Work Locally But Not on Render

Common issues fixed:

1. **Connection pooling**: Disabled in serverless environments (Render doesn't maintain persistent connections)
2. **Timeouts too short**: Increased from 3s to 30s for production
3. **TLS/STARTTLS**: Now explicitly configured for proper TLS negotiation
4. **Transporter caching**: Cache expires faster in serverless environments (1 min vs 5 min)

## Troubleshooting

### Emails not being received

1. **Check server logs** - Look for SMTP connection errors
2. **Verify SMTP credentials** - Ensure username/password are correct
3. **Check spam folder** - Emails might be filtered
4. **Test SMTP connection** - The app now verifies SMTP connection before sending
5. **Check firewall** - Ensure port 587 or 465 is not blocked
6. **Check Render logs** - View deployment logs in Render dashboard for detailed error messages

### Common Errors

- **EAUTH**: Authentication failed - Check username/password
- **ECONNECTION**: Connection failed - Check host/port settings
- **ETIMEDOUT**: Connection timeout - Check network/firewall (may need to increase `SMTP_CONNECTION_TIMEOUT`)

### Render/Production-Specific Issues

- **Connection timeouts**: If you see timeout errors, increase `SMTP_CONNECTION_TIMEOUT` to 60000 (60 seconds)
- **Certificate errors**: If you see TLS/certificate errors, set `SMTP_REJECT_UNAUTHORIZED=false`
- **Port blocked**: Some providers block port 587, try port 465 with `SMTP_SECURE=true`
- **Rate limiting**: Production environments have lower rate limits (5 messages/second) to prevent abuse

### Gmail-Specific Issues

- **"Less secure app access"**: Use App Password instead
- **Rate limiting**: Gmail has sending limits (500 emails/day for free accounts)
- **Spam filtering**: Ensure your "from" address matches your Gmail account

## Email Service Feature Flag

The application includes a feature flag to enable/disable email functionality:

### Environment Variables

```env
# Enable email service (default: true)
ENABLE_EMAIL_SERVICE="true"
NEXT_PUBLIC_ENABLE_EMAIL_SERVICE="true"

# Disable email service
ENABLE_EMAIL_SERVICE="false"
NEXT_PUBLIC_ENABLE_EMAIL_SERVICE="false"
```

### Behavior When Disabled

When `ENABLE_EMAIL_SERVICE="false"`:

- **Signup**: Email is automatically verified, no verification email sent
- **Signin**: "Forgot password?" link is hidden
- **Email Verification Banner**: Completely hidden
- **Invitations**: Uses in-app notifications instead of emails
- **Join Requests**: Uses in-app notifications instead of emails
- **All Email Features**: Disabled, app uses notifications only

### When to Disable

- Email service is not working (temporary solution)
- Testing without email setup
- Using notifications-only workflow
- SMTP configuration issues

### Default Behavior

- **Default**: Email service is **enabled** (`true`)
- If environment variable is not set, email service works normally
- Set to `"false"` explicitly to disable

## Security Notes

- Never commit `.env.local` to version control
- Use App Passwords instead of your main account password
- For production, use a dedicated email service (SendGrid, Mailgun, AWS SES)
- Consider using environment-specific SMTP configurations

