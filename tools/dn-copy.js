// Updates the home page intro lines to official wording. Backs up first. Safe to run twice.
var fs = require('fs'), path = require('path');
var files = ['public/index.html', 'index.html'].filter(function (p) { return fs.existsSync(p); });
var n = 0;
files.forEach(function (p) {
  var s = fs.readFileSync(p, 'utf8'), t = s;
  t = t.replace(/Patent-pending governed AI infrastructure\s*(?:—|&mdash;|&#8212;|&#x2014;|-{1,2})\s*built by a social worker,\s*not a lab\.?/g, 'Patent-pending governed AI infrastructure from an independent verification and certification lab.');
  t = t.replace(/A social worker built the governance layer that AI companies left open\.?/g, 'Founded by a social worker. Built for every person AI touches.');
  if (t !== s) { fs.writeFileSync(p + '.pre-copy.bak', s); fs.writeFileSync(p, t); n++; console.log('Updated ' + p); }
});
console.log('Intro wording updated on ' + n + ' file(s).');
