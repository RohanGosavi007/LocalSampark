const fs = require('fs');
const { SourceMapConsumer } = require('source-map');
const rawMap = fs.readFileSync('E:/localsampark 27-07-2026/localsampark 27-07-2026/apps/mobile/android/app/build/generated/sourcemaps/react/release/index.android.bundle.map', 'utf8');
const consumer = new SourceMapConsumer(JSON.parse(rawMap));
const offsets = [
  1098683, 1187328, 144258, 143788, 143418, 
  1183292, 144258, 143788, 143418,
  1098254, 144258, 143788, 143418,
  93685, 144258, 143788, 143418,
  93645, 144258, 143788, 143418,
  93003, 144258, 143788, 143418
];
for (const offset of offsets) {
  console.log(`1:${offset} ->`, consumer.originalPositionFor({line: 1, column: offset}));
}
