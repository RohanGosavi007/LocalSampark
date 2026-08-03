const fs = require('fs');
const path = require('path');

const src = 'E:\\localsampark 27-07-2026\\localsampark 27-07-2026';
const dest = 'E:\\ls_build_temp';

console.log('Starting fast copy using Node.js...');
try {
    fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(dest, { recursive: true });
    fs.cpSync(src, dest, { 
        recursive: true, 
        force: true,
        filter: (srcPath) => {
            const basename = path.basename(srcPath);
            const ignores = ['.gradle', '.idea', '.git', 'node_modules', 'dist', 'build-android', 'build'];
            return !ignores.includes(basename) && !basename.endsWith('.log');
        } 
    });
    console.log('Copy complete!');
} catch (e) {
    console.error('ERROR IN COPY:', e);
    process.exit(1);
}
