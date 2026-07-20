const Jimp = require('jimp');
const fs = require('fs');

async function fixImage(filename) {
  const path = 'assets/' + filename;
  try {
    // Read the image
    const image = await Jimp.read(path);
    // Write it back as proper PNG
    await image.writeAsync(path);
    console.log('Fixed ' + path);
  } catch (err) {
    console.error('Failed to fix ' + path, err);
  }
}

async function run() {
  await fixImage('icon.png');
  await fixImage('adaptive-icon.png');
  await fixImage('splash.png');
}

run();
