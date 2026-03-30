/**
 * Copies Cesium static assets (Workers, Assets, ThirdParty, Widgets)
 * from node_modules into public/cesium so they can be served at runtime.
 *
 * Runs automatically via the "postinstall" npm script.
 */

const { cpSync, mkdirSync } = require('fs');
const { join } = require('path');

const cesiumBuild = join(__dirname, '..', 'node_modules', 'cesium', 'Build', 'Cesium');
const dest = join(__dirname, '..', 'public', 'cesium');

mkdirSync(dest, { recursive: true });

for (const dir of ['Workers', 'Assets', 'ThirdParty', 'Widgets']) {
  cpSync(join(cesiumBuild, dir), join(dest, dir), { recursive: true });
  console.log(`[cesium] Copied ${dir}`);
}

console.log('[cesium] Static assets ready in public/cesium/');
