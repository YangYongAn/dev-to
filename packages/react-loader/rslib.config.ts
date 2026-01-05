import { defineConfig } from '@rslib/core'

export default defineConfig({
  lib: [
    {
      format: 'esm',
      bundle: true,
      autoExtension: false,
      dts: true,
      tools: {
        swc: {
          jsc: {
            transform: {
              react: {
                runtime: 'automatic',
              },
            },
          },
        },
      },
      output: {
        target: 'web',
      },
      source: {
        entry: {
          index: './src/index.ts',
        },
      },
    },
  ],
})
