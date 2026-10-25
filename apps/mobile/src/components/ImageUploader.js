import { Image } from 'expo-image';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../lib/api';

/**
 * Picks a photo and uploads it with POST /api/v1/upload.
 *
 * It never worked: it read the session from `authState`, which the auth
 * context does not provide (so it threw before sending anything), posted to a
 * development-only address, and read `fileUrl` from a response that did not
 * have one. KYC photos for rider onboarding were never uploaded.
 *
 * `purpose` decides how the server stores the file: 'document' (KYC) and
 * 'prescription' are private; images such as 'profile_photo' are public.
 */
export default function ImageUploader({ onUploadSuccess, label = "Upload Image", purpose = 'general', module = null }) {
  const [imageUri, setImageUri] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const { authToken } = useAuth();
  
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission Refused", "You need to allow access to your photos to upload KYC documents.");
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7, 
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    setIsUploading(true);
    
    const formData = new FormData();
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image`;
    
        // Fields before the file, so the server has them when the file arrives.
    formData.append('purpose', purpose);
    if (module) formData.append('module', module);
    formData.append('file', { uri, name: filename, type: type === 'image/jpg' ? 'image/jpeg' : type });

    try {
      if (!authToken) throw new Error('Please sign in again to upload.');
      const response = await fetch(`${API_URL}/api/v1/upload`, {
        method: 'POST',
        body: formData,
        // No Content-Type: fetch sets multipart/form-data with its boundary.
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.url) {
        Alert.alert('Uploaded', 'Your photo has been uploaded.');
        if (onUploadSuccess) onUploadSuccess(data.url, data.files && data.files[0]);
      } else {
        throw new Error(data.error || data.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert('Upload Error', error.message || 'Something went wrong during the upload. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      <TouchableOpacity 
        style={styles.uploadBox} 
        onPress={pickImage}
        disabled={isUploading}
      >
        {isUploading ? (
          <ActivityIndicator size="large" color="#3b82f6" />
        ) : imageUri ? (
          <Image source={imageUri } style={styles.imagePreview}  contentFit="cover" placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4" cachePolicy="memory-disk" transition={200} />
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name="cloud-upload-outline" size={32} color="#6b7280" />
            <Text style={styles.placeholderText}>Tap to select image</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  uploadBox: {
    height: 150,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContainer: {
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 14,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  }
});
