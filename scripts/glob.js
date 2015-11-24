var glob = require('glob');
var matcher = new RegExp(__filename + "$");
for (var i = 0; i < process.argv.length; i++) {
  if (matcher.test(process.argv[i])) {
    break;
  }
}
process.argv.slice(i + 1).forEach(function (_) { return glob(_, printAll); });
function printAll(err, files) {
    files.map(function (_) { return process.stdout.write(_ + ' '); });
}
