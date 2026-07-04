/**
 * Scene3D — cinematic floating-geometry background for the landing page.
 *
 * Design notes:
 * - Lighting is a manual three-point "studio" rig instead of drei's
 *   <Environment preset="..."> because presets download HDR files from a CDN
 *   at runtime — a hidden failure mode on slow networks and inside the
 *   Capacitor APK. Everything here renders offline.
 * - Parallax uses R3F's built-in state.pointer (normalized -1..1), lerped
 *   every frame — no manual mousemove listeners to clean up.
 * - dpr is clamped to 1.75 so 3x-DPR phones don't render 9x the pixels.
 * - This module is heavy (three.js ≈ 600 KB min). ALWAYS import it with
 *   React.lazy — LandingPage.jsx does this — so it never blocks first paint.
 */
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, ContactShadows, MeshDistortMaterial } from '@react-three/drei';
import { useRef } from 'react';

const BRAND = '#7c5cff'; // violet — matches the from-brand-600 gradient
const SKY = '#38bdf8';
const EMERALD = '#34d399';
const AMBER = '#fbbf24';

/** Lerps the camera toward the pointer for a subtle parallax drift. */
function ParallaxRig({ intensity = 0.9 }) {
  useFrame((state, delta) => {
    const damp = 1 - Math.exp(-2.2 * delta); // framerate-independent easing
    state.camera.position.x += (state.pointer.x * intensity - state.camera.position.x) * damp;
    state.camera.position.y += (state.pointer.y * intensity * 0.6 - state.camera.position.y) * damp;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

function Geometry({ still = false }) {
  const torus = useRef();
  useFrame((_, delta) => {
    if (torus.current && !still) torus.current.rotation.y += delta * 0.12;
  });

  const float = (props) =>
    still ? { speed: 0, rotationIntensity: 0, floatIntensity: 0, ...props } : props;

  return (
    <group>
      {/* Hero piece: torus knot, right of the headline */}
      <Float {...float({ speed: 1.2, rotationIntensity: 0.5, floatIntensity: 0.9 })}>
        <mesh ref={torus} position={[3.4, 0.6, -1.5]} castShadow>
          <torusKnotGeometry args={[1.15, 0.34, 220, 36]} />
          <meshStandardMaterial color={BRAND} metalness={0.35} roughness={0.18} />
        </mesh>
      </Float>

      {/* Faceted icosahedron, left */}
      <Float {...float({ speed: 1.6, rotationIntensity: 0.8, floatIntensity: 1.1 })}>
        <mesh position={[-3.6, 1.2, -2.5]} castShadow>
          <icosahedronGeometry args={[1.05, 0]} />
          <meshStandardMaterial color={SKY} flatShading metalness={0.15} roughness={0.35} />
        </mesh>
      </Float>

      {/* Soft organic blob, low center-left */}
      <Float {...float({ speed: 1.1, rotationIntensity: 0.3, floatIntensity: 0.8 })}>
        <mesh position={[-1.9, -1.7, -1]} castShadow>
          <sphereGeometry args={[0.85, 48, 48]} />
          <MeshDistortMaterial color={EMERALD} distort={still ? 0 : 0.28} speed={1.4} roughness={0.25} />
        </mesh>
      </Float>

      {/* Small accent spheres */}
      <Float {...float({ speed: 2.0, rotationIntensity: 0.2, floatIntensity: 1.4 })}>
        <mesh position={[2.2, -1.9, -0.5]} castShadow>
          <sphereGeometry args={[0.38, 32, 32]} />
          <meshStandardMaterial color={AMBER} metalness={0.5} roughness={0.2} />
        </mesh>
      </Float>
      <Float {...float({ speed: 1.8, rotationIntensity: 0.2, floatIntensity: 1.2 })}>
        <mesh position={[0.4, 2.4, -3]} castShadow>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshStandardMaterial color={BRAND} metalness={0.4} roughness={0.3} />
        </mesh>
      </Float>
    </group>
  );
}

/**
 * @param {boolean} still  render a static (reduced-motion) scene
 */
export default function Scene3D({ still = false }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 9], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ pointerEvents: 'none' }} // never intercept clicks on the UI overlay
      aria-hidden="true"
    >
      {/* Manual studio lighting — no runtime HDR downloads */}
      <ambientLight intensity={0.65} />
      <directionalLight position={[6, 8, 4]} intensity={1.4} castShadow />
      <directionalLight position={[-6, 3, 2]} intensity={0.5} color="#e0e7ff" />
      <pointLight position={[0, -4, 3]} intensity={0.35} color={BRAND} />

      <Geometry still={still} />

      {/* Soft grounded shadow plane — the "premium studio" cue */}
      <ContactShadows position={[0, -3.1, 0]} opacity={0.32} scale={16} blur={2.6} far={4} />

      {!still && <ParallaxRig />}
    </Canvas>
  );
}
