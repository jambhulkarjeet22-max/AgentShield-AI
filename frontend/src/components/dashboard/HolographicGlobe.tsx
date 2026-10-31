'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  AlertTriangle,
  Activity,
  Radio,
  X,
} from 'lucide-react';
import { AuditLogEntry, CampaignResponse, GuardianDecisionRecord } from '@/types';
import { formatDate } from '@/lib/utils';

// =============================================================================
// Security Telemetry Node Taxonomy
// Real Agentra Architectural Gateways Mapped to Global Spherical Coordinates
// =============================================================================
export interface CyberNode {
  id: string;
  name: string;
  category: 'attacker' | 'target' | 'guardian' | 'tool' | 'sentinel';
  role: string;
  lat: number;
  lon: number;
  color: string;
  description: string;
}

const CYBER_NODES: CyberNode[] = [
  {
    id: 'redteam_nexus',
    name: 'Red Team Adversary Nexus',
    category: 'attacker',
    role: 'Adversarial Test Suite',
    lat: 37.77,
    lon: -122.41, // North America (San Francisco)
    color: '#ef4444',
    description: 'Autonomous multi-vector attack generator injecting adversarial prompts & policy bypass payloads.',
  },
  {
    id: 'target_core',
    name: 'Target AI Agent Sandbox',
    category: 'target',
    role: 'Autonomous Target Agent',
    lat: 51.50,
    lon: -0.12, // Western Europe (London)
    color: '#00f0ff',
    description: 'Monitored language model execution runtime executing business workflows under inspection.',
  },
  {
    id: 'guardian_shield',
    name: 'Blue Team Guardian',
    category: 'guardian',
    role: 'Real-Time Defense Boundary',
    lat: 50.11,
    lon: 8.68, // Central Europe (Frankfurt)
    color: '#10b981',
    description: 'Proactive 8-signal ML anomaly detector and intent alignment decision engine.',
  },
  {
    id: 'email_gateway',
    name: 'Email Tool Gateway',
    category: 'tool',
    role: 'Mock Email Tool Sandbox',
    lat: 35.68,
    lon: 139.76, // East Asia (Tokyo)
    color: '#38bdf8',
    description: 'Isolated messaging sandbox for read/send operations subjected to phishing & exfiltration tests.',
  },
  {
    id: 'payments_gateway',
    name: 'Payments & Financial Vault',
    category: 'tool',
    role: 'Transaction Sandbox',
    lat: 1.35,
    lon: 103.81, // Southeast Asia (Singapore)
    color: '#fbbf24',
    description: 'Simulated payment processing environment validating transaction limits & approval workflows.',
  },
  {
    id: 'filesystem_vault',
    name: 'Confidential File Vault',
    category: 'tool',
    role: 'Storage Sandbox',
    lat: -33.86,
    lon: 151.20, // Oceania (Sydney)
    color: '#818cf8',
    description: 'Multi-tier file access repository enforcing public, internal, and confidential access levels.',
  },
  {
    id: 'browser_node',
    name: 'Web Intelligence Sandbox',
    category: 'tool',
    role: 'Browser Tool Gateway',
    lat: -23.55,
    lon: -46.63, // South America (São Paulo)
    color: '#a855f7',
    description: 'Simulated external browsing environment monitored for secondary prompt injection & data leaks.',
  },
  {
    id: 'policy_sentinel',
    name: 'Policy & RBAC Sentinel',
    category: 'sentinel',
    role: 'Deterministic Policy Validator',
    lat: 59.33,
    lon: 18.06, // Nordic (Stockholm)
    color: '#06b6d4',
    description: 'Pre-execution permission matrix validating actor credentials and negative user constraints.',
  },
];

// Helper: Convert Lat/Lon to 3D Cartesian coordinates on sphere of radius R
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// =============================================================================
// Component Props
// =============================================================================
interface HolographicGlobeProps {
  className?: string;
  modelUrl?: string;
  autoRotate?: boolean;
  events?: AuditLogEntry[];
  campaigns?: CampaignResponse[];
  decisions?: GuardianDecisionRecord[];
  isLive?: boolean;
}

export function HolographicGlobe({
  className = '',
  modelUrl = '/models/earth_hologram.glb',
  events = [],
  campaigns = [],
  decisions = [],
  isLive = false,
}: HolographicGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webglAvailable, setWebglAvailable] = useState(true);
  const [filterMode, setFilterMode] = useState<'ALL' | 'ATTACKS' | 'DEFENSES'>('ALL');
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [activeTelemetryCount, setActiveTelemetryCount] = useState<number>(0);

  // Three.js References
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const arcsGroupRef = useRef<THREE.Group | null>(null);
  const shockwavesGroupRef = useRef<THREE.Group | null>(null);
  const nodesGroupRef = useRef<THREE.Group | null>(null);

  // Reset Camera View to Default Static Perspective
  const resetCamera = useCallback(() => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 0.25, 9.6);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, []);

  // =============================================================================
  // Main Three.js Scene Setup & Render Loop
  // =============================================================================
  useEffect(() => {
    if (!containerRef.current) return;

    // 0. Verify WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      setWebglAvailable(false);
      setLoading(false);
      return;
    }

    const container = containerRef.current;
    let width = container.clientWidth || 800;
    let height = container.clientHeight || 600;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    camera.position.set(0, 0.25, 9.6);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // 2. Controls: Position Static, Continuously Rotating, NOT Zoomable
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true; // Continuously rotate smoothly without stopping
    controls.autoRotateSpeed = 0.65;
    controls.enablePan = false; // Position static (cannot be shifted/dragged out of position)
    controls.enableZoom = false; // NOT zoomable for perfect stability
    controlsRef.current = controls;

    // 3. Cybernetic Lighting (Kaspersky / Radware Aesthetic)
    const ambientLight = new THREE.AmbientLight(0x061e3f, 1.4);
    scene.add(ambientLight);

    const primaryLight = new THREE.DirectionalLight(0x38bdf8, 2.6);
    primaryLight.position.set(10, 14, 15);
    scene.add(primaryLight);

    const counterLight = new THREE.DirectionalLight(0x0369a1, 1.8);
    counterLight.position.set(-12, -8, -12);
    scene.add(counterLight);

    const cyanPoint = new THREE.PointLight(0x00f0ff, 3.2, 50);
    cyanPoint.position.set(0, 10, 12);
    scene.add(cyanPoint);

    const blueBackPoint = new THREE.PointLight(0x1d4ed8, 2.8, 50);
    blueBackPoint.position.set(0, -10, -12);
    scene.add(blueBackPoint);

    // 4. Globe Dimensions (Calibrated for Perfect Alignment & Visibility)
    const GLOBE_RADIUS = 2.35;
    const ATMOSPHERE_RADIUS = GLOBE_RADIUS * 1.05;

    // Deep Midnight Core Sphere (Ocean Base)
    const coreGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 0.995, 64, 64);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x020817,
      roughness: 0.65,
      metalness: 0.45,
      emissive: 0x02122c,
      emissiveIntensity: 0.3,
    });
    const coreSphere = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreSphere);

    // 5. Kaspersky / Radware Atmospheric Glow (Realistic Soft Falloff - Zero Harsh Bands)
    const atmosphereVertexShader = `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    // Outer soft haze: fades to 0 at the outer boundary (no hard cutoff ring)
    const atmosphereFragmentShader = `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      uniform vec3 glowColor;
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        float d = max(dot(normal, viewDir), 0.0);
        float intensity = pow(d, 3.8);
        gl_FragColor = vec4(glowColor, intensity * 0.45);
      }
    `;

    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      uniforms: {
        glowColor: { value: new THREE.Color(0x00f0ff) },
      },
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });

    const atmosphereMesh = new THREE.Mesh(
      new THREE.SphereGeometry(ATMOSPHERE_RADIUS, 64, 64),
      atmosphereMat
    );
    scene.add(atmosphereMesh);

    // Inner rim glow for crisp holographic edge
    const innerRimFragmentShader = `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      uniform vec3 glowColor;
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        float rim = 1.0 - max(dot(normal, viewDir), 0.0);
        float intensity = pow(rim, 3.0);
        gl_FragColor = vec4(glowColor, intensity * 0.55);
      }
    `;

    const innerRimMat = new THREE.ShaderMaterial({
      vertexShader: atmosphereVertexShader,
      fragmentShader: innerRimFragmentShader,
      uniforms: {
        glowColor: { value: new THREE.Color(0x00f0ff) },
      },
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });

    const innerRimMesh = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.002, 64, 64),
      innerRimMat
    );
    scene.add(innerRimMesh);

    // 6. Ambient Digital Space Particle Constellation
    const particleCount = 450;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const radius = 5.0 + Math.random() * 6.5;
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(Math.random() * 2 - 1);
      particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = radius * Math.cos(phi);
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.04,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const spaceParticles = new THREE.Points(particleGeo, particleMat);
    scene.add(spaceParticles);

    // Telemetry Groups
    const nodesGroup = new THREE.Group();
    scene.add(nodesGroup);
    nodesGroupRef.current = nodesGroup;

    const arcsGroup = new THREE.Group();
    scene.add(arcsGroup);
    arcsGroupRef.current = arcsGroup;

    const shockwavesGroup = new THREE.Group();
    scene.add(shockwavesGroup);
    shockwavesGroupRef.current = shockwavesGroup;

    // 7. Render Cybersecurity Telemetry Nodes
    CYBER_NODES.forEach((node) => {
      const pos = latLonToVector3(node.lat, node.lon, GLOBE_RADIUS * 1.006);

      // Node Marker Core
      const markerGeo = new THREE.SphereGeometry(0.05, 16, 16);
      const markerMat = new THREE.MeshBasicMaterial({
        color: node.color,
      });
      const markerMesh = new THREE.Mesh(markerGeo, markerMat);
      markerMesh.position.copy(pos);
      markerMesh.userData = { node };

      // Node Pulse Halo
      const haloGeo = new THREE.RingGeometry(0.06, 0.10, 24);
      const haloMat = new THREE.MeshBasicMaterial({
        color: node.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.position.copy(pos);
      haloMesh.lookAt(new THREE.Vector3(0, 0, 0));

      nodesGroup.add(markerMesh);
      nodesGroup.add(haloMesh);
    });

    // 8. Load GLB Continents & Completely Strip ALL Rings & Orbit Meshes
    const loader = new GLTFLoader();

    loader.load(
      modelUrl,
      (gltf) => {
        // Completely strip all circles, rings, and icospheres from the model
        const toRemove: THREE.Object3D[] = [];
        gltf.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const name = child.name.toLowerCase();
            // ONLY keep the true earth continents mesh (terre)
            if (!name.includes('terre')) {
              toRemove.push(child);
            }
          }
        });
        toRemove.forEach((r) => {
          r.removeFromParent();
          if ((r as THREE.Mesh).geometry) {
            (r as THREE.Mesh).geometry.dispose();
          }
        });

        // Center directly on the Earth landmass geometry
        let earthMesh: THREE.Mesh | null = null;
        gltf.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && child.name.toLowerCase().includes('terre')) {
            earthMesh = child as THREE.Mesh;
          }
        });

        const targetWorldRadius = GLOBE_RADIUS;
        if (earthMesh) {
          const box = new THREE.Box3().setFromObject(earthMesh);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z) || 2.0;
          const scaleFactor = (targetWorldRadius * 2.0) / maxDim;
          gltf.scene.scale.set(scaleFactor, scaleFactor, scaleFactor);
        } else {
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z) || 1.0;
          const scaleFactor = (targetWorldRadius * 2.0) / maxDim;
          gltf.scene.scale.set(scaleFactor, scaleFactor, scaleFactor);
        }

        // Center model exactly on origin (0, 0, 0)
        const centerBox = new THREE.Box3().setFromObject(gltf.scene);
        const center = centerBox.getCenter(new THREE.Vector3());
        gltf.scene.position.x -= center.x;
        gltf.scene.position.y -= center.y;
        gltf.scene.position.z -= center.z;

        // Enhance continent materials with vibrant cyber cyan / electric blue
        gltf.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const name = mesh.name.toLowerCase();

            if (name.includes('terre')) {
              mesh.material = new THREE.MeshStandardMaterial({
                color: 0x0ea5e9,
                emissive: 0x00f0ff,
                emissiveIntensity: 0.7,
                roughness: 0.25,
                metalness: 0.7,
              });
            }
          }
        });

        scene.add(gltf.scene);
        setLoading(false);
        setError(null);
      },
      undefined,
      (err) => {
        console.warn('GLB asset load warning, falling back to procedural cyber globe:', err);
        // Procedural Continents Matrix Layer if GLB fails
        const dotCount = 1400;
        const dotGeo = new THREE.BufferGeometry();
        const dotPositions = new Float32Array(dotCount * 3);
        for (let i = 0; i < dotCount; i++) {
          const lat = (Math.random() - 0.5) * 160;
          const lon = (Math.random() - 0.5) * 360;
          const p = latLonToVector3(lat, lon, GLOBE_RADIUS * 1.004);
          dotPositions[i * 3] = p.x;
          dotPositions[i * 3 + 1] = p.y;
          dotPositions[i * 3 + 2] = p.z;
        }
        dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3));
        const dotMat = new THREE.PointsMaterial({
          color: 0x00f0ff,
          size: 0.05,
          transparent: true,
          opacity: 0.75,
        });
        const proceduralDots = new THREE.Points(dotGeo, dotMat);
        scene.add(proceduralDots);

        setLoading(false);
        setError(null);
      }
    );

    // 9. Animation Loop: Continuous Smooth Rotation & Radware Threat Path Updater
    let reqId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Slowly rotate background space particles
      spaceParticles.rotation.y += 0.0003;
      spaceParticles.rotation.x += 0.0001;

      // Pulse node halos
      nodesGroup.children.forEach((child, i) => {
        if ((child as THREE.Mesh).geometry instanceof THREE.RingGeometry) {
          const scale = 1.0 + Math.sin(elapsed * 3.0 + i) * 0.18;
          child.scale.set(scale, scale, scale);
        }
      });

      // Update active Radware threat arcs and particles
      if (arcsGroupRef.current) {
        arcsGroupRef.current.children.forEach((arcContainer) => {
          const data = arcContainer.userData;
          if (data && data.curve && data.particle) {
            data.progress += delta * data.speed;
            if (data.progress > 1.0) {
              data.progress = 0.0;
              triggerShockwave(data.targetPos, data.color);
            }
            const currentPos = data.curve.getPoint(data.progress);
            data.particle.position.copy(currentPos);
          }
        });
      }

      // Update and fade shockwaves
      if (shockwavesGroupRef.current) {
        for (let i = shockwavesGroupRef.current.children.length - 1; i >= 0; i--) {
          const shockwave = shockwavesGroupRef.current.children[i] as THREE.Mesh;
          const sData = shockwave.userData;
          if (sData) {
            sData.progress += delta * 1.8;
            const currentScale = 1.0 + sData.progress * 2.8;
            shockwave.scale.set(currentScale, currentScale, currentScale);

            const mat = shockwave.material as THREE.MeshBasicMaterial;
            if (mat) {
              mat.opacity = Math.max(0, 0.8 * (1.0 - sData.progress));
            }

            if (sData.progress >= 1.0) {
              shockwavesGroupRef.current.remove(shockwave);
              shockwave.geometry.dispose();
              if (Array.isArray(shockwave.material)) {
                shockwave.material.forEach((m) => m.dispose());
              } else {
                shockwave.material.dispose();
              }
            }
          }
        }
      }

      // Continuous rotation update
      controls.update();
      renderer.render(scene, camera);
    };

    // Helper: Shockwave Trigger
    function triggerShockwave(targetPos: THREE.Vector3, color: string) {
      if (!shockwavesGroupRef.current) return;
      const sGeo = new THREE.RingGeometry(0.05, 0.10, 24);
      const sMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const sMesh = new THREE.Mesh(sGeo, sMat);
      sMesh.position.copy(targetPos);
      sMesh.lookAt(new THREE.Vector3(0, 0, 0));
      sMesh.userData = { progress: 0.0 };
      shockwavesGroupRef.current.add(sMesh);
    }

    animate();

    // 10. Raycasting for Node / Threat Inspection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodesGroup.children, false);

      if (intersects.length > 0) {
        const hit = intersects.find((i) => i.object.userData?.node);
        if (hit && hit.object.userData?.node) {
          const node = hit.object.userData.node as CyberNode;
          const matchingEvent = events.find(
            (e) =>
              (e.tool && node.id.includes(e.tool.toLowerCase())) ||
              (e.actor_id && node.id.includes(e.actor_id.toLowerCase()))
          );
          setSelectedEvent({
            node,
            event: matchingEvent || null,
          });
        }
      }
    };

    renderer.domElement.addEventListener('click', handlePointerDown);

    // 11. Responsive Resize Observer
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

    // 12. Cleanup
    return () => {
      cancelAnimationFrame(reqId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('click', handlePointerDown);
      controls.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

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

      renderer.dispose();
    };
  }, [modelUrl]);

  // =============================================================================
  // Dynamic Real-Event to Radware Threat Arc Synchronisation
  // =============================================================================
  useEffect(() => {
    if (!arcsGroupRef.current || !sceneRef.current) return;
    const arcsGroup = arcsGroupRef.current;

    while (arcsGroup.children.length > 0) {
      const child = arcsGroup.children[0];
      arcsGroup.remove(child);
      child.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material?.dispose();
        }
      });
    }

    const GLOBE_RADIUS = 2.35;
    const nodeMap = new Map(CYBER_NODES.map((n) => [n.id, n]));

    const threatItems: {
      source: CyberNode;
      target: CyberNode;
      color: string;
      speed: number;
      type: 'attack' | 'defended' | 'agent' | 'warning' | 'breach';
      eventRef: any;
    }[] = [];

    // 1. Process Real Audit Logs
    events.slice(0, 8).forEach((log) => {
      let source = nodeMap.get('target_core')!;
      let target = nodeMap.get('guardian_shield')!;
      let color = '#00f0ff';
      let type: 'attack' | 'defended' | 'agent' | 'warning' | 'breach' = 'agent';

      const toolLower = log.tool?.toLowerCase() || '';
      const actorLower = log.actor_id?.toLowerCase() || '';

      if (actorLower.includes('untrusted') || actorLower.includes('redteam')) {
        source = nodeMap.get('redteam_nexus')!;
      }

      if (toolLower.includes('email')) {
        target = nodeMap.get('email_gateway')!;
      } else if (toolLower.includes('payment')) {
        target = nodeMap.get('payments_gateway')!;
      } else if (toolLower.includes('file')) {
        target = nodeMap.get('filesystem_vault')!;
      } else if (toolLower.includes('browser')) {
        target = nodeMap.get('browser_node')!;
      } else {
        target = nodeMap.get('target_core')!;
      }

      if (log.status === 'DENIED' || (log.status as string) === 'BLOCKED') {
        color = '#10b981';
        type = 'defended';
      } else if (log.status === 'FAILED') {
        color = '#ef4444';
        type = 'breach';
      } else if (log.status === 'WARNING') {
        color = '#fbbf24';
        type = 'warning';
      } else {
        color = actorLower.includes('untrusted') ? '#f97316' : '#00f0ff';
        type = actorLower.includes('untrusted') ? 'attack' : 'agent';
      }

      threatItems.push({
        source,
        target,
        color,
        speed: 0.35 + Math.random() * 0.25,
        type,
        eventRef: log,
      });
    });

    // 2. Process Recent Campaign Attacks
    campaigns.slice(0, 3).forEach((camp) => {
      const results = camp.attack_results || [];
      results.slice(0, 4).forEach((att) => {
        const source = nodeMap.get('redteam_nexus')!;
        let target = nodeMap.get('target_core')!;

        const catLower = att.category?.toLowerCase() || '';
        if (catLower.includes('email')) target = nodeMap.get('email_gateway')!;
        else if (catLower.includes('payment')) target = nodeMap.get('payments_gateway')!;
        else if (catLower.includes('privilege') || catLower.includes('file')) target = nodeMap.get('filesystem_vault')!;
        else if (catLower.includes('tool') || catLower.includes('web')) target = nodeMap.get('browser_node')!;

        const isDefended = att.outcome === 'DEFENCE_HELD';
        threatItems.push({
          source,
          target,
          color: isDefended ? '#10b981' : '#ef4444',
          speed: 0.4 + Math.random() * 0.3,
          type: isDefended ? 'defended' : 'breach',
          eventRef: {
            ...att,
            campaign_id: camp.campaign_id,
            campaign_name: camp.campaign_name,
            timestamp: camp.started_at,
          },
        });
      });
    });

    const filteredThreats = threatItems.filter((t) => {
      if (filterMode === 'ATTACKS') return t.type === 'attack' || t.type === 'breach';
      if (filterMode === 'DEFENSES') return t.type === 'defended';
      return true;
    });

    setActiveTelemetryCount(filteredThreats.length);

    filteredThreats.forEach((threat, idx) => {
      const p1 = latLonToVector3(threat.source.lat, threat.source.lon, GLOBE_RADIUS * 1.008);
      const p2 = latLonToVector3(threat.target.lat, threat.target.lon, GLOBE_RADIUS * 1.008);

      const pMid = p1.clone().add(p2).multiplyScalar(0.5);
      const distance = p1.distanceTo(p2);
      const arcAltitude = GLOBE_RADIUS + Math.min(distance * 0.35, 0.75);
      pMid.normalize().multiplyScalar(arcAltitude);

      const curve = new THREE.QuadraticBezierCurve3(p1, pMid, p2);
      const points = curve.getPoints(45);
      const curveGeo = new THREE.BufferGeometry().setFromPoints(points);

      const arcMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(threat.color),
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
      });
      const arcLine = new THREE.Line(curveGeo, arcMat);

      const particleGeo = new THREE.SphereGeometry(0.045, 12, 12);
      const particleMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(threat.color),
      });
      const particle = new THREE.Mesh(particleGeo, particleMat);
      particle.position.copy(p1);

      const arcContainer = new THREE.Group();
      arcContainer.add(arcLine);
      arcContainer.add(particle);
      arcContainer.userData = {
        curve,
        particle,
        progress: (idx * 0.18) % 1.0,
        speed: threat.speed,
        color: threat.color,
        targetPos: p2,
        threat,
      };

      arcsGroup.add(arcContainer);
    });
  }, [events, campaigns, decisions, filterMode]);

  if (!webglAvailable) {
    return (
      <div className="flex flex-col items-center justify-center h-[520px] p-8 text-center bg-card/40 rounded-2xl border border-border/80">
        <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
        <h4 className="text-sm font-semibold text-foreground">WebGL Acceleration Not Available</h4>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Your browser does not have hardware-accelerated WebGL enabled to render the interactive 3D Cyber Threat Globe.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-[520px] md:h-[580px] lg:h-[640px] rounded-2xl overflow-hidden bg-gradient-to-b from-[#030714] via-[#02050e] to-[#010309] border border-blue-500/25 shadow-2xl shadow-blue-950/50 select-none ${className}`}
    >
      {/* Background Deep Cyber Space Grid & Radial Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(14,165,233,0.14)_0%,_transparent_68%)] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0ea5e906_1px,transparent_1px),linear-gradient(to_bottom,#0ea5e906_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none -z-10" />

      {/* Top Left: Threat Telemetry Status Header */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/70 border border-blue-500/35 backdrop-blur-md text-[11px] font-mono text-cyan-400 shadow-sm shadow-blue-950/60">
            <span
              className={`w-2 h-2 rounded-full ${
                isLive ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400'
              }`}
            />
            <span className="font-semibold tracking-wider">
              {isLive ? 'CONVEX REAL-TIME TELEMETRY' : 'ACTIVE DEFENSE SPHERE'}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card/60 border border-border/80 text-[10px] font-mono text-muted-foreground backdrop-blur-md">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span>{activeTelemetryCount > 0 ? `${activeTelemetryCount} Active Threat Vectors` : 'Awaiting Test Run'}</span>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground font-mono hidden md:block">
          Radware Attack Trajectories &bull; Continuous Autonomous Rotation &bull; Controlled Multi-Agent Testing
        </p>
      </div>



      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#02050e]/85 backdrop-blur-md">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            <div
              className="absolute inset-2 rounded-full border-2 border-blue-500/20 border-b-blue-400 animate-spin"
              style={{ animationDirection: 'reverse', animationDuration: '1.4s' }}
            />
            <Activity className="w-6 h-6 text-cyan-400 animate-pulse" />
          </div>
          <p className="mt-4 text-xs font-mono text-cyan-400 tracking-wider">
            SYNTHESIZING 3D CYBER THREAT GLOBE...
          </p>
          <p className="text-[10px] text-muted-foreground mt-1 font-mono">
            Calibrating spherical coordinate telemetry &bull; Radware attack vectors
          </p>
        </div>
      )}

      {/* 3D WebGL Canvas Viewport */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Bottom Left: Threat Classification Legend */}
      <div className="absolute bottom-4 left-4 z-10 p-3 rounded-xl bg-card/75 border border-border/80 backdrop-blur-md shadow-lg max-w-xs sm:max-w-sm pointer-events-auto">
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border/60">
          <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-cyan-400" />
            Threat Vector Telemetry
          </span>
          <span className="text-[9px] font-mono text-cyan-400">
            {activeTelemetryCount > 0 ? `${activeTelemetryCount} active` : 'Ready'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_#ef4444]" />
            <span className="text-muted-foreground">Attack Attempt</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
            <span className="text-muted-foreground">Defended / Blocked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f0ff]" />
            <span className="text-muted-foreground">Agent Activity</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
            <span className="text-muted-foreground">Warning / Review</span>
          </div>
        </div>
      </div>

      {/* Bottom Right: Interaction Guidance */}
      <div className="absolute bottom-4 right-4 z-10 pointer-events-none hidden sm:block">
        <div className="px-3 py-1.5 rounded-lg bg-card/60 border border-border/60 backdrop-blur-md text-[10px] font-mono text-muted-foreground/75 shadow-sm">
          INTERACTIVE CYBER THREAT GLOBE &bull; DRAG TO ROTATE
        </div>
      </div>

      {/* Selected Node / Threat Inspection HUD Modal */}
      {selectedEvent && (
        <div className="absolute top-16 right-4 z-30 w-80 p-4 rounded-xl bg-card/95 border border-cyan-500/40 backdrop-blur-xl shadow-2xl shadow-cyan-950/50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-border/70">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: selectedEvent.node.color }}
              />
              <h4 className="text-xs font-bold text-foreground truncate max-w-[200px]">
                {selectedEvent.node.name}
              </h4>
            </div>
            <button
              onClick={() => setSelectedEvent(null)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-2.5 space-y-2 text-xs">
            <div>
              <span className="text-[10px] font-mono uppercase text-muted-foreground">Gateway Role</span>
              <p className="text-[11px] font-semibold text-cyan-400">{selectedEvent.node.role}</p>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-muted-foreground">Architecture Description</span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {selectedEvent.node.description}
              </p>
            </div>

            {selectedEvent.event && (
              <div className="pt-2 border-t border-border/60 space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold block">
                  Latest Captured Telemetry
                </span>
                <div className="bg-muted/40 p-2 rounded-lg font-mono text-[10px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Actor:</span>
                    <span className="text-foreground">{selectedEvent.event.actor_id || 'untrusted-agent'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Action:</span>
                    <span className="text-cyan-300">{selectedEvent.event.action || selectedEvent.event.attack_name || 'execute_task'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span
                      className={
                        selectedEvent.event.status === 'ALLOWED' || selectedEvent.event.outcome === 'DEFENCE_HELD'
                          ? 'text-emerald-400 font-bold'
                          : 'text-rose-400 font-bold'
                      }
                    >
                      {selectedEvent.event.status || selectedEvent.event.outcome || 'ALLOWED'}
                    </span>
                  </div>
                  {selectedEvent.event.timestamp && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Timestamp:</span>
                      <span className="text-muted-foreground">{formatDate(selectedEvent.event.timestamp)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default HolographicGlobe;
