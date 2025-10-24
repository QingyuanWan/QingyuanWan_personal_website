import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function LiquidBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    renderer: THREE.WebGLRenderer;
    animationId?: number;
  }>();

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Mouse tracking
    const mouse = new THREE.Vector2(0.5, 0.5);
    const targetMouse = new THREE.Vector2(0.5, 0.5);

    // Shader uniforms
    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uResolution: { value: new THREE.Vector2(width, height) },
      uBaseColor: { value: new THREE.Color(0xFFFFFF) }, // White/light background
      uLiquidColor: { value: new THREE.Color(0x5171D9) }, // Royal blue (from concept)
      uDarkLiquidColor: { value: new THREE.Color(0x2D4BA6) }, // Darker blue for depth
    };

    // Vertex shader - simple full screen quad
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    // Fragment shader - liquid drops with ripple effects
    const fragmentShader = `
      uniform float uTime;
      uniform vec2 uMouse;
      uniform vec2 uResolution;
      uniform vec3 uBaseColor;
      uniform vec3 uLiquidColor;
      uniform vec3 uDarkLiquidColor;

      varying vec2 vUv;

      // Noise functions
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      // Fractal Brownian Motion for organic shapes
      float fbm(vec2 st) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;

        for(int i = 0; i < 5; i++) {
          value += amplitude * noise(st * frequency);
          frequency *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }

      // Distortion ripple from mouse
      vec2 distort(vec2 uv, vec2 center, float time, float strength) {
        vec2 dir = uv - center;
        float dist = length(dir);
        float ripple = sin(dist * 15.0 - time * 4.0) * exp(-dist * 3.0);
        return uv + normalize(dir) * ripple * strength;
      }

      void main() {
        vec2 uv = vUv;

        // Apply mouse distortion
        vec2 distortedUv = distort(uv, uMouse, uTime * 2.0, 0.03);

        // REVERSED: Liquid flows from BOTTOM to TOP (inverted Y)
        // Create flowing liquid blobs rising upward
        vec2 flowUv = vec2(distortedUv.x * 2.0, distortedUv.y * 3.0);

        // Multiple liquid blob layers rising from bottom
        float blob1 = fbm(flowUv + vec2(uTime * 0.15, uTime * 0.25));
        float blob2 = fbm(flowUv * 1.3 + vec2(-uTime * 0.12, uTime * 0.22 + 5.0));
        float blob3 = fbm(flowUv * 0.8 + vec2(uTime * 0.1, uTime * 0.28 + 10.0));

        // Combine blobs
        float liquidMask = (blob1 + blob2 * 0.8 + blob3 * 0.6) / 2.4;

        // Make blobs more solid and defined (like fromroswell style)
        liquidMask = smoothstep(0.35, 0.75, liquidMask);

        // REVERSED: Bias toward bottom (liquid rises from bottom)
        float bottomBias = smoothstep(0.0, 0.6, 1.0 - uv.y);
        liquidMask *= bottomBias;

        // Add some tendrils/edges
        float edge = fbm(flowUv * 4.0 + uTime * 0.1);
        edge = smoothstep(0.55, 0.65, edge);
        liquidMask = max(liquidMask, edge * bottomBias * 0.3);

        // Color variation within liquid
        float colorVariation = fbm(flowUv * 2.0 + uTime * 0.05);
        vec3 liquidColor = mix(uLiquidColor, uDarkLiquidColor, colorVariation * 0.5);

        // Add highlights from mouse interaction
        float mouseDist = distance(distortedUv, uMouse);
        float highlight = exp(-mouseDist * 4.0);
        liquidColor += vec3(highlight * 0.3);

        // Final blend
        vec3 finalColor = mix(uBaseColor, liquidColor, liquidMask);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    // Create shader material
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    });

    // Create full-screen quad
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    sceneRef.current = { scene, camera, renderer };

    // Mouse move handler
    const handleMouseMove = (event: MouseEvent) => {
      targetMouse.x = event.clientX / width;
      targetMouse.y = 1.0 - event.clientY / height;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Animation loop
    const animate = () => {
      if (!sceneRef.current) return;

      sceneRef.current.animationId = requestAnimationFrame(animate);

      // Smooth mouse movement
      mouse.x += (targetMouse.x - mouse.x) * 0.05;
      mouse.y += (targetMouse.y - mouse.y) * 0.05;

      // Update uniforms
      uniforms.uTime.value += 0.016;
      uniforms.uMouse.value.copy(mouse);

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;

      renderer.setSize(newWidth, newHeight);
      uniforms.uResolution.value.set(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (sceneRef.current?.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
}
