// Sends a copy of every site file on this server to the Oshi server, which saves it in a private GitHub repo.
var fs = require('fs'), path = require('path'), zlib = require('zlib'), https = require('https'), http = require('http');
var code = process.argv[process.argv.length - 1];
var target = process.env.BACKUP_URL || 'https://oshi.debacconexus.ai/api/site-backup';
var root = process.cwd(), files = [], bytes = 0, skipped = [];
function walk(dir) {
  fs.readdirSync(dir).forEach(function (n) {
    if (n === 'node_modules' || n === '.git' || n === '.cache' || n === '.npm' || /\.(bak|pre-dn\.bak|pre-copy\.bak)$/.test(n)) return;
    var p = path.join(dir, n), st; try { st = fs.lstatSync(p); } catch (e) { return; }
    if (st.isSymbolicLink()) return;
    if (st.isDirectory()) return walk(p);
    if (st.size > 40 * 1024 * 1024) { skipped.push(path.relative(root, p)); return; }
    var rel = path.relative(root, p).split(path.sep).join('/');
    files.push({ path: rel, b64: fs.readFileSync(p).toString('base64'), exec: !!(st.mode & 0o111) }); bytes += st.size;
  });
}
walk(root);
var body = zlib.gzipSync(Buffer.from(JSON.stringify({ files: files })));
console.log('Sending ' + files.length + ' files (' + (bytes / 1048576).toFixed(1) + ' MB) to the backup...');
if (skipped.length) console.log('Too large to back up: ' + skipped.join(', '));
var u = new URL(target), lib = u.protocol === 'http:' ? http : https;
var req = lib.request({ method: 'POST', hostname: u.hostname, port: u.port, path: u.pathname, headers: { 'content-type': 'application/octet-stream', 'content-length': body.length, 'x-backup-code': code } }, function (r) {
  var d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () {
    try { var j = JSON.parse(d); console.log(j.ok ? 'BACKUP SAVED: ' + j.files + ' files in GitHub repo ' + j.repo : 'Backup not saved: ' + (j.error || d)); }
    catch (e) { console.log('Backup not saved (' + r.statusCode + '): ' + d.slice(0, 200)); }
  });
});
req.setTimeout(600000); req.on('error', function (e) { console.log('Backup not saved: ' + e.message); });
req.end(body);
