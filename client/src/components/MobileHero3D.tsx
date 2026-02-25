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
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.8, 0]}>
      <mesh>
        <planeGeometry args={[24, 24, 1, 1]} />
        <shaderMaterial ref={materialRef} args={[shader]} transparent side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function RetroMonitor({ springProps }: { springProps: any }) {
  return (
    <animated.group
      position={[0, 0, 0]}
      rotation-x={springProps.rotX}
      rotation-y={springProps.rotY}
    >
      <RoundedBox args={[3.6, 2.8, 0.6]} radius={0.1} smoothness={4} position={[0, 0, 0]}>
        <meshStandardMaterial color="#1e1e1e" roughness={0.6} metalness={0.3} />
      </RoundedBox>

      <mesh position={[0, 0.05, 0.31]}>
        <planeGeometry args={[3.2, 2.35]} />
        <meshBasicMaterial color="#040a04" />
      </mesh>

      <mesh position={[0, -1.52, 0]}>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[0, -1.63, 0]}>
        <boxGeometry args={[0.7, 0.03, 0.4]} />
        <meshStandardMaterial color="#222" roughness={0.5} metalness={0.2} />
      </mesh>

      <mesh position={[1.4, -1.1, 0.31]}>
        <circleGeometry args={[0.03, 12]} />
        <meshBasicMaterial color="#33ff33" />
      </mesh>

      <pointLight position={[0, 0, 2.5]} color="#33ff33" intensity={1.5} distance={6} decay={2} />
    </animated.group>
  );
}

function Starfield() {
  const count = 300;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const stars = useMemo(() =>
    Array.from({ length: count }, () => {
      const isBright = Math.random() < 0.15;
      return {
        x: (Math.random() - 0.5) * 20,
        y: (Math.random() - 0.5) * 14,
        z: -2 - Math.random() * 10,
        baseScale: isBright ? (0.02 + Math.random() * 0.025) : (0.005 + Math.random() * 0.012),
        twinkleSpeed: 1.5 + Math.random() * 5,
        offset: Math.random() * Math.PI * 2,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.5) * 0.3,
      };
    }), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    stars.forEach((s, i) => {
      let x = s.x + t * s.speedX;
      let y = s.y + t * s.speedY;
      x = ((x + 10) % 20) - 10;
      y = ((y + 7) % 14) - 7;
      dummy.position.set(x, y, s.z);
      const twinkle = 0.4 + 0.6 * Math.sin(t * s.twinkleSpeed + s.offset);
      dummy.scale.setScalar(s.baseScale * twinkle);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#33ff33" transparent opacity={0.6} toneMapped={false} />
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
    rotX: pointer.y * 0.05,
    rotY: pointer.x * 0.07,
    config: { mass: 2, tension: 120, friction: 30 },
  });

  return (
    <>
      <color attach="background" args={["#020204"]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 3, 5]} intensity={0.4} />
      <directionalLight position={[-1, 1, 3]} intensity={0.15} color="#33ff33" />
      <SynthwaveGrid />
      <Suspense fallback={null}>
        <RetroMonitor springProps={springProps} />
      </Suspense>
      <Starfield />
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
      const delay = 2000 + Math.random() * 4000;
      const timer = setTimeout(() => {
        setGlitchActive(true);
        setTimeout(() => setGlitchActive(false), 80 + Math.random() * 150);
        scheduleGlitch();
      }, delay);
      return timer;
    };
    const t = scheduleGlitch();
    return () => clearTimeout(t);
  }, []);

  const handleNavClick = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={crt.wrapper} data-testid="crt-screen-content">
      <div style={{
        ...crt.inner,
        transform: glitchActive ? `translateX(${Math.random() > 0.5 ? 2 : -2}px) skewX(${Math.random() * 1.5 - 0.75}deg)` : 'none',
      }}>
        <div style={crt.top}>
          <div style={crt.label}>&gt; THE GROWTH STUDIO _</div>
          <h2 style={crt.headline}>
            Build the<br />Engine.<br />Build the{" "}
            <span style={crt.accent}>Face.</span>
          </h2>
          <p style={crt.desc}>
            Automated ops. Automated presence.<br />
            One studio for Insurance &amp; Logistics.
          </p>
          <div style={crt.statsRow}>
            {[
              { v: "70%", l: "OPS SAVED" },
              { v: "2-4wk", l: "BUILD TIME" },
              { v: "5x", l: "CONTENT" },
            ].map((s) => (
              <div key={s.l} style={crt.stat}>
                <span style={crt.statVal}>{s.v}</span>
                <span style={crt.statLbl}>{s.l}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={crt.bottom}>
          <div style={crt.navCol}>
            {[
              { label: "THE SYSTEM", href: "#system" },
              { label: "RESULTS", href: "#results" },
              { label: "WHO IT'S FOR", href: "#for-who" },
              { label: "ABOUT", href: "#about" },
            ].map((item) => (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                style={crt.navBtn}
              >
                <span style={{ color: "#33ff33", opacity: 0.4, marginRight: 4 }}>&gt;</span>
                {item.label}
              </button>
            ))}
          </div>
          <a
            href="#cta"
            data-testid="button-book-call-mobile-hero"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector("#cta")?.scrollIntoView({ behavior: "smooth" });
            }}
            style={crt.ctaBtn}
          >
            BOOK A FREE CALL
          </a>
        </div>
      </div>

      <div style={crt.scanlines} />
      <div style={{
        ...crt.glitchBar,
        opacity: glitchActive ? 0.5 : 0,
        top: glitchActive ? `${15 + Math.random() * 70}%` : '50%',
      }} />
    </div>
  );
}

const crt: Record<string, React.CSSProperties> = {
  wrapper: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -52%)",
    width: "72vw",
    maxWidth: 360,
    aspectRatio: "3.2 / 2.35",
    zIndex: 5,
    overflow: "hidden",
    borderRadius: 2,
  },
  inner: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "8% 8% 6%",
    position: "relative",
    zIndex: 2,
    transition: "transform 0.04s",
  },
  top: {
    display: "flex",
    flexDirection: "column" as const,
  },
  label: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 7,
    color: "#33ff33",
    letterSpacing: "0.15em",
    marginBottom: 6,
    opacity: 0.6,
  },
  headline: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1.15,
    color: "#33ff33",
    margin: "0 0 6px",
    textShadow: "0 0 15px rgba(51,255,51,0.25), 0 0 40px rgba(51,255,51,0.08)",
  },
  accent: {
    color: "#66ff66",
    fontStyle: "italic",
    textShadow: "0 0 20px rgba(51,255,51,0.4)",
  },
  desc: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 7,
    lineHeight: 1.7,
    color: "rgba(51,255,51,0.45)",
    margin: "0 0 8px",
  },
  statsRow: {
    display: "flex",
    gap: 14,
  },
  stat: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 1,
  },
  statVal: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 12,
    fontWeight: 700,
    color: "#33ff33",
    textShadow: "0 0 8px rgba(51,255,51,0.3)",
  },
  statLbl: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 5,
    color: "rgba(51,255,51,0.3)",
    letterSpacing: "0.08em",
  },
  bottom: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  navCol: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 0,
  },
  navBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontFamily: "'Press Start 2P', 'DM Mono', monospace",
    fontSize: 5,
    letterSpacing: "0.04em",
    textAlign: "left" as const,
    padding: "3px 0",
    color: "#1a8c1a",
    transition: "color 0.15s",
    pointerEvents: "auto" as const,
  },
  ctaBtn: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 7,
    letterSpacing: "0.06em",
    color: "#000",
    background: "#33ff33",
    border: "none",
    padding: "6px 10px",
    textDecoration: "none",
    textTransform: "uppercase" as const,
    fontWeight: 700,
    boxShadow: "0 0 12px rgba(51,255,51,0.25)",
    pointerEvents: "auto" as const,
    whiteSpace: "nowrap" as const,
  },
  scanlines: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 1px, transparent 3px)",
    zIndex: 3,
  },
  glitchBar: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    background: "rgba(51,255,51,0.35)",
    zIndex: 4,
    transition: "opacity 0.02s",
    mixBlendMode: "screen" as const,
  },
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100%",
    height: "100dvh",
    position: "relative",
    overflow: "hidden",
    background: "#020204",
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
};

export default function MobileHero3D() {
  return (
    <div style={styles.container} data-testid="mobile-hero-3d">
      <Canvas
        camera={{ position: [0, 0.3, 4], fov: 45 }}
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
    </div>
  );
}
