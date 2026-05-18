const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const DEVICE_FILE = path.join(os.homedir(), '.aclass_device_id');

function getDeviceId() {
  try {
    if (fs.existsSync(DEVICE_FILE)) {
      return fs.readFileSync(DEVICE_FILE, 'utf8').trim();
    }
  } catch (err) {
    console.error('Error reading device ID:', err);
  }

  const deviceId = uuidv4();
  try {
    fs.writeFileSync(DEVICE_FILE, deviceId, 'utf8');
  } catch (err) {
    console.error('Error writing device ID:', err);
  }
  return deviceId;
}

module.exports = { getDeviceId };
