'use client';
import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { PhoneCall, Mic, MicOff, PhoneOff } from 'lucide-react';
import { Button } from './ui/Button';
import { supabase } from '@/lib/supabase';

const WebRTCIntercom = forwardRef(({ currentUser, onCallEnd, flatNumber }, ref) => {
  const [callState, setCallState] = useState('idle'); // idle, ringing, connected
  const [isMuted, setIsMuted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [incomingCaller, setIncomingCaller] = useState(null);
  
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerConnection = useRef(null);
  const mediaRecorder = useRef(null);
  const recordedChunks = useRef([]);
  const channelRef = useRef(null);

  // Determine if this user is a Guard or a Resident
  // For simplicity: If we passed `flatNumber`, this component is in the Resident Dashboard
  const isResident = !!flatNumber; 
  const roomName = isResident ? `intercom:flat:${flatNumber}` : `intercom:guard`;

  useEffect(() => {
    // 1. Subscribe to Supabase Realtime Channel
    if (!supabase) return;
    
    // We listen to the Resident's flat channel if Resident, or a Guard channel if Guard
    const channel = supabase.channel(`intercom:global`);
    
    channel
      .on('broadcast', { event: 'call-offer' }, async (payload) => {
        // If I am a resident and the call is for my flat
        if (isResident && payload.payload.targetFlat === flatNumber) {
          setIncomingCaller(payload.payload.callerName || 'Gate Security');
          setCallState('ringing');
          await setupPeerConnection();
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(payload.payload.offer));
        }
      })
      .on('broadcast', { event: 'call-answer' }, async (payload) => {
        if (!isResident && callState === 'ringing') {
          // Guard receives the answer
          setCallState('connected');
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(payload.payload.answer));
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async (payload) => {
        if (peerConnection.current) {
          try {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(payload.payload.candidate));
          } catch (e) {
            console.error('Error adding received ice candidate', e);
          }
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
    };
  }, [flatNumber, isResident]);

  const setupPeerConnection = async () => {
    peerConnection.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { candidate: event.candidate }
        });
      }
    };

    peerConnection.current.ontrack = (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };
  };

  // Called by Guard to initiate a call to a flat
  useImperativeHandle(ref, () => ({
    initiateCall: async (targetFlat) => {
      setCallState('ringing');
      setIncomingCaller(`Flat ${targetFlat}`);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (localAudioRef.current) localAudioRef.current.srcObject = stream;
      
      await setupPeerConnection();
      stream.getTracks().forEach(track => peerConnection.current.addTrack(track, stream));

      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);

      channelRef.current.send({
        type: 'broadcast',
        event: 'call-offer',
        payload: { offer, targetFlat, callerName: 'Gate Security' }
      });
    }
  }));

  const acceptCall = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (localAudioRef.current) localAudioRef.current.srcObject = stream;
    
    stream.getTracks().forEach(track => peerConnection.current.addTrack(track, stream));

    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);

    channelRef.current.send({
      type: 'broadcast',
      event: 'call-answer',
      payload: { answer }
    });
    
    setCallState('connected');
  };

  const cleanupCall = () => {
    if (mediaRecorder.current && recording) {
      mediaRecorder.current.stop();
    }
    if (localAudioRef.current?.srcObject) {
      localAudioRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setCallState('idle');
    setRecording(false);
    setIncomingCaller(null);
    if (onCallEnd) onCallEnd();
  };

  const endCall = () => {
    channelRef.current.send({ type: 'broadcast', event: 'end-call' });
    cleanupCall();
  };

  const toggleMute = () => {
    if (localAudioRef.current?.srcObject) {
      localAudioRef.current.srcObject.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleRecording = () => {
    if (!recording && localAudioRef.current?.srcObject) {
      mediaRecorder.current = new MediaRecorder(localAudioRef.current.srcObject, { mimeType: 'audio/webm' });
      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.current.push(e.data);
      };
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: 'audio/webm' });
        console.log('Call recording saved (blob size):', blob.size);
        recordedChunks.current = [];
      };
      mediaRecorder.current.start();
      setRecording(true);
    } else if (recording && mediaRecorder.current) {
      mediaRecorder.current.stop();
      setRecording(false);
    }
  };

  if (callState === 'idle') return null;

  return (
    <div style={{
      position: 'fixed', bottom: '20px', right: '20px', width: '350px',
      background: 'var(--surface)', borderRadius: '1rem',
      boxShadow: '0 10px 25px rgba(0,0,0,0.2)', border: '1px solid var(--border)',
      overflow: 'hidden', zIndex: 9999
    }}>
      <audio ref={localAudioRef} autoPlay muted />
      <audio ref={remoteAudioRef} autoPlay />

      <div style={{ background: 'var(--primary)', padding: '1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <PhoneCall className={callState === 'ringing' ? 'animate-pulse' : ''} />
        <div>
          <h4 style={{ fontWeight: 600 }}>
            {callState === 'ringing' ? (isResident ? 'Incoming Call...' : 'Calling...') : 'Live Intercom'}
          </h4>
          <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>{incomingCaller}</span>
        </div>
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {callState === 'ringing' && isResident && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button variant="success" style={{ flex: 1, background: 'var(--success)', color: 'white' }} onClick={acceptCall}>Accept</Button>
            <Button variant="danger" style={{ flex: 1, background: 'var(--error)', color: 'white' }} onClick={endCall}>Decline</Button>
          </div>
        )}
        
        {callState === 'ringing' && !isResident && (
           <Button variant="danger" style={{ background: 'var(--error)', color: 'white' }} onClick={endCall}>Cancel Call</Button>
        )}

        {callState === 'connected' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', padding: '1rem 0' }}>
              <button onClick={toggleMute} style={{ width: '50px', height: '50px', borderRadius: '50%', border: 'none', background: isMuted ? 'var(--error-light)' : 'var(--surface-active)', color: isMuted ? 'var(--error)' : 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isMuted ? <MicOff /> : <Mic />}
              </button>
              <button onClick={endCall} style={{ width: '50px', height: '50px', borderRadius: '50%', border: 'none', background: 'var(--error)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PhoneOff />
              </button>
            </div>
            {!isResident && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer', justifyContent: 'center', color: recording ? 'var(--error)' : 'var(--text-muted)' }}>
                <input type="checkbox" checked={recording} onChange={toggleRecording} />
                {recording ? '● Recording Audio...' : 'Record Call'}
              </label>
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default WebRTCIntercom;
