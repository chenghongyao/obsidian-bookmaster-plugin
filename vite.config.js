import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
    minify: false,
    build: {
        lib: {
            entry: "./src/main.ts",
            formats: ['cjs']
        },
        rollupOptions: {
            external: [
                "obsidian"
            ],
            output: {
                entryFileNames: 'main.js',
                assetFileNames: 'styles.css',
                dir: "./",
                sourcemap: 'inline',
                format: 'cjs',
                exports: 'default',
            }
        },
    },
    plugins: [
        vue(),
    ]

    

})
