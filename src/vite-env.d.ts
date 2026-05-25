/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NTFY_TOPIC: string
  readonly VITE_IMIE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
