const fs = require('node:fs');
const routes = ['/', '/brief', '/build', '/timeline', '/decisions', '/contradictions', '/risks', '/actions', '/team', '/questions', '/sources', '/update', '/guide', '/ask', '/sources/E02'];
const results = [];
async function run(route) {
  try {
    const response = await fetch(`http://localhost:3000${route}`, {signal: AbortSignal.timeout(60000)});
    const html = await response.text();
    const text = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    results.push({route, status: response.status, french: html.includes('<html lang="fr"'), text});
    console.log(`${route}: ${response.status}, langue française=${html.includes('<html lang="fr"')}, ${text.length} caractères`);
  } catch (e) { results.push({route, error: e.message}); console.log(`${route}: ${e.message}`); }
}
(async () => { for (let i = 0; i < routes.length; i += 3) await Promise.all(routes.slice(i, i + 3).map(run)); fs.writeFileSync('.translation-smoke.json', JSON.stringify(results, null, 2)); if (results.some(r=>r.status !== 200 || !r.french)) process.exitCode = 1; })();
