import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Eye,
  Grid,
  Box,
  RotateCcw,
  ShieldCheck,
  Ticket,
  Info,
} from 'lucide-react';
import { Movie, SeatInfo, ShowtimeSlot, Theatre } from '../types/cinema.ts';
import { AUDITORIUM_ROWS } from '../data/liveCinemaProvider.ts';

interface Auditorium3DProps {
  movie: Movie;
  theatre: Theatre;
  selectedDate: string;
  selectedShowtime: ShowtimeSlot;
  selectedLanguage: string;
  selectedFormat: string;
  seats: SeatInfo[];
  selectedSeatIds: string[];
  onToggleSeat: (seat: SeatInfo) => void;
  onProceedToCheckout: () => void;
  layoutSource: string;
  lockingInProgress: boolean;
}

// Pre-allocated math helpers at module scope (Zero GC in render loop)
const _targetCamPos = new THREE.Vector3(0, 12.6, 17.5);
const _targetLookAt = new THREE.Vector3(0, 3.2, -2.5);
const _raycaster = new THREE.Raycaster();
const _pointer = new THREE.Vector2();

// Exact required Seat Colour Legend hex constants
const SEAT_COLORS = {
  AVAILABLE_GREEN: 0x10b981, // Green = Available
  SELECTED_BLUE: 0x3b82f6,   // Blue = Selected
  BOOKED_RED: 0xef4444,      // Red = Already booked
  LOCKED_YELLOW: 0xeab308,   // Yellow = Temporarily locked
  VIP_PURPLE: 0xa855f7,      // Purple = Premium/VIP
  HOVER_CYAN: 0x38bdf8,      // Subtle hover highlight on available seats
};

function createScreenCanvasTexture(
  movieTitle: string,
  format: string,
  theatreName: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 440;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 1024, 440);
  grad.addColorStop(0, '#090d1a');
  grad.addColorStop(0.45, '#1e1b4b');
  grad.addColorStop(0.8, '#4c0519');
  grad.addColorStop(1, '#090d1a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 440);

  const radial = ctx.createRadialGradient(512, 220, 30, 512, 220, 460);
  radial.addColorStop(0, 'rgba(244, 63, 94, 0.38)');
  radial.addColorStop(0.5, 'rgba(168, 85, 247, 0.16)');
  radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, 1024, 440);

  ctx.fillStyle = '#030508';
  ctx.fillRect(0, 0, 1024, 34);
  ctx.fillRect(0, 406, 1024, 34);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fbbf24';
  ctx.font = '600 20px "Outfit", sans-serif';
  ctx.fillText(`CINENEXUS ${format} · ${theatreName.toUpperCase()}`, 512, 125);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 42px "Outfit", sans-serif';
  ctx.fillText(movieTitle.slice(0, 38).toUpperCase(), 512, 210);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('GIANT CURVED PROJECTION SCREEN · 326-SEAT STADIUM AUDITORIUM (ROWS A–P)', 512, 275);

  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 52, 928, 336);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

function createRowBadgeTexture(label: string, maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 116, 116);

  ctx.fillStyle = '#fbbf24';
  ctx.font = '700 68px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 64, 68);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

interface ChairMaterialBundle {
  cushionMat: THREE.MeshStandardMaterial;
  backMat: THREE.MeshStandardMaterial;
  headMat: THREE.MeshStandardMaterial;
}

function createMaterialBundle(hex: number, emissiveHex = 0x000000, emissiveIntensity = 0): ChairMaterialBundle {
  return {
    cushionMat: new THREE.MeshStandardMaterial({
      color: hex,
      emissive: emissiveHex,
      emissiveIntensity,
      roughness: 0.52,
      metalness: 0.14,
    }),
    backMat: new THREE.MeshStandardMaterial({
      color: hex,
      emissive: emissiveHex,
      emissiveIntensity,
      roughness: 0.62,
      metalness: 0.1,
    }),
    headMat: new THREE.MeshStandardMaterial({
      color: hex,
      emissive: emissiveHex,
      emissiveIntensity: emissiveIntensity * 0.8,
      roughness: 0.35,
      metalness: 0.22,
    }),
  };
}

export const Auditorium3D: React.FC<Auditorium3DProps> = ({
  movie,
  theatre,
  selectedDate,
  selectedShowtime,
  selectedLanguage,
  selectedFormat,
  seats,
  selectedSeatIds,
  onToggleSeat,
  onProceedToCheckout,
  layoutSource,
  lockingInProgress,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const seatsRef = useRef<SeatInfo[]>(seats);
  const selectedIdsRef = useRef<string[]>(selectedSeatIds);
  const onToggleSeatRef = useRef(onToggleSeat);
  const lastHoveredSeatIdRef = useRef<string | null>(null);

  const [hoveredSeat, setHoveredSeat] = useState<SeatInfo | null>(null);
  const [viewMode, setViewMode] = useState<'3D' | '2D'>('3D');
  const [activeCameraPreset, setActiveCameraPreset] = useState<string>('overview');
  const [dockCollapsed, setDockCollapsed] = useState(false);

  const triggerPresetRef = useRef<((preset: string) => void) | null>(null);
  const syncSeatColorsRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    seatsRef.current = seats;
    selectedIdsRef.current = selectedSeatIds;
    onToggleSeatRef.current = onToggleSeat;
    if (syncSeatColorsRef.current) {
      syncSeatColorsRef.current();
    }
  }, [seats, selectedSeatIds, onToggleSeat]);

  /**
   * Computes 3D Stadium Coordinates for 16 Rows (A..P) and up to 22 Seats per Row (326 Seats Total)
   * Divided into 3 Stadium Wings: Left Wing | Stepped Aisle | Center Prime Block | Stepped Aisle | Right Wing
   */
  const getSeatWorldCoords = (
    row: string,
    col: number
  ): { x: number; y: number; z: number; yaw: number } => {
    const rIdx = Math.max(0, AUDITORIUM_ROWS.indexOf(row));
    const isVip = rIdx >= 12; // M, N, O, P (18 cols: 4 + 10 + 4)
    const isExec = rIdx >= 5 && rIdx < 12; // F..L (22 cols: 5 + 12 + 5)
    const colsCount = isVip ? 18 : isExec ? 22 : 20; // A..E (20 cols: 5 + 10 + 5)
    const leftWingCols = isVip ? 4 : 5;
    const rightWingStart = colsCount - leftWingCols + 1;

    const spacingX = isVip ? 1.08 : 0.92;
    const centerCol = (colsCount + 1) / 2;

    // Dual stepped aisles between Left Wing, Center Block, and Right Wing
    let aisleShift = 0;
    if (col <= leftWingCols) {
      aisleShift = -1.05;
    } else if (col >= rightWingStart) {
      aisleShift = 1.05;
    }

    const x = (col - centerCol) * spacingX + aisleShift;

    // Cross-aisle walkways between Standard (A-E), Executive (F-L), and VIP Balcony (M-P)
    const crossAisleZ = (rIdx >= 5 ? 0.75 : 0) + (rIdx >= 12 ? 0.95 : 0);
    const crossAisleY = (rIdx >= 5 ? 0.22 : 0) + (rIdx >= 12 ? 0.38 : 0);

    const y = 0.34 + rIdx * 0.45 + crossAisleY;
    const zBase = -7.2 + rIdx * 1.02 + crossAisleZ;

    // Subtle stadium amphitheatre curve toward the screen on outer wings
    const curveZ = -Math.pow(Math.abs(x) * 0.065, 1.35);
    const z = zBase + curveZ;
    const yaw = -x * 0.015;

    return { x, y, z, yaw };
  };

  useEffect(() => {
    if (viewMode !== '3D') return;
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 580;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06080f);
    scene.fog = new THREE.FogExp2(0x06080f, 0.013);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 140);
    camera.position.set(0, 12.6, 17.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Environment Map Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    // Silky-smooth OrbitControls with tuned damping & inertia
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.rotateSpeed = 0.72;
    controls.zoomSpeed = 0.95;
    controls.panSpeed = 0.75;
    controls.minDistance = 4.2;
    controls.maxDistance = 32;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.target.set(0, 3.2, -2.5);

    // Balanced 3-Point Studio & Grand Multiplex Lighting
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.7);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.38);
    keyLight.position.set(8, 18, 12);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.left = -18;
      keyLight.shadow.camera.right = 18;
      keyLight.shadow.camera.top = 18;
      keyLight.shadow.camera.bottom = -18;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const screenBounceLight = new THREE.PointLight(0xe11d48, 2.8, 28, 1.4);
    screenBounceLight.position.set(0, 5.2, -10.5);
    scene.add(screenBounceLight);

    const backRimLight = new THREE.DirectionalLight(0xa855f7, 0.8);
    backRimLight.position.set(-8, 12, -12);
    scene.add(backRimLight);

    // ========================================================================
    // BUILD GRAND 326-SEAT AUDITORIUM ARCHITECTURE (SCREEN, WALLS, 16 RISERS)
    // ========================================================================
    const hallGroup = new THREE.Group();
    scene.add(hallGroup);

    // Main Floor
    const floorGeo = new THREE.PlaneGeometry(34, 38);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.85,
      metalness: 0.15,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, 0, 1);
    floorMesh.receiveShadow = true;
    hallGroup.add(floorMesh);

    // Giant Curved Cinema Screen Assembly
    const screenGroup = new THREE.Group();
    screenGroup.position.set(0, 5.4, -12.6);

    const frameGeo = new THREE.BoxGeometry(22.8, 8.6, 0.4);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.35,
      metalness: 0.8,
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    screenGroup.add(frameMesh);

    const haloGeo = new THREE.PlaneGeometry(24.0, 9.4);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xe11d48,
      transparent: true,
      opacity: 0.24,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.position.z = -0.24;
    screenGroup.add(haloMesh);

    const screenTexture = createScreenCanvasTexture(
      movie.title,
      selectedFormat,
      theatre.name,
      maxAnisotropy
    );
    const screenCanvasGeo = new THREE.PlaneGeometry(21.8, 7.8);
    const screenCanvasMat = new THREE.MeshStandardMaterial({
      map: screenTexture,
      emissive: new THREE.Color(0xffffff),
      emissiveMap: screenTexture,
      emissiveIntensity: 0.65,
      roughness: 0.25,
      metalness: 0.1,
    });
    const screenCanvasMesh = new THREE.Mesh(screenCanvasGeo, screenCanvasMat);
    screenCanvasMesh.position.z = 0.22;
    screenGroup.add(screenCanvasMesh);

    const stageGeo = new THREE.BoxGeometry(24.6, 0.5, 2.8);
    const stageMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.6,
      metalness: 0.3,
    });
    const stageMesh = new THREE.Mesh(stageGeo, stageMat);
    stageMesh.position.set(0, -4.8, 1.1);
    screenGroup.add(stageMesh);

    hallGroup.add(screenGroup);

    // Left & Right Acoustic Side Walls with Golden Sconces
    const wallGeo = new THREE.BoxGeometry(0.45, 12.2, 30);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0d1322,
      roughness: 0.75,
      metalness: 0.2,
    });
    const leftWall = new THREE.Mesh(wallGeo, wallMat);
    leftWall.position.set(-13.4, 5.8, 0.5);
    const rightWall = new THREE.Mesh(wallGeo, wallMat);
    rightWall.position.set(13.4, 5.8, 0.5);
    hallGroup.add(leftWall, rightWall);

    const sconceGeo = new THREE.BoxGeometry(0.16, 0.7, 0.24);
    const sconceMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.4,
      roughness: 0.2,
      metalness: 0.9,
    });
    for (let zPos = -9.5; zPos <= 10.5; zPos += 3.3) {
      const sLeft = new THREE.Mesh(sconceGeo, sconceMat);
      sLeft.position.set(-13.1, 6.8, zPos);
      const sRight = new THREE.Mesh(sconceGeo, sconceMat);
      sRight.position.set(13.1, 6.8, zPos);
      hallGroup.add(sLeft, sRight);
    }

    // Stadium Seating Risers (16 Rows A..P) & Dual Illuminated Stepped Aisles
    const riserGeo = new THREE.BoxGeometry(25.6, 0.46, 1.08);
    const riserMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.8,
      metalness: 0.15,
    });
    const stripGeo = new THREE.PlaneGeometry(0.95, 0.08);
    const aisleStripMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const badgeGeo = new THREE.PlaneGeometry(0.38, 0.38);

    for (let rIdx = 0; rIdx < AUDITORIUM_ROWS.length; rIdx++) {
      const crossAisleZ = (rIdx >= 5 ? 0.75 : 0) + (rIdx >= 12 ? 0.95 : 0);
      const crossAisleY = (rIdx >= 5 ? 0.22 : 0) + (rIdx >= 12 ? 0.38 : 0);
      const y = rIdx * 0.45 + crossAisleY;
      const z = -7.2 + rIdx * 1.02 + crossAisleZ;

      const riserMesh = new THREE.Mesh(riserGeo, riserMat);
      riserMesh.position.set(0, y + 0.1, z);
      riserMesh.receiveShadow = true;
      hallGroup.add(riserMesh);

      // Left & Right Stepped Aisle Golden LED Strips
      const leftStrip = new THREE.Mesh(stripGeo, aisleStripMat);
      leftStrip.rotation.x = -Math.PI / 2;
      leftStrip.position.set(-5.7, y + 0.34, z + 0.44);

      const rightStrip = new THREE.Mesh(stripGeo, aisleStripMat);
      rightStrip.rotation.x = -Math.PI / 2;
      rightStrip.position.set(5.7, y + 0.34, z + 0.44);
      hallGroup.add(leftStrip, rightStrip);

      // Row Label Badges on both stepped aisles
      const badgeTex = createRowBadgeTexture(AUDITORIUM_ROWS[rIdx], maxAnisotropy);
      const badgeMat = new THREE.MeshBasicMaterial({
        map: badgeTex,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const leftBadge = new THREE.Mesh(badgeGeo, badgeMat);
      leftBadge.rotation.x = -Math.PI / 2;
      leftBadge.position.set(-5.7, y + 0.345, z);

      const rightBadge = new THREE.Mesh(badgeGeo, badgeMat);
      rightBadge.rotation.x = -Math.PI / 2;
      rightBadge.position.set(5.7, y + 0.345, z);
      hallGroup.add(leftBadge, rightBadge);
    }

    // ========================================================================
    // SHARED GPU MATERIAL POOLS & 326 COMPOSITE 6-PART 3D CINEMA CHAIRS
    // ========================================================================
    const sharedMaterialPools = {
      available: createMaterialBundle(SEAT_COLORS.AVAILABLE_GREEN),
      selected: createMaterialBundle(SEAT_COLORS.SELECTED_BLUE, SEAT_COLORS.SELECTED_BLUE, 0.48),
      booked: createMaterialBundle(SEAT_COLORS.BOOKED_RED),
      locked: createMaterialBundle(SEAT_COLORS.LOCKED_YELLOW),
      vip: createMaterialBundle(SEAT_COLORS.VIP_PURPLE),
      hoveredAvailable: createMaterialBundle(SEAT_COLORS.AVAILABLE_GREEN, SEAT_COLORS.HOVER_CYAN, 0.32),
      hoveredVip: createMaterialBundle(SEAT_COLORS.VIP_PURPLE, SEAT_COLORS.HOVER_CYAN, 0.32),
    };

    const chairRegistry: Record<
      string,
      {
        group: THREE.Group;
        baseY: number;
        targetY: number;
        cushion: THREE.Mesh;
        backrest: THREE.Mesh;
        headrest: THREE.Mesh;
      }
    > = {};
    const clickableMeshes: THREE.Object3D[] = [];

    const armrestMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.75,
    });
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.5,
      metalness: 0.85,
    });

    const seatCushionGeo = new THREE.BoxGeometry(0.58, 0.14, 0.54);
    const backrestGeo = new THREE.BoxGeometry(0.58, 0.62, 0.13);
    const headrestGeo = new THREE.BoxGeometry(0.45, 0.15, 0.15);
    const armrestGeo = new THREE.BoxGeometry(0.08, 0.08, 0.48);
    const pedestalGeo = new THREE.CylinderGeometry(0.11, 0.16, 0.26, 8);
    const proxyHitGeo = new THREE.BoxGeometry(0.74, 0.92, 0.7);
    const proxyHitMat = new THREE.MeshBasicMaterial({ visible: false });

    const currentSeats = seatsRef.current;
    for (const seat of currentSeats) {
      const { x, y, z, yaw } = getSeatWorldCoords(seat.row, seat.col);
      const isVip = seat.category === 'VIP Recliner';

      const chairGroup = new THREE.Group();
      chairGroup.position.set(x, y, z);
      chairGroup.rotation.y = yaw;
      if (isVip) {
        chairGroup.scale.set(1.16, 1.08, 1.15);
      }

      const initBundle = isVip ? sharedMaterialPools.vip : sharedMaterialPools.available;

      // 1. Pedestal Base
      const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
      pedestal.position.set(0, 0.13, 0);
      chairGroup.add(pedestal);

      // 2. Seat Cushion
      const cushion = new THREE.Mesh(seatCushionGeo, initBundle.cushionMat);
      cushion.position.set(0, 0.28, 0.04);
      chairGroup.add(cushion);

      // 3. Ergonomically Tilted Backrest
      const backrest = new THREE.Mesh(backrestGeo, initBundle.backMat);
      backrest.position.set(0, 0.6, 0.25);
      backrest.rotation.x = -0.14;
      chairGroup.add(backrest);

      // 4. Plush Headrest
      const headrest = new THREE.Mesh(headrestGeo, initBundle.headMat);
      headrest.position.set(0, 0.93, 0.3);
      headrest.rotation.x = -0.14;
      chairGroup.add(headrest);

      // 5 & 6. Dual Armrests
      const leftArm = new THREE.Mesh(armrestGeo, armrestMat);
      leftArm.position.set(-0.32, 0.43, 0.05);
      const rightArm = new THREE.Mesh(armrestGeo, armrestMat);
      rightArm.position.set(0.32, 0.43, 0.05);
      chairGroup.add(leftArm, rightArm);

      // Simplified Invisible Collision Box on Layer 1
      const proxyHit = new THREE.Mesh(proxyHitGeo, proxyHitMat);
      proxyHit.position.set(0, 0.48, 0.05);
      proxyHit.layers.set(1);
      proxyHit.userData = { seatId: seat.id };
      chairGroup.add(proxyHit);
      clickableMeshes.push(proxyHit);

      chairRegistry[seat.id] = {
        group: chairGroup,
        baseY: y,
        targetY: y,
        cushion,
        backrest,
        headrest,
      };

      hallGroup.add(chairGroup);
    }

    // ========================================================================
    // SILKY-SMOOTH 60FPS ANIMATION LOOP WITH IDLE WAKEUP
    // ========================================================================
    let frameId = 0;
    let keepAliveFrames = 90;
    let loopRunning = false;
    let cameraTransitionActive = false;

    const wakeLoop = (frames = 75) => {
      keepAliveFrames = Math.max(keepAliveFrames, frames);
      if (!loopRunning) {
        loopRunning = true;
        lastFrameTime = performance.now();
        frameId = requestAnimationFrame(tick);
      }
    };

    const syncColors = () => {
      const latestSeats = seatsRef.current;
      const selectedSet = new Set(selectedIdsRef.current);
      const hoveredId = lastHoveredSeatIdRef.current;

      for (const s of latestSeats) {
        const entry = chairRegistry[s.id];
        if (!entry) continue;

        let bundle = sharedMaterialPools.available;
        let lift = 0;

        if (s.status === 'booked') {
          bundle = sharedMaterialPools.booked;
        } else if (s.status === 'locked') {
          bundle = sharedMaterialPools.locked;
        } else if (selectedSet.has(s.id)) {
          bundle = sharedMaterialPools.selected;
          lift = 0.09;
        } else if (s.id === hoveredId) {
          bundle =
            s.category === 'VIP Recliner'
              ? sharedMaterialPools.hoveredVip
              : sharedMaterialPools.hoveredAvailable;
          lift = 0.06;
        } else if (s.category === 'VIP Recliner') {
          bundle = sharedMaterialPools.vip;
        } else {
          bundle = sharedMaterialPools.available;
        }

        entry.cushion.material = bundle.cushionMat;
        entry.backrest.material = bundle.backMat;
        entry.headrest.material = bundle.headMat;
        entry.targetY = entry.baseY + lift;
      }

      wakeLoop(45);
    };

    syncSeatColorsRef.current = syncColors;

    let lastFrameTime = performance.now();

    function tick(now: number) {
      const dt = Math.min((now - lastFrameTime) / 1000, 0.05);
      lastFrameTime = now;

      let stillMoving = false;

      if (cameraTransitionActive) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCamPos.x, 7, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCamPos.y, 7, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCamPos.z, 7, dt);

        controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetLookAt.x, 7, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetLookAt.y, 7, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetLookAt.z, 7, dt);

        if (
          camera.position.distanceToSquared(_targetCamPos) < 0.004 &&
          controls.target.distanceToSquared(_targetLookAt) < 0.004
        ) {
          cameraTransitionActive = false;
        } else {
          stillMoving = true;
        }
      }

      for (const key in chairRegistry) {
        const c = chairRegistry[key];
        const diff = Math.abs(c.group.position.y - c.targetY);
        if (diff > 0.001) {
          c.group.position.y = THREE.MathUtils.damp(c.group.position.y, c.targetY, 14, dt);
          stillMoving = true;
        }
      }

      const controlsChanged = controls.update();
      if (controlsChanged) {
        stillMoving = true;
      }

      renderer.render(scene, camera);

      if (stillMoving) {
        keepAliveFrames = Math.max(keepAliveFrames, 20);
      } else {
        keepAliveFrames--;
      }

      if (keepAliveFrames > 0) {
        frameId = requestAnimationFrame(tick);
      } else {
        loopRunning = false;
      }
    }

    controls.addEventListener('start', () => {
      cameraTransitionActive = false;
      wakeLoop(90);
    });
    controls.addEventListener('change', () => {
      wakeLoop(60);
    });

    // Camera Presets Handler calibrated for 16-Row 326-Seat Auditorium
    triggerPresetRef.current = (preset: string) => {
      setActiveCameraPreset(preset);
      cameraTransitionActive = true;
      if (preset === 'overview') {
        _targetCamPos.set(0, 12.6, 17.5);
        _targetLookAt.set(0, 3.2, -2.5);
      } else if (preset === 'screen_pov') {
        _targetCamPos.set(0, 5.4, -10.8);
        _targetLookAt.set(0, 4.2, 6.0);
      } else if (preset === 'vip_balcony') {
        _targetCamPos.set(0, 9.4, 13.5);
        _targetLookAt.set(0, 4.8, -12.6);
      } else if (preset === 'top_down') {
        _targetCamPos.set(0, 24.5, 2.5);
        _targetLookAt.set(0, 0, 0.5);
      } else if (preset === 'seat_pov') {
        const lastSelectedId =
          selectedIdsRef.current[selectedIdsRef.current.length - 1] || 'H11';
        const matched = seatsRef.current.find((s) => s.id === lastSelectedId);
        if (matched) {
          const coords = getSeatWorldCoords(matched.row, matched.col);
          _targetCamPos.set(coords.x, coords.y + 1.15, coords.z + 0.4);
          _targetLookAt.set(0, 5.2, -12.6);
        }
      }
      wakeLoop(110);
    };

    _raycaster.layers.set(1);
    let lastRaycastMs = 0;

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastRaycastMs < 28) return;
      lastRaycastMs = now;

      const rect = renderer.domElement.getBoundingClientRect();
      _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      _raycaster.setFromCamera(_pointer, camera);
      const hits = _raycaster.intersectObjects(clickableMeshes, false);

      const newSeatId: string | null = hits.length > 0 ? hits[0].object.userData.seatId : null;

      if (newSeatId !== lastHoveredSeatIdRef.current) {
        lastHoveredSeatIdRef.current = newSeatId;
        if (newSeatId) {
          const found = seatsRef.current.find((s) => s.id === newSeatId) || null;
          setHoveredSeat(found);
          renderer.domElement.style.cursor =
            found && found.status === 'available' ? 'pointer' : 'not-allowed';
        } else {
          setHoveredSeat(null);
          renderer.domElement.style.cursor = 'grab';
        }
        syncColors();
      }
    };

    let pointerDownPos = { x: 0, y: 0 };
    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
      wakeLoop(90);
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dx = Math.abs(e.clientX - pointerDownPos.x);
      const dy = Math.abs(e.clientY - pointerDownPos.y);
      if (dx > 6 || dy > 6) return;

      const rect = renderer.domElement.getBoundingClientRect();
      _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      _raycaster.setFromCamera(_pointer, camera);
      const hits = _raycaster.intersectObjects(clickableMeshes, false);

      if (hits.length > 0) {
        const seatId = hits[0].object.userData.seatId;
        const found = seatsRef.current.find((s) => s.id === seatId);
        if (found && found.status === 'available') {
          onToggleSeatRef.current(found);
        }
      }
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointermove', handlePointerMove, { passive: true });
    domElem.addEventListener('pointerdown', handlePointerDown, { passive: true });
    domElem.addEventListener('pointerup', handlePointerUp, { passive: true });

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 580;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      wakeLoop(30);
    };
    window.addEventListener('resize', handleResize);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    syncColors();
    wakeLoop(90);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      domElem.removeEventListener('pointermove', handlePointerMove);
      domElem.removeEventListener('pointerdown', handlePointerDown);
      domElem.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();
      renderer.dispose();
    };
  }, [viewMode, movie.title, selectedFormat, theatre.name]);

  // Compute live INR pricing breakdown
  const selectedSeatObjects = seats.filter((s) => selectedSeatIds.includes(s.id));
  const subtotalInr = selectedSeatObjects.reduce((sum, s) => sum + s.priceInr, 0);
  const gstInr = Math.round(subtotalInr * 0.18);
  const convenienceFeeInr = selectedSeatObjects.length * 30;
  const finalAmountInr = subtotalInr + gstInr + convenienceFeeInr;

  const availableCount = seats.filter((s) => s.status === 'available').length;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left 8-Column Interactive 3D / 2D Auditorium Viewport */}
      <div className="xl:col-span-8 bg-[#0b0f19] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
        {/* Top Auditorium Header Bar */}
        <div className="px-5 py-3.5 bg-[#0f1523] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-white">{theatre.name}</span>
              <span>·</span>
              <span>{selectedShowtime.screenName}</span>
              <span>·</span>
              <span className="text-amber-400 font-medium">
                {selectedDate} at {selectedShowtime.time}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {layoutSource === 'LIVE_PARTNER_SEAT_MANIFEST'
                  ? 'Live Partner Seat Manifest Verified'
                  : `Grand 326-Seat 3D Stadium Auditorium (16 Rows A–P · ${availableCount} Available)`}
              </span>
            </div>
          </div>

          {/* 3D / 2D Fallback Mode Switch */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-white/10 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('3D')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === '3D'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Auditorium ({seats.length} Seats)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('2D')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === '2D'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>2D Seat Map Fallback</span>
            </button>
          </div>
        </div>

        {/* Mandatory Seat Colour Legend Strip */}
        <div className="px-5 py-2.5 bg-[#080b12] border-b border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#10b981] inline-block" />
              <span className="text-slate-300">Green = Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#3b82f6] inline-block" />
              <span className="text-slate-300">Blue = Selected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#ef4444] inline-block" />
              <span className="text-slate-300">Red = Already Booked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#eab308] inline-block" />
              <span className="text-slate-300">Yellow = Temporarily Locked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#a855f7] inline-block" />
              <span className="text-slate-300">Purple = Premium / VIP</span>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400 tabular-nums">
            Rows A–E: Std ₹{selectedShowtime.standardPriceInr} · Rows F–L: Exec ₹{selectedShowtime.executivePriceInr} · Rows M–P: VIP ₹{selectedShowtime.vipReclinerPriceInr}
          </div>
        </div>

        {/* Viewport Container */}
        {viewMode === '3D' ? (
          <div className="relative w-full h-[580px] bg-[#06080f] select-none">
            {/* Dedicated Isolated Ref Container for Three.js WebGL Canvas */}
            <div ref={canvasMountRef} className="w-full h-full" />

            {/* Top-Left Minimal Spec & Hover Inspection HUD */}
            <div className="absolute top-4 left-4 z-10 pointer-events-none flex flex-col gap-2">
              {hoveredSeat ? (
                <div className="px-4 py-2.5 rounded-xl bg-[#0b0f19]/95 border border-white/15 shadow-xl text-xs">
                  <div className="flex items-center gap-2 font-mono font-bold text-white">
                    <span>Row {hoveredSeat.row}</span>
                    <span>·</span>
                    <span>Seat {hoveredSeat.id}</span>
                    <span>·</span>
                    <span className="text-amber-400">₹{hoveredSeat.priceInr}</span>
                  </div>
                  <div className="text-slate-300 mt-0.5">
                    {hoveredSeat.category} · Status:{' '}
                    <span className="uppercase font-semibold">{hoveredSeat.status}</span>
                  </div>
                </div>
              ) : (
                <div className="px-3.5 py-2 rounded-xl bg-[#0b0f19]/90 border border-white/10 text-xs text-slate-300 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-rose-400" />
                  <span>326 Seats (Rows A–P, 3 Wings) · Drag to orbit · Scroll to zoom · Click any 3D chair</span>
                </div>
              )}
            </div>

            {/* Collapsible Bottom Control Dock */}
            <div
              className="absolute left-1/2 -translate-x-1/2 bottom-4 z-10 transition-transform duration-200"
              style={{
                maxWidth: 'min(900px, 94%)',
                width: '100%',
                transform: dockCollapsed
                  ? 'translate(-50%, calc(100% - 28px))'
                  : 'translate(-50%, 0)',
              }}
            >
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setDockCollapsed(!dockCollapsed)}
                  className="px-3.5 py-1 rounded-t-lg bg-[#0f172a] border border-b-0 border-white/15 text-[11px] font-medium text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {dockCollapsed ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Show Camera Controls</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Hide Controls (Zen Mode)</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-[#0b0f19]/95 border border-white/15 shadow-2xl flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 px-2">
                  <Camera className="w-3.5 h-3.5 text-rose-400" />
                  <span className="font-medium text-slate-200">Camera Angle:</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'overview', label: 'Perspective Hall' },
                    { id: 'seat_pov', label: 'Selected Seat Sightline' },
                    { id: 'vip_balcony', label: 'VIP Recliner Balcony' },
                    { id: 'screen_pov', label: 'Stage Looking Back' },
                    { id: 'top_down', label: 'Top-Down Blueprint' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => triggerPresetRef.current?.(preset.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        activeCameraPreset === preset.id
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => triggerPresetRef.current?.('overview')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  title="Reset 3D Camera"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 2D Fallback Seat Map for All 16 Rows (A-P) & 326 Seats */
          <div className="p-6 bg-[#070a12] overflow-x-auto">
            <div className="min-w-[820px] max-w-5xl mx-auto space-y-4">
              {/* Curved Screen Indicator */}
              <div className="text-center space-y-1.5 pb-3">
                <div className="h-2.5 w-4/5 mx-auto rounded-t-full bg-gradient-to-r from-rose-500/20 via-rose-500 to-rose-500/20 shadow-lg shadow-rose-500/30" />
                <p className="text-[11px] font-mono tracking-widest text-slate-400">
                  GIANT CURVED PROJECTION SCREEN THIS WAY ({selectedFormat}) · 326 SEATS
                </p>
              </div>

              <div className="space-y-1.5">
                {AUDITORIUM_ROWS.map((rowLabel, rIdx) => {
                  const rowSeats = seats.filter((s) => s.row === rowLabel);
                  const isVip = rIdx >= 12;
                  const leftWingCount = isVip ? 4 : 5;
                  const rightWingStartIdx = rowSeats.length - leftWingCount;

                  return (
                    <React.Fragment key={rowLabel}>
                      {rIdx === 0 && (
                        <div className="text-[10px] font-mono text-emerald-400 text-center py-1 tracking-wider">
                          ── STANDARD TIER (ROWS A–E · ₹{selectedShowtime.standardPriceInr}) ──
                        </div>
                      )}
                      {rIdx === 5 && (
                        <div className="text-[10px] font-mono text-amber-400 text-center pt-3 pb-1 tracking-wider">
                          ── EXECUTIVE PRIME TIER (ROWS F–L · ₹{selectedShowtime.executivePriceInr}) ──
                        </div>
                      )}
                      {rIdx === 12 && (
                        <div className="text-[10px] font-mono text-purple-400 text-center pt-3 pb-1 tracking-wider">
                          ── LUXURY VIP RECLINER BALCONY (ROWS M–P · ₹{selectedShowtime.vipReclinerPriceInr}) ──
                        </div>
                      )}

                      <div className="flex items-center justify-center gap-2">
                        <span className="w-5 text-[11px] font-mono font-bold text-amber-400 text-right">
                          {rowLabel}
                        </span>

                        <div className="flex items-center gap-1">
                          {rowSeats.map((s, idx) => {
                            const isSelected = selectedSeatIds.includes(s.id);
                            let bgClass =
                              'bg-[#10b981]/20 border-[#10b981] text-emerald-200 hover:bg-[#10b981]/40';
                            if (s.status === 'booked') {
                              bgClass =
                                'bg-[#ef4444]/25 border-[#ef4444]/60 text-rose-300 opacity-50 cursor-not-allowed';
                            } else if (s.status === 'locked') {
                              bgClass =
                                'bg-[#eab308]/25 border-[#eab308] text-amber-200 cursor-not-allowed';
                            } else if (isSelected) {
                              bgClass =
                                'bg-[#3b82f6] border-[#60a5fa] text-white shadow-md shadow-blue-500/30';
                            } else if (isVip) {
                              bgClass =
                                'bg-[#a855f7]/25 border-[#a855f7] text-purple-200 hover:bg-[#a855f7]/45';
                            }

                            return (
                              <React.Fragment key={s.id}>
                                {(idx === leftWingCount || idx === rightWingStartIdx) && (
                                  <div className="w-4" />
                                )}
                                <button
                                  type="button"
                                  disabled={s.status !== 'available'}
                                  onClick={() => onToggleSeat(s)}
                                  title={`${s.id} · ${s.category} · ₹${s.priceInr}`}
                                  className={`h-6 ${
                                    isVip ? 'w-7' : 'w-6'
                                  } rounded border text-[10px] font-mono font-semibold transition-all cursor-pointer ${bgClass}`}
                                >
                                  {s.col}
                                </button>
                              </React.Fragment>
                            );
                          })}
                        </div>

                        <span className="w-5 text-[11px] font-mono font-bold text-amber-400">
                          {rowLabel}
                        </span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right 4-Column Real-Time INR Seat Selection & Booking Summary Panel */}
      <div className="xl:col-span-4 bg-[#0b0f19] border border-white/10 rounded-2xl p-6 space-y-5 sticky top-20">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-semibold text-rose-400">SEAT SELECTION PANEL</span>
            <h3 className="font-display text-xl font-bold text-white mt-0.5">{movie.title}</h3>
            <p className="text-xs text-slate-400 mt-1">
              {selectedLanguage} · {selectedFormat} · {theatre.name}
            </p>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-amber-400 shrink-0">
            {selectedShowtime.time}
          </div>
        </div>

        {/* Auditorium Capacity Summary Strip */}
        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-center text-xs font-mono">
          <div>
            <div className="text-white font-bold">{seats.length}</div>
            <div className="text-[10px] text-slate-400">Total Seats</div>
          </div>
          <div>
            <div className="text-emerald-400 font-bold">{availableCount}</div>
            <div className="text-[10px] text-slate-400">Available</div>
          </div>
          <div>
            <div className="text-amber-400 font-bold">16 Rows</div>
            <div className="text-[10px] text-slate-400">Rows A–P</div>
          </div>
        </div>

        {/* Selected Seats Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Selected Seats ({selectedSeatObjects.length} / 10 max)
            </span>
            {selectedSeatObjects.length > 0 && (
              <button
                type="button"
                onClick={() => triggerPresetRef.current?.('seat_pov')}
                className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview Sightline</span>
              </button>
            )}
          </div>

          {selectedSeatObjects.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-900/60 border border-white/5 text-center space-y-2">
              <Ticket className="w-6 h-6 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-300 font-medium">
                Click any green or purple 3D chair across our 16 stadium rows (A–P) to select seats.
              </p>
              <p className="text-[11px] text-slate-500">
                Rows A–E: Standard (₹{selectedShowtime.standardPriceInr}) · Rows F–L: Executive (₹
                {selectedShowtime.executivePriceInr}) · Rows M–P: VIP Recliner (₹
                {selectedShowtime.vipReclinerPriceInr})
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {selectedSeatObjects.map((seat) => (
                <div
                  key={seat.id}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-white text-sm">Seat {seat.id}</span>
                    <span className="text-slate-400 ml-2">
                      (Row {seat.row}, Seat #{seat.col})
                    </span>
                    <div className="text-[11px] text-slate-400 mt-0.5">{seat.category} Tier</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-amber-400 tabular-nums">
                      ₹{seat.priceInr}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleSeat(seat)}
                      className="text-slate-400 hover:text-rose-400 text-xs cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Real-Time INR Fare Breakdown */}
        <div className="pt-4 border-t border-white/10 space-y-2.5 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span>Tickets Subtotal ({selectedSeatObjects.length} seats)</span>
            <span className="font-mono tabular-nums">₹{subtotalInr.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>GST (18% CGST + SGST)</span>
            <span className="font-mono tabular-nums">₹{gstInr.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Internet Handling & Convenience Fee</span>
            <span className="font-mono tabular-nums">
              ₹{convenienceFeeInr.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-sm font-bold text-white">
            <span>Total Payable (INR)</span>
            <span className="font-mono text-lg text-amber-400 tabular-nums">
              ₹{finalAmountInr.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Proceed to Atomic Seat Lock & Razorpay INR Checkout */}
        <button
          type="button"
          disabled={selectedSeatObjects.length === 0 || lockingInProgress}
          onClick={onProceedToCheckout}
          className="w-full py-3.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-sm shadow-lg shadow-rose-600/20 transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          {lockingInProgress
            ? 'Enqueuing in FIFO Queue & Locking Seats...'
            : selectedSeatObjects.length === 0
            ? 'Select Seats in 3D Hall to Continue'
            : `Lock ${selectedSeatObjects.length} Seat(s) & Proceed — ₹${finalAmountInr.toLocaleString('en-IN')}`}
        </button>

        <div className="text-[11px] text-slate-400 text-center">
          Seats are locked for 5 minutes via our backend FIFO Queue & HashMap engine while you
          complete Razorpay INR payment.
        </div>
      </div>
    </div>
  );
};
