import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  external: [
    '@azerothian/toast',
    '@nestjs/common',
    '@nestjs/core',
    '@nestjs/event-emitter',
    'bpmn-moddle',
    'bullmq',
    'ioredis',
    'reflect-metadata',
    'rxjs',
  ],
});
