import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';

export default function PollsTab({ role }) {
  const [polls] = useState([
    { 
      id: 1, 
      title: 'Should we hire a new gardening agency?', 
      endsIn: '2 days', 
      options: [
        { id: 'yes', text: 'Yes, current is bad', votes: 45 },
        { id: 'no', text: 'No, they are fine', votes: 20 }
      ],
      totalVotes: 65
    }
  ]);

  const handleVote = () => {
    Alert.alert('Voted', 'Your vote has been recorded securely.');
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {role === 'admin' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Create New Poll</Text>
          <Text style={styles.subtitle}>Gather community opinion on important decisions.</Text>
          <TouchableOpacity style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>+ Create Poll</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Active Community Polls</Text>
        {polls.map(poll => (
          <View key={poll.id} style={styles.pollCard}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12}}>
              <Text style={styles.pollTitle}>{poll.title}</Text>
              <Text style={styles.pollTime}>Ends in {poll.endsIn}</Text>
            </View>
            
            {poll.options.map(opt => {
              const pct = Math.round((opt.votes / poll.totalVotes) * 100);
              return (
                <TouchableOpacity key={opt.id} style={styles.optionRow} onPress={handleVote}>
                  <View style={styles.optionHeader}>
                    <Text style={styles.optionText}>{opt.text}</Text>
                    <Text style={styles.optionPct}>{pct}%</Text>
                  </View>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${pct}%` }]} />
                  </View>
                </TouchableOpacity>
              );
            })}
            <Text style={styles.totalVotes}>{poll.totalVotes} total votes</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  sectionTitle: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#64748b', fontSize: 13, marginBottom: 16 },
  primaryBtn: { backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  primaryBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  
  pollCard: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  pollTitle: { color: '#0f172a', fontSize: 15, fontWeight: 'bold', flex: 1, paddingRight: 10 },
  pollTime: { color: '#ef4444', fontSize: 11, fontWeight: 'bold' },
  
  optionRow: { marginBottom: 12 },
  optionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  optionText: { color: '#475569', fontSize: 13, fontWeight: '600' },
  optionPct: { color: '#64748b', fontSize: 12, fontWeight: 'bold' },
  
  barBg: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4 },
  barFill: { height: 8, backgroundColor: '#3b82f6', borderRadius: 4 },
  totalVotes: { color: '#64748b', fontSize: 11, textAlign: 'right', marginTop: 4 }
});
