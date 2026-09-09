import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { MesaVista } from '../lib/salon';
import { COLOR_ESTADO_MESA, LOCAL } from '../data/salon';

interface Props {
  mesas: MesaVista[];
  seleccionada: string | null;
  onSelect: (mesaId: string) => void;
}

const TOP_Y = 0.74;

/** Textura de texto para el rótulo flotante de cada mesa. */
function rotulo(texto: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(28,26,23,0.9)';
  ctx.fillRect(4, 12, 248, 40);
  ctx.font = '600 26px "Space Grotesk", system-ui, sans-serif';
  ctx.fillStyle = '#F7F5F2';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, 128, 33);
  const textura = new THREE.CanvasTexture(canvas);
  textura.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: textura, depthTest: false }));
  sprite.scale.set(1.5, 0.375, 1);
  sprite.renderOrder = 10;
  return sprite;
}

export function Salon3D({ mesas, seleccionada, onSelect }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const datos = useRef(mesas);
  datos.current = mesas;

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const [error, setError] = useState(false);
  // Meshes del tablero de cada mesa, para recolorearlos sin reconstruir la escena.
  const topes = useRef(new Map<string, THREE.Mesh>());
  const anillo = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    const host = contenedor.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setError(true);
      return;
    }

    const ancho = host.clientWidth || 640;
    const alto = host.clientHeight || 480;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(ancho, alto);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, ancho / alto, 0.1, 100);
    camera.position.set(1.5, 11, 13.5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.4, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 6;
    controls.maxDistance = 27;
    controls.maxPolarAngle = 1.45;
    controls.update();

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8d8374, 0.95));
    const sol = new THREE.DirectionalLight(0xfff1df, 0.75);
    sol.position.set(6, 13, 7);
    sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    sol.shadow.camera.left = -12;
    sol.shadow.camera.right = 12;
    sol.shadow.camera.top = 12;
    sol.shadow.camera.bottom = -12;
    sol.shadow.camera.far = 40;
    sol.shadow.camera.updateProjectionMatrix();
    scene.add(sol);

    // Recursos a liberar al desmontar.
    const geometrias: THREE.BufferGeometry[] = [];
    const materiales: THREE.Material[] = [];
    const texturas: THREE.Texture[] = [];
    const track = <T,>(x: T): T => {
      if (x instanceof THREE.BufferGeometry) geometrias.push(x);
      else if (x instanceof THREE.Material) materiales.push(x);
      else if (x instanceof THREE.Texture) texturas.push(x);
      return x;
    };

    // Piso y contorno del local.
    const piso = new THREE.Mesh(
      track(new THREE.PlaneGeometry(LOCAL.ancho, LOCAL.fondo)),
      track(new THREE.MeshStandardMaterial({ color: 0xece5db, roughness: 0.95 })),
    );
    piso.rotation.x = -Math.PI / 2;
    piso.receiveShadow = true;
    scene.add(piso);

    const tinte = (
      w: number,
      d: number,
      x: number,
      z: number,
      color: number,
    ) => {
      const p = new THREE.Mesh(
        track(new THREE.PlaneGeometry(w, d)),
        track(new THREE.MeshStandardMaterial({ color, roughness: 1, transparent: true, opacity: 0.5 })),
      );
      p.rotation.x = -Math.PI / 2;
      p.position.set(x, 0.01, z);
      p.receiveShadow = true;
      scene.add(p);
    };
    tinte(LOCAL.ancho, 2.6, 0, LOCAL.fondo / 2 - 1.3, 0x2f7d55); // franja de terraza
    tinte(4.2, 3.4, LOCAL.ancho / 2 - 2.1, -LOCAL.fondo / 2 + 1.7, 0xcaa25a); // rincón privado

    const grid = new THREE.GridHelper(Math.max(LOCAL.ancho, LOCAL.fondo), 24, 0xcfc7ba, 0xe4ded3);
    grid.position.y = 0.02;
    scene.add(grid);
    track(grid.geometry as THREE.BufferGeometry);
    ([] as THREE.Material[]).concat(grid.material as THREE.Material).forEach((m) => materiales.push(m));

    const matMuro = track(new THREE.MeshStandardMaterial({ color: 0xe4e0d9, roughness: 0.9 }));
    const muro = (w: number, h: number, dep: number, x: number, y: number, z: number) => {
      const box = new THREE.Mesh(track(new THREE.BoxGeometry(w, h, dep)), matMuro);
      box.position.set(x, y, z);
      box.receiveShadow = true;
      scene.add(box);
    };
    const H = LOCAL.altoMuro;
    muro(LOCAL.ancho, H, 0.16, 0, H / 2, -LOCAL.fondo / 2); // fondo
    muro(0.16, H, LOCAL.fondo, -LOCAL.ancho / 2, H / 2, 0); // izquierda
    muro(0.16, H, LOCAL.fondo, LOCAL.ancho / 2, H / 2, 0); // derecha

    // Barra contra el muro del fondo.
    const barra = new THREE.Mesh(
      track(new THREE.BoxGeometry(5.4, 1.05, 0.75)),
      track(new THREE.MeshStandardMaterial({ color: 0x6f5b47, roughness: 0.7 })),
    );
    barra.position.set(-2.4, 0.525, -LOCAL.fondo / 2 + 0.75);
    barra.castShadow = true;
    barra.receiveShadow = true;
    scene.add(barra);

    // Geometrías reutilizables para las mesas.
    const gTopeCuad = track(new THREE.BoxGeometry(1, 0.06, 1));
    const gTopeRed = track(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 32));
    const gPedestal = track(new THREE.CylinderGeometry(0.07, 0.09, TOP_Y, 12));
    const gSilla = track(new THREE.BoxGeometry(0.36, 0.36, 0.36));
    const matPedestal = track(new THREE.MeshStandardMaterial({ color: 0x9a9188, roughness: 0.8 }));
    const matSilla = track(new THREE.MeshStandardMaterial({ color: 0x3f3a34, roughness: 0.85 }));

    const pickTargets: THREE.Object3D[] = [];

    for (const { mesa } of datos.current) {
      const grupo = new THREE.Group();
      grupo.position.set(mesa.x, 0, mesa.z);

      const redonda = mesa.forma === 'redonda';
      const geoTope = redonda ? gTopeRed : gTopeCuad;
      const matTope = track(
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.05 }),
      );
      const tope = new THREE.Mesh(geoTope, matTope);
      if (!redonda) tope.scale.set(mesa.ancho, 1, mesa.fondo);
      else tope.scale.set(mesa.ancho, 1, mesa.ancho);
      tope.position.y = TOP_Y;
      tope.castShadow = true;
      tope.receiveShadow = true;
      tope.userData.mesaId = mesa.id;
      grupo.add(tope);
      pickTargets.push(tope);
      topes.current.set(mesa.id, tope);

      const pedestal = new THREE.Mesh(gPedestal, matPedestal);
      pedestal.position.y = TOP_Y / 2;
      pedestal.castShadow = true;
      grupo.add(pedestal);

      // Sillas repartidas alrededor del tablero.
      const radio = Math.max(mesa.ancho, mesa.fondo) / 2 + 0.32;
      for (let i = 0; i < mesa.capacidad; i += 1) {
        const ang = (i / mesa.capacidad) * Math.PI * 2;
        const silla = new THREE.Mesh(gSilla, matSilla);
        silla.position.set(Math.cos(ang) * radio, 0.18, Math.sin(ang) * radio);
        silla.castShadow = true;
        grupo.add(silla);
      }

      const etiqueta = rotulo(mesa.nombre);
      etiqueta.position.set(0, TOP_Y + 0.7, 0);
      texturas.push((etiqueta.material as THREE.SpriteMaterial).map as THREE.Texture);
      materiales.push(etiqueta.material as THREE.Material);
      grupo.add(etiqueta);

      scene.add(grupo);
    }

    // Anillo de selección (se escala y reubica según la mesa activa).
    const ring = new THREE.Mesh(
      track(new THREE.TorusGeometry(1, 0.045, 10, 48)),
      track(new THREE.MeshStandardMaterial({ color: 0x1c1a17, roughness: 0.5 })),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    ring.visible = false;
    scene.add(ring);
    anillo.current = ring;

    // Selección por click (ignora si el puntero se arrastró: eso es orbitar).
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    const onDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(pickTargets, false)[0];
      const id = hit?.object.userData.mesaId as string | undefined;
      if (id) onSelectRef.current(id);
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    const observer = new ResizeObserver(() => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    observer.observe(host);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    // Primera pintura de estados.
    pintar(datos.current, seleccionada, topes.current, ring);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      controls.dispose();
      geometrias.forEach((g) => g.dispose());
      materiales.forEach((m) => m.dispose());
      texturas.forEach((t) => t.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
      topes.current.clear();
      anillo.current = null;
    };
    // Montaje único: la disposición de las mesas no cambia en caliente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recolorea los tableros y mueve el anillo cuando cambian estados o selección.
  useEffect(() => {
    pintar(mesas, seleccionada, topes.current, anillo.current);
  }, [mesas, seleccionada]);

  if (error) {
    return (
      <div className="grid h-full place-items-center p-6 text-center text-sm text-muted">
        Tu navegador no pudo iniciar el modelo 3D (WebGL). El resto del módulo funciona igual.
      </div>
    );
  }

  return <div ref={contenedor} className="h-full w-full" />;
}

function pintar(
  mesas: MesaVista[],
  seleccionada: string | null,
  topes: Map<string, THREE.Mesh>,
  ring: THREE.Mesh | null,
) {
  for (const { mesa, estado } of mesas) {
    const tope = topes.get(mesa.id);
    if (!tope) continue;
    const mat = tope.material as THREE.MeshStandardMaterial;
    mat.color.set(COLOR_ESTADO_MESA[estado]);
    mat.emissive.set(mesa.id === seleccionada ? 0x2a2a2a : 0x000000);
  }

  if (!ring) return;
  const activa = seleccionada ? mesas.find((v) => v.mesa.id === seleccionada) : undefined;
  if (!activa) {
    ring.visible = false;
    return;
  }
  const r = Math.max(activa.mesa.ancho, activa.mesa.fondo) / 2 + 0.5;
  ring.visible = true;
  ring.position.set(activa.mesa.x, 0.06, activa.mesa.z);
  ring.scale.set(r, r, 1);
}
