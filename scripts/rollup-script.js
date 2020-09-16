const child_process = require('child_process');
const path = require('path')

if (parseFloat(process.version.match(/^v(\d+\.\d+)/)[1]) < 10) {
  child_process.execSync(`npm install rollup@1`, {stdio: 'inherit'})
  child_process.execSync(`node ${path.resolve('./node_modules/rollup/dist/bin/rollup')} -c -f umd --file=bundle/worker.js --name=threads -- dist-esm/worker/bundle-entry.js`, {stdio: 'inherit'})
} else {
  child_process.execSync(`node ${path.resolve('./node_modules/rollup/dist/bin/rollup')} -c -f umd --file=bundle/worker.js --name=threads -- dist-esm/worker/bundle-entry.js`, {stdio: 'inherit'})
}
