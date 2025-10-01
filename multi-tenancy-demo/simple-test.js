// Simple test script using built-in Node.js modules only
const http = require('http');

const BASE_HOST = 'localhost';
const PORT = 9000;

// Helper function to make HTTP requests
function makeRequest(method, path, headers = {}, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_HOST,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: jsonBody, body });
        } catch (e) {
          resolve({ status: res.statusCode, data: {}, body });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test helper function
async function testEndpoint(description, method, path, data = null, headers = {}) {
  try {
    console.log(`\n🧪 ${description}`);
    console.log(`   ${method} ${path}`);

    const result = await makeRequest(method, path, headers, data);

    if (result.status >= 200 && result.status < 300) {
      console.log(`   ✅ SUCCESS: ${result.status}`);
    } else if (result.status >= 400 && result.status < 500) {
      console.log(`   ⚠️  CLIENT ERROR: ${result.status}`);
    } else {
      console.log(`   ❌ ERROR: ${result.status}`);
    }

    // Show response preview
    if (result.data && Object.keys(result.data).length > 0) {
      const preview = JSON.stringify(result.data, null, 2).substring(0, 150);
      console.log(`   📋 ${preview}${preview.length >= 150 ? '...' : ''}`);
    }

    return { success: result.status < 400, ...result };
  } catch (error) {
    console.log(`   ❌ NETWORK ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runSimpleTests() {
  console.log('🚀 Simple Multi-Tenancy Demo Tests');
  console.log('===================================');

  let passed = 0;
  let total = 0;

  const test = async (description, method, path, data, headers) => {
    total++;
    const result = await testEndpoint(description, method, path, data, headers);
    if (result.success) passed++;
    return result;
  };

  // Test headers
  const tenantHeaders = { 'x-tenant-id': 'tenant-a', 'x-user-id': 'test-user' };

  // ===== CORE API TESTS =====
  console.log('\n📊 CORE API TESTS');
  console.log('=================');

  // Health and docs
  await test('Health Check', 'GET', '/health');
  await test('API Documentation', 'GET', '/api-docs');

  // Users API
  console.log('\n👥 USERS API');
  await test('List Users', 'GET', '/users/list', null, tenantHeaders);
  await test('Create User', 'POST', '/users/create', {
    email: 'test@example.com',
    name: 'Test User'
  }, tenantHeaders);
  await test('Get User', 'GET', '/users/get/user-001', null, tenantHeaders);

  // Products API
  console.log('\n📦 PRODUCTS API');
  await test('List Products', 'GET', '/products/list', null, tenantHeaders);
  await test('Create Product', 'POST', '/products/create', {
    name: 'Test Product',
    category: 'Electronics',
    price: 99.99
  }, tenantHeaders);
  await test('Get Product', 'GET', '/products/get/1', null, tenantHeaders);
  await test('Update Product', 'PUT', '/products/update/1', {
    name: 'Updated Product',
    price: 149.99
  }, tenantHeaders);

  // Categories API
  console.log('\n📂 CATEGORIES API');
  await test('List Categories', 'GET', '/categories/list', null, tenantHeaders);
  await test('Create Category', 'POST', '/categories/create', {
    name: 'Test Category',
    description: 'Test description'
  }, tenantHeaders);
  await test('Get Category', 'GET', '/categories/get/1', null, tenantHeaders);
  await test('Update Category', 'PUT', '/categories/update/1', {
    name: 'Updated Category'
  }, tenantHeaders);

  // Error handling
  console.log('\n❌ ERROR HANDLING');
  await test('404 Test', 'GET', '/nonexistent');
  await test('Missing Data Test', 'POST', '/users/create', {}, tenantHeaders);

  // Summary
  console.log('\n📈 TEST SUMMARY');
  console.log('===============');
  console.log(`✅ Passed: ${passed}/${total} tests`);
  console.log(`📊 Success Rate: ${Math.round((passed / total) * 100)}%`);

  if (passed === total) {
    console.log('\n🎉 All tests passed! The application is working correctly.');
  } else {
    console.log('\n⚠️  Some tests had issues. Check the details above.');
  }

  console.log('\n🚀 Application Ready!');
  console.log('\n📋 Quick Test Commands:');
  console.log(`curl http://localhost:${PORT}/health`);
  console.log(`curl -H "x-tenant-id: tenant-a" http://localhost:${PORT}/users/list`);
  console.log(`curl -H "x-tenant-id: tenant-a" http://localhost:${PORT}/products/list`);
  console.log(`curl -H "x-tenant-id: tenant-a" http://localhost:${PORT}/categories/list`);

  return { passed, total };
}

// Auto-run if this file is executed directly
if (require.main === module) {
  console.log('⏳ Waiting 2 seconds for server to start...');
  setTimeout(() => {
    runSimpleTests().catch(console.error);
  }, 2000);
}

module.exports = { runSimpleTests };
