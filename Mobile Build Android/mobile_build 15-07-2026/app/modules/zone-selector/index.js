import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useZone } from '../../../src/context/ZoneContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ZoneSelectorScreen() {
  const router = useRouter();
  const { allZones, savedZones, activeZone, switchZone, detectLocation, isLoading, saveZone } = useZone();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);

  const filteredZones = allZones.filter(zone => 
    (zone.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) || 
    (zone.pincode && zone.pincode.includes(searchQuery))
  );

  const handleSelectZone = async (zoneId) => {
    await switchZone(zoneId);
    router.back();
  };

  const handleDetectLocation = async () => {
    setIsDetecting(true);
    await detectLocation();
    setIsDetecting(false);
    router.back();
  };

  const renderZoneItem = ({ item }) => {
    const isActive = activeZone && activeZone.id === item.id;
    return (
      <TouchableOpacity 
        style={[styles.zoneItem, isActive && styles.zoneItemActive]}
        onPress={() => handleSelectZone(item.id)}
      >
        <View style={styles.zoneInfo}>
          <Text style={[styles.zoneName, isActive && styles.zoneNameActive]}>{item.name}</Text>
          <Text style={styles.zoneDetails}>{item.district}, {item.state} {item.pincode ? `- ${item.pincode}` : ''}</Text>
        </View>
        <View style={styles.zoneActions}>
          {isActive && <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />}
          {!savedZones.some(z => z.id === item.id) && (
            <TouchableOpacity onPress={() => saveZone(item.id, 'Favorite')} style={{marginLeft: 10}}>
              <Ionicons name="heart-outline" size={24} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Select Your Zone</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by area, district, or pincode..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <TouchableOpacity 
        style={styles.detectButton} 
        onPress={handleDetectLocation}
        disabled={isDetecting}
      >
        {isDetecting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="location" size={20} color="#fff" style={{marginRight: 8}} />
            <Text style={styles.detectButtonText}>Use Current Location</Text>
          </>
        )}
      </TouchableOpacity>

      {savedZones.length > 0 && !searchQuery && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved Zones</Text>
          <FlatList
            data={savedZones}
            keyExtractor={(item) => `saved-${item.id}`}
            renderItem={renderZoneItem}
            scrollEnabled={false}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{searchQuery ? 'Search Results' : 'All Available Zones'}</Text>
        {isLoading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{marginTop: 20}} />
        ) : (
          <FlatList
            data={filteredZones}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderZoneItem}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No zones found matching "{searchQuery}"</Text>
            }
          />
        )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  detectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 8,
  },
  detectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    flex: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  zoneItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  zoneItemActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  zoneInfo: {
    flex: 1,
  },
  zoneName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  zoneNameActive: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  zoneDetails: {
    fontSize: 14,
    color: '#6b7280',
  },
  zoneActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 20,
    fontSize: 16,
  }
});
