/// <reference types="vite/client" />

declare module '*/package.json' {
  export const version: string
  const content: { version: string; [key: string]: unknown }
  export default content
}
