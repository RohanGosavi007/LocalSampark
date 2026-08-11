const fs = require('fs'); 
const code = fs.readFileSync('src/modules/ecommerce/controllers/shop-management.controller.js', 'utf8'); 
const lines = code.split('\n'); 
const stack = []; 
for (let i = 0; i < lines.length; i++) { 
  const line = lines[i]; 
  let inString = false; 
  let inComment = false; 
  for (let j = 0; j < line.length; j++) { 
    const char = line[j]; 
    if (inComment) continue; 
    if (inString) { 
      if (char === inString && line[j-1] !== '\\') inString = false; 
      continue; 
    } 
    if (char === '"' || char === "'" || char === "`") { 
      inString = char; 
      continue; 
    } 
    if (char === '/' && line[j+1] === '/') { 
      inComment = true; 
      break; 
    } 
    if (char === '{') { 
      stack.push(i + 1); 
    } else if (char === '}') { 
      stack.pop(); 
    } 
  } 
} 
console.log('Unclosed braces opened at lines:', stack);
