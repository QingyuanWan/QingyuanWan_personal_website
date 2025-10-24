<template>
  <div ref="containerRef" :class="className" :style="containerStyle">
    <slot></slot>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { createDotPanel } from '../utils/dotPanel.js';

const props = defineProps({
  // Theming
  backgroundColor: String,
  dotColor: String,
  cursorColor: String,

  // Dot grid
  dotSpacing: Number,
  dotBaseSize: Number,

  // Halo effect
  haloRadius: Number,
  haloMaxScale: Number,
  haloAlphaBoost: Number,

  // Cursor
  cursorSize: Number,

  // Magnetic headings
  magnetSelector: String,
  magnetRadius: Number,
  magnetStrength: Number,
  magnetSmoothing: Number,

  // Performance
  reducedMotion: Boolean,

  // Styling
  className: String,
  style: Object,
});

const containerRef = ref(null);
let panelInstance = null;

const containerStyle = computed(() => ({
  position: 'relative',
  ...props.style,
}));

function initPanel() {
  if (!containerRef.value) return;

  // Build options object
  const options = {};

  if (props.backgroundColor !== undefined) options.backgroundColor = props.backgroundColor;
  if (props.dotColor !== undefined) options.dotColor = props.dotColor;
  if (props.cursorColor !== undefined) options.cursorColor = props.cursorColor;
  if (props.dotSpacing !== undefined) options.dotSpacing = props.dotSpacing;
  if (props.dotBaseSize !== undefined) options.dotBaseSize = props.dotBaseSize;
  if (props.haloRadius !== undefined) options.haloRadius = props.haloRadius;
  if (props.haloMaxScale !== undefined) options.haloMaxScale = props.haloMaxScale;
  if (props.haloAlphaBoost !== undefined) options.haloAlphaBoost = props.haloAlphaBoost;
  if (props.cursorSize !== undefined) options.cursorSize = props.cursorSize;
  if (props.magnetRadius !== undefined) options.magnetRadius = props.magnetRadius;
  if (props.magnetStrength !== undefined) options.magnetStrength = props.magnetStrength;
  if (props.magnetSmoothing !== undefined) options.magnetSmoothing = props.magnetSmoothing;
  if (props.reducedMotion !== undefined) options.reducedMotion = props.reducedMotion;

  // Set magnet elements
  if (props.magnetSelector) {
    options.magnetElements = props.magnetSelector;
  }

  panelInstance = createDotPanel(containerRef.value, options);
}

onMounted(() => {
  // Wait for slot content to render
  setTimeout(initPanel, 0);
});

onUnmounted(() => {
  if (panelInstance) {
    panelInstance.destroy();
  }
});

// Watch for prop changes and reinitialize if needed
watch(
  () => [
    props.backgroundColor,
    props.dotColor,
    props.cursorColor,
    props.dotSpacing,
    props.dotBaseSize,
    props.haloRadius,
    props.haloMaxScale,
    props.haloAlphaBoost,
    props.cursorSize,
    props.magnetSelector,
    props.magnetRadius,
    props.magnetStrength,
    props.magnetSmoothing,
    props.reducedMotion,
  ],
  () => {
    if (panelInstance) {
      panelInstance.destroy();
    }
    setTimeout(initPanel, 0);
  }
);
</script>
