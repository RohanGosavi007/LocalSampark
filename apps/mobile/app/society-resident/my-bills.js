import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import api from '../../src/lib/api';

export default function MyBillsScreen() {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBills();
    }, []);

    const fetchBills = async () => {
        try {
            const res = await api.get('/society-billing/my-bills');
            if (res.data.success) {
                setBills(res.data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handlePay = async (bill) => {
        Alert.alert('Payment processing', `Simulating payment for Rs. ${bill.total_amount - bill.paid_amount}`);
        
        try {
            const res = await api.post('/society-billing/payment', {
                billId: bill.id,
                amount: bill.total_amount - bill.paid_amount,
                paymentMethod: 'upi',
                transactionId: 'TXN' + Date.now()
            });

            if (res.data.success) {
                Alert.alert('Success', 'Payment successful! Receipt generated.');
                fetchBills();
            }
        } catch (error) {
            Alert.alert('Error', 'Payment failed');
        }
    };

    const renderBill = ({ item }) => {
        const isPaid = item.payment_status === 'paid';
        const pendingAmount = item.total_amount - item.paid_amount;

        return (
            <View style={styles.card}>
                <View style={styles.headerRow}>
                    <Text style={styles.month}>{item.month}/{item.year}</Text>
                    <Text style={[styles.status, isPaid ? styles.paid : styles.pending]}>
                        {item.payment_status.toUpperCase()}
                    </Text>
                </View>
                
                <Text style={styles.amount}>Total: Rs. {item.total_amount}</Text>
                {!isPaid && <Text style={styles.due}>Due: Rs. {pendingAmount}</Text>}
                <Text style={styles.date}>Due Date: {new Date(item.due_date).toLocaleDateString()}</Text>

                {!isPaid && (
                    <TouchableOpacity style={styles.payBtn} onPress={() => handlePay(item)}>
                        <Text style={styles.payBtnText}>Pay Rs. {pendingAmount}</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>My Maintenance Bills</Text>
            {loading ? (
                <Text>Loading bills...</Text>
            ) : (
                <FlatList
                    data={bills}
                    keyExtractor={item => item.id}
                    renderItem={renderBill}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, elevation: 2, marginBottom: 15 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    month: { fontSize: 18, fontWeight: 'bold' },
    status: { fontSize: 14, fontWeight: 'bold', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, overflow: 'hidden' },
    paid: { backgroundColor: '#e8f5e9', color: '#4caf50' },
    pending: { backgroundColor: '#ffebee', color: '#f44336' },
    amount: { fontSize: 16, marginBottom: 5 },
    due: { fontSize: 16, color: '#f44336', fontWeight: 'bold', marginBottom: 5 },
    date: { fontSize: 14, color: '#777', marginBottom: 15 },
    payBtn: { backgroundColor: '#2196F3', padding: 12, borderRadius: 5, alignItems: 'center' },
    payBtnText: { color: '#fff', fontWeight: 'bold' }
});
