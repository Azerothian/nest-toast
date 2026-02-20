import { defineConfig, type Options } from 'tsup';

const shared: Options = {
  entry: ['src/index.ts'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  external: [
    'react',
    'react-dom',
    'bpmn-js',
    'bpmn-js-properties-panel',
    '@bpmn-io/properties-panel',
    'bpmn-moddle',
  ],
};

export default defineConfig([
  {
    ...shared,
    format: 'esm',
    banner: { js: "import React from 'react';" },
  },
  {
    ...shared,
    format: 'cjs',
    banner: { js: "const React = require('react');" },
    dts: false,
  },
]);
