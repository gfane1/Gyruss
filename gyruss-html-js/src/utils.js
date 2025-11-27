// --- UTILITIES ---
window.Gyruss = window.Gyruss || {};

Gyruss.Utils = {
  rand: (min, max) => Math.random() * (max - min) + min,
  
  polarToCartesian: (angle, radius) => ({ 
    x: Gyruss.C.CX + Math.cos(angle) * radius, 
    y: Gyruss.C.CY + Math.sin(angle) * radius 
  }),
  
  wrapAngle: (angle) => (angle % Gyruss.C.TWO_PI + Gyruss.C.TWO_PI) % Gyruss.C.TWO_PI,
  
  distSq: (x1, y1, x2, y2) => (x1 - x2)**2 + (y1 - y2)**2
};