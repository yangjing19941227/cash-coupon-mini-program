const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.join(__dirname, '..');

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), 'utf8');
}

test('app enables WeChat share menu on launch', () => {
  const appJs = readProjectFile('app.js');
  const shareService = readProjectFile('utils/share-service.js');

  assert.match(appJs, /enableShareMenu/);
  assert.match(shareService, /wx\.showShareMenu/);
  assert.match(shareService, /shareAppMessage/);
  assert.match(shareService, /shareTimeline/);
});

test('every mini program page exposes friend and timeline share handlers', () => {
  const pagesDir = path.join(rootDir, 'pages');
  const pageJsFiles = fs
    .readdirSync(pagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `pages/${entry.name}/index.js`)
    .filter((filePath) => fs.existsSync(path.join(rootDir, filePath)));

  assert.ok(pageJsFiles.length > 0);

  for (const filePath of pageJsFiles) {
    const source = readProjectFile(filePath);
    assert.match(source, /onShareAppMessage\(\)/, `${filePath} needs onShareAppMessage`);
    assert.match(source, /onShareTimeline\(\)/, `${filePath} needs onShareTimeline`);
    assert.match(source, /path:\s*'\/pages\/home\/index'/, `${filePath} should share home path`);
  }
});
