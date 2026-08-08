import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

const PollsScreen = () => {
  const [polls, setPolls] = useState([
    { 
      id: '1', 
      question: 'Should we upgrade the gym equipment this quarter?', 
      options: ['Yes, much needed', 'No, maybe next year', 'Neutral'],
      isSecretBallot: true,
      hasVoted: false,
      expiresAt: '2026-08-15'
    },
    { 
      id: '2', 
      question: 'Vote for Diwali Caterer', 
      options: ['Sharma Sweets', 'Haldirams', 'Local Vendor'],
      isSecretBallot: false,
      hasVoted: true,
      expiresAt: '2026-08-20'
    }
  ]);

  const renderPoll = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.question}>{item.question}</Text>
      {item.isSecretBallot && (
        <View style={styles.secretBadge}>
          <Text style={styles.secretText}>🔒 Secret Ballot</Text>
        </View>
      )}
      
      {item.hasVoted ? (
        <View style={styles.votedContainer}>
          <Text style={styles.votedText}>✅ You have voted on this poll.</Text>
          <Text style={styles.metaText}>Results will be published on {item.expiresAt}</Text>
        </View>
      ) : (
        <View style={styles.optionsContainer}>
          {item.options.map((opt, idx) => (
            <TouchableOpacity key={idx} style={styles.optionButton}>
              <Text style={styles.optionText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Society Polls</Text>
      </View>
      <FlatList
        data={polls}
        keyExtractor={item => item.id}
        renderItem={renderPoll}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4' },
  header: { padding: 20, backgroundColor: '#00796B', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  list: { padding: 15 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 10, marginBottom: 15, elevation: 2 },
  question: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  secretBadge: { backgroundColor: '#FFF9C4', padding: 5, borderRadius: 5, alignSelf: 'flex-start', marginBottom: 15 },
  secretText: { fontSize: 12, color: '#F57F17', fontWeight: 'bold' },
  optionsContainer: { marginTop: 10 },
  optionButton: { borderWidth: 1, borderColor: '#00796B', borderRadius: 8, padding: 12, marginBottom: 10, alignItems: 'center' },
  optionText: { color: '#00796B', fontWeight: 'bold' },
  votedContainer: { backgroundColor: '#E8F5E9', padding: 15, borderRadius: 8, marginTop: 10, alignItems: 'center' },
  votedText: { color: '#2E7D32', fontWeight: 'bold', marginBottom: 5 },
  metaText: { fontSize: 12, color: '#757575' }
});

export default PollsScreen;
