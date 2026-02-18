import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PluginProvider } from '../context/PluginContext';
import { usePlugin } from './usePlugin';
import type { IToastBpmnPlugin } from '../plugin/plugin-interface';

function Consumer() {
  const plugin = usePlugin();
  return <div data-testid="result">{plugin ? 'plugin-present' : 'no-plugin'}</div>;
}

describe('usePlugin', () => {
  it('returns null outside of PluginProvider', () => {
    render(<Consumer />);
    expect(screen.getByTestId('result').textContent).toBe('no-plugin');
  });

  it('returns the plugin when inside PluginProvider', () => {
    const plugin: IToastBpmnPlugin = { getChainEventNames: async () => [] };
    render(
      <PluginProvider plugin={plugin}>
        <Consumer />
      </PluginProvider>
    );
    expect(screen.getByTestId('result').textContent).toBe('plugin-present');
  });
});
