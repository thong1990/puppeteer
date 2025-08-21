// Example usage of the Email OTP Retrieval API (IMAP)

const API_BASE_URL = 'http://localhost:3000';

// Test health check
async function testHealthCheck() {
  try {
    const response = await fetch(`${API_BASE_URL}/`);
    const data = await response.json();
    console.log('Health Check:', data);
    return data.status === 'OK';
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

// Test accounts endpoint
async function testAccountsEndpoint() {
  try {
    const response = await fetch(`${API_BASE_URL}/accounts`);
    const data = await response.json();
    console.log('Active Accounts:', data);
    return data.success;
  } catch (error) {
    console.error('Accounts endpoint failed:', error);
    return false;
  }
}

// Test OTP retrieval (POST method)
async function testOTPPost(referenceCode, accountIds = null) {
  try {
    const payload = {
      referenceCode,
      ...(accountIds && { accountIds }),
      timeout: 10000 // 10 seconds for testing
    };

    const response = await fetch(`${API_BASE_URL}/otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('OTP POST Response:', data);
    return data;
  } catch (error) {
    console.error('OTP POST failed:', error);
    return null;
  }
}

// Test OTP retrieval (GET method)
async function testOTPGet(referenceCode, accounts = null) {
  try {
    let url = `${API_BASE_URL}/otp/${referenceCode}`;
    if (accounts) {
      url += `?accounts=${accounts.join(',')}&timeout=10000`;
    }

    const response = await fetch(url);
    const data = await response.json();
    console.log('OTP GET Response:', data);
    return data;
  } catch (error) {
    console.error('OTP GET failed:', error);
    return null;
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 Testing Email OTP Retrieval API (IMAP)...\n');

  // Test 1: Health Check
  console.log('1. Testing health check...');
  const healthOk = await testHealthCheck();
  console.log(`✅ Health check: ${healthOk ? 'PASSED' : 'FAILED'}\n`);

  // Test 2: Accounts endpoint
  console.log('2. Testing accounts endpoint...');
  const accountsOk = await testAccountsEndpoint();
  console.log(`✅ Accounts endpoint: ${accountsOk ? 'PASSED' : 'FAILED'}\n`);

  // Test 3: OTP with invalid reference code (should fail)
  console.log('3. Testing invalid reference code...');
  const invalidResult = await testOTPPost('ABC'); // Too short
  console.log(`✅ Invalid ref code: ${!invalidResult?.success ? 'PASSED' : 'FAILED'}\n`);

  // Test 4: OTP with valid format but no credentials (should fail gracefully)
  console.log('4. Testing valid format reference code (will fail without credentials)...');
  const validResult = await testOTPPost('ABC12');
  console.log(`✅ Valid format test: ${validResult !== null ? 'PASSED' : 'FAILED'}\n`);

  // Test 5: GET method test
  console.log('5. Testing GET method...');
  const getResult = await testOTPGet('TEST1');
  console.log(`✅ GET method test: ${getResult !== null ? 'PASSED' : 'FAILED'}\n`);

  console.log('🎉 Tests completed!');
  console.log('\n📝 Note: OTP retrieval will fail without proper IMAP credentials in .env file');
}

// Run if called directly
if (typeof require !== 'undefined' && require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testHealthCheck,
  testAccountsEndpoint,
  testOTPPost,
  testOTPGet,
  runTests
};