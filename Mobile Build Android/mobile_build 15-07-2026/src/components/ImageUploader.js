import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Constants from 'expo-constants';

export default function ImageUploader({ onUploadSuccess, label = "Upload Image" }) {
  const [imageUri, setImageUri] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const { authState } = useAuth();
  
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
    
    formData.append('file', { uri, name: filename, type });

    try {
      const baseUrl = Constants.expoConfig?.extra?.API_URL_DEV || 'http://10.0.2.2:5000';
      const url = `${baseUrl}/api/v1/upload`; 
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${authState.token}`
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        Alert.alert('Success', 'Image uploaded successfully!');
        if (onUploadSuccess) onUploadSuccess(data.fileUrl);
      } else {
        throw new Error(data.message || 'Failed to upload image');
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
          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
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
