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
        float alpha = grid * fade * pulse * 0.35;
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
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
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

function ScreenShader() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const shader = useMemo(() => ({
    uniforms: { uTime: { value: 0 } },
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
        vec2 c = vUv - 0.5;
        float vig = 1.0 - dot(c, c) * 2.0;
        float scan = 0.92 + 0.08 * sin(vUv.y * 200.0 + uTime * 3.0);
        float flick = 0.96 + 0.04 * sin(uTime * 12.0);
        float brightness = vig * scan * flick;
        vec3 col = vec3(0.05, 0.15, 0.05) + vec3(0.0, 0.08, 0.02) * brightness;
        float textY = sin(vUv.y * 40.0 + uTime * 0.8) * 0.5 + 0.5;
        float textX = step(0.15, vUv.x) * step(vUv.x, 0.85);
        float textLine = step(0.92, textY) * textX * step(0.2, vUv.y) * step(vUv.y, 0.8);
        col += vec3(0.0, 0.25, 0.06) * textLine * 0.3;
        float cursor = step(0.14, vUv.x) * step(vUv.x, 0.18);
        cursor *= step(0.72, vUv.y) * step(vUv.y, 0.78);
        cursor *= step(0.5, sin(uTime * 4.0));
        col += vec3(0.1, 1.0, 0.3) * cursor * 0.4;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  }), []);

  useFrame((state) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return <shaderMaterial ref={matRef} args={[shader]} />;
}

function RetroMonitor({ springProps }: { springProps: any }) {
  return (
    <animated.group
      position={[0, 0.3, 0]}
      rotation-x={springProps.rotX}
      rotation-y={springProps.rotY}
      scale={0.9}
    >
      <RoundedBox args={[2.2, 1.7, 0.7]} radius={0.15} smoothness={4} position={[0, 0, 0]}>
        <meshStandardMaterial color="#1a1a1a" roughness={0.6} metalness={0.2} />
      </RoundedBox>

      <RoundedBox args={[1.9, 1.3, 0.02]} radius={0.06} smoothness={2} position={[0, 0.05, 0.36]}>
        <meshStandardMaterial color="#0a0a0a" roughness={0.9} />
      </RoundedBox>

      <mesh position={[0, 0.05, 0.37]}>
        <planeGeometry args={[1.75, 1.15]} />
        <ScreenShader />
      </mesh>

      <mesh position={[0.75, -0.6, 0.36]}>
        <circleGeometry args={[0.04, 16]} />
        <meshBasicMaterial color="#33ff33" />
      </mesh>

      <mesh position={[0, -0.95, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.3, 0.2, 0.3]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, -1.06, 0.02]}>
        <boxGeometry args={[0.9, 0.04, 0.5]} />
        <meshStandardMaterial color="#222" roughness={0.5} metalness={0.15} />
      </mesh>

      <pointLight position={[0, 0.1, 1.8]} color="#33ff33" intensity={0.8} distance={5} decay={2} />
    </animated.group>
  );
}

function FloatingParticles() {
  const count = 15;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 6,
      y: (Math.random() - 0.5) * 4,
      z: (Math.random() - 0.5) * 2 - 2,
      speed: 0.15 + Math.random() * 0.3,
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
      dummy.scale.setScalar(0.005 + Math.sin(t * 2 + p.offset) * 0.002);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#33ff33" transparent opacity={0.2} />
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
    rotX: pointer.y * 0.08,
    rotY: pointer.x * 0.1,
    config: { mass: 2, tension: 120, friction: 30 },
  });

  return (
    <>
      <color attach="background" args={["#050508"]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[2, 3, 4]} intensity={0.3} color="#ffffff" />
      <SynthwaveGrid />
      <Suspense fallback={null}>
        <RetroMonitor springProps={springProps} />
      </Suspense>
      <FloatingParticles />
      <EffectComposer>
        <Noise opacity={0.04} />
        <Vignette eskil={false} offset={0.1} darkness={0.8} />
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
            color: hoveredIdx === i ? "#33ff33" : "#555",
            textShadow: hoveredIdx === i ? "0 0 8px rgba(51,255,51,0.5)" : "none",
          }}
        >
          <span style={{ marginRight: 6, color: "#33ff33", opacity: 0.3 }}>&gt;</span>
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
    padding: "16px 20px",
  },
  logoWrap: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  logoDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#33ff33",
    boxShadow: "0 0 6px rgba(51,255,51,0.5)",
  },
  logoText: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    fontWeight: 700,
    color: "#e0e0e0",
    letterSpacing: "0.04em",
  },
  topLabel: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 7,
    color: "#333",
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
  },
  heroContent: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    zIndex: 10,
    pointerEvents: "none",
  },
  label: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 9,
    color: "#33ff33",
    letterSpacing: "0.12em",
    marginBottom: 8,
    textTransform: "uppercase" as const,
    opacity: 0.7,
  },
  headline: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 26,
    fontWeight: 700,
    lineHeight: 1.15,
    color: "#e0e0e0",
    margin: "0 0 10px",
  },
  desc: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    lineHeight: 1.7,
    color: "#555",
    margin: "0 0 14px",
    maxWidth: 260,
  },
  statsRow: {
    display: "flex",
    gap: 20,
  },
  statN: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 16,
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
    padding: "0 20px 18px",
  },
  gameNav: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 1,
  },
  navBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontFamily: "'Press Start 2P', 'DM Mono', monospace",
    fontSize: 6,
    letterSpacing: "0.06em",
    textAlign: "left" as const,
    padding: "4px 0",
    transition: "color 0.15s",
  },
  ctaBtn: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 8,
    letterSpacing: "0.06em",
    color: "#000",
    background: "#33ff33",
    border: "none",
    padding: "10px 14px",
    textDecoration: "none",
    textTransform: "uppercase" as const,
    fontWeight: 700,
    boxShadow: "0 0 14px rgba(51,255,51,0.2)",
  },
  scanlines: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 3px)",
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
        camera={{ position: [0, 0.5, 4.5], fov: 40 }}
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
          Build the <span style={{ color: "#33ff33", textShadow: "0 0 12px rgba(51,255,51,0.25)" }}>Face.</span>
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
