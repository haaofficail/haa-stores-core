import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SystemThemeProvider, useSystemTheme } from './SystemThemeProvider';

describe('SystemThemeProvider', () => {
  beforeEach(() => {
    document.documentElement.innerHTML = '<head></head><body><div id="root"></div></body>';
  });

  it('renders children', () => {
    render(
      <SystemThemeProvider>
        <div data-testid="child">Hello</div>
      </SystemThemeProvider>
    );
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  it('applies .haa-system-theme class to wrapper', () => {
    render(
      <SystemThemeProvider>
        <div data-testid="child">Hello</div>
      </SystemThemeProvider>
    );
    const wrapper = screen.getByTestId('child').parentElement;
    expect(wrapper).toHaveClass('haa-system-theme');
  });

  it('sets data-theme-scope="system"', () => {
    render(
      <SystemThemeProvider>
        <div data-testid="child">Hello</div>
      </SystemThemeProvider>
    );
    const wrapper = screen.getByTestId('child').parentElement;
    expect(wrapper).toHaveAttribute('data-theme-scope', 'system');
  });

  it('sets data-haa-theme="light" by default', () => {
    render(
      <SystemThemeProvider>
        <div data-testid="child">Hello</div>
      </SystemThemeProvider>
    );
    const wrapper = screen.getByTestId('child').parentElement;
    expect(wrapper).toHaveAttribute('data-haa-theme', 'light');
  });

  it('sets data-haa-theme="dark" when defaultMode is dark', () => {
    render(
      <SystemThemeProvider defaultMode="dark">
        <div data-testid="child">Hello</div>
      </SystemThemeProvider>
    );
    const wrapper = screen.getByTestId('child').parentElement;
    expect(wrapper).toHaveAttribute('data-haa-theme', 'dark');
  });

  it('does NOT write to document.documentElement', () => {
    render(
      <SystemThemeProvider>
        <div data-testid="child">Hello</div>
      </SystemThemeProvider>
    );
    const htmlStyle = document.documentElement.style;
    expect(htmlStyle.getPropertyValue('--haa-surface-1')).toBe('');
    expect(htmlStyle.getPropertyValue('--haa-text-primary')).toBe('');
  });

  it('provides mode context via useSystemTheme', () => {
    function TestConsumer() {
      const { mode } = useSystemTheme();
      return <div data-testid="mode">{mode}</div>;
    }
    render(
      <SystemThemeProvider defaultMode="dark">
        <TestConsumer />
      </SystemThemeProvider>
    );
    expect(screen.getByTestId('mode').textContent).toBe('dark');
  });

  it('throws when useSystemTheme is used outside provider', () => {
    function TestConsumer() {
      useSystemTheme();
      return null;
    }
    expect(() => render(<TestConsumer />)).toThrow('useSystemTheme must be used within SystemThemeProvider');
  });
});
