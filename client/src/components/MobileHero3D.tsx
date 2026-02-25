import { Suspense, useRef, useMemo, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
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
        float fade = smoothstep(12.0, 0.5, length(vec2(vPos.x, scrollZ)));
        float glow = grid * fade * 0.55;
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
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
      <mesh>
        <planeGeometry args={[30, 30, 1, 1]} />
        <shaderMaterial ref={materialRef} args={[shader]} transparent side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Starfield() {
  const count = 400;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const stars = useMemo(() =>
    Array.from({ length: count }, () => {
      const layer = Math.random();
      const isFar = layer < 0.5;
      const isMid = layer >= 0.5 && layer < 0.85;
      return {
        x: (Math.random() - 0.5) * 24,
        y: (Math.random() - 0.5) * 16,
        z: isFar ? (-4 - Math.random() * 8) : isMid ? (-1 - Math.random() * 3) : (-0.5 - Math.random() * 1),
        baseScale: isFar ? (0.008 + Math.random() * 0.012) : isMid ? (0.015 + Math.random() * 0.02) : (0.025 + Math.random() * 0.035),
        twinkleSpeed: 1 + Math.random() * 6,
        offset: Math.random() * Math.PI * 2,
        speedX: (Math.random() - 0.5) * (isFar ? 0.15 : isMid ? 0.3 : 0.5),
        speedY: (Math.random() - 0.5) * (isFar ? 0.08 : isMid ? 0.15 : 0.25),
      };
    }), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    stars.forEach((s, i) => {
      let x = s.x + t * s.speedX;
      let y = s.y + t * s.speedY;
      x = ((x % 24) + 24) % 24 - 12;
      y = ((y % 16) + 16) % 16 - 8;
      dummy.position.set(x, y, s.z);
      const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.offset));
      dummy.scale.setScalar(s.baseScale * twinkle);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#44ff44" transparent opacity={0.8} toneMapped={false} />
    </instancedMesh>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#020204"]} />
      <SynthwaveGrid />
      <Starfield />
      <EffectComposer>
        <Noise opacity={0.03} />
        <Vignette eskil={false} offset={0.05} darkness={0.75} />
      </EffectComposer>
    </>
  );
}

function GlitchOverlay() {
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    const loop = () => {
      const delay = 1500 + Math.random() * 4000;
      const timer = setTimeout(() => {
        setGlitch(true);
        setTimeout(() => setGlitch(false), 60 + Math.random() * 120);
        loop();
      }, delay);
      return timer;
    };
    const t = loop();
    return () => clearTimeout(t);
  }, []);

  if (!glitch) return null;

  return (
    <div style={{
      position: "absolute",
      left: 0,
      right: 0,
      top: `${10 + Math.random() * 80}%`,
      height: 2 + Math.random() * 4,
      background: "rgba(51,255,51,0.25)",
      zIndex: 15,
      pointerEvents: "none",
      mixBlendMode: "screen",
    }} />
  );
}

const handleNavClick = (href: string) => {
  const el = document.querySelector(href);
  if (el) el.scrollIntoView({ behavior: "smooth" });
};

export default function MobileHero3D() {
  return (
    <div style={s.container} data-testid="mobile-hero-3d">
      <Canvas
        camera={{ position: [0, 0.5, 5], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: false }}
        style={s.canvas}
      >
        <Scene />
      </Canvas>

      <div style={s.scanlines} />
      <GlitchOverlay />

      <div style={s.topBar}>
        <div style={s.logoWrap}>
          <div style={s.logoDot} />
          <span style={s.logoText}>aktivate</span>
        </div>
        <span style={s.topLabel}>AI AUTOMATION STUDIO</span>
      </div>

      <div style={s.content}>
        <div style={s.label}>&gt; THE GROWTH STUDIO _</div>
        <h2 style={s.headline}>
          Build the<br />Engine.<br />Build the{" "}
          <span style={s.accent}>Face.</span>
        </h2>
        <p style={s.desc}>
          Automated ops. Automated presence.<br />
          One studio built for Insurance &amp; Logistics operators.
        </p>
        <div style={s.statsRow}>
          {[
            { v: "70%", l: "OPS SAVED" },
            { v: "2-4wk", l: "BUILD TIME" },
            { v: "5x", l: "CONTENT" },
          ].map((stat) => (
            <div key={stat.l} style={s.stat}>
              <span style={s.statVal}>{stat.v}</span>
              <span style={s.statLbl}>{stat.l}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={s.bottomBar}>
        <div style={s.navCol}>
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
              style={s.navBtn}
            >
              <span style={{ color: "#33ff33", opacity: 0.4, marginRight: 5 }}>&gt;</span>
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
          style={s.ctaBtn}
        >
          BOOK A FREE CALL
        </a>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
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
    zIndex: 1,
  },
  scanlines: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 3px)",
    zIndex: 12,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
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
    boxShadow: "0 0 8px rgba(51,255,51,0.6)",
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
    fontSize: 7,
    color: "#444",
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
  },
  content: {
    position: "absolute",
    top: "50%",
    left: 20,
    right: 20,
    transform: "translateY(-55%)",
    zIndex: 10,
    pointerEvents: "none",
  },
  label: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    color: "#33ff33",
    letterSpacing: "0.15em",
    marginBottom: 12,
    opacity: 0.6,
  },
  headline: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 32,
    fontWeight: 700,
    lineHeight: 1.1,
    color: "#e0e0e0",
    margin: "0 0 12px",
    textShadow: "0 0 30px rgba(51,255,51,0.15), 0 2px 4px rgba(0,0,0,0.5)",
  },
  accent: {
    color: "#33ff33",
    fontStyle: "italic",
    textShadow: "0 0 25px rgba(51,255,51,0.4), 0 0 60px rgba(51,255,51,0.15)",
  },
  desc: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    lineHeight: 1.7,
    color: "#777",
    margin: "0 0 16px",
  },
  statsRow: {
    display: "flex",
    gap: 22,
  },
  stat: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
  },
  statVal: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 18,
    fontWeight: 700,
    color: "#33ff33",
    textShadow: "0 0 12px rgba(51,255,51,0.3)",
  },
  statLbl: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 7,
    color: "#555",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: "0 18px 20px",
  },
  navCol: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 1,
  },
  navBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontFamily: "'Press Start 2P', 'DM Mono', monospace",
    fontSize: 7,
    letterSpacing: "0.05em",
    textAlign: "left" as const,
    padding: "4px 0",
    color: "#555",
    transition: "color 0.15s, text-shadow 0.15s",
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
    fontWeight: 700,
    boxShadow: "0 0 16px rgba(51,255,51,0.25)",
    whiteSpace: "nowrap" as const,
  },
};
