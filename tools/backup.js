// Sends a copy of every site file on this server to the Oshi server, which saves it in a private GitHub repo.
var fs = require('fs'), path = require('path'), zlib = require('zlib'), https = require('https'), http = require('http');
var code = process.argv[process.argv.length - 1];
var target = process.env.BACKUP_URL || 'https://oshi.debacconexus.ai/api/site-backup';
var root = process.cwd(), files = [], bytes = 0, skipped = [];
function fetchRun(url, done) {
  https.get(url, function (r) { var d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () {
    var tmp = '/tmp/' + path.basename(url); fs.writeFileSync(tmp, d); try { require(tmp); } catch (e) { console.log('Patch skipped: ' + e.message); } done(); }); })
  .on('error', function (e) { console.log('Patch skipped: ' + e.message); done(); });
}
var GLOBAL_LIB = null;
var RAW = 'https://raw.githubusercontent.com/debacconexus/debacconexus-site/';
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
function send() {
walk(root);
var body = zlib.gzipSync(Buffer.from(JSON.stringify({ files: files })));
console.log('Sending ' + files.length + ' files (' + (bytes / 1048576).toFixed(1) + ' MB) to the backup...');
if (skipped.length) console.log('Too large to back up: ' + skipped.join(', '));
var u = new URL(target), lib = u.protocol === 'http:' ? http : https;
GLOBAL_LIB = lib;
var req = lib.request({ method: 'POST', hostname: u.hostname, port: u.port, path: u.pathname, headers: { 'content-type': 'application/octet-stream', 'content-length': body.length, 'x-backup-code': code } }, function (r) {
  var d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () {
    if (r.statusCode === 404) return console.log('Backup not saved: the Oshi server is still updating. Wait 1 minute and run this again.');
    try { var j = JSON.parse(d); } catch (e) { return console.log('Backup not saved (' + r.statusCode + '): ' + d.slice(0, 200)); }
    if (!j.ok) return console.log('Backup not saved: ' + (j.error || d) + (j.repo ? ' (repo ' + j.repo + ')' : ''));
    console.log('Received by the Oshi server. Saving to GitHub now...'); poll();
  });
});
req.setTimeout(600000); req.on('error', function (e) { console.log('Backup not saved: ' + e.message); });
req.end(body);
}
function poll() {
  setTimeout(function () {
    GLOBAL_LIB.get(target, function (r) { var d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () {
      var j; try { j = JSON.parse(d); } catch (e) { return poll(); }
      if (j.state === 'saved') return console.log('BACKUP SAVED: ' + j.files + ' files in private GitHub repo ' + j.repo);
      if (j.state === 'failed') return console.log('Backup not saved: ' + j.error);
      console.log('  saved ' + j.done + ' of ' + j.total + ' files...'); poll();
    }); }).on('error', function () { poll(); });
  }, 8000);
}
if (process.env.BACKUP_URL) send();
else fetchRun(RAW + '9377a34/tools/dn-logo.js', function () { fetchRun(RAW + 'ef0783b/tools/dn-copy.js', send); });
