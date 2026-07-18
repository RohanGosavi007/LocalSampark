import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import VisitorLayout from './components/VisitorLayout';

export default function EducationEventsVisitorView({ shop }) {
  return (
    <VisitorLayout 
      shopName={shop.name || 'Learnix Institute'} 
      shopAddress="Online / Viman Nagar"
      shopIcon="🎓"
      cartCount={0}
      onCheckout={() => {}}
    >
      <View style={{ padding: 16 }}>
        <Text style={styles.sectionTitle}>Upcoming Courses</Text>
        
        <View style={styles.courseCard}>
          <Text style={styles.courseTitle}>Digital Marketing Masterclass</Text>
          <Text style={styles.courseMeta}>📅 Starts 12 Aug | ⏱️ 6 Weeks</Text>
          <Text style={styles.courseDesc}>Learn SEO, SMM, and Performance Marketing from industry experts.</Text>
          <View style={styles.courseFooter}>
            <Text style={styles.coursePrice}>₹4,999</Text>
            <TouchableOpacity style={styles.enrollBtn}>
              <Text style={styles.enrollText}>Enroll Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.courseCard}>
          <Text style={styles.courseTitle}>Spoken English Basics</Text>
          <Text style={styles.courseMeta}>📅 Weekend Batches | ⏱️ 3 Months</Text>
          <Text style={styles.courseDesc}>Improve your communication skills with interactive weekend classes.</Text>
          <View style={styles.courseFooter}>
            <Text style={styles.coursePrice}>₹2,500</Text>
            <TouchableOpacity style={styles.enrollBtn}>
              <Text style={styles.enrollText}>Enroll Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </VisitorLayout>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 16 },
  
  courseCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  courseTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
  courseMeta: { fontSize: 13, color: '#6366f1', fontWeight: 'bold', marginBottom: 8 },
  courseDesc: { fontSize: 14, color: '#64748b', marginBottom: 16, lineHeight: 20 },
  courseFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: '#f1f5f9', paddingTop: 12 },
  coursePrice: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  enrollBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  enrollText: { color: '#fff', fontWeight: 'bold' },
});
