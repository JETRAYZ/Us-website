const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{2300}-\u{23FF}\u{2B50}\u{1F004}]/gu;

let count = 0;
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const matches = [...new Set(content.match(emojiRegex) || [])];
  if (matches.length > 0) {
    console.log(`\nFile: ${file}`);
    console.log(`Emojis found: ${matches.join(', ')}`);
    count++;
  }
});
console.log(`\nTotal files with emojis: ${count}`);
