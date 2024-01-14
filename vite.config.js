import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode, isSsrBuild, isPreview }) => {
  if (command === 'serve') {
    return {
    }
  } else {
    // command === 'build'
    return {
      base: '/GOL-3D/'
    }
  }
})