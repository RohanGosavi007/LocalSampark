const fs = require('fs');
const path = require('path');

const WEB_APP_DIR = path.join(__dirname, '..', '..', 'apps', 'web', 'src', 'app');
const MOBILE_APP_DIR = path.join(__dirname, 'app', 'modules');

const IGNORE_DIRS = ['components', 'data', 'api', 'assets', 'lib', 'hooks', 'ui', 'utils'];

const formatTitle = (str) => {
    return str
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const getBoilerplate = (title, relativePath) => {
    return `import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ${title.replace(/[^a-zA-Z0-9]/g, '')}Screen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>${title}</Text>
      </View>
      <View style={styles.content}>
        <Ionicons name="construct-outline" size={64} color="#9ca3af" style={{ marginBottom: 16 }} />
        <Text style={styles.message}>This feature was synced from the website.</Text>
        <Text style={styles.subMessage}>Mobile UI implementation coming soon!</Text>
        <Text style={styles.path}>Route: /${relativePath}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
  },
  subMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  path: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: 'monospace',
    backgroundColor: '#e5e7eb',
    padding: 8,
    borderRadius: 4,
  }
});
`;
};

let syncCount = 0;

function syncDirectory(webPath, mobilePath, relativePath) {
    if (!fs.existsSync(webPath)) return;
    
    const items = fs.readdirSync(webPath);
    
    // Check if this directory is a route (has page.js or page.tsx)
    const isRoute = items.includes('page.js') || items.includes('page.tsx');
    
    if (isRoute && relativePath !== '') {
        const title = formatTitle(path.basename(relativePath));
        const indexFile = path.join(mobilePath, 'index.js');
        
        // Ensure parent directories exist
        if (!fs.existsSync(mobilePath)) {
            fs.mkdirSync(mobilePath, { recursive: true });
        }
        
        // Create file if it doesn't exist
        if (!fs.existsSync(indexFile)) {
            fs.writeFileSync(indexFile, getBoilerplate(title, relativePath));
            console.log(`✅ Synced missing route: ${relativePath}`);
            syncCount++;
        }
    }
    
    // Traverse subdirectories
    for (const item of items) {
        const itemWebPath = path.join(webPath, item);
        if (fs.statSync(itemWebPath).isDirectory()) {
            // Ignore [id], (group) style folders for now to avoid complexity, or just process them
            if (IGNORE_DIRS.includes(item)) continue;
            
            // Clean up dynamic routes for React Native like [id] -> just id or something similar
            // Expo router actually supports [id] !
            const itemMobilePath = path.join(mobilePath, item);
            const itemRelative = path.join(relativePath, item).replace(/\\/g, '/');
            
            syncDirectory(itemWebPath, itemMobilePath, itemRelative);
        }
    }
}

console.log('Starting Website to Mobile sync...');
syncDirectory(WEB_APP_DIR, MOBILE_APP_DIR, '');
console.log(`\n🎉 Sync Complete! Generated ${syncCount} missing screens in Mobile App.`);
