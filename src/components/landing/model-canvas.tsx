"use client";

import { useEffect, useRef } from "react";

type Vec3 = [number, number, number];

interface ModelCanvasProps {
  /** A .glb file in /public. */
  url: string;
  className?: string;
  fov?: number;
  cameraPosition: Vec3;
  cameraTarget: Vec3;
  /** The camera swings left and right around the target by this angle (radians). */
  swayAngle?: number;
  swaySpeed?: number;
  /** The model turns around its up axis by this many radians per second. */
  spinSpeed?: number;
  /** Play the animations that come inside the model file. */
  playAnimations?: boolean;
  modelScale?: number;
  modelPosition?: Vec3;
  ambient?: number;
  sun?: { color: number; intensity: number; position: Vec3 };
}

/**
 * Draws one 3D model with Three.js. Three.js and the model load on their own,
 * after the page is ready, so the first view does not wait for them. The scene
 * pauses when it is off screen, and it stays still when the system asks for
 * reduced motion. The mouse moves the camera a little.
 */
export function ModelCanvas({
  url,
  className,
  fov = 38,
  cameraPosition,
  cameraTarget,
  swayAngle = 0,
  swaySpeed = 0.12,
  spinSpeed = 0,
  playAnimations = false,
  modelScale = 1,
  modelPosition = [0, 0, 0],
  ambient = 1.6,
  sun = { color: 0xffe2b8, intensity: 1.8, position: [-30, 40, 20] },
}: ModelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let cleanup = () => {};

    Promise.all([
      import("three"),
      import("three/examples/jsm/loaders/GLTFLoader.js"),
      import("three/examples/jsm/libs/meshopt_decoder.module.js"),
    ]).then(([THREE, { GLTFLoader }, { MeshoptDecoder }]) => {
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      scene.add(new THREE.AmbientLight(0xffffff, ambient));
      const light = new THREE.DirectionalLight(sun.color, sun.intensity);
      light.position.set(...sun.position);
      scene.add(light);

      const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 400);
      const target = new THREE.Vector3(...cameraTarget);
      const home = new THREE.Vector3(...cameraPosition);
      const radius = Math.hypot(home.x - target.x, home.z - target.z);

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      const clock = new THREE.Clock();
      let mixer: import("three").AnimationMixer | null = null;
      let model: import("three").Group | null = null;
      let frameId = 0;
      let visible = true;
      let elapsed = 0;
      let pointerX = 0;
      let smoothPointer = 0;

      function draw() {
        const sway = reducedMotion.matches ? 0 : Math.sin(elapsed * swaySpeed) * swayAngle;
        smoothPointer += (pointerX - smoothPointer) * 0.06;
        const angle = sway + smoothPointer * 0.08;
        camera.position.set(
          target.x + Math.sin(angle) * radius,
          home.y,
          target.z + Math.cos(angle) * radius,
        );
        camera.lookAt(target);
        renderer.render(scene, camera);
      }

      function resize() {
        const { clientWidth, clientHeight } = canvas!;
        if (!clientWidth || !clientHeight) return;
        renderer.setSize(clientWidth, clientHeight, false);
        camera.aspect = clientWidth / clientHeight;
        camera.updateProjectionMatrix();
        draw();
      }

      function tick() {
        frameId = 0;
        if (!visible || document.hidden) return;
        const dt = Math.min(0.05, clock.getDelta());
        elapsed += dt;
        if (!reducedMotion.matches) {
          mixer?.update(dt);
          if (model && spinSpeed) model.rotation.y += spinSpeed * dt;
        }
        draw();
        if (!reducedMotion.matches) frameId = requestAnimationFrame(tick);
      }

      function start() {
        if (!frameId && visible && !document.hidden) {
          clock.getDelta();
          frameId = requestAnimationFrame(tick);
        }
      }

      function onPointerMove(event: PointerEvent) {
        if (event.pointerType !== "mouse") return;
        const rect = canvas!.getBoundingClientRect();
        pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      }
      function onPointerLeave() {
        pointerX = 0;
      }

      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      loader.load(url, (gltf) => {
        if (disposed) return;
        model = gltf.scene;
        model.scale.setScalar(modelScale);
        model.position.set(...modelPosition);
        scene.add(model);
        if (playAnimations && gltf.animations.length) {
          mixer = new THREE.AnimationMixer(model);
          gltf.animations.forEach((clip) => mixer!.clipAction(clip).play());
        }
        canvas.dataset.ready = "true";
        draw();
      });

      const resizeObserver = new ResizeObserver(resize);
      const intersectionObserver = new IntersectionObserver((entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        if (visible) start();
      });
      resizeObserver.observe(canvas);
      intersectionObserver.observe(canvas);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerleave", onPointerLeave);
      document.addEventListener("visibilitychange", start);
      reducedMotion.addEventListener("change", start);

      resize();
      start();

      cleanup = () => {
        cancelAnimationFrame(frameId);
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerleave", onPointerLeave);
        document.removeEventListener("visibilitychange", start);
        reducedMotion.removeEventListener("change", start);
        mixer?.stopAllAction();
        model?.traverse((object) => {
          const mesh = object as import("three").Mesh;
          mesh.geometry?.dispose();
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((material) => material?.dispose());
        });
        renderer.dispose();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
    // The settings are fixed for the life of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}
