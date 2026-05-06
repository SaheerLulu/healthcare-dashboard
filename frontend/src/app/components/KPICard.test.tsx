import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KPICard } from './KPICard';

/**
 * a11y contract for KPICard (DASH-E00-A06).
 *
 * Every KPI tile is a top-of-fold element on Executive/Sales/Financial.
 * If a screen-reader user can't read the value or activate the
 * drill-through, the dashboard is unusable for them.
 */
describe('KPICard a11y', () => {
  it('exposes title and value via aria-label when interactive', () => {
    render(<KPICard title="Total Revenue" value="₹4.50Cr" onClick={() => {}} />);
    const tile = screen.getByRole('button', { name: /Total Revenue.*₹4.50Cr/ });
    expect(tile).toBeInTheDocument();
    expect(tile).toHaveAttribute('tabindex', '0');
  });

  it('renders as a non-interactive group when no onClick', () => {
    render(<KPICard title="GST Liability" value="₹1.20L" />);
    expect(screen.queryByRole('button')).toBeNull();
    const tile = screen.getByRole('group', { name: /GST Liability.*₹1.20L/ });
    expect(tile).toBeInTheDocument();
  });

  it('Enter key activates onClick on interactive cards', () => {
    const onClick = vi.fn();
    render(<KPICard title="Revenue" value="₹1Cr" onClick={onClick} />);
    const tile = screen.getByRole('button');
    tile.focus();
    fireEvent.keyDown(tile, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('Space key activates onClick on interactive cards', () => {
    const onClick = vi.fn();
    render(<KPICard title="Revenue" value="₹1Cr" onClick={onClick} />);
    const tile = screen.getByRole('button');
    tile.focus();
    fireEvent.keyDown(tile, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('aria-label includes trend direction and value', () => {
    render(
      <KPICard
        title="Revenue"
        value="₹1Cr"
        trend={{ value: '+12.3%', direction: 'up' }}
        onClick={() => {}}
      />,
    );
    const tile = screen.getByRole('button');
    expect(tile.getAttribute('aria-label')).toMatch(/up \+12\.3%/);
  });

  it('aria-label includes subtitle text', () => {
    render(<KPICard title="Cash" value="₹2Cr" subtitle="vs last month" />);
    const tile = screen.getByRole('group');
    expect(tile.getAttribute('aria-label')).toMatch(/vs last month/);
  });
});
