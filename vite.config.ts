import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'
import fs from 'fs'
import pkg from './package.json'

const reactPlugin = react()

// Workaround: Vite's default loader fails to read .tsx files when the resolved
// id uses a real drive path (D:/...) inside a sandboxed environment. This custom
// loader reads the file directly and returns its content so the React plugin's
// transform hook can run on it.
const fsLoader = {
  name: 'fs-loader-workaround',
  enforce: 'pre' as const,
  load(id: string) {
    if (id.endsWith('.tsx') || id.endsWith('.ts')) {
      try {
        const code = fs.readFileSync(id, 'utf8')
        return { code, map: null }
      } catch {
        return null
      }
    }
    return null
  }
}

export default defineConfig({
  plugins: [
    fsLoader,
    reactPlugin,
    electron([
      {
        entry: 'electron/main.ts',
        onstart(options) {
          options.startup()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            minify: false,
            rollupOptions: {
              external: ['electron'],
              output: {
                format: 'cjs',
                inlineDynamicImports: true
              }
            }
          }
        }
      }
    ]),
    renderer()
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
