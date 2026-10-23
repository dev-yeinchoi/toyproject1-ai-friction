/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VERCEL_ENV?: string;
  readonly VITE_CLARITY_PROJECT_ID?: string;
  readonly VITE_ENABLE_CLARITY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
