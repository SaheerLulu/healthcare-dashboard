import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactElement } from 'react';
import { ChartCard } from './ChartCard';
import { CrossFilterProvider } from '../contexts/CrossFilterContext';

// ChartCard calls useNavigate() (drill-through) and its ContextMenu uses
// useCrossFilter, so renders need a Router + CrossFilterProvider.
const renderCard = (ui: ReactElement) =>
  render(
    <MemoryRouter>
      <CrossFilterProvider>{ui}</CrossFilterProvider>
    </MemoryRouter>,
  );

const sampleData = [
  { month: '2026-01', revenue: 1200 },
  { month: '2026-02', revenue: 1800 },
];

describe('ChartCard a11y', () => {
  it('exposes a labelled landmark with the chart title', () => {
    renderCard(
      <ChartCard title="Revenue & Profit Trend">
        <div data-testid="chart-body">chart</div>
      </ChartCard>,
    );
    const region = screen.getByRole('region', { name: 'Revenue & Profit Trend' });
    expect(region).toBeInTheDocument();
    expect(within(region).getByTestId('chart-body')).toBeInTheDocument();
  });

  it('renders the title as a heading', () => {
    renderCard(
      <ChartCard title="Sales by Channel">
        <span />
      </ChartCard>,
    );
    expect(screen.getByRole('heading', { name: 'Sales by Channel' })).toBeInTheDocument();
  });

  it('action buttons carry the focus-visible ring class', () => {
    renderCard(
      <ChartCard title="X" data={sampleData} drillTarget="/detail/sales">
        <span />
      </ChartCard>,
    );
    const toolbar = screen.getByRole('toolbar', { name: 'X actions' });
    const buttons = within(toolbar).getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    for (const b of buttons) {
      expect(b.className).toMatch(/focus-visible:ring-2/);
    }
  });
});

describe('ChartCard header actions', () => {
  it('always shows Full Screen; data-dependent buttons are hidden without data', () => {
    renderCard(<ChartCard title="X"><span /></ChartCard>);
    const toolbar = screen.getByRole('toolbar', { name: 'X actions' });
    expect(within(toolbar).getByRole('button', { name: 'Full Screen' })).toBeInTheDocument();
    expect(within(toolbar).queryByRole('button', { name: 'Show Data Table' })).toBeNull();
    expect(within(toolbar).queryByRole('button', { name: 'Download CSV' })).toBeNull();
    expect(within(toolbar).getAllByRole('button').length).toBe(1);
  });

  it('shows Show Data Table and Download CSV when data is provided', () => {
    renderCard(<ChartCard title="X" data={sampleData}><span /></ChartCard>);
    const toolbar = screen.getByRole('toolbar', { name: 'X actions' });
    expect(within(toolbar).getByRole('button', { name: 'Show Data Table' })).toBeInTheDocument();
    expect(within(toolbar).getByRole('button', { name: 'Download CSV' })).toBeInTheDocument();
    expect(within(toolbar).getByRole('button', { name: 'Full Screen' })).toBeInTheDocument();
    expect(within(toolbar).getAllByRole('button').length).toBe(3);
  });

  it('shows the drill-through button when drillTarget is set', () => {
    renderCard(
      <ChartCard title="X" drillTarget="/detail/sales">
        <span />
      </ChartCard>,
    );
    const toolbar = screen.getByRole('toolbar', { name: 'X actions' });
    expect(
      within(toolbar).getByRole('button', { name: 'Drill through to records' }),
    ).toBeInTheDocument();
  });

  it('Full Screen opens a fullscreen dialog containing the chart', () => {
    renderCard(
      <ChartCard title="Trend">
        <div data-testid="chart-body">chart</div>
      </ChartCard>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Full Screen' }));
    const dialog = screen.getByRole('dialog', { name: 'Trend full screen' });
    expect(within(dialog).getByTestId('chart-body')).toBeInTheDocument();
  });

  it('Show Data Table opens the data-behind modal with the chart rows', () => {
    renderCard(<ChartCard title="Trend" data={sampleData}><span /></ChartCard>);
    fireEvent.click(screen.getByRole('button', { name: 'Show Data Table' }));
    const dialog = screen.getByRole('dialog', { name: 'Data behind Trend' });
    expect(within(dialog).getByText('2026-01')).toBeInTheDocument();
    // numbers are rendered with en-IN locale grouping
    expect(within(dialog).getByText('1,200')).toBeInTheDocument();
  });
});

describe('ChartCard drill & provenance', () => {
  it('right-click on the chart opens the owned context menu when drillTarget is set', () => {
    renderCard(
      <ChartCard title="Trend" drillTarget="/detail/sales" data={sampleData}>
        <div data-testid="chart-body">chart</div>
      </ChartCard>,
    );
    fireEvent.contextMenu(screen.getByTestId('chart-body'));
    expect(screen.getByText('Drill Through to Data')).toBeInTheDocument();
  });

  it('right-click does nothing without a drillTarget', () => {
    renderCard(
      <ChartCard title="Trend">
        <div data-testid="chart-body">chart</div>
      </ChartCard>,
    );
    fireEvent.contextMenu(screen.getByTestId('chart-body'));
    expect(screen.queryByText('Drill Through to Data')).toBeNull();
  });

  it('info prop renders a provenance popover with formula and source', () => {
    renderCard(
      <ChartCard
        title="Trend"
        info={{ formula: 'sum of unit_price × qty', source: 'report_sales', notes: 'COGS modeled at 70%' }}
      >
        <span />
      </ChartCard>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'How is this calculated?' }));
    expect(screen.getByText('sum of unit_price × qty')).toBeInTheDocument();
    expect(screen.getByText(/report_sales/)).toBeInTheDocument();
    expect(screen.getByText(/COGS modeled at 70%/)).toBeInTheDocument();
  });

  it('no provenance button when info is omitted', () => {
    renderCard(<ChartCard title="Trend"><span /></ChartCard>);
    expect(screen.queryByRole('button', { name: 'How is this calculated?' })).toBeNull();
  });
});
