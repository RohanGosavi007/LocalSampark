import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Modal, TouchableOpacity, Text } from 'react-native';
// import { WebView } from 'react-native-webview'; // Requires installation
import { X } from 'lucide-react-native';

export default function RazorpayCheckout({ visible, amount, orderId, onClose, onSuccess, shopName }) {
  const [loading, setLoading] = useState(true);

  // Since react-native-webview isn't in package.json yet, this is a mocked placeholder
  // that behaves like the webview to demonstrate the exact UX flow.
  
  const handleSimulatedPayment = (success) => {
    if (success) {
      onSuccess({
        razorpay_payment_id: `pay_${Math.random().toString(36).substr(2, 9)}`,
        razorpay_order_id: orderId,
        razorpay_signature: "mock_signature"
      });
    } else {
      onClose();
    }
  };

  /* 
  // REAL WEBVIEW IMPLEMENTATION 
  // The WebView renders a local HTML string that loads the Razorpay checkout.js SDK
  
  const htmlContent = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f3f4f6;">
        <h2 style="font-family: sans-serif; color: #6b7280;">Loading Secure Payment Gateway...</h2>
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <script>
          var options = {
              "key": "rzp_test_YourKeyId",
              "amount": "${amount * 100}",
              "currency": "INR",
              "name": "${shopName}",
              "description": "Order Payment",
              "order_id": "${orderId}",
              "handler": function (response) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'success', data: response }));
              },
              "theme": {
                  "color": "#f97316"
              }
          };
          var rzp1 = new Razorpay(options);
          
          rzp1.on('payment.failed', function (response){
              window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'failed', data: response.error }));
          });
          
          setTimeout(() => {
              rzp1.open();
          }, 500);
        </script>
      </body>
    </html>
  `;

  const handleMessage = (event) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.status === 'success') {
      onSuccess(data.data);
    } else {
      console.warn("Payment Failed:", data.data);
      onClose();
    }
  };
  */

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={24} color="#6b7280" />
          </TouchableOpacity>
          
          {/* SIMULATED UI */}
          <View style={styles.simulatedContainer}>
            <Text style={styles.simTitle}>Razorpay Sandbox</Text>
            <Text style={styles.simAmount}>Paying ₹{amount} to {shopName}</Text>
            
            <TouchableOpacity style={[styles.btn, styles.successBtn]} onPress={() => handleSimulatedPayment(true)}>
              <Text style={styles.btnText}>Simulate Success</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.btn, styles.failBtn]} onPress={() => handleSimulatedPayment(false)}>
              <Text style={styles.btnText}>Simulate Failure</Text>
            </TouchableOpacity>
            <Text style={styles.simNote}>WebView component is prepared in comments.</Text>
          </View>

          {/* 
          <WebView
            source={{ html: htmlContent }}
            onMessage={handleMessage}
            onLoadEnd={() => setLoading(false)}
            style={{ flex: 1, marginTop: 40 }}
            originWhitelist={['*']}
            javaScriptEnabled={true}
          /> 
          */}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { flex: 1, backgroundColor: '#f9fafb', marginTop: 50, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  closeBtn: { position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 8, backgroundColor: '#fff', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
  
  // Simulated Styles
  simulatedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  simTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, color: '#111827' },
  simAmount: { fontSize: 16, color: '#6b7280', marginBottom: 32 },
  btn: { width: '100%', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  successBtn: { backgroundColor: '#10b981' },
  failBtn: { backgroundColor: '#ef4444' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  simNote: { marginTop: 24, fontSize: 12, color: '#9ca3af', textAlign: 'center' }
});
