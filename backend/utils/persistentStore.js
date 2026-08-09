const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (err) {
    console.error("Could not create data directory for persistent store:", err);
  }
}

const loadStore = (filename, defaultValue = []) => {
  const filePath = path.join(dataDir, filename);
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn(`Could not read persistent file ${filename}:`, err.message);
  }
  return defaultValue;
};

const saveStore = (filename, data) => {
  const filePath = path.join(dataDir, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn(`Could not save persistent file ${filename}:`, err.message);
  }
};

module.exports = {
  loadStore,
  saveStore
};
