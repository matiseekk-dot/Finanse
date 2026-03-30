const fs = require("fs");

let code = fs.readFileSync("App.jsx", "utf-8");

// FIX 1: usuwa })()}
code = code.replace(/\}\)\(\)\}/g, ")");

// FIX 2: usuwa nadmiarowe } po divach
code = code.replace(/<\/div>\s*<\/div>\}/g, "</div>\n</div>");

// FIX 3: poprawia końcówki komponentów
code = code.replace(/\);\s*\}/g, ");\n};");

fs.writeFileSync("App.jsx", code);

console.log("✅ App.jsx naprawiony");