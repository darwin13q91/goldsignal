/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_TWELVE_DATA_API_KEY: string
  readonly VITE_PAYMONGO_PUBLIC_KEY: string
  readonly VITE_PAYMONGO_SECRET_KEY: string
  readonly VITE_ENVIRONMENT: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
