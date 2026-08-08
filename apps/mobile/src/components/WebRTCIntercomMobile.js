import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PermissionsAndroid, Platform } from 'react-native';
import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices, RTCView } from 'react-native-webrtc';
import RNCallKeep from 'react-native-callkeep';
import { supabase } from '../lib/supabase'; // assuming this exists in mobile too
import { MaterialCommunityIcons } from '@expo/vector-icons'; // or standard react-native-vector-icons

const WebRTCIntercomMobile = ({ flatNumber, isGuard }) => {
  const [callState, setCallState] = useState('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [incomingCaller, setIncomingCaller] = useState(null);
  
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const channelRef = useRef(null);
  const currentCallId = useRef(null);
  
  const isResident = !!flatNumber;
  const roomName = isResident ? `intercom:flat:${flatNumber}` : `intercom:guard`;

  useEffect(() => {
    // 1. Setup CallKeep for Background VOIP
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      const options = {
        ios: { appName: 'LocalSampark', includesCallsInRecents: false },
        android: { alertTitle: 'Permissions required', alertDescription: 'This application needs to access your phone accounts', cancelButton: 'Cancel', okButton: 'ok', imageMargin: 0, additionalPermissions: [PermissionsAndroid.PERMISSIONS.example] }
      };
      
      try {
        RNCallKeep.setup(options).then(accepted => {
          console.log('CallKeep Setup:', accepted);
        });
        
        RNCallKeep.addEventListener('answerCall', ({ callUUID }) => {
          acceptCall();
          RNCallKeep.setCurrentCallActive(callUUID);
        });
        
        RNCallKeep.addEventListener('endCall', ({ callUUID }) => {
          endCall();
        });
      } catch (err) {
        console.error('CallKeep Setup Error:', err);
      }
    }

    // 2. Setup Supabase Realtime
    if (!supabase) return;
    const channel = supabase.channel(`intercom:global`);
    
    channel
      .on('broadcast', { event: 'call-offer' }, async (payload) => {
        if (isResident && payload.payload.targetFlat === flatNumber) {
          setIncomingCaller(payload.payload.callerName || 'Gate Security');
          setCallState('ringing');
          currentCallId.current = payload.payload.callId || 'call-uuid';
          
          // Trigger native ringing via CallKeep
          RNCallKeep.displayIncomingCall(currentCallId.current, "Security Gate", payload.payload.callerName || "Gate", 'generic', true);
          
          await setupPeerConnection();
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(payload.payload.offer));
        }
      })
      .on('broadcast', { event: 'call-answer' }, async (payload) => {
        if (!isResident && callState === 'ringing') {
          setCallState('connected');
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(payload.payload.answer));
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async (payload) => {
        if (peerConnection.current) {
          try {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(payload.payload.candidate));
          } catch (e) {}
        }
      })
      .on('broadcast', { event: 'end-call' }, () => {
        cleanupCall();
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      cleanupCall();
      RNCallKeep.removeEventListener('answerCall');
      RNCallKeep.removeEventListener('endCall');
    };
  }, [flatNumber, isResident]);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);
      } catch (err) { console.warn(err); }
    }
  };

  const setupPeerConnection = async () => {
    peerConnection.current = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        channelRef.current.send({ type: 'broadcast', event: 'ice-candidate', payload: { candidate: event.candidate } });
      }
    };
  };

  const startStream = async () => {
    await requestPermissions();
    const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
    localStream.current = stream;
    stream.getTracks().forEach(track => peerConnection.current.addStream(stream));
  };

  const acceptCall = async () => {
    await startStream();
    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);
    channelRef.current.send({ type: 'broadcast', event: 'call-answer', payload: { answer } });
    setCallState('connected');
  };

  const endCall = () => {
    channelRef.current.send({ type: 'broadcast', event: 'end-call' });
    cleanupCall();
  };

  const cleanupCall = () => {
    if (localStream.current) localStream.current.getTracks().forEach(t => t.stop());
    if (peerConnection.current) peerConnection.current.close();
    if (currentCallId.current) RNCallKeep.endCall(currentCallId.current);
    peerConnection.current = null;
    localStream.current = null;
    currentCallId.current = null;
    setCallState('idle');
    setIncomingCaller(null);
  };

  const toggleMute = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      setIsMuted(!isMuted);
    }
  };

  if (callState === 'idle') return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="phone-in-talk" size={24} color="#fff" />
        <View style={styles.headerText}>
          <Text style={styles.title}>{callState === 'ringing' ? 'Incoming Call...' : 'Live Intercom'}</Text>
          <Text style={styles.subtitle}>{incomingCaller}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        {callState === 'ringing' && isResident && (
          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, styles.btnSuccess]} onPress={acceptCall}>
              <Text style={styles.btnText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={endCall}>
              <Text style={styles.btnText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {callState === 'connected' && (
          <View style={styles.row}>
            <TouchableOpacity style={[styles.iconBtn, isMuted && styles.iconBtnActive]} onPress={toggleMute}>
              <MaterialCommunityIcons name={isMuted ? "microphone-off" : "microphone"} size={28} color={isMuted ? "#ef4444" : "#fff"} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, styles.btnDangerIcon]} onPress={endCall}>
              <MaterialCommunityIcons name="phone-hangup" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    backgroundColor: '#1f2937', borderRadius: 16,
    overflow: 'hidden', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5
  },
  header: { backgroundColor: '#3b82f6', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1 },
  title: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  subtitle: { color: '#e0e7ff', fontSize: 14 },
  controls: { padding: 20 },
  row: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  btn: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  btnSuccess: { backgroundColor: '#10b981' },
  btnDanger: { backgroundColor: '#ef4444' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  iconBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' },
  iconBtnActive: { backgroundColor: '#fee2e2' },
  btnDangerIcon: { backgroundColor: '#ef4444' }
});

export default WebRTCIntercomMobile;
