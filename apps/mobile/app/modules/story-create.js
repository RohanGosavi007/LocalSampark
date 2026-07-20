import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

export default function StoryCreateScreen() {
  const [imageUri, setImageUri] = useState(null);
  const [text, setText] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Gallery permission is required to post stories.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Error picking image:', error);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Error taking photo:', error);
    }
  };

  const postStory = () => {
    if (!imageUri && !text.trim()) {
      Alert.alert('Hold on', 'Please add an image or text to post a story.');
      return;
    }
    
    setIsPosting(true);
    // Simulate API POST request
    setTimeout(() => {
      setIsPosting(false);
      Alert.alert('Success', 'Your story has been posted to your zone!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={28} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Story</Text>
        <TouchableOpacity 
          style={[styles.postBtn, (!imageUri && !text.trim()) || isPosting ? styles.postBtnDisabled : null]} 
          onPress={postStory}
          disabled={(!imageUri && !text.trim()) || isPosting}
        >
          <Text style={styles.postBtnText}>{isPosting ? 'Posting...' : 'Post'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.content}>
          {imageUri ? (
            <View style={styles.previewContainer}>
              <Image source={imageUri } style={styles.previewImage}  contentFit="cover" placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4" cachePolicy="memory-disk" transition={200} />
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageUri(null)}>
                <Ionicons name="trash" size={20} color="#fff" />
              </TouchableOpacity>
              
              <TextInput
                style={styles.textOverlayInput}
                placeholder="Add a caption..."
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={text}
                onChangeText={setText}
                multiline
                maxLength={100}
              />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <TextInput
                style={styles.textInput}
                placeholder="What's happening in your neighborhood?"
                placeholderTextColor="#94a3b8"
                value={text}
                onChangeText={setText}
                multiline
                autoFocus
                maxLength={200}
              />
              
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionCard} onPress={takePhoto}>
                  <View style={[styles.actionIcon, { backgroundColor: '#eff6ff' }]}>
                    <Ionicons name="camera" size={32} color="#3b82f6" />
                  </View>
                  <Text style={styles.actionText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionCard} onPress={pickImage}>
                  <View style={[styles.actionIcon, { backgroundColor: '#f0fdf4' }]}>
                    <Ionicons name="images" size={32} color="#10b981" />
                  </View>
                  <Text style={styles.actionText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  iconBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  postBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  postBtnDisabled: { backgroundColor: '#94a3b8' },
  postBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  
  content: { flex: 1 },
  
  emptyState: { flex: 1, padding: 20, justifyContent: 'space-between' },
  textInput: { fontSize: 24, fontWeight: '600', color: '#1f2937', textAlignVertical: 'top' },
  
  actionRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  actionCard: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  actionIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  actionText: { fontSize: 14, fontWeight: 'bold', color: '#475569' },
  
  previewContainer: { flex: 1, backgroundColor: '#000' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeImageBtn: { position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  textOverlayInput: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', padding: 16, borderRadius: 12, fontSize: 16, textAlign: 'center' }
});
