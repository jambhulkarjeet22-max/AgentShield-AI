'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Battlefield3DProps {
  simulationState: 'IDLE' | 'ATTACKING' | 'DEFENDING' | 'BLOCKED' | 'BREACHED';
  activeScenario?: string;
}

export function Battlefield3D({ simulationState, activeScenario }: Battlefield3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070b14, 0.035);

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 480;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 14, 22);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x3b82f6, 1.2);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    const redLight = new THREE.PointLight(0xef4444, 2, 20);
    redLight.position.set(-8, 5, -4);
    scene.add(redLight);

    const blueLight = new THREE.PointLight(0x10b981, 2, 20);
    blueLight.position.set(8, 5, 4);
    scene.add(blueLight);

    // 3. Futuristic Grid Floor
    const gridHelper = new THREE.GridHelper(30, 30, 0x1e3a8a, 0x0f172a);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    // 4. Nodes (Red Attacker, Target AI, Blue Shield, Tool Nodes)
    const nodeGroup = new THREE.Group();
    scene.add(nodeGroup);

    // Red Attacker Node (Left)
    const redGeo = new THREE.OctahedronGeometry(1.4, 0);
    const redMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x991b1b,
      wireframe: true,
      roughness: 0.2,
      metalness: 0.8,
    });
    const redMesh = new THREE.Mesh(redGeo, redMat);
    redMesh.position.set(-8, 2, -2);
    nodeGroup.add(redMesh);

    // Target AI Node (Center)
    const targetGeo = new THREE.IcosahedronGeometry(1.6, 0);
    const targetMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      roughness: 0.1,
      metalness: 0.9,
    });
    const targetMesh = new THREE.Mesh(targetGeo, targetMat);
    targetMesh.position.set(0, 2, 0);
    nodeGroup.add(targetMesh);

    // Blue Defense Shield (Hemisphere over Target/Tools)
    const shieldGeo = new THREE.SphereGeometry(3.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.35,
      wireframe: true,
      side: THREE.DoubleSide,
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shieldMesh.position.set(0, 0, 0);
    nodeGroup.add(shieldMesh);

    // Protected Tool Nodes (Arranged below target)
    const toolPositions = [
      { name: 'FILES', pos: new THREE.Vector3(-4, 0, 5), color: 0x8b5cf6 },
      { name: 'EMAIL', pos: new THREE.Vector3(-1.5, 0, 6.5), color: 0x3b82f6 },
      { name: 'BROWSER', pos: new THREE.Vector3(1.5, 0, 6.5), color: 0x06b6d4 },
      { name: 'PAYMENTS', pos: new THREE.Vector3(4, 0, 5), color: 0x10b981 },
    ];

    const toolMeshes: THREE.Mesh[] = [];
    toolPositions.forEach((tp) => {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshStandardMaterial({
        color: tp.color,
        roughness: 0.3,
        metalness: 0.7,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(tp.pos);
      nodeGroup.add(mesh);
      toolMeshes.push(mesh);
    });

    // Beam / Particle Connection Path
    const beamCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-8, 2, -2),
      new THREE.Vector3(-4, 3, -1),
      new THREE.Vector3(0, 2, 0),
    ]);
    const beamGeo = new THREE.TubeGeometry(beamCurve, 30, 0.08, 8, false);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.7,
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    nodeGroup.add(beamMesh);

    // Particle pulse along beam
    const particleGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const particleMesh = new THREE.Mesh(particleGeo, particleMat);
    nodeGroup.add(particleMesh);

    // 5. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Rotate nodes
      redMesh.rotation.x = time * 0.8;
      redMesh.rotation.y = time * 0.6;
      targetMesh.rotation.y = time * 0.5;
      targetMesh.rotation.z = time * 0.3;

      toolMeshes.forEach((tm, idx) => {
        tm.rotation.y = time * 0.7 + idx;
        tm.position.y = Math.sin(time * 2 + idx) * 0.2;
      });

      // Pulse shield
      if (simulationState === 'BLOCKED' || simulationState === 'DEFENDING') {
        shieldMesh.scale.setScalar(1 + Math.sin(time * 6) * 0.08);
        shieldMat.color.setHex(0x10b981);
        shieldMat.opacity = 0.6;
      } else if (simulationState === 'BREACHED') {
        shieldMat.color.setHex(0xef4444);
        shieldMat.opacity = 0.8;
      } else {
        shieldMesh.scale.setScalar(1 + Math.sin(time * 2) * 0.03);
        shieldMat.color.setHex(0x3b82f6);
        shieldMat.opacity = 0.3;
      }

      // Move particle along attack trajectory
      const t = (time * 0.7) % 1;
      const pt = beamCurve.getPoint(t);
      particleMesh.position.copy(pt);

      renderer.render(scene, camera);
    };

    animate();

    // 6. Resize Handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [simulationState]);

  return (
    <div className="relative w-full h-[460px] bg-slate-950/70 rounded-xl overflow-hidden border border-border/80 shadow-2xl">
      <div ref={containerRef} className="w-full h-full" />

      {/* Overlay Battlefield HUD */}
      <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-mono text-xs uppercase font-bold text-cyan-400 tracking-wider">
            3D Cyber Battlefield
          </span>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground">
          {activeScenario ? `Active Scenario: ${activeScenario}` : 'Awaiting scenario dispatch'}
        </span>
      </div>

      <div className="absolute top-4 right-4 pointer-events-none flex items-center gap-2">
        <span
          className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${
            simulationState === 'BLOCKED' || simulationState === 'DEFENDING'
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              : simulationState === 'ATTACKING'
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse'
              : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
          }`}
        >
          SIMULATION STATUS: {simulationState}
        </span>
      </div>

      {/* Legend at bottom of 3D Canvas */}
      <div className="absolute bottom-3 left-4 right-4 pointer-events-none flex flex-wrap items-center justify-between text-[11px] font-mono text-muted-foreground bg-black/40 backdrop-blur-sm p-2 rounded-lg border border-border/40">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500" /> Red Attacker
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400" /> Target AI
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> Blue Shield
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Mock Tools
          </span>
        </div>
        <span className="text-muted-foreground/80">Real-Time WebGL Arena</span>
      </div>
    </div>
  );
}

