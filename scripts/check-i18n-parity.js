const fs = require('fs');
const path = require('path');

function getKeys(data, prefix = '') {
  let keys = new Set();
  for (let k in data) {
    let fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof data[k] === 'object' && data[k] !== null && !Array.isArray(data[k])) {
      let subKeys = getKeys(data[k], fullKey);
      subKeys.forEach(sk => keys.add(sk));
    } else {
      keys.add(fullKey);
    }
  }
  return keys;
}

function checkParity(file1, file2) {
  const data1 = JSON.parse(fs.readFileSync(file1, 'utf8'));
  const data2 = JSON.parse(fs.readFileSync(file2, 'utf8'));

  const keys1 = getKeys(data1);
  const keys2 = getKeys(data2);

  const missingIn2 = [...keys1].filter(k => !keys2.has(k));
  const missingIn1 = [...keys2].filter(k => !keys1.has(k));

  if (missingIn1.length === 0 && missingIn2.length === 0) {
    console.log("✅ Parity check passed! All keys match.");
    return true;
  } else {
    if (missingIn2.length > 0) {
      console.log(`❌ Keys present in ${path.basename(file1)} but missing in ${path.basename(file2)}:`);
      missingIn2.sort().forEach(k => console.log(`  - ${k}`));
    }
    if (missingIn1.length > 0) {
      console.log(`❌ Keys present in ${path.basename(file2)} but missing in ${path.basename(file1)}:`);
      missingIn1.sort().forEach(k => console.log(`  - ${k}`));
    }
    return false;
  }
}

const baseDir = path.dirname(__dirname);
const enPath = path.join(baseDir, 'clients', 'desktop', 'src', 'locales', 'en.json');
const zhPath = path.join(baseDir, 'clients', 'desktop', 'src', 'locales', 'zh.json');

console.log(`Checking ${enPath} and ${zhPath}...`);
if (checkParity(enPath, zhPath)) {
  process.exit(0);
} else {
  process.exit(1);
}
