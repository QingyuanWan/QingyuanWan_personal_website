/**
 * WebGL Shader Sources
 *
 * All shaders for fluid simulation:
 * - Advection (semi-Lagrangian)
 * - Divergence
 * - Pressure (Jacobi iteration)
 * - Projection (subtract gradient)
 * - Dye advection
 * - Composite (final render with glass mask)
 */

/**
 * Base vertex shader (full-screen quad)
 */
export const baseVertexShader = `
precision highp float;

attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5; // Map from [-1,1] to [0,1]
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

/**
 * Advection shader (semi-Lagrangian)
 * Advects a field (velocity or dye) along the velocity field
 */
export const advectionFragmentShader = `
precision highp float;

uniform sampler2D u_field;      // Field to advect (velocity or dye)
uniform sampler2D u_velocity;   // Velocity field
uniform vec2 u_resolution;      // Texture resolution
uniform float u_dt;             // Time step
uniform float u_dissipation;    // Dissipation factor (0.95-0.99)

varying vec2 v_uv;

void main() {
  vec2 texelSize = 1.0 / u_resolution;

  // Sample velocity at current position
  vec2 velocity = texture2D(u_velocity, v_uv).xy;

  // Semi-Lagrangian: trace back in time
  vec2 backPos = v_uv - velocity * u_dt * texelSize;

  // Bilinear sampling at backtraced position
  vec4 value = texture2D(u_field, backPos);

  // Apply dissipation
  gl_FragColor = value * u_dissipation;
}
`;

/**
 * Divergence shader
 * Computes divergence of velocity field (∇·v)
 */
export const divergenceFragmentShader = `
precision highp float;

uniform sampler2D u_velocity;
uniform vec2 u_resolution;

varying vec2 v_uv;

void main() {
  vec2 texelSize = 1.0 / u_resolution;

  // Sample neighboring velocities
  float left = texture2D(u_velocity, v_uv - vec2(texelSize.x, 0.0)).x;
  float right = texture2D(u_velocity, v_uv + vec2(texelSize.x, 0.0)).x;
  float bottom = texture2D(u_velocity, v_uv - vec2(0.0, texelSize.y)).y;
  float top = texture2D(u_velocity, v_uv + vec2(0.0, texelSize.y)).y;

  // Compute divergence: (∂u/∂x + ∂v/∂y)
  float divergence = 0.5 * ((right - left) + (top - bottom));

  gl_FragColor = vec4(divergence, 0.0, 0.0, 1.0);
}
`;

/**
 * Pressure shader (Jacobi iteration)
 * Solves Poisson equation for pressure
 */
export const pressureFragmentShader = `
precision highp float;

uniform sampler2D u_pressure;     // Previous pressure iteration
uniform sampler2D u_divergence;   // Divergence field
uniform vec2 u_resolution;

varying vec2 v_uv;

void main() {
  vec2 texelSize = 1.0 / u_resolution;

  // Sample neighboring pressures
  float left = texture2D(u_pressure, v_uv - vec2(texelSize.x, 0.0)).x;
  float right = texture2D(u_pressure, v_uv + vec2(texelSize.x, 0.0)).x;
  float bottom = texture2D(u_pressure, v_uv - vec2(0.0, texelSize.y)).x;
  float top = texture2D(u_pressure, v_uv + vec2(0.0, texelSize.y)).x;

  // Sample divergence
  float div = texture2D(u_divergence, v_uv).x;

  // Jacobi iteration: p = (left + right + bottom + top - divergence) / 4
  float pressure = 0.25 * (left + right + bottom + top - div);

  gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
}
`;

/**
 * Projection shader (subtract pressure gradient)
 * Makes velocity field divergence-free
 */
export const projectionFragmentShader = `
precision highp float;

uniform sampler2D u_velocity;
uniform sampler2D u_pressure;
uniform vec2 u_resolution;

varying vec2 v_uv;

void main() {
  vec2 texelSize = 1.0 / u_resolution;

  // Sample neighboring pressures
  float left = texture2D(u_pressure, v_uv - vec2(texelSize.x, 0.0)).x;
  float right = texture2D(u_pressure, v_uv + vec2(texelSize.x, 0.0)).x;
  float bottom = texture2D(u_pressure, v_uv - vec2(0.0, texelSize.y)).x;
  float top = texture2D(u_pressure, v_uv + vec2(0.0, texelSize.y)).x;

  // Compute pressure gradient
  vec2 gradient = 0.5 * vec2(right - left, top - bottom);

  // Subtract gradient from velocity
  vec2 velocity = texture2D(u_velocity, v_uv).xy;
  vec2 newVelocity = velocity - gradient;

  gl_FragColor = vec4(newVelocity, 0.0, 1.0);
}
`;

/**
 * Buoyancy shader (gravity-driven rise/sink)
 * Applies buoyancy force to velocity based on dye density
 */
export const buoyancyFragmentShader = `
precision highp float;

uniform sampler2D u_velocity;
uniform sampler2D u_dye;
uniform float u_buoyancy;     // Buoyancy strength (positive = rise)
uniform float u_dt;

varying vec2 v_uv;

void main() {
  vec2 velocity = texture2D(u_velocity, v_uv).xy;
  vec4 dye = texture2D(u_dye, v_uv);

  // Use dye alpha as density indicator
  float density = dye.a;

  // Apply vertical buoyancy force (y-axis)
  float buoyancyForce = u_buoyancy * density * u_dt;
  velocity.y += buoyancyForce;

  gl_FragColor = vec4(velocity, 0.0, 1.0);
}
`;

/**
 * Composite shader (final render with glass mask)
 * Renders dye field with rounded-rect mask and edge lighting
 */
export const compositeFragmentShader = `
precision highp float;

uniform sampler2D u_dye;
uniform vec2 u_resolution;
uniform float u_radius;          // Corner radius (pixels)
uniform float u_padding;         // Edge padding (pixels)

varying vec2 v_uv;

// Signed distance function for rounded rectangle
float sdRoundedRect(vec2 p, vec2 size, float radius) {
  vec2 d = abs(p) - size + radius;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - radius;
}

void main() {
  // Sample dye
  vec4 color = texture2D(u_dye, v_uv);

  // Compute position in pixels
  vec2 pixelPos = v_uv * u_resolution;
  vec2 center = u_resolution * 0.5;
  vec2 halfSize = (u_resolution * 0.5) - u_padding;

  // Compute signed distance to rounded rect
  float dist = sdRoundedRect(pixelPos - center, halfSize, u_radius);

  // Smooth alpha mask (antialiased edge)
  float mask = 1.0 - smoothstep(-1.0, 1.0, dist);

  // Inner shadow (darkening near edges)
  float shadowDist = dist + 2.0; // 2px inner shadow
  float shadow = smoothstep(0.0, 4.0, shadowDist);
  shadow = mix(0.7, 1.0, shadow); // Darken by 30% max

  // Edge highlight (brightening on edges)
  float highlightDist = abs(dist);
  float highlight = 1.0 - smoothstep(0.0, 1.5, highlightDist);
  highlight *= 0.15; // 15% brightness boost

  // Apply effects
  color.rgb *= shadow;
  color.rgb += highlight;
  color.a *= mask;

  gl_FragColor = color;
}
`;

/**
 * Clear shader (fill with solid color)
 */
export const clearFragmentShader = `
precision highp float;

uniform vec4 u_color;

void main() {
  gl_FragColor = u_color;
}
`;

/**
 * Splat shader (add circular blob of dye/velocity)
 */
export const splatFragmentShader = `
precision highp float;

uniform sampler2D u_target;
uniform vec2 u_resolution;
uniform vec2 u_point;        // Splat center (normalized)
uniform float u_radius;       // Splat radius (pixels)
uniform vec4 u_color;         // Splat color/value

varying vec2 v_uv;

void main() {
  vec4 base = texture2D(u_target, v_uv);

  // Compute distance to splat center
  vec2 pixelPos = v_uv * u_resolution;
  vec2 splatPos = u_point * u_resolution;
  float dist = length(pixelPos - splatPos);

  // Gaussian falloff
  float splat = exp(-dist * dist / (u_radius * u_radius));

  // Add splat to base
  gl_FragColor = base + u_color * splat;
}
`;
