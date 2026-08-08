'use client';
import React, { useState, useRef, useCallback } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import Webcam from 'react-webcam';
import Link from 'next/link';
import { ArrowLeft, Camera, UserPlus } from 'lucide-react';

export default function NewVisitorPage() {
  const webcamRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    setImgSrc(imageSrc);
  }, [webcamRef]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>
      <Header />
      <main style={{ flex: 1, padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        
        <Link href="/security-dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '1.5rem', fontWeight: 600 }}>
          <ArrowLeft size={20} /> Back to Dashboard
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ padding: '1rem', background: 'var(--primary-light)', borderRadius: '1rem', color: 'var(--primary)' }}>
            <UserPlus size={32} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Register New Visitor</h1>
            <p style={{ color: 'var(--text-muted)' }}>Complete form for visitor pre-approval</p>
          </div>
        </div>

        <Card style={{ padding: '2rem' }}>
          <div style={{ display: 'grid', gap: '2rem' }}>
            
            {/* Photo Section */}
            <div>
              <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 600, fontSize: '1.1rem' }}>Visitor Photo (Required)</label>
              {!imgSrc ? (
                <div style={{ position: 'relative', borderRadius: '1rem', overflow: 'hidden', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '300px', justifyContent: 'center' }}>
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    width="100%"
                    videoConstraints={{ facingMode: "user" }}
                  />
                  <Button variant="primary" onClick={capture} style={{ position: 'absolute', bottom: '1.5rem', display: 'flex', gap: '0.5rem', padding: '1rem 2rem', fontSize: '1.1rem' }}>
                    <Camera size={20} /> Capture Photo
                  </Button>
                </div>
              ) : (
                <div style={{ position: 'relative', borderRadius: '1rem', overflow: 'hidden' }}>
                  <img src={imgSrc} alt="Visitor Capture" style={{ width: '100%', display: 'block' }} />
                  <Button variant="outline" onClick={() => setImgSrc(null)} style={{ position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', background: 'white', padding: '0.75rem 2rem' }}>
                    Retake Photo
                  </Button>
                </div>
              )}
            </div>

            <hr style={{ borderTop: '1px solid var(--border)' }} />
            
            {/* Form Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Visitor Full Name</label>
                <input type="text" placeholder="e.g. Rahul Sharma" style={{ width: '100%', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', fontSize: '1rem' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Phone Number</label>
                <input type="tel" placeholder="+91" style={{ width: '100%', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', fontSize: '1rem' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Total Guests</label>
                <input type="number" defaultValue={1} min={1} style={{ width: '100%', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', fontSize: '1rem' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Visiting Flat/Villa</label>
                <input type="text" placeholder="e.g. A-101" style={{ width: '100%', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', fontSize: '1rem' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Purpose of Visit</label>
                <select style={{ width: '100%', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', fontSize: '1rem' }}>
                  <option>Guest/Relative</option>
                  <option>Service/Repair</option>
                  <option>Delivery</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <Button variant="primary" style={{ padding: '1rem', fontSize: '1.1rem', marginTop: '1rem' }}>
              Send Approval Request to Resident
            </Button>

          </div>
        </Card>

      </main>
      <Footer />
    </div>
  );
}
