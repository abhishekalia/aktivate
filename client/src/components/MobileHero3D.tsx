import { Suspense, useRef, useMemo, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { useSpring, animated } from "@react-spring/three";
import * as THREE from "three";

function SynthwaveGrid() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const shader = useMemo(() => ({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color("#33ff33") },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec3 vPos;
      void main() {
        float gridX = abs(fract(vPos.x * 2.0) - 0.5);
        float gridZ = abs(fract(vPos.z * 2.0) - 0.5);
        float lineX = smoothstep(0.02, 0.0, gridX);
        float lineZ = smoothstep(0.02, 0.0, gridZ);
        float grid = max(lineX, lineZ);
        float fade = smoothstep(8.0, 1.0, length(vPos.xz));
        float pulse = 0.6 + 0.4 * sin(uTime * 0.5 + vPos.z * 0.5);
        float alpha = grid * fade * pulse * 0.4;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  }), []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.2, 0]}>
      <mesh>
        <planeGeometry args={[20, 20, 1, 1]} />
        <shaderMaterial
          ref={materialRef}
          args={[shader]}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function ScreenGlow() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const shader = useMemo(() => ({
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vec2 center = vUv - 0.5;
        float vignette = 1.0 - dot(center, center) * 1.8;
        float scanline = 0.95 + 0.05 * sin(vUv.y * 120.0 + uTime * 2.0);
        float flicker = 0.97 + 0.03 * sin(uTime * 8.0);
        float g = 0.12 * vignette * scanline * flicker;
        gl_FragColor = vec4(0.1, 1.0, 0.3, g);
      }
    `,
  }), []);

  useFrame((state) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <shaderMaterial ref={matRef} args={[shader]} transparent depthWrite={false} />
  );
}

function IMac3D({ springProps }: { springProps: any }) {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <animated.group
      ref={groupRef}
      position={[0, -0.1, 0]}
      rotation-x={springProps.rotX}
      rotation-y={springProps.rotY}
    >
      <RoundedBox args={[2.4, 2.0, 0.9]} radius={0.18} smoothness={4} position={[0, 0.15, 0]}>
        <meshStandardMaterial color="#b8d8e8" roughness={0.35} metalness={0.1} />
      </RoundedBox>

      <RoundedBox args={[2.0, 1.4, 0.05]} radius={0.04} smoothness={2} position={[0, 0.35, 0.44]}>
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </RoundedBox>

      <mesh position={[0, 0.35, 0.47]}>
        <planeGeometry args={[1.85, 1.25]} />
        <ScreenGlow />
      </mesh>

      <mesh position={[0, 0.35, 0.465]}>
        <planeGeometry args={[1.85, 1.25]} />
        <meshBasicMaterial color="#0a1a0a" transparent opacity={0.85} />
      </mesh>

      <RoundedBox args={[2.4, 0.5, 0.9]} radius={0.12} smoothness={3} position={[0, -0.95, 0]}>
        <meshStandardMaterial color="#88ccdd" roughness={0.3} metalness={0.05} transparent opacity={0.7} />
      </RoundedBox>

      <mesh position={[-0.65, -0.95, 0.46]}>
        <cylinderGeometry args={[0.12, 0.12, 0.04, 16]} />
        <meshStandardMaterial color="#555" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0.65, -0.95, 0.46]}>
        <cylinderGeometry args={[0.12, 0.12, 0.04, 16]} />
        <meshStandardMaterial color="#555" roughness={0.5} metalness={0.3} />
      </mesh>

      <mesh position={[0, -0.62, 0.46]}>
        <boxGeometry args={[0.6, 0.03, 0.02]} />
        <meshStandardMaterial color="#aaa" roughness={0.4} metalness={0.2} />
      </mesh>

      <pointLight position={[0, 0.35, 1.5]} color="#33ff33" intensity={0.6} distance={4} decay={2} />
    </animated.group>
  );
}

function FloatingParticles() {
  const count = 20;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 8,
      y: (Math.random() - 0.5) * 5,
      z: (Math.random() - 0.5) * 3 - 1,
      speed: 0.2 + Math.random() * 0.4,
      offset: Math.random() * Math.PI * 2,
    }));
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    particles.forEach((p, i) => {
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.offset) * 0.3,
        p.y + Math.cos(t * p.speed * 0.7 + p.offset) * 0.2,
        p.z
      );
      dummy.scale.setScalar(0.006 + Math.sin(t * 2 + p.offset) * 0.003);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#33ff33" transparent opacity={0.3} />
    </instancedMesh>
  );
}

function Scene() {
  const { size } = useThree();
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  const handlePointerMove = useCallback((e: PointerEvent) => {
    setPointer({
      x: (e.clientX / size.width - 0.5) * 2,
      y: -(e.clientY / size.height - 0.5) * 2,
    });
  }, [size]);

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [handlePointerMove]);

  useEffect(() => {
    let lastBeta = 0;
    let lastGamma = 0;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const beta = ((e.beta || 0) - 30) / 60;
      const gamma = (e.gamma || 0) / 45;
      lastBeta = lastBeta * 0.8 + beta * 0.2;
      lastGamma = lastGamma * 0.8 + gamma * 0.2;
      setPointer({ x: lastGamma, y: -lastBeta });
    };
    window.addEventListener("deviceorientation", handleOrientation);
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, []);

  const springProps = useSpring({
    rotX: pointer.y * 0.1,
    rotY: pointer.x * 0.12,
    config: { mass: 2, tension: 120, friction: 30 },
  });

  return (
    <>
      <color attach="background" args={["#050508"]} />
      <ambientLight intensity={0.5} />
      <SynthwaveGrid />
      <Suspense fallback={null}>
        <IMac3D springProps={springProps} />
      </Suspense>
      <FloatingParticles />
      <EffectComposer>
        <Noise opacity={0.05} />
        <Vignette eskil={false} offset={0.15} darkness={0.7} />
      </EffectComposer>
    </>
  );
}

interface NavItem {
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { label: "THE SYSTEM", href: "#system" },
  { label: "RESULTS", href: "#results" },
  { label: "WHO IT'S FOR", href: "#for-who" },
  { label: "ABOUT", href: "#about" },
];

function GameNav() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const handleClick = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={styles.gameNav} data-testid="mobile-hero-nav">
      {navItems.map((item, i) => (
        <button
          key={item.href}
          onClick={() => handleClick(item.href)}
          onPointerEnter={() => setHoveredIdx(i)}
          onPointerLeave={() => setHoveredIdx(null)}
          data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
          style={{
            ...styles.navBtn,
            color: hoveredIdx === i ? "#33ff33" : "#666",
            textShadow: hoveredIdx === i ? "0 0 8px rgba(51,255,51,0.5)" : "none",
            animation: hoveredIdx === i ? "glitch-flicker 0.15s steps(2) infinite" : "none",
          }}
        >
          <span style={{ marginRight: 6, color: "#33ff33", opacity: 0.4 }}>&gt;</span>
          {item.label}
        </button>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100%",
    height: "100dvh",
    position: "relative",
    overflow: "hidden",
    background: "#050508",
  },
  canvas: {
    position: "absolute",
    inset: 0,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 18px",
  },
  logoWrap: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  logoDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#33ff33",
    boxShadow: "0 0 6px rgba(51,255,51,0.6)",
  },
  logoText: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    fontWeight: 700,
    color: "#e0e0e0",
    letterSpacing: "0.04em",
  },
  topLabel: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 8,
    color: "#444",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  heroContent: {
    position: "absolute",
    bottom: 110,
    left: 18,
    right: 18,
    zIndex: 10,
    pointerEvents: "none",
  },
  label: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 9,
    color: "#33ff33",
    letterSpacing: "0.1em",
    marginBottom: 10,
    textTransform: "uppercase" as const,
  },
  headline: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 28,
    fontWeight: 700,
    lineHeight: 1.12,
    color: "#e0e0e0",
    margin: "0 0 12px",
  },
  desc: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    lineHeight: 1.7,
    color: "#666",
    margin: "0 0 16px",
    maxWidth: 280,
  },
  statsRow: {
    display: "flex",
    gap: 24,
    marginBottom: 0,
  },
  statN: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 18,
    fontWeight: 700,
    color: "#33ff33",
    lineHeight: 1.2,
  },
  statL: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 7,
    color: "#444",
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    marginTop: 2,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: "0 18px 16px",
  },
  gameNav: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
  },
  navBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontFamily: "'Press Start 2P', 'DM Mono', monospace",
    fontSize: 7,
    letterSpacing: "0.06em",
    textAlign: "left" as const,
    padding: "5px 0",
    transition: "color 0.15s",
  },
  ctaBtn: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 9,
    letterSpacing: "0.06em",
    color: "#000",
    background: "#33ff33",
    border: "none",
    padding: "10px 16px",
    textDecoration: "none",
    textTransform: "uppercase" as const,
    fontWeight: 600,
    boxShadow: "0 0 12px rgba(51,255,51,0.25)",
  },
  scanlines: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 3px)",
    zIndex: 20,
  },
};

export default function MobileHero3D() {
  const stats = [
    { value: "70%", label: "OPS SAVED" },
    { value: "2-4wk", label: "BUILD TIME" },
    { value: "5x", label: "CONTENT" },
  ];

  return (
    <div style={styles.container} data-testid="mobile-hero-3d">
      <Canvas
        camera={{ position: [0, 0.3, 5], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: false }}
        style={styles.canvas}
      >
        <Scene />
      </Canvas>

      <div style={styles.topBar}>
        <div style={styles.logoWrap}>
          <div style={styles.logoDot} />
          <span style={styles.logoText}>aktivate</span>
        </div>
        <span style={styles.topLabel}>AI AUTOMATION STUDIO</span>
      </div>

      <div style={styles.heroContent}>
        <div style={styles.label}>&gt; THE GROWTH STUDIO _</div>
        <h2 style={styles.headline}>
          Build the Engine.<br />
          Build the <span style={{ color: "#33ff33", textShadow: "0 0 14px rgba(51,255,51,0.3)" }}>Face.</span>
        </h2>
        <p style={styles.desc}>
          Automated ops. Automated presence. One studio for Insurance &amp; Logistics operators ready to scale.
        </p>
        <div style={styles.statsRow}>
          {stats.map((s) => (
            <div key={s.label}>
              <div style={styles.statN}>{s.value}</div>
              <div style={styles.statL}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.bottomBar}>
        <GameNav />
        <a
          href="#cta"
          data-testid="button-book-call-mobile-hero"
          onClick={(e) => {
            e.preventDefault();
            document.querySelector("#cta")?.scrollIntoView({ behavior: "smooth" });
          }}
          style={styles.ctaBtn}
        >
          BOOK A FREE CALL
        </a>
      </div>

      <div style={styles.scanlines} />
    </div>
  );
}
