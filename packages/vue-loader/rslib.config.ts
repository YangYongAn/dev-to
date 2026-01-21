import { defineConfig } from '@rslib/core'

export default defineConfig({
  lib: [
    {
      format: 'esm',
      bundle: true,
      autoExtension: false,
      dts: true,
      output: {
        target: 'web',
      },
      source: {
        entry: {
          index: './src/index.ts',
        },
      },
    },
    {
      format: 'umd',
      bundle: true,
      autoExtension: false,
      dts: false,
      umdName: 'DevToVueLoader',
      output: {
        target: 'web',
        externals: {
          vue: 'Vue',
        },
      },
      source: {
        entry: {
          'index.umd': './src/index.ts',
        },
      },
    },
  ],
})
