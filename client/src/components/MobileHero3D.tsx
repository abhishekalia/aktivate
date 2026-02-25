import { Suspense, useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, Noise, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

function SynthwaveFloor() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const shader = useMemo(() => ({
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vWorldPos;

      void main() {
        vec3 col = vec3(0.0);

        float scrollZ = vWorldPos.z + uTime * 3.0;

        float gx = abs(fract(vWorldPos.x * 0.5) - 0.5);
        float gz = abs(fract(scrollZ * 0.5) - 0.5);

        float lineX = smoothstep(0.03, 0.005, gx);
        float lineZ = smoothstep(0.03, 0.005, gz);

        float grid = max(lineX, lineZ);

        float distFade = 1.0 - smoothstep(2.0, 25.0, length(vWorldPos.xz));
        distFade = max(distFade, 0.0);

        float glowStr = grid * distFade;

        vec3 green = vec3(0.2, 1.0, 0.2);
        col = green * glowStr * 1.2;

        float edgeGlow = grid * distFade * 0.4;
        col += green * edgeGlow;

        gl_FragColor = vec4(col, glowStr * 0.9 + edgeGlow * 0.3);
      }
    `,
  }), []);

  useFrame((state) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
      <planeGeometry args={[60, 60, 1, 1]} />
      <shaderMaterial ref={matRef} args={[shader]} transparent side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function Starfield() {
  const count = 350;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const stars = useMemo(() =>
    Array.from({ length: count }, () => {
      const isBig = Math.random() < 0.1;
      return {
        x: (Math.random() - 0.5) * 30,
        y: Math.random() * 12 - 2,
        z: -2 - Math.random() * 15,
        baseScale: isBig ? (0.03 + Math.random() * 0.04) : (0.006 + Math.random() * 0.015),
        twinkleSpeed: 1 + Math.random() * 5,
        offset: Math.random() * Math.PI * 2,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.15,
      };
    }), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    stars.forEach((s, i) => {
      let x = s.x + t * s.speedX;
      let y = s.y + t * s.speedY;
      x = ((x % 30) + 30) % 30 - 15;
      y = ((y % 14) + 14) % 14 - 2;
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
      <meshBasicMaterial color="#55ff55" transparent opacity={0.75} toneMapped={false} />
    </instancedMesh>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#000000"]} />
      <SynthwaveFloor />
      <Starfield />
      <EffectComposer>
        <Bloom
          intensity={0.6}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Noise opacity={0.03} />
        <Vignette eskil={false} offset={0.05} darkness={0.7} />
      </EffectComposer>
    </>
  );
}

function GlitchBar() {
  const [bar, setBar] = useState<{ top: number; h: number } | null>(null);

  useEffect(() => {
    const loop = () => {
      const delay = 2000 + Math.random() * 5000;
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
      background: "rgba(51,255,51,0.2)", zIndex: 15,
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
        camera={{ position: [0, 2.5, 8], fov: 55, near: 0.1, far: 100 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: false }}
        style={ui.canvas}
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
      </div>

      <div style={ui.bottomBar}>
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
        <a
          href="#cta"
          data-testid="button-book-call-mobile-hero"
          onClick={(e) => {
            e.preventDefault();
            document.querySelector("#cta")?.scrollIntoView({ behavior: "smooth" });
          }}
          style={ui.ctaBtn}
        >
          BOOK A FREE CALL
        </a>
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
    background: "#000",
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
    top: 0, left: 0, right: 0,
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
    top: "42%",
    left: 20, right: 20,
    transform: "translateY(-50%)",
    zIndex: 10,
    pointerEvents: "none",
  },
  label: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10, color: "#33ff33",
    letterSpacing: "0.15em",
    marginBottom: 12, opacity: 0.6,
  },
  headline: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 32, fontWeight: 700,
    lineHeight: 1.1, color: "#e0e0e0",
    margin: "0 0 12px",
    textShadow: "0 0 30px rgba(51,255,51,0.15), 0 2px 4px rgba(0,0,0,0.6)",
  },
  accent: {
    color: "#33ff33",
    fontStyle: "italic",
    textShadow: "0 0 25px rgba(51,255,51,0.5), 0 0 60px rgba(51,255,51,0.15)",
  },
  desc: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11, lineHeight: 1.7,
    color: "#666", margin: "0 0 16px",
  },
  statsRow: {
    display: "flex", gap: 22,
  },
  stat: {
    display: "flex",
    flexDirection: "column" as const, gap: 2,
  },
  statVal: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 18, fontWeight: 700,
    color: "#33ff33",
    textShadow: "0 0 12px rgba(51,255,51,0.3)",
  },
  statLbl: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 7, color: "#555",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    zIndex: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: "0 18px 20px",
  },
  navCol: {
    display: "flex",
    flexDirection: "column" as const, gap: 1,
  },
  navBtn: {
    background: "none", border: "none",
    cursor: "pointer",
    fontFamily: "'Press Start 2P', 'DM Mono', monospace",
    fontSize: 7, letterSpacing: "0.05em",
    textAlign: "left" as const,
    padding: "4px 0", color: "#555",
    transition: "color 0.15s",
  },
  ctaBtn: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 9, letterSpacing: "0.06em",
    color: "#000", background: "#33ff33",
    border: "none", padding: "10px 16px",
    textDecoration: "none",
    textTransform: "uppercase" as const,
    fontWeight: 700,
    boxShadow: "0 0 16px rgba(51,255,51,0.3)",
    whiteSpace: "nowrap" as const,
  },
};
