import { Suspense, useRef, useMemo, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { Text, useTexture } from "@react-three/drei";
import { EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { useSpring, animated } from "@react-spring/three";
import * as THREE from "three";

function SynthwaveGrid() {
  const gridRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const shader = useMemo(() => ({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color("#33ff33") },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPos;
      void main() {
        vUv = uv;
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;
      varying vec3 vPos;
      void main() {
        float gridX = abs(fract(vPos.x * 2.0) - 0.5);
        float gridZ = abs(fract(vPos.z * 2.0) - 0.5);
        float lineX = smoothstep(0.02, 0.0, gridX);
        float lineZ = smoothstep(0.02, 0.0, gridZ);
        float grid = max(lineX, lineZ);
        float fade = smoothstep(8.0, 1.0, length(vPos.xz));
        float pulse = 0.6 + 0.4 * sin(uTime * 0.5 + vPos.z * 0.5);
        float alpha = grid * fade * pulse * 0.5;
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
    <group ref={gridRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.8, 0]}>
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

function IMacBillboard({ springProps }: { springProps: any }) {
  const texture = useTexture("/imac-front.png");
  const meshRef = useRef<THREE.Mesh>(null);

  const aspect = useMemo(() => {
    if (texture.image) {
      return texture.image.width / texture.image.height;
    }
    return 1;
  }, [texture]);

  const height = 3.2;
  const width = height * aspect;

  return (
    <animated.mesh
      ref={meshRef}
      position={[0, 0.1, 0]}
      rotation-x={springProps.rotX}
      rotation-y={springProps.rotY}
    >
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.01} />
    </animated.mesh>
  );
}

function BackgroundText() {
  return (
    <Text
      position={[0, 0.3, -2]}
      fontSize={2.2}
      letterSpacing={0.15}
      font="https://fonts.gstatic.com/s/spacegrotesk/v16/V8mDoQDjQSkFtoMM3T6r8E7mPb54C_k3HqUtEw.woff"
      color="#33ff33"
      fillOpacity={0}
      strokeWidth={0.02}
      strokeColor="#33ff33"
      strokeOpacity={0.12}
      anchorX="center"
      anchorY="middle"
    >
      AKTIVATE
    </Text>
  );
}

function FloatingParticles() {
  const count = 30;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 8,
      y: (Math.random() - 0.5) * 4,
      z: (Math.random() - 0.5) * 4 - 1,
      speed: 0.2 + Math.random() * 0.5,
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
      dummy.scale.setScalar(0.008 + Math.sin(t * 2 + p.offset) * 0.004);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#33ff33" transparent opacity={0.4} />
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
    rotX: pointer.y * 0.12,
    rotY: pointer.x * 0.15,
    config: { mass: 2, tension: 120, friction: 30 },
  });

  return (
    <>
      <color attach="background" args={["#050508"]} />
      <ambientLight intensity={0.5} />
      <BackgroundText />
      <SynthwaveGrid />
      <Suspense fallback={null}>
        <IMacBillboard springProps={springProps} />
      </Suspense>
      <FloatingParticles />
      <EffectComposer>
        <Noise opacity={0.06} />
        <Vignette eskil={false} offset={0.2} darkness={0.8} />
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
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        left: 20,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
      data-testid="mobile-hero-nav"
    >
      {navItems.map((item, i) => (
        <button
          key={item.href}
          onClick={() => handleClick(item.href)}
          onPointerEnter={() => setHoveredIdx(i)}
          onPointerLeave={() => setHoveredIdx(null)}
          data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "'Press Start 2P', 'DM Mono', monospace",
            fontSize: 9,
            letterSpacing: "0.08em",
            color: hoveredIdx === i ? "#33ff33" : "#888",
            textAlign: "left",
            padding: "6px 0",
            transition: "color 0.15s",
            textShadow: hoveredIdx === i ? "0 0 8px rgba(51,255,51,0.5)" : "none",
            animation: hoveredIdx === i ? "glitch-flicker 0.15s steps(2) infinite" : "none",
            position: "relative",
          }}
        >
          <span style={{ marginRight: 8, color: "#33ff33", opacity: 0.5 }}>&gt;</span>
          {item.label}
          <span
            style={{
              position: "absolute",
              inset: 0,
              background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)",
              pointerEvents: "none",
            }}
          />
        </button>
      ))}
    </div>
  );
}

function CTAOverlay() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        right: 20,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
      }}
    >
      <a
        href="#cta"
        data-testid="button-book-call-mobile-hero"
        onClick={(e) => {
          e.preventDefault();
          document.querySelector("#cta")?.scrollIntoView({ behavior: "smooth" });
        }}
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10,
          letterSpacing: "0.06em",
          color: "#000",
          background: "#33ff33",
          border: "1px solid #33ff33",
          padding: "10px 18px",
          textDecoration: "none",
          textTransform: "uppercase",
          fontWeight: 600,
          boxShadow: "0 0 16px rgba(51,255,51,0.3)",
        }}
      >
        BOOK A FREE CALL
      </a>
    </div>
  );
}

function TopOverlay() {
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 20,
        right: 20,
        zIndex: 10,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#33ff33",
            boxShadow: "0 0 6px rgba(51,255,51,0.6)",
          }}
        />
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 13,
            fontWeight: 700,
            color: "#e0e0e0",
            letterSpacing: "0.04em",
          }}
        >
          aktivate
        </span>
      </div>
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 9,
          color: "#555",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        AI AUTOMATION STUDIO
      </div>
    </div>
  );
}

function HeroTextOverlay() {
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: 20,
        transform: "translateY(-50%)",
        zIndex: 10,
        pointerEvents: "none",
        maxWidth: 200,
      }}
    >
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 9,
          color: "#33ff33",
          letterSpacing: "0.1em",
          marginBottom: 8,
          textTransform: "uppercase",
        }}
      >
        &gt; THE GROWTH STUDIO _
      </div>
      <h2
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 22,
          fontWeight: 700,
          lineHeight: 1.15,
          color: "#e0e0e0",
          margin: 0,
        }}
      >
        Build the
        <br />
        Engine.
        <br />
        Build the <span style={{ color: "#33ff33", textShadow: "0 0 16px rgba(51,255,51,0.3)" }}>Face.</span>
      </h2>
    </div>
  );
}

function StatsOverlay() {
  const stats = [
    { value: "70%", label: "OPS TIME SAVED" },
    { value: "2-4wk", label: "BUILD TIME" },
    { value: "5x", label: "CONTENT OUTPUT" },
  ];

  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        right: 16,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        alignItems: "flex-end",
      }}
    >
      {stats.map((s) => (
        <div key={s.label} style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 18,
              fontWeight: 700,
              color: "#33ff33",
              lineHeight: 1.2,
            }}
          >
            {s.value}
          </div>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 7,
              color: "#555",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginTop: 1,
            }}
          >
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MobileHero3D() {
  return (
    <div
      style={{
        width: "100%",
        height: "100dvh",
        position: "relative",
        overflow: "hidden",
        background: "#050508",
      }}
      data-testid="mobile-hero-3d"
    >
      <Canvas
        camera={{ position: [0, 0.5, 4.5], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: false }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Scene />
      </Canvas>
      <TopOverlay />
      <HeroTextOverlay />
      <StatsOverlay />
      <GameNav />
      <CTAOverlay />
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 3px)",
          zIndex: 20,
        }}
      />
    </div>
  );
}
