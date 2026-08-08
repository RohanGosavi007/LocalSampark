import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import api from '../../src/lib/api';

export default function MovePassScreen() {
    const [moveType, setMoveType] = useState('move_in');
    const [moveDate, setMoveDate] = useState('');
    const [moversCompany, setMoversCompany] = useState('');
    const [moversVehicleNumber, setMoversVehicleNumber] = useState('');
    const [passes, setPasses] = useState([]);

    useEffect(() => {
        fetchPasses();
    }, []);

    const fetchPasses = async () => {
        try {
            const res = await api.get('/society-move/pass');
            if (res.data.success) {
                setPasses(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching passes:', error);
        }
    };

    const requestPass = async () => {
        if (!moveDate) return Alert.alert('Error', 'Move date is required');

        try {
            const res = await api.post('/society-move/pass', {
                societyId: 'dummy-society',
                flatNumber: 'A-101',
                moveType,
                moveDate,
                moversCompany,
                moversVehicleNumber
            });

            if (res.data.success) {
                const { outstandingDues } = res.data.data;
                if (outstandingDues > 0) {
                    Alert.alert('Request Sent', `Move-Out pass requested, but you have outstanding dues of Rs. ${outstandingDues}. Please clear them to get approval.`);
                } else {
                    Alert.alert('Request Sent', 'Pass requested successfully. Waiting for admin approval.');
                }
                fetchPasses();
            }
        } catch (error) {
            Alert.alert('Error', 'Could not request pass');
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Move In / Move Out Pass</Text>

            <View style={styles.card}>
                <View style={styles.typeToggle}>
                    <TouchableOpacity 
                        style={[styles.toggleBtn, moveType === 'move_in' && styles.activeToggle]}
                        onPress={() => setMoveType('move_in')}
                    >
                        <Text style={moveType === 'move_in' ? styles.activeText : styles.inactiveText}>Move In</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.toggleBtn, moveType === 'move_out' && styles.activeToggle]}
                        onPress={() => setMoveType('move_out')}
                    >
                        <Text style={moveType === 'move_out' ? styles.activeText : styles.inactiveText}>Move Out</Text>
                    </TouchableOpacity>
                </View>

                <TextInput 
                    style={styles.input} 
                    placeholder="Move Date (YYYY-MM-DD)" 
                    value={moveDate} 
                    onChangeText={setMoveDate} 
                />
                <TextInput 
                    style={styles.input} 
                    placeholder="Movers/Packers Company (Optional)" 
                    value={moversCompany} 
                    onChangeText={setMoversCompany} 
                />
                <TextInput 
                    style={styles.input} 
                    placeholder="Vehicle Number (Optional)" 
                    value={moversVehicleNumber} 
                    onChangeText={setMoversVehicleNumber} 
                />

                <TouchableOpacity style={styles.btn} onPress={requestPass}>
                    <Text style={styles.btnText}>Request {moveType === 'move_in' ? 'Move-In' : 'Move-Out'} Pass</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.subtitle}>Your Requests</Text>
            {passes.map(pass => (
                <View key={pass.id} style={styles.historyCard}>
                    <Text style={styles.bold}>{pass.move_type === 'move_in' ? 'Move-In' : 'Move-Out'} on {pass.move_date}</Text>
                    <Text>Status: {pass.clearance_status}</Text>
                    {pass.outstanding_dues > 0 && <Text style={styles.error}>Dues: Rs. {pass.outstanding_dues}</Text>}
                    {pass.gate_passcode && pass.clearance_status === 'approved' && (
                        <Text style={styles.passcode}>Passcode: {pass.gate_passcode}</Text>
                    )}
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    subtitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
    card: { backgroundColor: '#fff', padding: 20, borderRadius: 10, elevation: 2 },
    input: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 5, marginBottom: 15 },
    btn: { backgroundColor: '#2196F3', padding: 15, borderRadius: 5, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: 'bold' },
    typeToggle: { flexDirection: 'row', marginBottom: 20, borderRadius: 5, overflow: 'hidden', borderWidth: 1, borderColor: '#2196F3' },
    toggleBtn: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#fff' },
    activeToggle: { backgroundColor: '#2196F3' },
    activeText: { color: '#fff', fontWeight: 'bold' },
    inactiveText: { color: '#2196F3', fontWeight: 'bold' },
    historyCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 1 },
    bold: { fontWeight: 'bold', fontSize: 16, marginBottom: 5 },
    error: { color: 'red' },
    passcode: { marginTop: 10, fontSize: 18, fontWeight: 'bold', color: '#4CAF50' }
});
