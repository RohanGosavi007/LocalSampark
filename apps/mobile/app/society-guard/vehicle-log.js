import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Switch } from 'react-native';
import api from '../../src/lib/api';

export default function VehicleLogScreen() {
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [isResident, setIsResident] = useState(false);
    const [direction, setDirection] = useState('in');

    const logVehicle = async () => {
        if (!vehicleNumber) return Alert.alert('Error', 'Enter vehicle number');

        try {
            const res = await api.post('/society-guard/vehicle', {
                societyId: 'dummy-society',
                vehicleNumber: vehicleNumber.toUpperCase(),
                vehicleType: 'car',
                flatNumber: isResident ? 'A-101' : null,
                direction,
                gateId: 'gate_1'
            });

            if (res.data.success) {
                Alert.alert('Success', `Vehicle ${direction.toUpperCase()} logged.`);
                setVehicleNumber('');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to log vehicle');
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Vehicle Entry/Exit</Text>

            <View style={styles.card}>
                <View style={styles.directionToggle}>
                    <TouchableOpacity 
                        style={[styles.toggleBtn, direction === 'in' && styles.activeToggle]}
                        onPress={() => setDirection('in')}
                    >
                        <Text style={direction === 'in' ? styles.activeText : styles.inactiveText}>ENTRY (IN)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.toggleBtn, direction === 'out' && styles.activeToggle]}
                        onPress={() => setDirection('out')}
                    >
                        <Text style={direction === 'out' ? styles.activeText : styles.inactiveText}>EXIT (OUT)</Text>
                    </TouchableOpacity>
                </View>

                <TextInput 
                    style={styles.input} 
                    placeholder="Enter Vehicle Number (e.g. MH01AB1234)" 
                    value={vehicleNumber} 
                    onChangeText={setVehicleNumber} 
                    autoCapitalize="characters"
                />

                <View style={styles.switchRow}>
                    <Text style={styles.label}>Is Resident Vehicle?</Text>
                    <Switch value={isResident} onValueChange={setIsResident} />
                </View>

                <TouchableOpacity style={styles.btn} onPress={logVehicle}>
                    <Text style={styles.btnText}>Log {direction.toUpperCase()}</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.scanBtn}>
                <Text style={styles.btnText}>Use ANPR (Camera Scan)</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    card: { backgroundColor: '#fff', padding: 20, borderRadius: 10, elevation: 2 },
    input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 5, marginBottom: 20, fontSize: 18, textAlign: 'center', letterSpacing: 2 },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    label: { fontSize: 16 },
    btn: { backgroundColor: '#2196F3', padding: 15, borderRadius: 5, alignItems: 'center' },
    scanBtn: { backgroundColor: '#333', padding: 15, borderRadius: 5, alignItems: 'center', marginTop: 20 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    directionToggle: { flexDirection: 'row', marginBottom: 20, borderRadius: 5, overflow: 'hidden', borderWidth: 1, borderColor: '#2196F3' },
    toggleBtn: { flex: 1, padding: 15, alignItems: 'center', backgroundColor: '#fff' },
    activeToggle: { backgroundColor: '#2196F3' },
    activeText: { color: '#fff', fontWeight: 'bold' },
    inactiveText: { color: '#2196F3', fontWeight: 'bold' }
});
