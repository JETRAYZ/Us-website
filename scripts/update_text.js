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
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src/components');

let changed = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace text-white with text-foreground globally
  content = content.replace(/text-white/g, 'text-foreground');
  
  // Revert specific cases where text-white is still needed
  content = content.replace(/bg-netflix-red([^"']*)text-foreground/g, 'bg-netflix-red$1text-white');
  content = content.replace(/bg-\[\#E50914\]([^"']*)text-foreground/g, 'bg-[#E50914]$1text-white');
  
  // Revert buttons that are strictly white text
  content = content.replace(/text-foreground([^"']*)bg-netflix-red/g, 'text-white$1bg-netflix-red');

  // Specific overrides for TimeCapsule locks etc
  content = content.replace(/text-foreground\/40/g, 'text-foreground/40');
  
  if (original !== content) {
    fs.writeFileSync(file, content);
    console.log('Updated:', file);
    changed++;
  }
});
console.log('Total files changed:', changed);
