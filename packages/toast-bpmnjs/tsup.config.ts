import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
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
});
