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

## Troubleshooting

### Emails not being received

1. **Check server logs** - Look for SMTP connection errors
2. **Verify SMTP credentials** - Ensure username/password are correct
3. **Check spam folder** - Emails might be filtered
4. **Test SMTP connection** - The app now verifies SMTP connection before sending
5. **Check firewall** - Ensure port 587 or 465 is not blocked

### Common Errors

- **EAUTH**: Authentication failed - Check username/password
- **ECONNECTION**: Connection failed - Check host/port settings
- **ETIMEDOUT**: Connection timeout - Check network/firewall

### Gmail-Specific Issues

- **"Less secure app access"**: Use App Password instead
- **Rate limiting**: Gmail has sending limits (500 emails/day for free accounts)
- **Spam filtering**: Ensure your "from" address matches your Gmail account

## Security Notes

- Never commit `.env.local` to version control
- Use App Passwords instead of your main account password
- For production, use a dedicated email service (SendGrid, Mailgun, AWS SES)
- Consider using environment-specific SMTP configurations

