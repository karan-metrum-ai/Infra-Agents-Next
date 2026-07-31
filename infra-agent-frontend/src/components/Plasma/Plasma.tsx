"use client";

import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle } from "ogl";
import styles from "./Plasma.module.css";
import type { PlasmaProps } from "./Plasma.types";

/** Reads --primary from the theme and returns [r,g,b] in 0-1. */
function getThemePrimaryRgb(): [number, number, number] {
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
    if (!value) return [59 / 255, 130 / 255, 246 / 255];
    const hex = value.startsWith("#") ? value : `#${value}`;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [59 / 255, 130 / 255, 246 / 255];
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ];
  } catch {
    return [59 / 255, 130 / 255, 246 / 255];
  }
}

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [59 / 255, 130 / 255, 246 / 255];
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  ];
};

const vertex = `#version 300 es
precision highp float;
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec3 uCustomColor;
uniform float uUseCustomColor;
uniform float uScale;
uniform float uOpacity;
uniform vec2 uMouse;
uniform float uMouseInteractive;
out vec4 fragColor;

void mainImage(out vec4 o, vec2 C) {
  vec2 center = iResolution.xy * 0.5;
  C = (C - center) / uScale + center;
  vec2 mouseOffset = (uMouse - center) * 0.0002;
  C += mouseOffset * length(C - center) * step(0.5, uMouseInteractive);
  float i, d, z, T = iTime;
  vec3 O, p, S;
  for (vec2 r = iResolution.xy, Q; ++i < 60.; O += o.w/d*o.xyz) {
    p = z*normalize(vec3(C-.5*r,r.y));
    p.z -= 4.;
    S = p;
    d = p.y-T;
    p.x += .4*(1.+p.y)*sin(d + p.x*0.1)*cos(.34*d + p.x*0.05);
    Q = p.xz *= mat2(cos(p.y+vec4(0,11,33,0)-T));
    z+= d = abs(sqrt(length(Q*Q)) - .25*(5.+S.y))/3.+8e-4;
    o = 1.+sin(S.y+p.z*.5+S.z-length(S-p)+vec4(2,1,0,8));
  }
  o.xyz = tanh(O/1e4);
}

bool finite1(float x){ return !(isnan(x) || isinf(x)); }
vec3 sanitize(vec3 c){
  return vec3(
    finite1(c.r) ? c.r : 0.0,
    finite1(c.g) ? c.g : 0.0,
    finite1(c.b) ? c.b : 0.0
  );
}

void main() {
  vec4 o = vec4(0.0);
  mainImage(o, gl_FragCoord.xy);
  vec3 rgb = sanitize(o.rgb);

  float intensity = (rgb.r + rgb.g + rgb.b) / 3.0;
  vec3 customColor = intensity * uCustomColor;
  vec3 finalColor = mix(rgb, customColor, step(0.5, uUseCustomColor));

  float alpha = length(rgb) * uOpacity;
  fragColor = vec4(finalColor, alpha);
}`;

export function Plasma({
  color,
  speed = 0.5,
  scale = 1,
  opacity = 0.85,
  mouseInteractive = true,
}: PlasmaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const loseTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(loseTimerRef.current);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const useCustomColor = 1.0;
    const customColorRgb = color ? hexToRgb(color) : getThemePrimaryRgb();

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        webgl: 2,
        alpha: true,
        antialias: false,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        canvas,
      });
    } catch {
      return;
    }

    const gl = renderer.gl;
    if (!gl) return;

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uCustomColor: { value: new Float32Array(customColorRgb) },
        uUseCustomColor: { value: useCustomColor },
        uScale: { value: scale },
        uOpacity: { value: opacity },
        uMouse: { value: new Float32Array([0, 0]) },
        uMouseInteractive: { value: mouseInteractive ? 1.0 : 0.0 },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });

    // Phase 16: a continuous full-viewport shader animation is exactly the
    // case `prefers-reduced-motion` exists for. Render one static frame
    // instead of starting the RAF loop, and skip mouse-driven motion too.
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const interactive = mouseInteractive && !prefersReducedMotion;

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = parent.getBoundingClientRect();
      mousePos.current.x = e.clientX - rect.left;
      mousePos.current.y = e.clientY - rect.top;
      const u = program.uniforms.uMouse.value as Float32Array;
      u[0] = mousePos.current.x;
      u[1] = mousePos.current.y;
    };

    if (interactive) {
      parent.addEventListener("mousemove", handleMouseMove);
    }

    const resize = () => {
      const w = Math.max(1, parent.clientWidth);
      const h = Math.max(1, parent.clientHeight);
      renderer.setSize(w, h);
      const res = program.uniforms.iResolution.value as Float32Array;
      res[0] = gl.drawingBufferWidth;
      res[1] = gl.drawingBufferHeight;
    };

    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    resize();

    const start = performance.now();
    let frame = 0;

    if (prefersReducedMotion) {
      renderer.render({ scene: mesh });
    } else {
      const loop = () => {
        const timeSec = ((performance.now() - start) / 1000) * speed;
        (program.uniforms.iTime as { value: number }).value = timeSec;
        renderer.render({ scene: mesh });
        frame = requestAnimationFrame(loop);
      };
      loop();
    }

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      if (interactive) {
        parent.removeEventListener("mousemove", handleMouseMove);
      }
      loseTimerRef.current = setTimeout(() => {
        const ext = gl.getExtension("WEBGL_lose_context");
        if (ext) ext.loseContext();
      }, 1000);
    };
  }, [color, speed, scale, opacity, mouseInteractive]);

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden />
    </div>
  );
}

export default Plasma;
