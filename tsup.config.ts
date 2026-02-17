import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  external: [
    '@nestjs/common',
    '@nestjs/core',
    '@nestjs/config',
    '@nestjs/event-emitter',
    'reflect-metadata',
    'rxjs',
  ],
});
