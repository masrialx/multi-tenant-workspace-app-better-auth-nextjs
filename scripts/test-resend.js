/**
 * Test script to verify Resend API key
 * Usage: node scripts/test-resend.js
 */

const { Resend } = require('resend');

// Get API key from environment variable or use the provided one
const apiKey = process.env.RESEND_API_KEY || 're_7xQDSSip_75ymW1g7tFWD7YQ8usvFHviu';
const testEmail = process.env.TEST_EMAIL || 'masrialemuai@gmail.com';

console.log('🧪 Testing Resend API key...\n');
console.log('API Key:', apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4));
console.log('Test Email:', testEmail);
console.log('From Email: onboarding@resend.dev\n');

const resend = new Resend(apiKey);

async function testResend() {
  try {
    console.log('📧 Sending test email...\n');
    
    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: testEmail,
      subject: 'Hello World - Resend Test',
      html: '<p>Congrats on sending your <strong>first email</strong>!</p><p>This is a test email to verify your Resend API key is working correctly.</p>'
    });

    console.log('✅ SUCCESS! Email sent successfully!\n');
    console.log('Response:', JSON.stringify(result, null, 2));
    console.log('\n📬 Check your inbox at:', testEmail);
    
    return { success: true, result };
  } catch (error) {
    console.error('❌ ERROR: Failed to send email\n');
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      status: error.status,
      statusCode: error.statusCode,
    });
    
    if (error.message?.includes('API key')) {
      console.error('\n💡 Tip: Your API key might be invalid or expired.');
      console.error('   Please check your Resend dashboard: https://resend.com/api-keys');
    } else if (error.message?.includes('domain')) {
      console.error('\n💡 Tip: The "from" domain might not be verified.');
      console.error('   Please verify your domain in Resend dashboard: https://resend.com/domains');
    } else if (error.message?.includes('rate limit')) {
      console.error('\n💡 Tip: You might have hit the rate limit.');
      console.error('   Please wait a few minutes and try again.');
    }
    
    return { success: false, error };
  }
}

// Run the test
testResend()
  .then((result) => {
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });

