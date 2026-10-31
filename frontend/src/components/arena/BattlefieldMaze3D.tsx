'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Maximize2, Minimize2 } from 'lucide-react';

export interface BattlefieldMaze3DProps {
  simulationState: 'IDLE' | 'ATTACKING' | 'DEFENDING' | 'BLOCKED' | 'BREACHED';
  currentTargetTool?: string;
  activeScenarioName?: string;
  lastEvent?: {
    agent?: string;
    action?: string;
    status?: string;
  };
  onNodeClick?: (nodeName: string) => void;
}

// -------------------------------------------------------------
// Texture Generators for Holographic Billboards & Badges
// -------------------------------------------------------------

function createToolBillboardTexture(tool: 'FILES' | 'MAILBOX' | 'BROWSER' | 'PAYMENTS'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Background glow
  ctx.clearRect(0, 0, 512, 512);

  // Outer glowing card
  ctx.fillStyle = 'rgba(21, 11, 36, 0.92)';
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 14;
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 24;

  const r = 40;
  const x = 32, y = 32, w = 448, h = 448;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Reset shadow for inner icon
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cx = 256;
  const cy = 210;

  if (tool === 'FILES') {
    // Folder Icon
    ctx.beginPath();
    ctx.moveTo(cx - 100, cy - 60);
    ctx.lineTo(cx - 30, cy - 60);
    ctx.lineTo(cx, cy - 30);
    ctx.lineTo(cx + 100, cy - 30);
    ctx.lineTo(cx + 100, cy + 70);
    ctx.lineTo(cx - 100, cy + 70);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
    ctx.fill();
  } else if (tool === 'MAILBOX') {
    // Envelope Icon
    ctx.beginPath();
    ctx.strokeRect(cx - 100, cy - 65, 200, 130);
    ctx.moveTo(cx - 100, cy - 65);
    ctx.lineTo(cx, cy + 15);
    ctx.lineTo(cx + 100, cy - 65);
    ctx.stroke();
  } else if (tool === 'BROWSER') {
    // Globe / Network Icon
    ctx.beginPath();
    ctx.arc(cx, cy, 75, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, cy, 35, 75, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 75, cy);
    ctx.lineTo(cx + 75, cy);
    ctx.stroke();
  } else if (tool === 'PAYMENTS') {
    // Credit Card Icon
    ctx.beginPath();
    ctx.strokeRect(cx - 100, cy - 65, 200, 130);
    ctx.moveTo(cx - 100, cy - 20);
    ctx.lineTo(cx + 100, cy - 20);
    ctx.stroke();
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(cx - 75, cy + 15, 45, 30);
  }

  // Label text at bottom
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 16;
  ctx.font = 'bold 54px "Courier New", monospace, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(tool, cx, 385);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

function createPillBadgeTexture(text: string, bgColor: string, textColor: string = '#ffffff'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 112;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 384, 112);

  // Pill background
  ctx.fillStyle = bgColor;
  ctx.shadowColor = bgColor;
  ctx.shadowBlur = 18;

  const r = 40;
  const x = 12, y = 16, w = 360, h = 80;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();

  // Subtle border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Text
  ctx.shadowBlur = 0;
  ctx.fillStyle = textColor;
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 192, 56);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

// -------------------------------------------------------------
// Procedural Cyber Agent Character Mesh (Pac-Man Ghost style)
// -------------------------------------------------------------

function createCyberAgentMesh(color: number, emissiveColor: number): THREE.Group {
  const agentGroup = new THREE.Group();

  // Dome head
  const headGeo = new THREE.SphereGeometry(0.65, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const bodyMat = new THREE.MeshStandardMaterial({
    color,
    emissive: emissiveColor,
    emissiveIntensity: 0.85,
    roughness: 0.2,
    metalness: 0.8,
  });
  const headMesh = new THREE.Mesh(headGeo, bodyMat);
  headMesh.position.y = 0.5;
  agentGroup.add(headMesh);

  // Body cylinder
  const bodyGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.6, 20, 1, true);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.y = 0.2;
  agentGroup.add(bodyMesh);

  // Tentacles / skirt scallops at bottom
  const skirtGroup = new THREE.Group();
  const numScallops = 4;
  for (let i = 0; i < numScallops; i++) {
    const angle = (i / numScallops) * Math.PI * 2;
    const r = 0.45;
    const sx = Math.cos(angle) * r;
    const sz = Math.sin(angle) * r;
    const scGeo = new THREE.ConeGeometry(0.18, 0.35, 12);
    scGeo.rotateX(Math.PI);
    const scMesh = new THREE.Mesh(scGeo, bodyMat);
    scMesh.position.set(sx, -0.15, sz);
    skirtGroup.add(scMesh);
  }
  agentGroup.add(skirtGroup);

  // Glowing Cyber Eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x002244 });

  // Left Eye
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), eyeMat);
  eyeL.position.set(-0.24, 0.5, 0.52);
  const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), pupilMat);
  pupilL.position.set(-0.24, 0.5, 0.64);
  agentGroup.add(eyeL);
  agentGroup.add(pupilL);

  // Right Eye
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), eyeMat);
  eyeR.position.set(0.24, 0.5, 0.52);
  const pupilR = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), pupilMat);
  pupilR.position.set(0.24, 0.5, 0.64);
  agentGroup.add(eyeR);
  agentGroup.add(pupilR);

  // Subtle ground glow ring
  const ringGeo = new THREE.RingGeometry(0.5, 0.8, 24);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.position.y = -0.22;
  agentGroup.add(ringMesh);

  return agentGroup;
}

export function BattlefieldMaze3D({
  simulationState,
  currentTargetTool,
  activeScenarioName,
  lastEvent,
  onNodeClick,
}: BattlefieldMaze3DProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (wrapperRef.current?.requestFullscreen) {
          await wrapperRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (e) {
      console.warn('Fullscreen request failed:', e);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Scene & Renderer Setup
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x08050e);
    scene.fog = new THREE.FogExp2(0x08050e, 0.022);

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 1000);
    // Isometric angle viewing the battlefield
    camera.position.set(0, 16.5, 17.5);
    camera.lookAt(0, -0.6, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0x190d2e, 1.8);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xa855f7, 1.4);
    mainLight.position.set(5, 20, 10);
    scene.add(mainLight);

    const centerPointLight = new THREE.PointLight(0xc084fc, 2.5, 18);
    centerPointLight.position.set(0, 3, 0);
    scene.add(centerPointLight);

    // 3. Cyber Floor & Neon Grid
    const floorGeo = new THREE.PlaneGeometry(32, 24);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0d0817,
      roughness: 0.4,
      metalness: 0.8,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.05;
    scene.add(floorMesh);

    // Violet isometric grid overlay
    const gridHelper = new THREE.GridHelper(30, 30, 0xa855f7, 0x241438);
    gridHelper.position.y = 0.0;
    scene.add(gridHelper);

    // 4. Futuristic Pac-Man Inspired Maze Circuit Walls
    const wallGroup = new THREE.Group();
    scene.add(wallGroup);

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x150b24,
      roughness: 0.25,
      metalness: 0.85,
    });

    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xc084fc,
      linewidth: 2,
    });

    function addWallSegment(x: number, z: number, length: number, isVertical: boolean) {
      const w = isVertical ? 0.35 : length;
      const d = isVertical ? length : 0.35;
      const h = 0.75;

      const boxGeo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(boxGeo, wallMaterial);
      mesh.position.set(x, h / 2, z);
      wallGroup.add(mesh);

      // Glowing neon edge top
      const edges = new THREE.EdgesGeometry(boxGeo);
      const line = new THREE.LineSegments(edges, edgeMaterial);
      mesh.add(line);
    }

    // Outer boundary walls with openings for tools
    addWallSegment(0, -9.5, 24, false); // North wall
    addWallSegment(0, 9.5, 24, false);  // South wall
    addWallSegment(-12, 0, 19, true);   // West wall
    addWallSegment(12, 0, 19, true);    // East wall

    // Inner Maze Circuits (Symmetric Pac-Man tactical lanes)
    // Top-Left corridor bends
    addWallSegment(-5.5, -6.5, 7, false);
    addWallSegment(-8.5, -3.5, 5, true);
    addWallSegment(-3.0, -3.5, 5, true);

    // Top-Right corridor bends
    addWallSegment(5.5, -6.5, 7, false);
    addWallSegment(8.5, -3.5, 5, true);
    addWallSegment(3.0, -3.5, 5, true);

    // Bottom-Left corridor bends
    addWallSegment(-5.5, 6.5, 7, false);
    addWallSegment(-8.5, 3.5, 5, true);
    addWallSegment(-3.0, 3.5, 5, true);

    // Bottom-Right corridor bends
    addWallSegment(5.5, 6.5, 7, false);
    addWallSegment(8.5, 3.5, 5, true);
    addWallSegment(3.0, 3.5, 5, true);

    // Central crossbars leading into Target AI
    addWallSegment(-4.8, 0, 4, false);
    addWallSegment(4.8, 0, 4, false);

    // 5. Central TARGET AI Platform
    const targetGroup = new THREE.Group();
    targetGroup.position.set(0, 0, 0);
    scene.add(targetGroup);

    // Hexagonal Pedestal
    const hexPedestalGeo = new THREE.CylinderGeometry(2.1, 2.3, 0.45, 6);
    const hexPedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1c0f30,
      emissive: 0x6b21a8,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.9,
    });
    const hexMesh = new THREE.Mesh(hexPedestalGeo, hexPedestalMat);
    hexMesh.position.y = 0.22;
    targetGroup.add(hexMesh);

    // Concentric glowing violet ring
    const hexRingGeo = new THREE.RingGeometry(2.35, 2.55, 32);
    hexRingGeo.rotateX(-Math.PI / 2);
    const hexRingMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      side: THREE.DoubleSide,
    });
    const hexRing = new THREE.Mesh(hexRingGeo, hexRingMat);
    hexRing.position.y = 0.05;
    targetGroup.add(hexRing);

    // Floating 3D Holographic Defense Shield Emblem
    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(0, 1.2);
    shieldShape.lineTo(0.9, 0.8);
    shieldShape.lineTo(0.8, -0.5);
    shieldShape.lineTo(0, -1.2);
    shieldShape.lineTo(-0.8, -0.5);
    shieldShape.lineTo(-0.9, 0.8);
    shieldShape.closePath();

    const extrudeSettings = { depth: 0.25, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.08, bevelThickness: 0.08 };
    const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, extrudeSettings);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.9,
      roughness: 0.1,
      metalness: 0.95,
      transparent: true,
      opacity: 0.92,
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shieldMesh.position.set(0, 1.8, 0);
    shieldMesh.scale.set(0.9, 0.9, 0.9);
    targetGroup.add(shieldMesh);

    // Inner glowing core sphere inside shield
    const coreGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.set(0, 1.8, 0.15);
    targetGroup.add(coreMesh);

    // Target AI Label Sprite below shield
    const targetAILabelTexture = createPillBadgeTexture('TARGET AI', 'rgba(36, 17, 56, 0.9)', '#c084fc');
    const targetAILabelMat = new THREE.SpriteMaterial({ map: targetAILabelTexture, transparent: true });
    const targetAISprite = new THREE.Sprite(targetAILabelMat);
    targetAISprite.scale.set(3.0, 0.85, 1);
    targetAISprite.position.set(0, 0.75, 1.4);
    targetGroup.add(targetAISprite);

    // 6. Four Protected Tool Nodes (FILES, MAILBOX, BROWSER, PAYMENTS)
    const toolNodeConfigs: Array<{
      name: 'FILES' | 'MAILBOX' | 'BROWSER' | 'PAYMENTS';
      pos: [number, number, number];
    }> = [
      { name: 'FILES', pos: [-7.8, 0, -5.2] },
      { name: 'MAILBOX', pos: [7.8, 0, -5.2] },
      { name: 'BROWSER', pos: [-7.8, 0, 5.2] },
      { name: 'PAYMENTS', pos: [7.8, 0, 5.2] },
    ];

    const toolNodeMeshes: Array<{ name: string; group: THREE.Group; billboard: THREE.Mesh }> = [];

    toolNodeConfigs.forEach(({ name, pos }) => {
      const nodeGroup = new THREE.Group();
      nodeGroup.position.set(pos[0], pos[1], pos[2]);
      scene.add(nodeGroup);

      // Elevated round pedestal with neon ring
      const baseGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.35, 24);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x160c28,
        emissive: 0x4c1d95,
        roughness: 0.2,
        metalness: 0.9,
      });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = 0.17;
      nodeGroup.add(baseMesh);

      const ringGeo = new THREE.RingGeometry(1.85, 2.05, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = 0.05;
      nodeGroup.add(ringMesh);

      // 3D Billboard Plaque facing camera
      const billGeo = new THREE.PlaneGeometry(2.4, 2.4);
      const billTex = createToolBillboardTexture(name);
      const billMat = new THREE.MeshBasicMaterial({
        map: billTex,
        transparent: true,
        side: THREE.DoubleSide,
      });
      const billMesh = new THREE.Mesh(billGeo, billMat);
      billMesh.position.set(0, 1.8, 0);
      // Tilt back slightly to align with isometric camera
      billMesh.rotation.x = -Math.PI / 6;
      nodeGroup.add(billMesh);

      toolNodeMeshes.push({ name, group: nodeGroup, billboard: billMesh });
    });

    // 7. Tactical Data Cubes (scattered along corridors)
    const dataCubes: THREE.Mesh[] = [];
    const cubePositions = [
      [-10.0, 0.45, 0],
      [10.0, 0.45, 0],
      [0, 0.45, -7.5],
      [0, 0.45, 7.5],
      [-5.8, 0.45, -1.8],
      [5.8, 0.45, -1.8],
      [-5.8, 0.45, 1.8],
      [5.8, 0.45, 1.8],
    ];

    cubePositions.forEach((pos, idx) => {
      const colors = [0xa855f7, 0xc084fc, 0x818cf8];
      const cubeGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
      const cubeMat = new THREE.MeshStandardMaterial({
        color: colors[idx % colors.length],
        emissive: colors[idx % colors.length],
        emissiveIntensity: 0.8,
        roughness: 0.1,
        metalness: 0.9,
      });
      const cubeMesh = new THREE.Mesh(cubeGeo, cubeMat);
      cubeMesh.position.set(pos[0], pos[1], pos[2]);
      scene.add(cubeMesh);
      dataCubes.push(cubeMesh);
    });

    // 8. RED TEAM AGENT (Attacker)
    const redTeamGroup = new THREE.Group();
    redTeamGroup.position.set(-4.5, 0.35, -2.0); // Initial spawn corridor
    scene.add(redTeamGroup);

    const redMesh = createCyberAgentMesh(0xff2244, 0xbb0022);
    redTeamGroup.add(redMesh);

    // Floating RED TEAM pill badge
    const redBadgeTex = createPillBadgeTexture('RED TEAM', '#e11d48');
    const redBadgeMat = new THREE.SpriteMaterial({ map: redBadgeTex, transparent: true });
    const redBadgeSprite = new THREE.Sprite(redBadgeMat);
    redBadgeSprite.scale.set(2.2, 0.65, 1);
    redBadgeSprite.position.set(0, 1.8, 0);
    redTeamGroup.add(redBadgeSprite);

    // Red Team Dotted Laser Trail (Curve)
    const trailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-10.5, 0.35, -2.0),
      new THREE.Vector3(-7.5, 0.35, -2.0),
      new THREE.Vector3(-4.5, 0.35, -2.0),
    ]);
    const trailPoints = trailCurve.getPoints(30);
    const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPoints);
    const trailMat = new THREE.LineDashedMaterial({
      color: 0xff2244,
      dashSize: 0.3,
      gapSize: 0.2,
      linewidth: 3,
    });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    trailLine.computeLineDistances();
    scene.add(trailLine);

    // 9. BLUE TEAM AGENT (Defender)
    const blueTeamGroup = new THREE.Group();
    blueTeamGroup.position.set(4.5, 0.35, 1.5); // Initial defensive corridor
    scene.add(blueTeamGroup);

    const blueMesh = createCyberAgentMesh(0x818cf8, 0x4f46e5);
    blueTeamGroup.add(blueMesh);

    // Floating BLUE TEAM pill badge
    const blueBadgeTex = createPillBadgeTexture('BLUE TEAM', '#4f46e5');
    const blueBadgeMat = new THREE.SpriteMaterial({ map: blueBadgeTex, transparent: true });
    const blueBadgeSprite = new THREE.Sprite(blueBadgeMat);
    blueBadgeSprite.scale.set(2.2, 0.65, 1);
    blueBadgeSprite.position.set(0, 1.8, 0);
    blueTeamGroup.add(blueBadgeSprite);

    // Defensive Interception Shield Dome (Activates when BLOCKED or DEFENDING)
    const defenseDomeGeo = new THREE.SphereGeometry(1.6, 24, 16);
    const defenseDomeMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x7c3aed,
      transparent: true,
      opacity: 0.0,
      wireframe: true,
    });
    const defenseDome = new THREE.Mesh(defenseDomeGeo, defenseDomeMat);
    defenseDome.position.set(0, 0.6, 0);
    blueTeamGroup.add(defenseDome);

    // 10. Animation Coordinates & Interpolation State
    let clock = new THREE.Clock();
    let animFrameId: number;

    // Waypoints for Red Team based on targeted tool
    function getDestinationCoordinates(toolName?: string): THREE.Vector3 {
      const clean = (toolName || '').toUpperCase();
      if (clean.includes('FILE')) return new THREE.Vector3(-7.8, 0.35, -3.8);
      if (clean.includes('MAIL') || clean.includes('EMAIL')) return new THREE.Vector3(7.8, 0.35, -3.8);
      if (clean.includes('BROWSER') || clean.includes('WEB')) return new THREE.Vector3(-7.8, 0.35, 3.8);
      if (clean.includes('PAY') || clean.includes('TRANSFER')) return new THREE.Vector3(7.8, 0.35, 3.8);
      return new THREE.Vector3(-2.2, 0.35, -0.5); // Center Target AI approach
    }

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Gentle floating animation on tools
      toolNodeMeshes.forEach(({ group }, i) => {
        group.position.y = Math.sin(elapsed * 2 + i) * 0.08;
      });

      // Target AI central rotation & hover
      shieldMesh.rotation.y = Math.sin(elapsed * 1.2) * 0.3;
      shieldMesh.position.y = 1.8 + Math.sin(elapsed * 2.5) * 0.12;
      hexRing.rotation.z = elapsed * 0.4;

      // Rotating Data Cubes
      dataCubes.forEach((cube, i) => {
        cube.rotation.x = elapsed * 1.5 + i;
        cube.rotation.y = elapsed * 1.2 + i;
        cube.position.y = 0.45 + Math.sin(elapsed * 3 + i) * 0.08;
      });

      // Dynamic Agent Positioning based on simulation state (Slow, smooth glide)
      const targetPos = getDestinationCoordinates(currentTargetTool);

      if (simulationState === 'ATTACKING') {
        // Red team moves towards target with deliberate pacing
        redTeamGroup.position.lerp(targetPos, 0.022);
        redTeamGroup.rotation.y = Math.sin(elapsed * 3.5) * 0.15;
        blueTeamGroup.position.lerp(new THREE.Vector3(targetPos.x * 0.45, 0.35, targetPos.z * 0.45), 0.018);
        defenseDomeMat.opacity = 0.2;
      } else if (simulationState === 'DEFENDING') {
        // Blue team rushes to intercept at intersection
        const interceptPoint = new THREE.Vector3(targetPos.x * 0.72, 0.35, targetPos.z * 0.72);
        blueTeamGroup.position.lerp(interceptPoint, 0.035);
        defenseDomeMat.opacity = 0.5 + Math.sin(elapsed * 6) * 0.25;
      } else if (simulationState === 'BLOCKED') {
        // Red pushed back, defensive dome flares
        const pushback = new THREE.Vector3(targetPos.x * 0.4 - 1.5, 0.35, targetPos.z * 0.4);
        redTeamGroup.position.lerp(pushback, 0.025);
        defenseDomeMat.opacity = 0.65;
        defenseDome.rotation.y = elapsed * 1.5;
      } else if (simulationState === 'BREACHED') {
        // Red team reaches destination, red alarm
        redTeamGroup.position.lerp(targetPos, 0.035);
        defenseDomeMat.opacity = 0.0;
      } else {
        // IDLE: Patrol hover around starting corridors
        redTeamGroup.position.lerp(new THREE.Vector3(-4.5, 0.35 + Math.sin(elapsed * 1.5) * 0.05, -2.0), 0.022);
        blueTeamGroup.position.lerp(new THREE.Vector3(4.5, 0.35 + Math.sin(elapsed * 1.5 + 1) * 0.05, 1.5), 0.022);
        defenseDomeMat.opacity = 0.0;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 11. Window Resize & Fullscreen Handling
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || window.innerWidth;
      const newH = container.clientHeight || (document.fullscreenElement ? window.innerHeight : 520);
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
      cancelAnimationFrame(animFrameId);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [simulationState, currentTargetTool]);

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full ${
        isFullscreen ? 'h-screen w-screen rounded-none z-50 fixed inset-0' : 'h-[520px] rounded-xl'
      } overflow-hidden bg-[#08050e] select-none border border-violet-900/30 transition-all duration-200`}
    >
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Subtle Corner HUD Elements */}
      <div className="absolute top-3 left-4 flex items-center gap-2 pointer-events-none z-20">
        <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse shadow-[0_0_8px_#a855f7]" />
        <span className="text-[11px] font-mono font-semibold tracking-wider text-violet-300/90 uppercase">
          CYBER BATTLEFIELD // 3D MAZE ACTIVE
        </span>
      </div>

      {/* Top Right Controls: Target Tool Focus Pill + Fullscreen Toggle */}
      <div className="absolute top-3 right-4 z-20 flex items-center gap-2.5">
        {currentTargetTool && (
          <div className="px-3 py-1 rounded-full bg-violet-950/80 border border-violet-500/40 backdrop-blur-md flex items-center gap-2 pointer-events-none">
            <span className="text-[10px] font-mono text-violet-400 uppercase font-bold">Targeted Node:</span>
            <span className="text-xs font-bold text-white tracking-wide">{currentTargetTool}</span>
          </div>
        )}

        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Expand Battlefield to Fullscreen'}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          className="h-8 w-8 rounded-lg bg-violet-950/80 hover:bg-violet-900 border border-violet-500/40 flex items-center justify-center text-violet-300 hover:text-white transition-all duration-200 shadow-md shadow-violet-950/40 hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 text-violet-300 hover:text-white" />
          ) : (
            <Maximize2 className="w-4 h-4 text-violet-300 hover:text-white" />
          )}
        </button>
      </div>

      {/* Bottom Status Legend */}
      <div className="absolute bottom-3 left-4 right-4 z-20 flex flex-wrap items-center justify-between text-[11px] font-mono text-muted-foreground/80 pointer-events-none">
        <div className="flex items-center gap-4 bg-black/75 px-3 py-1.5 rounded-lg border border-violet-900/40 backdrop-blur-sm">
          <span className="flex items-center gap-1.5 text-rose-400">
            <span className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]" /> Red Team Attacker
          </span>
          <span className="flex items-center gap-1.5 text-violet-400">
            <span className="h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_6px_#a855f7]" /> Target AI Core
          </span>
          <span className="flex items-center gap-1.5 text-indigo-400">
            <span className="h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_6px_#818cf8]" /> Blue Team Defender
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Protected Tools
          </span>
        </div>
        <div className="text-[10px] text-zinc-500 hidden sm:block font-mono">
          CYBER VIOLET DEFENSE GRID // 60 FPS
        </div>
      </div>
    </div>
  );
}

