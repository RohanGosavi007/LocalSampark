import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';

const CommunityForumScreen = () => {
  const [topics, setTopics] = useState([
    { id: '1', title: 'Water issue in Block A', category: 'Maintenance', replies: 5, author: 'Ramesh (A-102)', isPinned: true },
    { id: '2', title: 'Upcoming Diwali Celebration Ideas', category: 'Events', replies: 12, author: 'Sunita (B-405)', isPinned: false },
    { id: '3', title: 'Recommendations for a good plumber?', category: 'General', replies: 3, author: 'Vikram (C-201)', isPinned: false },
  ]);
  const [search, setSearch] = useState('');

  const renderTopic = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{item.isPinned && '📌 '}{item.title}</Text>
        <View style={styles.badge}><Text style={styles.badgeText}>{item.category}</Text></View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.metaText}>By: {item.author}</Text>
        <Text style={styles.metaText}>Replies: {item.replies}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community Forum</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search topics..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={topics}
        keyExtractor={item => item.id}
        renderItem={renderTopic}
        contentContainerStyle={styles.list}
      />
      
      <TouchableOpacity style={styles.fab}>
        <Text style={styles.fabText}>+ New Topic</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4' },
  header: { padding: 20, backgroundColor: '#1A237E', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  searchContainer: { padding: 15, backgroundColor: 'white' },
  searchInput: { backgroundColor: '#f0f0f0', borderRadius: 8, padding: 10, fontSize: 16 },
  list: { padding: 15 },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  title: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 10 },
  badge: { backgroundColor: '#E8EAF6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, color: '#3F51B5' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  metaText: { fontSize: 12, color: '#757575' },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#3F51B5', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, elevation: 5 },
  fabText: { color: 'white', fontWeight: 'bold' }
});

export default CommunityForumScreen;
