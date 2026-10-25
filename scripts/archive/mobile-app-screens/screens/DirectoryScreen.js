import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Switch } from 'react-native';

const DirectoryScreen = () => {
  const [members, setMembers] = useState([
    { id: '1', name: 'Ramesh Patel', flatNumber: 'A-102', role: 'resident', phone: '9876543210' },
    { id: '2', name: 'Sunita Sharma', flatNumber: 'B-405', role: 'committee', phone: null }, // Phone hidden
    { id: '3', name: 'Vikram Singh', flatNumber: 'C-201', role: 'resident', phone: '9123456789' },
  ]);
  const [search, setSearch] = useState('');
  const [isPrivacyEnabled, setIsPrivacyEnabled] = useState(false);

  const togglePrivacy = () => {
    setIsPrivacyEnabled(previousState => !previousState);
    // Call API to update privacy setting
  };

  const renderMember = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.nameText}>{item.name}</Text>
        <View style={item.role === 'committee' ? styles.badgeCommittee : styles.badgeResident}>
          <Text style={item.role === 'committee' ? styles.badgeTextCommittee : styles.badgeTextResident}>
            {item.role.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.detailText}>Flat: {item.flatNumber}</Text>
      
      {item.phone ? (
        <View style={styles.contactContainer}>
          <Text style={styles.detailText}>Phone: {item.phone}</Text>
          <TouchableOpacity style={styles.messageButton}>
            <Text style={styles.messageButtonText}>Message</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.contactContainer}>
          <Text style={[styles.detailText, { fontStyle: 'italic', color: '#999' }]}>Phone hidden by user</Text>
          <TouchableOpacity style={styles.messageButton}>
            <Text style={styles.messageButtonText}>Send App Message</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Society Directory</Text>
      </View>

      <View style={styles.privacySettings}>
        <Text style={styles.privacyText}>Hide my phone number from directory</Text>
        <Switch
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={isPrivacyEnabled ? "#f5dd4b" : "#f4f3f4"}
          onValueChange={togglePrivacy}
          value={isPrivacyEnabled}
        />
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search members by name or flat..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={members}
        keyExtractor={item => item.id}
        renderItem={renderMember}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4' },
  header: { padding: 20, backgroundColor: '#D84315', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  privacySettings: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#FFF3E0', borderBottomWidth: 1, borderColor: '#FFE0B2' },
  privacyText: { fontSize: 14, color: '#E65100', fontWeight: 'bold' },
  searchContainer: { padding: 15, backgroundColor: 'white' },
  searchInput: { backgroundColor: '#f0f0f0', borderRadius: 8, padding: 10, fontSize: 16 },
  list: { padding: 15 },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  nameText: { fontSize: 16, fontWeight: 'bold' },
  badgeCommittee: { backgroundColor: '#FFECB3', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeTextCommittee: { fontSize: 10, color: '#F57F17', fontWeight: 'bold' },
  badgeResident: { backgroundColor: '#E1F5FE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeTextResident: { fontSize: 10, color: '#0288D1', fontWeight: 'bold' },
  detailText: { fontSize: 14, color: '#616161', marginBottom: 5 },
  contactContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  messageButton: { backgroundColor: '#D84315', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 5 },
  messageButtonText: { color: 'white', fontSize: 12, fontWeight: 'bold' }
});

export default DirectoryScreen;
