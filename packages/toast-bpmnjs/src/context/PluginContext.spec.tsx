import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PluginProvider, usePluginContext } from './PluginContext';
import type { IToastBpmnPlugin } from '../plugin/plugin-interface';

function Consumer() {
  const plugin = usePluginContext();
  return <div data-testid="plugin">{plugin ? 'has-plugin' : 'no-plugin'}</div>;
}

describe('PluginContext', () => {
  it('provides null when no PluginProvider is present', () => {
    render(<Consumer />);
    expect(screen.getByTestId('plugin').textContent).toBe('no-plugin');
  });

  it('provides the plugin value through PluginProvider', () => {
    const plugin: IToastBpmnPlugin = {};
    render(
      <PluginProvider plugin={plugin}>
        <Consumer />
      </PluginProvider>
    );
    expect(screen.getByTestId('plugin').textContent).toBe('has-plugin');
  });
});
