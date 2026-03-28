import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf8');

// 1. Extract CSS
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (!fs.existsSync('css')) fs.mkdirSync('css');
fs.writeFileSync('css/styles.css', styleMatch[1].trim());

// 2. Extract JS
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
const jsCode = scriptMatch[1].trim();
if (!fs.existsSync('js')) fs.mkdirSync('js');

// Helper to find index or end
const until = (str, search) => {
  const i = str.indexOf(search);
  return i === -1 ? str.length : i;
};

// Split JS logic roughly
// state.js
// state contains STATE, API_BASE, CORS_PROXY, API_KEY, MODEL setup
const apiStart = jsCode.indexOf('/* ===');
const helpersStart = jsCode.indexOf('/* ============================================================', jsCode.indexOf('HELPERS'));

let stateJs = jsCode.substring(apiStart, helpersStart);

// Let's refine based on what's actually there
const nowFunc = jsCode.indexOf('function now()');
let apiJs = jsCode.substring(nowFunc, jsCode.indexOf('function fillExam(name)'));

let uiJs = jsCode.substring(jsCode.indexOf('function fillExam(name)'));

// ensure we write correct portions
let combinedState = stateJs + "\n\n/* Helpers */\n" + jsCode.substring(helpersStart, nowFunc);

fs.writeFileSync('js/state.js', jsCode.substring(0, helpersStart).trim());
fs.writeFileSync('js/api.js', apiJs.trim());
fs.writeFileSync('js/ui.js', uiJs.trim());

// 3. Update HTML
const newHtml = html
    .replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="css/styles.css">')
    .replace(/<script>[\s\S]*?<\/script>/, '<script src="js/state.js"></script>\n<script src="js/api.js"></script>\n<script src="js/ui.js"></script>');

fs.writeFileSync('index.html', newHtml);
console.log('Split complete!');
