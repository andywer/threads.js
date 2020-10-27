const child_process = require('child_process');
const path = require('path')

if (parseFloat(process.version.match(/^v(\d+\.\d+)/)[1]) < 10) {
  child_process.execSync(`npm install ava@^2`, {stdio: 'inherit'})
  child_process.execSync(`node ${path.resolve('./node_modules/ava/cli.js')}`, {stdio: 'inherit'})
} else {
  child_process.execSync(`node ${path.resolve('./node_modules/ava/cli.js')}`, {stdio: 'inherit'})
}
