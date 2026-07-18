const { io } = require('socket.io-client');

// Connect to the backend socket server
const socket = io('http://localhost:5000', {
  query: { userId: 'shop123' } // Authenticating as a shop owner
});

socket.on('connect', () => {
  console.log('✅ Connected to Socket Server as shop123 (ID:', socket.id, ')');
  
  // Now we simulate the backend emitting an order to us.
  // In a real flow, a customer HTTP POST /api/v1/orders would trigger emitNewOrderAlert() in the backend.
  console.log('Waiting for order:new events...');
});

socket.on('order:new', (data) => {
  console.log('🚨 Received new order alert! Ringing... 🚨');
  console.log('Order Details:', data);
  
  // Simulate the shop owner accepting the order after 2 seconds
  setTimeout(() => {
    console.log('Shop owner accepts the order, notifying customer...');
    socket.emit('order:accept', {
      orderId: data.id,
      customerId: data.customerId
    });
    
    // Close test script after success
    setTimeout(() => {
      socket.disconnect();
      process.exit(0);
    }, 500);
  }, 2000);
});

socket.on('disconnect', () => {
  console.log('Disconnected from server.');
});
