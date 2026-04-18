declare module "vanta/dist/vanta.cells.min.js" {
  import type * as THREE from "three";

  interface VantaOptions {
    el: HTMLElement;
    THREE: typeof THREE;
    [key: string]: unknown;
  }

  interface VantaEffect {
    destroy: () => void;
  }

  export default function CELLS(options: VantaOptions): VantaEffect;
}

declare module "vanta/dist/vanta.fog.min.js" {
  import type * as THREE from "three";

  interface VantaOptions {
    el: HTMLElement;
    THREE: typeof THREE;
    [key: string]: unknown;
  }

  interface VantaEffect {
    destroy: () => void;
  }

  export default function FOG(options: VantaOptions): VantaEffect;
}
