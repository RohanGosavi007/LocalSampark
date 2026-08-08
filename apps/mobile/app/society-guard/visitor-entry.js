import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import * as api from '../../src/lib/api';

export default function VisitorEntryScreen() {
    const [passcode, setPasscode] = useState('');
    const [scanMode, setScanMode] = useState(false);

    const verifyPasscode = async () => {
        if (passcode.length !== 6) return Alert.alert('Error', 'Enter 6-digit passcode');
        
        try {
            const res = await api.post('/society-preapproval/pre-approve/verify', {
                societyId: 'dummy-society',
                passcode
            });

            if (res.data.success) {
                const { flatNumber, visitorName, leaveAtGate } = res.data.data;
                let msg = `${visitorName} is verified for Flat ${flatNumber}.`;
                if (leaveAtGate) {
                    msg += '\n\n⚠️ INSTRUCTION: Resident has requested to leave the delivery at the gate.';
                }
                Alert.alert('Access Granted', msg);
                setPasscode('');
            }
        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Verification failed');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Gate Security</Text>
            
            <View style={styles.card}>
                <Text style={styles.label}>Enter Visitor Passcode</Text>
                <TextInput 
                    style={styles.codeInput}
                    placeholder="------"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={passcode}
                    onChangeText={setPasscode}
                />
                
                <TouchableOpacity style={styles.btn} onPress={verifyPasscode}>
                    <Text style={styles.btnText}>Verify Passcode</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.scanBtn} onPress={() => setScanMode(true)}>
                    <Text style={styles.btnText}>Scan QR Code</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.divider}>
                <Text>OR</Text>
            </View>

            <TouchableOpacity style={styles.manualBtn}>
                <Text style={styles.manualBtnText}>Manual Entry (Walk-in)</Text>
            </TouchableOpacity>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    card: { backgroundColor: '#fff', padding: 20, borderRadius: 10, elevation: 2, alignItems: 'center' },
    label: { fontSize: 16, marginBottom: 15, color: '#555' },
    codeInput: { 
        fontSize: 32, 
        letterSpacing: 10, 
        borderBottomWidth: 2, 
        borderColor: '#2196F3', 
        width: 200, 
        textAlign: 'center', 
        marginBottom: 20 
    },
    btn: { backgroundColor: '#2196F3', padding: 15, borderRadius: 5, width: '100%', alignItems: 'center' },
    scanBtn: { backgroundColor: '#333', padding: 15, borderRadius: 5, width: '100%', alignItems: 'center', marginTop: 10 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    divider: { alignItems: 'center', marginVertical: 30 },
    manualBtn: { backgroundColor: '#fff', padding: 15, borderRadius: 5, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
    manualBtnText: { color: '#333', fontWeight: 'bold', fontSize: 16 }
});
