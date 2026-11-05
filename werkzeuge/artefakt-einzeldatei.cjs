// Baut aus dist/ eine einzelne HTML-Datei (Schriften, Skript, Figurenfotos eingebettet) für das claude.ai-Artefakt. Aufruf: npx vite build && node werkzeuge/artefakt-einzeldatei.cjs <ziel.html>
const fs=require('fs'),d=require('path').join(__dirname,'..','dist')+'/';
let css=fs.readFileSync(d+fs_css(),'utf8');
function fs_css(){return 'assets/'+fs.readdirSync(d+'assets').find(f=>f.endsWith('.css'))}
css=css.replace(/src:\s*url\(([^)]+?\.woff2)\)\s*format\("woff2"\)\s*,\s*url\([^)]+?\.woff\)\s*format\("woff"\)/g,(m,u)=>{const f=u.replace(/["']/g,'').replace(/^\.?\//,'');return `src:url(data:font/woff2;base64,${fs.readFileSync(d+'assets/'+f.split('/').pop()).toString('base64')}) format("woff2")`});
const left=(css.match(/url\([^d)][^)]*\)/g)||[]);
const jsf=fs.readdirSync(d+'assets').find(f=>f.endsWith('.js'));
const js=fs.readFileSync(d+'assets/'+jsf,'utf8').replace(/<\/script/g,'<\\/script');
const fig={};if(fs.existsSync(d+'figuren'))for(const f of fs.readdirSync(d+'figuren'))fig[f.replace(/\.[a-z]+$/,'')]='data:image/'+(f.endsWith('.webp')?'webp':f.endsWith('.png')?'png':'jpeg')+';base64,'+fs.readFileSync(d+'figuren/'+f).toString('base64');
const out=`<title>Heatnet</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>html,body{margin:0;padding:0;background:#3f7a2f}</style>
<style>${css}</style>
<div id="app"><div id="drehen" role="alert"><p>Bitte drehe dein Handy ins Querformat.</p></div><canvas id="karte" role="img" aria-label="Dorfkarte mit Heizzentrale, Häusern und Wärmeleitungen"></canvas></div>
<script>window.__figuren=${JSON.stringify(fig)}</script>
<script type="module">${js}</script>`;
fs.writeFileSync(process.argv[2],out);console.log('KB',Math.round(out.length/1024),'unresolved',left.slice(0,5));
