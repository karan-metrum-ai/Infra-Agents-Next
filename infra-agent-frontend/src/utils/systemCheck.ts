/**
 * Browser capability probes for the /system-check diagnostics page.
 *
 * Each probe is self-contained and side-effect free (beyond creating
 * throwaway canvases/renderers), so they can be re-run on demand.
 */

export type CheckStatus = "checking" | "pass" | "warn" | "fail" | "info";

export interface MinimumRequirementGroup {
  category: string;
  items: string[];
}

export const INFRA_AGENTS_MIN_REQUIREMENTS: MinimumRequirementGroup[] = [
  {
    category: "Browser",
    items: [
      "Chrome 120+, Firefox 120+, Edge 120+, or Safari 15.4+",
      "JavaScript enabled; hardware acceleration turned on",
    ],
  },
  {
    category: "Rendering",
    items: [
      "WebGL 1 support minimum (WebGL 2 recommended for the digital twin)",
      "Working GPU driver — software rendering (SwiftShader) is not recommended",
      "Three.js / WebGL context must initialize without errors",
    ],
  },
  {
    category: "Display",
    items: [
      "Viewport width at least 768px (1024px+ recommended)",
      "1920×1080 or higher recommended for dashboard and 3D views",
    ],
  },
  {
    category: "System",
    items: [
      "4 GB device memory minimum (8 GB+ recommended)",
      "Stable network connection to the Infra Agents server",
    ],
  },
  {
    category: "Connectivity",
    items: [
      "Access to the app origin without blocked API or static asset routes",
      "Backend services reachable (/auth-api, /digital-twin-api, cluster APIs)",
      "Static assets load from the same origin (e.g. /assets/globe/*)",
    ],
  },
];

export interface WebGLProbe {
  webgl1: boolean;
  webgl2: boolean;
  vendor: string | null;
  renderer: string | null;
  isSoftware: boolean;
}

/** Creates two independent canvases so WebGL1/WebGL2 support is tested
 * without one context creation call shadowing the other. */
export function probeWebGL(): WebGLProbe {
  const canvasA = document.createElement("canvas");
  const gl2 = canvasA.getContext("webgl2") as WebGL2RenderingContext | null;

  const canvasB = document.createElement("canvas");
  const gl1 = (canvasB.getContext("webgl") ||
    canvasB.getContext("experimental-webgl")) as WebGLRenderingContext | null;

  const primary = gl2 || gl1;
  let vendor: string | null = null;
  let renderer: string | null = null;

  if (primary) {
    const ext = primary.getExtension("WEBGL_debug_renderer_info");
    if (ext) {
      vendor = primary.getParameter(ext.UNMASKED_VENDOR_WEBGL);
      renderer = primary.getParameter(ext.UNMASKED_RENDERER_WEBGL);
    } else {
      vendor = primary.getParameter(primary.VENDOR);
      renderer = primary.getParameter(primary.RENDERER);
    }
  }

  const rendererStr = (renderer || "").toLowerCase();
  const isSoftware = [
    "swiftshader",
    "software",
    "llvmpipe",
    "basic render",
    "microsoft basic",
  ].some((kw) => rendererStr.includes(kw));

  return { webgl1: !!gl1, webgl2: !!gl2, vendor, renderer, isSoftware };
}

export interface BrowserInfo {
  name: string;
  version: string;
  userAgent: string;
}

/** Lightweight UA parse — order matters: Edge/Opera before Chrome, Chrome
 * before Safari, since their UA strings are substrings of each other. */
export function getBrowserInfo(): BrowserInfo {
  const ua = navigator.userAgent;
  const patterns: Array<[string, RegExp]> = [
    ["Edge", /Edg\/([\d.]+)/],
    ["Opera", /OPR\/([\d.]+)/],
    ["Chrome", /Chrome\/([\d.]+)/],
    ["Firefox", /Firefox\/([\d.]+)/],
    ["Safari", /Version\/([\d.]+).*Safari/],
  ];

  for (const [name, re] of patterns) {
    const match = ua.match(re);
    if (match) {
      return { name, version: match[1], userAgent: ua };
    }
  }

  return { name: "Unknown browser", version: "", userAgent: ua };
}

export interface ScreenInfo {
  width: number;
  height: number;
  dpr: number;
}

export function getScreenInfo(): ScreenInfo {
  return {
    width: window.screen.width,
    height: window.screen.height,
    dpr: window.devicePixelRatio || 1,
  };
}

export interface MemoryInfo {
  deviceMemory: number | null;
}

export function getMemoryInfo(): MemoryInfo {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return { deviceMemory: typeof nav.deviceMemory === "number" ? nav.deviceMemory : null };
}

export interface NetworkCheckResult {
  ok: boolean;
  status: number | null;
  latencyMs: number | null;
  error?: string;
}

export async function checkNetwork(
  url = "/api/health",
  timeoutMs = 5000,
): Promise<NetworkCheckResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = performance.now();

  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    return {
      ok: res.ok,
      status: res.status,
      latencyMs: Math.round(performance.now() - start),
    };
  } catch (err) {
    return {
      ok: false,
      status: null,
      latencyMs: null,
      error: err instanceof Error ? err.message : "Network request failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

export interface AssetLoadResult {
  ok: boolean;
  latencyMs: number | null;
  error?: string;
}

export function checkAssetLoad(
  url = "/metrum-logo-white.webp",
  timeoutMs = 5000,
): Promise<AssetLoadResult> {
  const start = performance.now();

  return new Promise((resolve) => {
    const img = new Image();

    const timer = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      resolve({ ok: false, latencyMs: null, error: "Timed out" });
    }, timeoutMs);

    img.onload = () => {
      clearTimeout(timer);
      resolve({ ok: true, latencyMs: Math.round(performance.now() - start) });
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve({ ok: false, latencyMs: null, error: "Failed to load" });
    };

    img.src = `${url}?cachebust=${Date.now()}`;
  });
}

export interface ThreeJsCheckResult {
  ok: boolean;
  rendererInfo: string | null;
  error?: string;
}

/** Spins up a throwaway WebGLRenderer + scene off-DOM, renders one frame,
 * then tears everything down. Proves the actual render path the digital
 * twin depends on — not just raw WebGL context creation. */
export async function checkThreeJsRender(): Promise<ThreeJsCheckResult> {
  try {
    const THREE = await import("three");

    const canvas = document.createElement("canvas");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
    renderer.setSize(64, 64, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
    camera.position.z = 3;

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    renderer.render(scene, camera);
    const gl = renderer.getContext();
    const ok = !!gl && !gl.isContextLost();

    geometry.dispose();
    material.dispose();
    renderer.dispose();
    renderer.forceContextLoss();

    return { ok, rendererInfo: `three.js r${THREE.REVISION}` };
  } catch (err) {
    return {
      ok: false,
      rendererInfo: null,
      error: err instanceof Error ? err.message : "Render initialization failed",
    };
  }
}
