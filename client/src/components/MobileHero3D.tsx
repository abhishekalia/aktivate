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
        float scrollZ = vPos.z + uTime * 1.5;
        float gridX = abs(fract(vPos.x * 2.0) - 0.5);
        float gridZ = abs(fract(scrollZ * 2.0) - 0.5);
        float lineX = smoothstep(0.03, 0.0, gridX);
        float lineZ = smoothstep(0.03, 0.0, gridZ);
        float grid = max(lineX, lineZ);
        float fade = smoothstep(10.0, 0.5, length(vec2(vPos.x, scrollZ)));
        float glow = grid * fade * 0.5;
        float horizon = smoothstep(-0.5, 2.0, vPos.z);
        glow *= horizon;
        gl_FragColor = vec4(uColor, glow);
      }
    `,
  }), []);

  useFrame((state) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.6, 0]}>
      <mesh>
        <planeGeometry args={[20, 20, 1, 1]} />
        <shaderMaterial ref={materialRef} args={[shader]} transparent side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function RetroMonitor({ springProps }: { springProps: any }) {
  return (
    <animated.group
      position={[0, 0.4, 0]}
      rotation-x={springProps.rotX}
      rotation-y={springProps.rotY}
      scale={1.1}
    >
      <RoundedBox args={[2.8, 2.1, 0.7]} radius={0.12} smoothness={4} position={[0, 0, 0]}>
        <meshStandardMaterial color="#2a2a2a" roughness={0.5} metalness={0.25} />
      </RoundedBox>

      <mesh position={[0, 0, 0.351]}>
        <planeGeometry args={[2.5, 1.75]} />
        <meshBasicMaterial color="#050a05" />
      </mesh>

      <mesh position={[0, 0, 0.355]}>
        <planeGeometry args={[2.5, 1.75]} />
        <meshBasicMaterial color="#33ff33" transparent opacity={0.03} />
      </mesh>

      <mesh position={[1.1, -0.82, 0.36]}>
        <circleGeometry args={[0.035, 12]} />
        <meshBasicMaterial color="#33ff33" />
      </mesh>

      <mesh position={[0, -1.15, 0]}>
        <boxGeometry args={[0.25, 0.25, 0.25]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.5} metalness={0.25} />
      </mesh>
      <mesh position={[0, -1.29, 0.02]}>
        <boxGeometry args={[0.8, 0.04, 0.45]} />
        <meshStandardMaterial color="#333" roughness={0.4} metalness={0.2} />
      </mesh>

      <pointLight position={[0, 0, 2]} color="#33ff33" intensity={1.2} distance={5} decay={2} />
      <pointLight position={[0, 0.5, 3]} color="#33ff33" intensity={0.3} distance={6} decay={2} />
    </animated.group>
  );
}

function FloatingParticles() {
  const count = 12;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() =>
    Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 6,
      y: (Math.random() - 0.5) * 4,
      z: (Math.random() - 0.5) * 2 - 2,
      speed: 0.15 + Math.random() * 0.3,
      offset: Math.random() * Math.PI * 2,
    })), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    particles.forEach((p, i) => {
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.offset) * 0.3,
        p.y + Math.cos(t * p.speed * 0.7 + p.offset) * 0.2,
        p.z
      );
      dummy.scale.setScalar(0.004 + Math.sin(t * 2 + p.offset) * 0.002);
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
    rotX: pointer.y * 0.06,
    rotY: pointer.x * 0.08,
    config: { mass: 2, tension: 120, friction: 30 },
  });

  return (
    <>
      <color attach="background" args={["#050508"]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 3, 5]} intensity={0.4} color="#ffffff" />
      <directionalLight position={[-1, 1, 3]} intensity={0.15} color="#33ff33" />
      <SynthwaveGrid />
      <Suspense fallback={null}>
        <RetroMonitor springProps={springProps} />
      </Suspense>
      <FloatingParticles />
      <EffectComposer>
        <Noise opacity={0.04} />
        <Vignette eskil={false} offset={0.1} darkness={0.85} />
      </EffectComposer>
    </>
  );
}

function CRTScreen() {
  const [glitchActive, setGlitchActive] = useState(false);

  useEffect(() => {
    const scheduleGlitch = () => {
      const delay = 2000 + Math.random() * 5000;
      const timer = setTimeout(() => {
        setGlitchActive(true);
        setTimeout(() => setGlitchActive(false), 100 + Math.random() * 200);
        scheduleGlitch();
      }, delay);
      return timer;
    };
    const t = scheduleGlitch();
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={crt.wrapper} data-testid="crt-screen-content">
      <div style={{
        ...crt.content,
        transform: glitchActive ? `translateX(${Math.random() > 0.5 ? 3 : -3}px) skewX(${Math.random() * 2 - 1}deg)` : 'none',
      }}>
        <div style={crt.label}>&gt; THE GROWTH STUDIO _</div>
        <h2 style={crt.headline}>
          Build the<br />Engine.<br />Build the{" "}
          <span style={crt.accent}>Face.</span>
        </h2>
        <div style={crt.divider} />
        <p style={crt.desc}>
          Automated ops. Automated presence.<br />
          One studio for Insurance &amp; Logistics.
        </p>
        <div style={crt.statsRow}>
          <div style={crt.stat}><span style={crt.statVal}>70%</span><span style={crt.statLbl}>OPS SAVED</span></div>
          <div style={crt.stat}><span style={crt.statVal}>2-4wk</span><span style={crt.statLbl}>BUILD TIME</span></div>
          <div style={crt.stat}><span style={crt.statVal}>5x</span><span style={crt.statLbl}>CONTENT</span></div>
        </div>
        <div style={crt.cursor}>█</div>
      </div>

      <div style={crt.scanlines} />
      <div style={{
        ...crt.glitchBar,
        opacity: glitchActive ? 0.6 : 0,
        top: glitchActive ? `${20 + Math.random() * 60}%` : '50%',
      }} />
    </div>
  );
}

const crt: Record<string, React.CSSProperties> = {
  wrapper: {
    position: "absolute",
    top: "5%",
    left: "10%",
    right: "10%",
    bottom: "34%",
    zIndex: 5,
    overflow: "hidden",
    borderRadius: 4,
    pointerEvents: "none",
  },
  content: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "12% 10%",
    transition: "transform 0.05s",
    position: "relative",
    zIndex: 2,
  },
  label: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 8,
    color: "#33ff33",
    letterSpacing: "0.15em",
    marginBottom: 10,
    textTransform: "uppercase" as const,
    opacity: 0.6,
  },
  headline: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1.15,
    color: "#33ff33",
    margin: "0 0 8px",
    textShadow: "0 0 20px rgba(51,255,51,0.3), 0 0 60px rgba(51,255,51,0.1)",
  },
  accent: {
    color: "#66ff66",
    fontStyle: "italic",
    textShadow: "0 0 25px rgba(51,255,51,0.5)",
  },
  divider: {
    width: 40,
    height: 1,
    background: "rgba(51,255,51,0.3)",
    margin: "6px 0 8px",
  },
  desc: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 8,
    lineHeight: 1.8,
    color: "rgba(51,255,51,0.5)",
    margin: "0 0 12px",
  },
  statsRow: {
    display: "flex",
    gap: 16,
  },
  stat: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
  },
  statVal: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 14,
    fontWeight: 700,
    color: "#33ff33",
    textShadow: "0 0 10px rgba(51,255,51,0.3)",
  },
  statLbl: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 6,
    color: "rgba(51,255,51,0.35)",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  cursor: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    color: "#33ff33",
    marginTop: 8,
    animation: "blink-cursor 0.8s step-end infinite",
    opacity: 0.7,
  },
  scanlines: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 3px)",
    zIndex: 3,
  },
  glitchBar: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 3,
    background: "rgba(51,255,51,0.4)",
    zIndex: 4,
    transition: "opacity 0.02s",
    mixBlendMode: "screen" as const,
  },
};

const navItems = [
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
    background: "#030305",
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
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: "0 20px 24px",
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
};

export default function MobileHero3D() {
  return (
    <div style={styles.container} data-testid="mobile-hero-3d">
      <Canvas
        camera={{ position: [0, 0.2, 4.2], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: false }}
        style={styles.canvas}
      >
        <Scene />
      </Canvas>

      <CRTScreen />

      <div style={styles.topBar}>
        <div style={styles.logoWrap}>
          <div style={styles.logoDot} />
          <span style={styles.logoText}>aktivate</span>
        </div>
        <span style={styles.topLabel}>AI AUTOMATION STUDIO</span>
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
    </div>
  );
}
