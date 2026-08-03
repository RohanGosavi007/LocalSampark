const fs = require('fs');
const { SourceMapConsumer } = require('source-map');
const rawMap = fs.readFileSync('E:/localsampark 27-07-2026/localsampark 27-07-2026/apps/mobile/android/app/build/generated/sourcemaps/react/release/index.android.bundle.map', 'utf8');
const consumer = new SourceMapConsumer(JSON.parse(rawMap));
console.log('1:1098683 ->', consumer.originalPositionFor({line: 1, column: 1098683}));
console.log('1:1187328 ->', consumer.originalPositionFor({line: 1, column: 1187328}));
console.log('1:144258 ->', consumer.originalPositionFor({line: 1, column: 144258}));
console.log('1:143788 ->', consumer.originalPositionFor({line: 1, column: 143788}));
