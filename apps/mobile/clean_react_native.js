const fs = require('fs');
const path = require('path');

const filesToClean = [
  'src/private/specs/modules/NativeImageLoaderAndroid.js',
  'Libraries/StyleSheet/StyleSheet.js',
  'Libraries/Utilities/PixelRatio.js',
  'Libraries/NewAppScreen/components/Header.js',
  'Libraries/LogBox/UI/LogBoxInspectorHeaderButton.js',
  'Libraries/LogBox/UI/LogBoxNotificationDismissButton.js',
  'Libraries/Components/Touchable/TouchableHighlight.js',
  'Libraries/Components/Touchable/TouchableOpacity.js',
  'Libraries/Blob/Blob.js'
];

filesToClean.forEach(relPath => {
  const fullPath = path.join(__dirname, 'node_modules/react-native', relPath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    content = content.replace(/^import \{ Image \} from 'expo-image';\r?\n/, '');
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Cleaned:', relPath);
  } else {
    console.log('File not found:', relPath);
  }
});
