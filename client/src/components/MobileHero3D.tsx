import { Suspense, useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import { EffectComposer, Bloom, Noise, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

function ScrollingGrid() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.z = (state.clock.elapsedTime * 2.5) % 2;
    }
  });

  return (
    <group ref={groupRef}>
      <Grid
        args={[80, 80]}
        cellSize={2}
        cellThickness={1.2}
        cellColor="#33ff33"
        sectionSize={6}
        sectionThickness={1.8}
        sectionColor="#44ff66"
        fadeDistance={40}
        fadeStrength={1.5}
        infiniteGrid
        position={[0, 0, 0]}
      />
    </group>
  );
}

function Starfield() {
  const count = 300;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const stars = useMemo(() =>
    Array.from({ length: count }, () => {
      const isBig = Math.random() < 0.1;
      return {
        x: (Math.random() - 0.5) * 40,
        y: 1 + Math.random() * 15,
        z: -30 + Math.random() * 50,
        baseScale: isBig ? (0.04 + Math.random() * 0.06) : (0.008 + Math.random() * 0.02),
        twinkleSpeed: 1 + Math.random() * 5,
        offset: Math.random() * Math.PI * 2,
        speedX: (Math.random() - 0.5) * 0.2,
        speedY: (Math.random() - 0.5) * 0.08,
      };
    }), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    stars.forEach((s, i) => {
      let x = s.x + t * s.speedX;
      let y = s.y + t * s.speedY;
      x = ((x % 40) + 40) % 40 - 20;
      y = ((y % 16) + 16) % 16;
      dummy.position.set(x, y, s.z);
      const tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.offset));
      dummy.scale.setScalar(s.baseScale * tw);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#aaffaa" transparent opacity={0.8} toneMapped={false} />
    </instancedMesh>
  );
}

function SceneSetup() {
  const { scene } = useThree();
  useEffect(() => {
    scene.fog = new THREE.FogExp2(0x0d0015, 0.025);
  }, [scene]);
  return null;
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#0d0015"]} />
      <SceneSetup />

      <pointLight position={[0, 8, -5]} color="#7700ff" intensity={2} distance={30} decay={1.5} />
      <pointLight position={[0, -1, 5]} color="#33ff33" intensity={0.5} distance={15} decay={2} />
      <ambientLight intensity={0.08} color="#220033" />

      <ScrollingGrid />
      <Starfield />

      <EffectComposer>
        <Bloom
          intensity={1.2}
          luminanceThreshold={0.1}
          luminanceSmoothing={0.4}
          mipmapBlur
        />
        <Noise opacity={0.06} />
        <Vignette eskil={false} offset={0.05} darkness={0.65} />
      </EffectComposer>
    </>
  );
}

function GlitchBar() {
  const [bar, setBar] = useState<{ top: number; h: number } | null>(null);

  useEffect(() => {
    const loop = () => {
      const delay = 2500 + Math.random() * 5000;
      const timer = setTimeout(() => {
        setBar({ top: 10 + Math.random() * 80, h: 1 + Math.random() * 3 });
        setTimeout(() => setBar(null), 50 + Math.random() * 100);
        loop();
      }, delay);
      return timer;
    };
    const t = loop();
    return () => clearTimeout(t);
  }, []);

  if (!bar) return null;
  return (
    <div style={{
      position: "absolute", left: 0, right: 0,
      top: `${bar.top}%`, height: bar.h,
      background: "rgba(51,255,51,0.15)", zIndex: 15,
      pointerEvents: "none", mixBlendMode: "screen",
    }} />
  );
}

const handleNav = (href: string) => {
  const el = document.querySelector(href);
  if (el) el.scrollIntoView({ behavior: "smooth" });
};

export default function MobileHero3D() {
  return (
    <div style={ui.container} data-testid="mobile-hero-3d">
      <Canvas
        camera={{ position: [0, 1.8, 6], fov: 65, near: 0.1, far: 100, rotation: [-0.15, 0, 0] }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: false }}
        style={ui.canvas}
        onCreated={({ camera }) => {
          camera.lookAt(0, 0.5, -10);
        }}
      >
        <Scene />
      </Canvas>

      <div style={ui.scanlines} />
      <GlitchBar />

      <div style={ui.topBar}>
        <div style={ui.logoWrap}>
          <div style={ui.logoDot} />
          <span style={ui.logoText}>aktivate</span>
        </div>
        <span style={ui.topLabel}>AI AUTOMATION STUDIO</span>
      </div>

      <div style={ui.content}>
        <div style={ui.label}>&gt; THE GROWTH STUDIO _</div>
        <h2 style={ui.headline}>
          Build the<br />Engine.<br />Build the{" "}
          <span style={ui.accent}>Face.</span>
        </h2>
        <p style={ui.desc}>
          Automated ops. Automated presence.<br />
          One studio built for Insurance &amp; Logistics operators.
        </p>
        <div style={ui.statsRow}>
          {[
            { v: "70%", l: "OPS SAVED" },
            { v: "2-4wk", l: "BUILD TIME" },
            { v: "5x", l: "CONTENT" },
          ].map((stat) => (
            <div key={stat.l} style={ui.stat}>
              <span style={ui.statVal}>{stat.v}</span>
              <span style={ui.statLbl}>{stat.l}</span>
            </div>
          ))}
        </div>

        <div style={ui.navCol}>
          {[
            { label: "THE SYSTEM", href: "#system" },
            { label: "RESULTS", href: "#results" },
            { label: "WHO IT'S FOR", href: "#for-who" },
            { label: "ABOUT", href: "#about" },
          ].map((item) => (
            <button
              key={item.href}
              onClick={() => handleNav(item.href)}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              style={ui.navBtn}
            >
              <span style={{ color: "#33ff33", opacity: 0.4, marginRight: 5 }}>&gt;</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const ui: Record<string, React.CSSProperties> = {
  container: {
    width: "100%",
    height: "100dvh",
    position: "relative",
    overflow: "hidden",
    background: "#0d0015",
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
    background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 3px)",
    zIndex: 12,
  },
  topBar: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    zIndex: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 20px",
  },
  logoWrap: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  logoDot: {
    width: 6, height: 6,
    borderRadius: "50%",
    background: "#33ff33",
    boxShadow: "0 0 8px rgba(51,255,51,0.6)",
  },
  logoText: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 12, fontWeight: 700,
    color: "#e0e0e0",
    letterSpacing: "0.04em",
  },
  topLabel: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 7, color: "#444",
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
  },
  content: {
    position: "absolute",
    bottom: 20,
    left: 20, right: 20,
    zIndex: 10,
  },
  label: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10, color: "#33ff33",
    letterSpacing: "0.15em",
    marginBottom: 10, opacity: 0.6,
  },
  headline: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 30, fontWeight: 700,
    lineHeight: 1.1, color: "#e0e0e0",
    margin: "0 0 10px",
    textShadow: "0 0 30px rgba(51,255,51,0.12), 0 2px 4px rgba(0,0,0,0.7)",
  },
  accent: {
    color: "#33ff33",
    fontStyle: "italic",
    textShadow: "0 0 20px rgba(51,255,51,0.5), 0 0 50px rgba(51,255,51,0.15)",
  },
  desc: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10, lineHeight: 1.7,
    color: "#666", margin: "0 0 14px",
  },
  statsRow: {
    display: "flex", gap: 22,
    marginBottom: 16,
  },
  stat: {
    display: "flex",
    flexDirection: "column" as const, gap: 2,
  },
  statVal: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 17, fontWeight: 700,
    color: "#33ff33",
    textShadow: "0 0 10px rgba(51,255,51,0.3)",
  },
  statLbl: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 7, color: "#555",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  navCol: {
    display: "flex",
    flexDirection: "column" as const, gap: 0,
    pointerEvents: "auto" as const,
  },
  navBtn: {
    background: "none", border: "none",
    cursor: "pointer",
    fontFamily: "'Press Start 2P', 'DM Mono', monospace",
    fontSize: 7, letterSpacing: "0.05em",
    textAlign: "left" as const,
    padding: "4px 0", color: "#555",
    transition: "color 0.15s",
    pointerEvents: "auto" as const,
  },
};
