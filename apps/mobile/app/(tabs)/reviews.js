import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';

export default function ServiceReviews() {
  const reviews = [
    { id: 1, customer: 'Vikram Singh', rating: 5, text: 'Excellent service! Fixed the AC in under 30 minutes. Highly recommended.', date: '2 days ago' },
    { id: 2, customer: 'Anita Deshmukh', rating: 4, text: 'Good work, but arrived 10 minutes late. Otherwise very professional.', date: '1 week ago' },
    { id: 3, customer: 'Rohan Patil', rating: 5, text: 'Very polite and knowledgeable. Cleaned up everything after the plumbing job.', date: '2 weeks ago' }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⭐ Customer Reviews</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsCard}>
          <Text style={styles.statsScore}>4.8</Text>
          <View style={styles.starsRow}>
            <Text style={styles.starIcon}>⭐⭐⭐⭐✨</Text>
          </View>
          <Text style={styles.statsTotal}>Based on 42 reviews</Text>
        </View>

        <Text style={styles.sectionTitle}>Recent Feedback</Text>
        {reviews.map(rev => (
          <View key={rev.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Text style={styles.customerName}>{rev.customer}</Text>
              <Text style={styles.dateText}>{rev.date}</Text>
            </View>
            <View style={styles.starsRowSmall}>
              {Array(5).fill(0).map((_, i) => (
                <Text key={i} style={{fontSize: 14}}>{i < rev.rating ? '⭐' : '☆'}</Text>
              ))}
            </View>
            <Text style={styles.reviewText}>{rev.text}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  
  content: { padding: 15 },
  
  statsCard: { backgroundColor: '#ffffff', padding: 25, borderRadius: 12, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  statsScore: { fontSize: 48, fontWeight: 'bold', color: '#f59e0b', marginBottom: 5 },
  starsRow: { flexDirection: 'row', marginBottom: 5 },
  starIcon: { fontSize: 24 },
  statsTotal: { color: '#64748b', fontSize: 12 },

  sectionTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  
  reviewCard: { backgroundColor: '#f8fafc', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  customerName: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  dateText: { color: '#64748b', fontSize: 12 },
  starsRowSmall: { flexDirection: 'row', marginBottom: 10 },
  reviewText: { color: '#475569', fontSize: 14, lineHeight: 20 }
});
