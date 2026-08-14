'use client';

import React, { Suspense, useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RoundedBox, Environment, ContactShadows, Float, Html } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Floating3DCard
 *
 * A card rendered in WebGL that banks toward the pointer. The tilt is damped
 * per frame rather than driven by transitions, so it tracks continuously
 * instead of easing to fixed positions.
 *
 * Three.js cannot server-render, and this file is a client component for that
 * reason. Import it through next/dynamic with `ssr: false` at the call site.
 */

// ─── The card mesh ───────────────────────────────────────────────────────────

function CardMesh({ color, accent, hovered, reduceMotion }) {
  const group = useRef();
  const { viewport } = useThree();

  // Reused across frames; allocating vectors inside useFrame would create
  // garbage 60 times a second.
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    if (!group.current) return;

    if (reduceMotion) {
      group.current.rotation.set(0, 0, 0);
      group.current.position.set(0, 0, 0);
      return;
    }

    // Pointer arrives normalised to [-1, 1] on both axes.
    const { x, y } = state.pointer;

    // Rotate toward the pointer, clamped so the card never turns edge-on.
    const maxTilt = hovered ? 0.42 : 0.22;
    target.set(-y * maxTilt, x * maxTilt, 0);

    // Frame-rate independent damping: the 1 - e^(-k*dt) form converges at the
    // same rate whether the display runs at 60Hz or 120Hz.
    const k = hovered ? 9 : 4;
    const alpha = 1 - Math.exp(-k * delta);

    group.current.rotation.x += (target.x - group.current.rotation.x) * alpha;
    group.current.rotation.y += (target.y - group.current.rotation.y) * alpha;

    // Slight push toward the viewer on hover.
    const z = hovered ? 0.28 : 0;
    group.current.position.z += (z - group.current.position.z) * alpha;
  });

  // Scale the card to the viewport so it fills the frame consistently.
  const w = Math.min(viewport.width * 0.62, 3.2);
  const h = w * 0.62;

  return (
    <group ref={group}>
      <Float
        speed={reduceMotion ? 0 : 1.4}
        rotationIntensity={reduceMotion ? 0 : 0.18}
        floatIntensity={reduceMotion ? 0 : 0.5}
      >
        <RoundedBox args={[w, h, 0.12]} radius={0.08} smoothness={6} castShadow>
          <meshPhysicalMaterial
            color={color}
            // Physical material with transmission is what reads as glass;
            // a standard material only ever looks like tinted plastic.
            roughness={0.14}
            metalness={0.22}
            transmission={0.24}
            thickness={0.6}
            clearcoat={1}
            clearcoatRoughness={0.08}
            iridescence={0.5}
            iridescenceIOR={1.4}
            envMapIntensity={1.5}
          />
        </RoundedBox>

        {/* Accent bar, lifted just off the face so it catches its own light. */}
        <mesh position={[0, -h * 0.34, 0.07]}>
          <planeGeometry args={[w * 0.7, 0.045]} />
          <meshBasicMaterial color={accent} toneMapped={false} />
        </mesh>
      </Float>
    </group>
  );
}

// ─── Lighting rig ────────────────────────────────────────────────────────────

function Rig({ accent }) {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 5]} intensity={1.5} castShadow />
      {/* Coloured rim light: this is what separates the card from a dark
          background and gives the edge its glow. */}
      <pointLight position={[-4, -2, -3]} intensity={26} color={accent} distance={12} />
      <Environment preset="city" />
      <ContactShadows position={[0, -1.4, 0]} opacity={0.4} scale={9} blur={2.6} far={3} />
    </>
  );
}

// ─── Public component ────────────────────────────────────────────────────────

export default function Floating3DCard({
  color = '#12152E',
  accent = '#00C880',
  height = 380,
  className = '',
  children,
  fallback = null,
}) {
  const [hovered, setHovered] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // WebGL is unavailable on some devices and in some corporate profiles. A 3D
  // flourish must never take the page down with it.
  if (failed) return fallback;

  return (
    <div
      className={`relative ${className}`}
      style={{ height }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0, 5], fov: 42 }}
        // Pause rendering when nothing is animating; a static card should not
        // hold a GPU loop open.
        frameloop={reduceMotion ? 'demand' : 'always'}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
        }}
        onError={() => setFailed(true)}
      >
        <Suspense fallback={null}>
          <Rig accent={accent} />
          <CardMesh
            color={color}
            accent={accent}
            hovered={hovered}
            reduceMotion={reduceMotion}
          />
          {children ? (
            <Html center distanceFactor={6} transform occlude>
              {children}
            </Html>
          ) : null}
        </Suspense>
      </Canvas>
    </div>
  );
}
