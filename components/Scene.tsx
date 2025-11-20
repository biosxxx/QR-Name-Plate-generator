import React, { useEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Center, RoundedBox, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { PlaqueConfig, MaterialType } from '../types';
import { generatePlaqueTexture } from '../utils/canvasGenerator';

// Fix for TypeScript errors where R3F intrinsic elements are not recognized
declare global {
  namespace JSX {
    interface IntrinsicElements {
      meshPhysicalMaterial: any;
      meshStandardMaterial: any;
      ambientLight: any;
      spotLight: any;
      pointLight: any;
      group: any;
    }
  }
}

interface SceneProps {
  config: PlaqueConfig;
  onTextureReady: (modules: boolean[][], canvas: HTMLCanvasElement) => void;
}

const PlaqueModel: React.FC<{ config: PlaqueConfig; onTextureReady: any }> = ({ config, onTextureReady }) => {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const mesh = React.useRef<THREE.Mesh>(null);

  // Debounce texture generation
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const result = await generatePlaqueTexture(
          config.text, 
          config.qrUrl, 
          config.width, 
          config.height, 
          config.border
        );
        
        const tex = new THREE.CanvasTexture(result.canvas);
        tex.anisotropy = 16;
        tex.colorSpace = THREE.SRGBColorSpace;
        setTexture(tex);
        
        // Notify parent of new QR data for export
        onTextureReady(result.qrModules, result.canvas);
      } catch (e) {
        console.error("Texture gen error", e);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [config.text, config.qrUrl, config.border, config.width, config.height, onTextureReady]);

  // Derived Material Properties
  const materialProps = useMemo(() => {
    const bumpScale = 0.05;
    const common = {
      roughnessMap: texture,
      bumpMap: texture,
      bumpScale: bumpScale,
      envMapIntensity: 1
    };

    switch (config.material) {
      case MaterialType.GOLD:
        return {
          ...common,
          color: '#FFD700',
          metalness: 1.0,
          roughness: 0.15,
          clearcoat: 0.8
        };
      case MaterialType.COPPER:
        return {
          ...common,
          color: '#B87333',
          metalness: 0.9,
          roughness: 0.3,
          clearcoat: 0.5
        };
      case MaterialType.GRANITE:
        return {
          ...common,
          color: '#222222',
          metalness: 0.1,
          roughness: 0.8,
          bumpScale: -0.05, // Engraving goes in
          clearcoat: 0.3
        };
      case MaterialType.STEEL:
      default:
        return {
          ...common,
          color: '#e5e7eb',
          metalness: 0.9,
          roughness: 0.2,
          clearcoat: 0.4
        };
    }
  }, [config.material, texture]);

  return (
    <Center>
      <RoundedBox 
        ref={mesh}
        args={[config.width / 10, config.height / 10, config.depth / 10]} // Convert mm to cm for 3D scene scale
        radius={config.radius / 10} 
        smoothness={4}
      >
        {texture && (
           <meshPhysicalMaterial 
             {...materialProps}
             // For the metalness map, we want the engraved parts to be less shiny if it's metal
             metalnessMap={config.material !== MaterialType.GRANITE ? texture : undefined}
           />
        )}
        {!texture && <meshStandardMaterial color="gray" />}
      </RoundedBox>
    </Center>
  );
};

export const Scene: React.FC<SceneProps> = (props) => {
  return (
    <div className="w-full h-full min-h-[400px] rounded-2xl overflow-hidden bg-gradient-to-b from-gray-800 to-gray-900 shadow-2xl relative">
        <div className="absolute top-4 left-4 z-10 bg-black/30 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono text-white/50 pointer-events-none">
            Interactive 3D Preview
        </div>
      <Canvas shadows camera={{ position: [0, 0, 25], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        <Environment preset="city" />
        
        <group>
           <PlaqueModel {...props} />
        </group>

        <ContactShadows position={[0, -10, 0]} opacity={0.4} scale={40} blur={2} far={10} />
        <OrbitControls minPolarAngle={0} maxPolarAngle={Math.PI / 1.5} />
      </Canvas>
    </div>
  );
};