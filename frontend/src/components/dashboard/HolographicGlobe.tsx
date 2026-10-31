'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RotateCw, AlertTriangle, Eye, Shield, Activity } from 'lucide-react';

interface HolographicGlobeProps {
  className?: string;
  modelUrl?: string;
  autoRotate?: boolean;
}

export function HolographicGlobe({
  className = '',
  modelUrl = '/models/earth_hologram.glb',
  autoRotate = true,
}: HolographicGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(autoRotate);
  const [webglAvailable, setWebglAvailable] = useState(true);

  // References to keep across re-renders
  const controlsRef = useRef<OrbitControls | null>(null);

  // Toggle auto-rotation manually
  const toggleRotation = () => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = !controlsRef.current.autoRotate;
      setIsRotating(controlsRef.current.autoRotate);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // 0. Check WebGL availability
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      setWebglAvailable(false);
      setLoading(false);
      return;
    }

    const container = containerRef.current;
    let width = container.clientWidth || 600;
    let height = container.clientHeight || 500;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 15);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // 2. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.7;
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 50;
    controlsRef.current = controls;

    // 3. Lighting (Atmospheric Cyber Hologram Aesthetic)
    const ambientLight = new THREE.AmbientLight(0x0ea5e9, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x38bdf8, 2.2);
    keyLight.position.set(12, 15, 18);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x0284c7, 1.4);
    fillLight.position.set(-12, -10, -10);
    scene.add(fillLight);

    const cyanRim = new THREE.PointLight(0x00f0ff, 3.5, 40);
    cyanRim.position.set(0, 8, 12);
    scene.add(cyanRim);

    const blueBack = new THREE.PointLight(0x3b82f6, 3.0, 40);
    blueBack.position.set(0, -8, -12);
    scene.add(blueBack);

    // 4. Subtle Holographic Ring Atmosphere
    const ringGeo = new THREE.RingGeometry(5.2, 5.25, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2.3;
    scene.add(ringMesh);

    const outerRingGeo = new THREE.RingGeometry(6.0, 6.04, 64);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.15,
    });
    const outerRingMesh = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRingMesh.rotation.x = Math.PI / 2.1;
    scene.add(outerRingMesh);

    // 5. GLTF Model Loading
    let mixer: THREE.AnimationMixer | null = null;
    let modelGroup: THREE.Group | null = null;
    let reqId: number = 0;
    const clock = new THREE.Clock();

    const loader = new GLTFLoader();

    // Primary path, with fallback to root if needed
    const loadModel = (url: string, isFallback = false) => {
      loader.load(
        url,
        (gltf) => {
          modelGroup = gltf.scene;

          // Compute bounding box and center model
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());

          // Center geometry
          gltf.scene.position.x -= center.x;
          gltf.scene.position.y -= center.y;
          gltf.scene.position.z -= center.z;

          // Scale and frame camera appropriately
          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const targetScale = 6.5 / maxDim;
          gltf.scene.scale.set(targetScale, targetScale, targetScale);

          // Enhance materials for holographic feel
          gltf.scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              if (mesh.material) {
                const materials = Array.isArray(mesh.material)
                  ? mesh.material
                  : [mesh.material];
                materials.forEach((mat) => {
                  if (mat instanceof THREE.MeshStandardMaterial) {
                    mat.metalness = Math.max(mat.metalness, 0.4);
                    mat.roughness = Math.min(mat.roughness, 0.5);
                    if (mat.emissive) {
                      mat.emissiveIntensity = Math.max(mat.emissiveIntensity, 0.6);
                    }
                  }
                });
              }
            }
          });

          scene.add(gltf.scene);

          // Setup Animation if available (e.g. 'Take 01')
          if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(gltf.scene);
            gltf.animations.forEach((clip) => {
              const action = mixer!.clipAction(clip);
              action.play();
            });
          }

          setLoading(false);
          setError(null);
        },
        undefined,
        (err) => {
          if (!isFallback && url !== '/earth_hologram.glb') {
            // Attempt fallback to root url
            loadModel('/earth_hologram.glb', true);
          } else {
            console.error('Failed to load GLTF model:', err);
            setError('Unable to load holographic globe model.');
            setLoading(false);
          }
        }
      );
    };

    loadModel(modelUrl);

    // 6. Animation Loop
    const animate = () => {
      reqId = requestAnimationFrame(animate);

      const delta = clock.getDelta();

      if (mixer) {
        mixer.update(delta);
      }

      // Slowly rotate decorative rings
      ringMesh.rotation.z += 0.003;
      outerRingMesh.rotation.z -= 0.002;

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // 7. Responsive Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });

    resizeObserver.observe(container);

    // 8. Cleanup on Unmount
    return () => {
      cancelAnimationFrame(reqId);
      resizeObserver.disconnect();
      controls.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Dispose geometries and materials
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else if (mesh.material) {
            mesh.material.dispose();
          }
        }
      });

      ringGeo.dispose();
      ringMat.dispose();
      outerRingGeo.dispose();
      outerRingMat.dispose();
      renderer.dispose();
    };
  }, [modelUrl, autoRotate]);

  if (!webglAvailable) {
    return (
      <div className="flex flex-col items-center justify-center h-96 p-8 text-center bg-card/40 rounded-2xl border border-border/80">
        <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
        <h4 className="text-sm font-semibold text-foreground">
          WebGL Acceleration Not Available
        </h4>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Your browser or device does not have hardware-accelerated WebGL
          enabled to render the interactive 3D Holographic Globe.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-full min-h-[460px] md:min-h-[520px] lg:min-h-[560px] rounded-2xl overflow-hidden bg-gradient-to-b from-[#050b18] via-[#040813] to-[#02050c] border border-blue-500/20 shadow-2xl shadow-blue-950/40 select-none ${className}`}
    >
      {/* Background Holographic Cyber Grid / Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(14,165,233,0.12)_0%,_transparent_65%)] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0ea5e908_1px,transparent_1px),linear-gradient(to_bottom,#0ea5e908_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none -z-10" />

      {/* Top Controls Overlay */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-500/30 backdrop-blur-md text-[11px] font-mono text-cyan-400 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>HOLOGRAPHIC THREAT SPHERE</span>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          onClick={toggleRotation}
          title={isRotating ? 'Pause Rotation' : 'Resume Auto-Rotation'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all backdrop-blur-md border ${
            isRotating
              ? 'bg-blue-600/20 text-cyan-300 border-blue-500/40'
              : 'bg-muted/40 text-muted-foreground border-border hover:text-foreground'
          }`}
        >
          <RotateCw
            className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`}
            style={{ animationDuration: '6s' }}
          />
          <span className="text-[11px] font-mono hidden sm:inline">
            {isRotating ? 'AUTOROTATE ON' : 'PAUSED'}
          </span>
        </button>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#050b18]/80 backdrop-blur-sm">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            <div
              className="absolute inset-2 rounded-full border-2 border-blue-500/20 border-b-blue-400 animate-spin"
              style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
            />
            <Activity className="w-6 h-6 text-cyan-400 animate-pulse" />
          </div>
          <p className="mt-4 text-xs font-mono text-cyan-400 tracking-wider">
            INITIALIZING 3D HOLOGRAPHIC GLOBE...
          </p>
          <p className="text-[10px] text-muted-foreground mt-1 font-mono">
            Loading interactive cybersecurity telemetry model
          </p>
        </div>
      )}

      {/* Error Fallback */}
      {error && !loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-[#050b18]/90">
          <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
          <h4 className="text-xs font-bold text-foreground">{error}</h4>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-xs font-mono">
            Verify earth_hologram.glb is placed in /public/models/
          </p>
        </div>
      )}

      {/* 3D Canvas Mount Point */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Bottom Hint */}
      <div className="absolute bottom-3 right-4 z-10 pointer-events-none">
        <span className="text-[10px] font-mono text-muted-foreground/60">
          DRAG TO ROTATE • SCROLL TO ZOOM
        </span>
      </div>
    </div>
  );
}
export default HolographicGlobe;

