/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
import type PixiGameScene from './game/PixiGameScene';

declare global {
  interface Window {
    __wordShooterPixi?: PixiGameScene;
  }
}

declare module '*.png' {
  const source: string;
  export default source;
}
declare module '*.webp' {
  const source: string;
  export default source;
}
declare module '*.wav' {
  const source: string;
  export default source;
}
