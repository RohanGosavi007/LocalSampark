import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguage } from '../../src/context/LanguageContext';

export default function LanguageToggle() {
  const { lang, changeLanguage } = useLanguage();

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.btn, lang === 'en' && styles.btnActive]} 
        onPress={() => changeLanguage('en')}
      >
        <Text style={[styles.text, lang === 'en' && styles.textActive]}>EN</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.btn, lang === 'mr' && styles.btnActive]} 
        onPress={() => changeLanguage('mr')}
      >
        <Text style={[styles.text, lang === 'mr' && styles.textActive]}>मरा</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.btn, lang === 'hi' && styles.btnActive]} 
        onPress={() => changeLanguage('hi')}
      >
        <Text style={[styles.text, lang === 'hi' && styles.textActive]}>हिं</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    padding: 2,
    alignItems: 'center'
  },
  btn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  btnActive: {
    backgroundColor: '#3b82f6',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  textActive: {
    color: '#fff',
  }
});
