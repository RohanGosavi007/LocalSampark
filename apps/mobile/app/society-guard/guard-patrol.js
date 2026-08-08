import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, TextInput } from 'react-native';
import api from '../../src/lib/api';

export default function GuardPatrolScreen() {
    const [routes, setRoutes] = useState([]);
    const [activeLogId, setActiveLogId] = useState(null);
    const [scannedCheckpoints, setScannedCheckpoints] = useState([]);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetchRoutes();
    }, []);

    const fetchRoutes = async () => {
        try {
            const res = await api.get('/society-guard/patrol/routes?societyId=dummy-society');
            if (res.data.success) {
                setRoutes(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching routes:', error);
        }
    };

    const startPatrol = async (routeId) => {
        try {
            const res = await api.post('/society-guard/patrol/start', { societyId: 'dummy-society', routeId });
            if (res.data.success) {
                setActiveLogId(res.data.data.logId);
                setScannedCheckpoints([]);
                Alert.alert('Patrol Started', 'Please proceed to the first checkpoint and scan the QR.');
            }
        } catch (error) {
            Alert.alert('Error', 'Could not start patrol');
        }
    };

    const scanCheckpoint = async () => {
        // Mocking a QR scan result
        const mockCheckpointId = 'cp_1';
        try {
            const res = await api.post('/society-guard/patrol/scan', { logId: activeLogId, checkpointId: mockCheckpointId });
            if (res.data.success) {
                setScannedCheckpoints(res.data.data);
                Alert.alert('Success', 'Checkpoint scanned!');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to log checkpoint');
        }
    };

    const endPatrol = async () => {
        try {
            const res = await api.post('/society-guard/patrol/end', { logId: activeLogId, notes });
            if (res.data.success) {
                Alert.alert('Patrol Ended', res.data.message);
                setActiveLogId(null);
                setNotes('');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to end patrol');
        }
    };

    if (activeLogId) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Active Patrol</Text>
                <View style={styles.card}>
                    <Text style={styles.subtitle}>Checkpoints Scanned: {scannedCheckpoints.length}</Text>
                    
                    <TouchableOpacity style={styles.btn} onPress={scanCheckpoint}>
                        <Text style={styles.btnText}>Simulate QR Scan (Checkpoint 1)</Text>
                    </TouchableOpacity>

                    <TextInput 
                        style={styles.input} 
                        placeholder="Any suspicious activity?" 
                        value={notes} 
                        onChangeText={setNotes} 
                        multiline
                    />

                    <TouchableOpacity style={[styles.btn, styles.dangerBtn]} onPress={endPatrol}>
                        <Text style={styles.btnText}>End Patrol</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Select Patrol Route</Text>
            {routes.map(route => (
                <View key={route.id} style={styles.card}>
                    <Text style={styles.subtitle}>{route.route_name}</Text>
                    <Text>Expected time: {route.expected_duration_minutes} mins</Text>
                    <TouchableOpacity style={styles.btn} onPress={() => startPatrol(route.id)}>
                        <Text style={styles.btnText}>Start {route.route_name}</Text>
                    </TouchableOpacity>
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    subtitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
    card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, elevation: 2, marginBottom: 15 },
    btn: { backgroundColor: '#2196F3', padding: 15, borderRadius: 5, alignItems: 'center', marginTop: 10 },
    dangerBtn: { backgroundColor: '#f44336' },
    btnText: { color: '#fff', fontWeight: 'bold' },
    input: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 5, marginTop: 15, minHeight: 80, textAlignVertical: 'top' }
});
