const fs = require('fs');

const marukubo = fs.readFileSync('src/components/welcome/marukubo_welcome.html', 'utf8');
const wasii = fs.readFileSync('src/components/welcome/wasii_anime_logo.html', 'utf8');

const output = `// Auto-generated exact CodePen HTML bundles
export const MARUKUBO_WELCOME_HTML = ${JSON.stringify(marukubo)};

export const WASII_ANIME_LOGO_HTML = ${JSON.stringify(wasii)};
`;

fs.writeFileSync('src/components/welcome/welcomeHtml.ts', output, 'utf8');
console.log('welcomeHtml.ts generated with size:', output.length);
