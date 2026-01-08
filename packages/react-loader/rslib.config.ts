import { defineConfig } from '@rslib/core'

export default defineConfig({
  lib: [
    // ESM build for modern bundlers
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
    // UMD build for browsers
    {
      format: 'umd',
      bundle: true,
      autoExtension: false,
      dts: false,
      umdName: 'DevToReactLoader',
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
        externals: {
          'react': 'React',
          'react-dom': 'ReactDOM',
          'react-dom/client': 'ReactDOM',
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
