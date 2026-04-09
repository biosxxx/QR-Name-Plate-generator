import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { MaterialType, PlaqueConfig } from '../types';
import { computePlaqueCadGeometry } from '../cad/geometry/compute-plaque-geometry';
import { buildQrModules } from '../utils/canvasGenerator';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import helvetikerBold from 'three/examples/fonts/helvetiker_bold.typeface.json';

interface SceneProps {
  config: PlaqueConfig;
  onTextureReady?: () => void;
}

const font = new FontLoader().parse(helvetikerBold);

const createRoundedRectShape = (width: number, height: number, radius: number) => {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  const clampedRadius = Math.min(radius, Math.min(width, height) / 2);

  shape.moveTo(x + clampedRadius, y);
  shape.lineTo(x + width - clampedRadius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + clampedRadius);
  shape.lineTo(x + width, y + height - clampedRadius);
  shape.quadraticCurveTo(x + width, y + height, x + width - clampedRadius, y + height);
  shape.lineTo(x + clampedRadius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - clampedRadius);
  shape.lineTo(x, y + clampedRadius);
  shape.quadraticCurveTo(x, y, x + clampedRadius, y);

  return shape;
};

const buildBorderGeometry = (
  width: number,
  height: number,
  radius: number,
  inset: number,
  stroke: number,
  featureDepth: number,
) => {
  const outer = createRoundedRectShape(width - inset * 2, height - inset * 2, Math.max(radius - inset, 0));
  const inner = createRoundedRectShape(
    width - (inset + stroke) * 2,
    height - (inset + stroke) * 2,
    Math.max(radius - inset - stroke, 0),
  );
  outer.holes.push(inner);

  const geometry = new THREE.ExtrudeGeometry(outer, {
    depth: featureDepth,
    bevelEnabled: false,
    curveSegments: 24,
  });
  geometry.translate(0, 0, -featureDepth / 2);
  return geometry;
};

const buildTextGeometry = (config: PlaqueConfig, textMaxWidth: number, textCenterY: number, featureDepth: number) => {
  if (!config.text.trim()) {
    return null;
  }

  let fontSize = Math.max((config.height * 160) / 1024 / 10, 0.6);
  let geometry = new THREE.ExtrudeGeometry(font.generateShapes(config.text.trim(), fontSize), {
    depth: featureDepth,
    bevelEnabled: false,
    curveSegments: 8,
  });
  geometry.computeBoundingBox();
  const width = geometry.boundingBox ? geometry.boundingBox.max.x - geometry.boundingBox.min.x : 0;

  if (width > textMaxWidth) {
    const scaleFactor = textMaxWidth / width;
    geometry.scale(scaleFactor, scaleFactor, 1);
    fontSize *= scaleFactor;
  }

  geometry.computeBoundingBox();
  if (geometry.boundingBox) {
    const centerX = (geometry.boundingBox.min.x + geometry.boundingBox.max.x) / 2;
    const centerY = (geometry.boundingBox.min.y + geometry.boundingBox.max.y) / 2;
    geometry.translate(-centerX, -centerY + textCenterY, -featureDepth / 2);
  }

  return geometry;
};

const getBaseColors = (material: MaterialType) => {
  switch (material) {
    case MaterialType.COPPER:
      return {
        front: '#b87333',
        side: '#99602d',
        feature: '#101114',
      };
    case MaterialType.GRANITE:
      return {
        front: '#2b2d31',
        side: '#1d1f22',
        feature: '#d8dadd',
      };
    case MaterialType.GOLD:
      return {
        front: '#c9a227',
        side: '#a17d1d',
        feature: '#17120a',
      };
    case MaterialType.STEEL:
    default:
      return {
        front: '#d4d7dd',
        side: '#a7adb7',
        feature: '#111317',
      };
  }
};

const CameraRig: React.FC<{ width: number; height: number; controlsRef: React.RefObject<any> }> = ({
  width,
  height,
  controlsRef,
}) => {
  const { camera } = useThree();

  useEffect(() => {
    const maxSide = Math.max(width, height);
    const distance = maxSide * 1.68 + 4;
    camera.position.set(distance * 0.36, distance * 0.18, distance);
    camera.lookAt(0, 0, 0);
    controlsRef.current?.target.set(0, 0, 0);
    controlsRef.current?.update();
  }, [camera, controlsRef, height, width]);

  return null;
};

const PlaqueModel: React.FC<{ config: PlaqueConfig; onTextureReady?: () => void }> = ({ config, onTextureReady }) => {
  const controlsRef = useRef<any>(null);
  const cadGeometry = useMemo(
    () => computePlaqueCadGeometry(config, buildQrModules(config.qrUrl)),
    [config],
  );
  const colors = useMemo(() => getBaseColors(config.material), [config.material]);

  const baseGeometry = useMemo(() => {
    const shape = createRoundedRectShape(cadGeometry.width / 10, cadGeometry.height / 10, cadGeometry.cornerRadius / 10);
    const extrude = new THREE.ExtrudeGeometry(shape, {
      depth: cadGeometry.depth / 10,
      bevelEnabled: false,
      curveSegments: 48,
    });
    extrude.center();
    return extrude;
  }, [cadGeometry.cornerRadius, cadGeometry.depth, cadGeometry.height, cadGeometry.width]);

  const featureDepth = cadGeometry.engravingDepth / 10;
  const topSurfaceZ = cadGeometry.depth / 20 + featureDepth / 2 + 0.001;

  const borderGeometry = useMemo(() => {
    if (!cadGeometry.border) {
      return null;
    }

    return buildBorderGeometry(
      cadGeometry.width / 10,
      cadGeometry.height / 10,
      cadGeometry.cornerRadius / 10,
      cadGeometry.border.inset / 10,
      cadGeometry.border.stroke / 10,
      featureDepth,
    );
  }, [cadGeometry.border, cadGeometry.cornerRadius, cadGeometry.height, cadGeometry.width, featureDepth]);

  const textGeometry = useMemo(() => {
    if (!cadGeometry.text) {
      return null;
    }

    return buildTextGeometry(
      config,
      cadGeometry.text.maxWidth / 10,
      cadGeometry.text.centerY / 10,
      featureDepth,
    );
  }, [cadGeometry.text, config, featureDepth]);

  const qrModuleGeometry = useMemo(() => {
    if (!cadGeometry.qrModules.length) {
      return null;
    }

    const sample = cadGeometry.qrModules[0];
    return new THREE.BoxGeometry(sample.width / 10, sample.height / 10, featureDepth);
  }, [cadGeometry.qrModules, featureDepth]);

  const qrMatrices = useMemo(() => {
    const matrix = new THREE.Matrix4();
    return cadGeometry.qrModules.map((module) => {
      matrix.makeTranslation(module.centerX / 10, module.centerY / 10, topSurfaceZ);
      return matrix.clone();
    });
  }, [cadGeometry.qrModules, topSurfaceZ]);

  useEffect(() => {
    let firstFrame = 0;
    let secondFrame = 0;
    let readyTimer = 0;

    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        readyTimer = window.setTimeout(() => onTextureReady?.(), 80);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(readyTimer);
    };
  }, [cadGeometry, onTextureReady]);

  useEffect(
    () => () => {
      baseGeometry.dispose();
      borderGeometry?.dispose();
      textGeometry?.dispose();
      qrModuleGeometry?.dispose();
    },
    [baseGeometry, borderGeometry, qrModuleGeometry, textGeometry],
  );

  return (
    <>
      <CameraRig width={cadGeometry.width / 10} height={cadGeometry.height / 10} controlsRef={controlsRef} />

      <group rotation={[-0.04, -0.26, -0.02]}>
        <mesh geometry={baseGeometry} castShadow receiveShadow>
          <meshPhysicalMaterial
            attach="material-0"
            color={colors.front}
            metalness={config.material === MaterialType.GRANITE ? 0.12 : 0.92}
            roughness={config.material === MaterialType.GRANITE ? 0.82 : config.material === MaterialType.COPPER ? 0.32 : 0.22}
            clearcoat={config.material === MaterialType.GRANITE ? 0.06 : 0.28}
            clearcoatRoughness={config.material === MaterialType.GRANITE ? 0.48 : 0.16}
            envMapIntensity={config.material === MaterialType.GRANITE ? 0.55 : 1}
          />
          <meshPhysicalMaterial
            attach="material-1"
            color={colors.side}
            metalness={config.material === MaterialType.GRANITE ? 0.04 : 0.84}
            roughness={config.material === MaterialType.GRANITE ? 0.92 : 0.34}
            clearcoat={0.08}
            clearcoatRoughness={0.35}
            envMapIntensity={config.material === MaterialType.GRANITE ? 0.35 : 0.72}
          />
        </mesh>

        {borderGeometry ? (
          <mesh geometry={borderGeometry} position={[0, 0, topSurfaceZ]} castShadow receiveShadow>
            <meshPhysicalMaterial color={colors.feature} metalness={0.22} roughness={0.54} clearcoat={0.08} clearcoatRoughness={0.25} />
          </mesh>
        ) : null}

        {textGeometry ? (
          <mesh geometry={textGeometry} position={[0, 0, topSurfaceZ]} castShadow receiveShadow>
            <meshPhysicalMaterial color={colors.feature} metalness={0.24} roughness={0.48} clearcoat={0.12} clearcoatRoughness={0.2} />
          </mesh>
        ) : null}

        {qrModuleGeometry ? <QrInstances matrices={qrMatrices} geometry={qrModuleGeometry} color={colors.feature} /> : null}
      </group>

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.06}
        minDistance={6}
        maxDistance={50}
      />
    </>
  );
};

const QrInstances: React.FC<{ matrices: THREE.Matrix4[]; geometry: THREE.BufferGeometry; color: string }> = ({
  matrices,
  geometry,
  color,
}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color, metalness: 0.24, roughness: 0.5, clearcoat: 0.08, clearcoatRoughness: 0.22 }),
    [color],
  );

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    matrices.forEach((matrix, index) => {
      ref.current!.setMatrixAt(index, matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  }, [matrices]);

  useEffect(() => () => material.dispose(), [material]);

  return <instancedMesh ref={ref} args={[geometry, material, matrices.length]} castShadow receiveShadow />;
};

export const Scene: React.FC<SceneProps> = ({ config, onTextureReady }) => {
  const [isCanvasReady, setIsCanvasReady] = useState(false);

  useEffect(() => {
    setIsCanvasReady(false);
  }, [config.border, config.depth, config.height, config.material, config.qrUrl, config.radius, config.text, config.width]);

  const handleSceneReady = useCallback(() => {
    setIsCanvasReady(true);
    onTextureReady?.();
  }, [onTextureReady]);

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-[16px] bg-[radial-gradient(circle_at_20%_20%,rgba(49,64,52,0.18),transparent_30%),radial-gradient(circle_at_80%_85%,rgba(35,39,49,0.24),transparent_36%),#020606] md:h-[520px] lg:h-[620px]">
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-200"
        style={{ opacity: isCanvasReady ? 0 : 1 }}
      />
      <Canvas
        shadows
        dpr={[1, 2]}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          opacity: isCanvasReady ? 1 : 0,
          transition: 'opacity 180ms ease',
        }}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0, 24], fov: 38, near: 0.1, far: 200 }}
      >
        <color attach="background" args={['#020606']} />
        <ambientLight intensity={0.72} />
        <directionalLight position={[8, 10, 14]} intensity={1.45} castShadow />
        <directionalLight position={[-6, -2, 10]} intensity={0.45} />
        <Suspense fallback={null}>
          <Environment preset="city" />
        </Suspense>
        <PlaqueModel config={config} onTextureReady={handleSceneReady} />
      </Canvas>
    </div>
  );
};
