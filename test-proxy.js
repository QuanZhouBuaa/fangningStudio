// test-proxy.js

// 1. 加载 .env 文件中的环境变量
require('dotenv').config();

// 2. 启动全局代理
require('global-proxy-agent').bootstrap();

async function runTest() {
  console.log(`--- Starting Node.js Proxy Test ---`);
  console.log(`Using proxy: ${process.env.HTTPS_PROXY || 'None'}`);
  console.log(`Attempting to fetch https://www.google.com...`);

  try {
    // 3. 发起一个最基础的网络请求
    const response = await fetch('https://www.google.com');

    // 4. 如果成功，打印成功信息
    console.log('\n✅✅✅ SUCCESS! ✅✅✅');
    console.log(`Status Code: ${response.status}`);
    console.log('Conclusion: Your Node.js environment CAN connect through the proxy.');

  } catch (error) {
    // 5. 如果失败，打印失败信息
    console.error('\n❌❌❌ FAILURE! ❌❌❌');
    console.error('Conclusion: Your Node.js environment CANNOT connect through the proxy.');
    console.error('The problem is not your chat application code, but your system environment (Firewall, Antivirus, etc.).');
    console.error('\n--- Error Details ---');
    console.error(`Error Message: ${error.message}`);
    if (error.cause) {
        console.error(`Error Cause: ${error.cause}`);
    }
  }
}

runTest();