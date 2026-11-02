// Swaps the old "N" header mark for the DN hexagon on every page. Backs up each file it changes.
var fs = require('fs'), path = require('path');
var svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 200\"><path d=\"M100 8 L180 54 L180 146 L100 192 L20 146 L20 54 Z\" fill=\"#FFFFFF\" stroke=\"#0C8A96\" stroke-width=\"11\" stroke-linejoin=\"round\"/><g stroke=\"#0C8A96\" stroke-width=\"2.5\" fill=\"none\" opacity=\"0.28\"><circle cx=\"100\" cy=\"100\" r=\"50\"/><ellipse cx=\"100\" cy=\"100\" rx=\"17\" ry=\"50\"/><ellipse cx=\"100\" cy=\"100\" rx=\"34\" ry=\"50\"/><line x1=\"50\" y1=\"100\" x2=\"150\" y2=\"100\"/></g><text x=\"100\" y=\"124\" text-anchor=\"middle\" font-family=\"Inter,Arial,sans-serif\" font-size=\"70\" font-weight=\"800\" fill=\"#0C8A96\">DN</text></svg>";
var MARK = '<img src=/dn-hex.svg width=26 height=26 alt aria-hidden=true style=display:inline-block;vertical-align:middle;flex:none>';
var roots = ['public', '.'], changed = [], seen = {};
function walk(dir, depth) {
  var list; try { list = fs.readdirSync(dir); } catch (e) { return; }
  list.forEach(function (n) {
    if (n === 'node_modules' || n.charAt(0) === '.') return;
    var p = path.join(dir, n), st; try { st = fs.statSync(p); } catch (e) { return; }
    if (st.isDirectory()) { if (depth < 2) walk(p, depth + 1); return; }
    if (!/\.(html|js)$/.test(n) || seen[path.resolve(p)]) return;
    seen[path.resolve(p)] = 1;
    var s = fs.readFileSync(p, 'utf8'), t = s;
    // <a ... class="...brand..."> ... <x>N</x> ... </a>
    t = t.replace(/(<(?:a|div|span|header)\b[^>]*class=["'][^"']*brand[^"']*["'][^>]*>)([\s\S]{0,300}?)<(b|span|i|div|strong|em)\b[^>]*>\s*N\s*<\/\3>(?=([A-Za-z]?))/g, function (m, a, pre, tag, nxt) { return a + pre + MARK + (nxt ? ' ' : ''); });
    if (t !== s) { fs.writeFileSync(p + '.pre-dn.bak', s); fs.writeFileSync(p, t); changed.push(p); }
  });
}
roots.forEach(function (r) { walk(r, 0); });
var pub = fs.existsSync('public') ? 'public' : '.';
fs.writeFileSync(path.join(pub, 'dn-hex.svg'), svg);
console.log('DN logo placed on ' + changed.length + ' files:\n' + changed.join('\n'));
