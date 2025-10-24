import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

export function ThreeHello() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    textMeshes: THREE.Mesh[];
    animationId?: number;
  }>();

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 350;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = null;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 1, 1000);
    camera.position.z = 400;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Create environment map for reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0xE8E6E0);
    const envTexture = pmremGenerator.fromScene(envScene).texture;
    scene.environment = envTexture;

    // Lights - brighter for crystal visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xFFAD60, 2, 500);
    pointLight1.position.set(150, 150, 150);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xFFFFFF, 1.5, 500);
    pointLight2.position.set(-150, -100, 150);
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0xFFAD60, 1, 500);
    pointLight3.position.set(0, -150, 100);
    scene.add(pointLight3);

    const textMeshes: THREE.Mesh[] = [];
    sceneRef.current = { scene, camera, renderer, textMeshes };

    // Load font and create text
    const loader = new FontLoader();
    loader.load(
      'https://threejs.org/examples/fonts/helvetiker_bold.typeface.json',
      (font) => {
        const letters = ['H', 'E', 'L', 'L', 'O'];
        const spacing = 90;
        const totalWidth = letters.length * spacing;
        const startX = -totalWidth / 2 + spacing / 2;

        letters.forEach((letter, i) => {
          const geometry = new TextGeometry(letter, {
            font: font,
            size: 80,
            depth: 25,
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: 3,
            bevelSize: 2,
            bevelSegments: 5,
          });

          geometry.center();

          const material = new THREE.MeshPhysicalMaterial({
            color: 0xFFB869, // Light Orange A (warm, readable)
            metalness: 0.0,
            roughness: 0.1,
            transmission: 0.9, // More transparent for crystal effect
            thickness: 3,
            clearcoat: 1.0, // Crystal shine
            clearcoatRoughness: 0.05,
            envMapIntensity: 2.5, // Stronger reflections
            ior: 1.55, // Index of refraction for crystal
            reflectivity: 0.9,
          });

          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.x = startX + i * spacing;
          mesh.userData = { baseY: 0, rotationSpeed: 0.0003 + Math.random() * 0.0003 }; // Much slower

          scene.add(mesh);
          textMeshes.push(mesh);
        });

        animate();
      }
    );

    // Mouse tracking
    const mouse = { x: 0, y: 0 };
    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / height) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Animation loop
    const animate = () => {
      if (!sceneRef.current) return;

      sceneRef.current.animationId = requestAnimationFrame(animate);

      // Rotate all letters slowly
      textMeshes.forEach((mesh, i) => {
        mesh.rotation.y += mesh.userData.rotationSpeed;

        // Gentle float animation
        const time = Date.now() * 0.001;
        mesh.position.y = mesh.userData.baseY + Math.sin(time + i * 0.5) * 5;

        // Mouse interaction - letters tilt towards mouse
        const targetRotationX = mouse.y * 0.3;
        const targetRotationY = mouse.x * 0.8; // Increased horizontal rotation from 0.3 to 0.8
        mesh.rotation.x += (targetRotationX - mesh.rotation.x) * 0.05;
        // Don't override the base rotation, just add to it
        const baseRotation = mesh.userData.rotationSpeed * Date.now();
        mesh.rotation.y += (targetRotationY + baseRotation - mesh.rotation.y) * 0.08; // Increased from 0.05 to 0.08 for more responsiveness
      });

      renderer.render(scene, camera);
    };

    // Handle resize
    const handleResize = () => {
      if (!container || !sceneRef.current) return;
      const newWidth = container.clientWidth;
      camera.aspect = newWidth / height;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (sceneRef.current?.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
      renderer.dispose();
      textMeshes.forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '800px',
        height: '350px',
        position: 'relative',
        marginLeft: '-150px',
      }}
    />
  );
}
