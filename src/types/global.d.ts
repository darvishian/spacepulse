/**
 * Global type declarations and module augmentation
 */

declare global {
  interface Window {
    CESIUM_BASE_URL?: string;
  }

  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_CESIUM_ION_TOKEN?: string;
      NEXT_PUBLIC_WS_URL?: string;
      NEXT_PUBLIC_API_URL?: string;
      NEXT_PUBLIC_DEBUG_MODE?: string;
      NEXT_PUBLIC_DISABLE_ANIMATIONS?: string;
    }
  }
}

export {};
