const fetch = require('node-fetch');
const { getDeviceId } = require('./deviceId');

async function activateLicense(licenseKey) {
  const url = 'https://www.aclassstore.com/api/whitelist/activate';
  const deviceId = getDeviceId();

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey, deviceId }),
    timeout: 10000
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'License validation failed');
  }

  return {
    token: data.token,
    tiktokUsername: (data.tiktokUsername || data.whitelistedUsername || '').replace(/^@/, '')
  };
}

module.exports = { activateLicense };
