import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Switch } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import api from '../../src/lib/api';

export default function PreApproveVisitorScreen() {
    const [visitorName, setVisitorName] = useState('');
    const [visitorPhone, setVisitorPhone] = useState('');
    const [purpose, setPurpose] = useState('guest');
    const [leaveAtGate, setLeaveAtGate] = useState(false);
    const [passcodeData, setPasscodeData] = useState(null);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await api.get('/society-preapproval/pre-approve/my');
            if (res.data.success) {
                setHistory(res.data.data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const generatePasscode = async () => {
        try {
            // Hardcoded validFrom/validUntil for simplicity in UI, usually picked via datepicker
            const validFrom = new Date().toISOString();
            const validUntil = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours

            const res = await api.post('/society-preapproval/pre-approve', {
                societyId: 'dummy-society', // fetch from context
                flatNumber: 'A-101', // fetch from context
                visitorName,
                visitorPhone,
                purpose,
                validFrom,
                validUntil,
                leaveAtGate
            });

            if (res.data.success) {
                setPasscodeData(res.data.data);
                fetchHistory();
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Pre-Approve Visitor</Text>

            <View style={styles.card}>
                <TextInput 
                    style={styles.input} 
                    placeholder="Visitor Name" 
                    value={visitorName} 
                    onChangeText={setVisitorName} 
                />
                <TextInput 
                    style={styles.input} 
                    placeholder="Phone Number" 
                    keyboardType="phone-pad" 
                    value={visitorPhone} 
                    onChangeText={setVisitorPhone} 
                />
                
                <View style={styles.switchRow}>
                    <Text>Leave delivery at gate?</Text>
                    <Switch value={leaveAtGate} onValueChange={setLeaveAtGate} />
                </View>

                <TouchableOpacity style={styles.btn} onPress={generatePasscode}>
                    <Text style={styles.btnText}>Generate Passcode</Text>
                </TouchableOpacity>
            </View>

            {passcodeData && (
                <View style={styles.qrCard}>
                    <Text style={styles.passcodeText}>{passcodeData.passcode}</Text>
                    <QRCode value={passcodeData.qrData} size={150} />
                    <TouchableOpacity style={styles.shareBtn}>
                        <Text style={styles.btnText}>Share via WhatsApp</Text>
                    </TouchableOpacity>
                </View>
            )}

            <Text style={styles.subtitle}>Active Approvals</Text>
            {history.map(item => (
                <View key={item.id} style={styles.historyCard}>
                    <Text style={styles.bold}>{item.visitor_name}</Text>
                    <Text>Code: {item.passcode}</Text>
                    <Text>Status: {item.status}</Text>
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    subtitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
    card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, elevation: 2 },
    qrCard: { backgroundColor: '#fff', padding: 20, borderRadius: 10, elevation: 2, alignItems: 'center', marginTop: 20 },
    input: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 5, marginBottom: 15 },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    btn: { backgroundColor: '#2196F3', padding: 15, borderRadius: 5, alignItems: 'center' },
    shareBtn: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 5, alignItems: 'center', marginTop: 20, width: '100%' },
    btnText: { color: '#fff', fontWeight: 'bold' },
    passcodeText: { fontSize: 32, fontWeight: 'bold', letterSpacing: 5, marginBottom: 20 },
    historyCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10 },
    bold: { fontWeight: 'bold', fontSize: 16 }
});
