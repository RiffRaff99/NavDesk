const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const routerSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'router.js'), 'utf8');

const context = {
  console,
  appState: {
    mode: 'PAN_ZOOM',
    toolLayer: null,
    navTriangle: null,
    alignTriangle: null,
  },
  Konva: {},
  createTriangleGeometry: () => ({ x: () => 0, y: () => 0, rotation: () => 0, position: () => {}, add: () => {} }),
  positionAlignOnNav: () => {},
  getLocalPointer: () => ({ x: 10, y: 20 }),
};

vm.createContext(context);
vm.runInContext(routerSource, context);

test('normalizeModeName converts UI actions to canonical state names', () => {
  assert.equal(context.normalizeModeName('nav'), 'NAV_ACTIVE');
  assert.equal(context.normalizeModeName('align'), 'ALIGN_ACTIVE');
  assert.equal(context.normalizeModeName('pan'), 'PAN_ZOOM');
  assert.equal(context.normalizeModeName('parallel'), 'PARALLEL');
});

test('transition handles nav activation in PAN_ZOOM mode', () => {
  context.appState.mode = 'PAN_ZOOM';
  context.appState.navTriangle = null;
  context.transition('PAN_ZOOM', 'NAV_ACTIVE');
  assert.equal(context.appState.mode, 'NAV_ACTIVE');
});
