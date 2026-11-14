import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Check, Globe } from 'lucide-react-native';
import { useLanguage } from '../../../src/context/LanguageContext';

export default function LanguagesScreen() {
  const { language, setLanguage, t } = useLanguage();
  const [selectedLang, setSelectedLang] = useState(language || 'en');

  useEffect(() => {
    setSelectedLang(language || 'en');
  }, [language]);

  const languages = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    { code: 'mr', name: 'Marathi', native: 'मराठी' },
  ];

  const handleSave = async () => {
    await setLanguage(selectedLang);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} accessibilityRole="button" accessibilityLabel={t('back')} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('select_language')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconWrapper}>
          <Globe size={48} color="#3b82f6" />
          <Text style={styles.subtitle}>{t('choose_language_subtitle')}</Text>
        </View>

        <View style={styles.listContainer}>
          {languages.map((lang, index) => (
            <TouchableOpacity 
              key={lang.code}
              style={[
                styles.listItem, 
                index !== languages.length - 1 && styles.borderBottom,
                selectedLang === lang.code && styles.selectedItem
              ]}
              onPress={() => setSelectedLang(lang.code)}
            >
              <View>
                <Text style={styles.nativeText}>{lang.native}</Text>
                <Text style={styles.englishText}>{lang.name}</Text>
              </View>
              {selectedLang === lang.code && (
                <View style={styles.checkCircle}>
                  <Check size={16} color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>{t('save_changes')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  iconWrapper: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  listContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  selectedItem: {
    backgroundColor: '#eff6ff',
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  nativeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  englishText: {
    fontSize: 13,
    color: '#64748b',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
