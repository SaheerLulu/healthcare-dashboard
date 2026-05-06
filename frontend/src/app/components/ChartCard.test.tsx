import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ChartCard } from './ChartCard';

describe('ChartCard a11y', () => {
  it('exposes a labelled landmark with the chart title', () => {
    render(
      <ChartCard title="Revenue & Profit Trend">
        <div data-testid="chart-body">chart</div>
      </ChartCard>,
    );
    const region = screen.getByRole('region', { name: 'Revenue & Profit Trend' });
    expect(region).toBeInTheDocument();
    expect(within(region).getByTestId('chart-body')).toBeInTheDocument();
  });

  it('renders the title as a heading', () => {
    render(
      <ChartCard title="Sales by Channel">
        <span />
      </ChartCard>,
    );
    expect(screen.getByRole('heading', { name: 'Sales by Channel' })).toBeInTheDocument();
  });

  it('exposes a toolbar with five action buttons', () => {
    render(<ChartCard title="X"><span /></ChartCard>);
    const toolbar = screen.getByRole('toolbar', { name: 'X actions' });
    const buttons = within(toolbar).getAllByRole('button');
    expect(buttons.length).toBe(5);
    // Each button has an aria-label matching its title
    const labels = buttons.map((b) => b.getAttribute('aria-label'));
    expect(labels).toEqual(
      expect.arrayContaining(['Focus Mode', 'Show Data Table', 'Full Screen', 'Download', 'More Options']),
    );
  });

  it('action buttons carry the focus-visible ring class', () => {
    render(<ChartCard title="X"><span /></ChartCard>);
    const buttons = screen.getAllByRole('button');
    for (const b of buttons) {
      expect(b.className).toMatch(/focus-visible:ring-2/);
    }
  });
});
