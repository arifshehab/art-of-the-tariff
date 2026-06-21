// Effective tariff rates (%) by country, weekly 2025-2026. Source: tariff-rate-tracker
// (output/actual/daily/daily_by_country.csv + daily_overall.csv, weighted_etr).

import type { ReactNode } from "react";
export interface TimelineSeries {
  name: string;
  code: string;
  color: string;
  values: number[]; // one per DATES entry
}

export interface TimelineStep {
  date: string;   // display label
  at: string;     // ISO date the chart aligns to when this step is active
  title: string;
  body: React.ReactNode;
  quote?: React.ReactNode;
}

export const DATES = ['2025-01-01', '2025-01-08', '2025-01-15', '2025-01-22', '2025-01-29', '2025-02-05', '2025-02-12', '2025-02-19', '2025-02-26', '2025-03-05', '2025-03-12', '2025-03-19', '2025-03-26', '2025-04-02', '2025-04-09', '2025-04-16', '2025-04-23', '2025-04-30', '2025-05-07', '2025-05-14', '2025-05-21', '2025-05-28', '2025-06-04', '2025-06-11', '2025-06-18', '2025-06-25', '2025-07-02', '2025-07-09', '2025-07-16', '2025-07-23', '2025-07-30', '2025-08-06', '2025-08-13', '2025-08-20', '2025-08-27', '2025-09-03', '2025-09-10', '2025-09-17', '2025-09-24', '2025-10-01', '2025-10-08', '2025-10-15', '2025-10-22', '2025-10-29', '2025-11-05', '2025-11-12', '2025-11-19', '2025-11-26', '2025-12-03', '2025-12-10', '2025-12-17', '2025-12-24', '2025-12-31', '2026-01-07', '2026-01-14', '2026-01-21', '2026-01-28', '2026-02-04', '2026-02-11', '2026-02-18', '2026-02-25', '2026-03-04', '2026-03-11', '2026-03-18', '2026-03-25', '2026-04-01', '2026-04-08', '2026-04-15', '2026-04-22', '2026-04-29', '2026-05-06', '2026-05-13', '2026-05-20', '2026-05-27', '2026-06-03', '2026-06-10', '2026-06-17', '2026-06-24', '2026-07-01', '2026-07-08', '2026-07-15', '2026-07-22', '2026-07-29', '2026-08-05', '2026-08-12', '2026-08-19', '2026-08-26', '2026-09-02', '2026-09-09', '2026-09-16', '2026-09-23', '2026-09-30', '2026-10-07', '2026-10-14', '2026-10-21', '2026-10-28', '2026-11-04', '2026-11-11', '2026-11-18', '2026-11-25', '2026-12-02', '2026-12-09', '2026-12-16', '2026-12-23', '2026-12-30'];

export const SERIES: TimelineSeries[] = [
  { name: 'China', code: 'CN', color: '#e2504a', values: [11.9, 11.9, 11.9, 11.9, 11.9, 21.8, 21.8, 21.8, 21.8, 31.7, 32.6, 32.6, 32.6, 32.6, 89.1, 116.7, 116.7, 116.7, 109.3, 40.4, 40.4, 40.4, 41.5, 41.5, 41.5, 41.5, 41.4, 41.4, 41.4, 41.4, 41.4, 41.5, 41.5, 42.0, 42.0, 42.0, 42.0, 42.0, 42.0, 42.0, 42.0, 42.1, 42.1, 42.1, 42.1, 32.2, 32.2, 32.2, 32.2, 32.2, 32.2, 32.2, 32.2, 33.4, 33.4, 33.4, 33.4, 31.0, 31.0, 31.0, 20.7, 20.7, 20.7, 20.7, 20.7, 20.7, 23.2, 23.2, 23.2, 23.2, 23.2, 23.2, 23.2, 23.2, 23.2, 23.2, 23.2, 23.2, 23.2, 23.2, 23.2, 23.2, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 19.5, 19.5, 19.5, 19.5, 19.5, 19.5, 19.5, 19.5] },
  { name: 'European Union', code: 'EU', color: '#5dcaa5', values: [1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 2.2, 2.2, 2.2, 2.2, 12.7, 12.7, 12.7, 12.7, 13.3, 13.3, 13.3, 13.3, 14.3, 14.3, 14.3, 14.3, 14.1, 14.1, 14.1, 14.1, 14.1, 14.3, 16.3, 17.1, 17.1, 17.1, 17.1, 17.1, 17.1, 11.9, 11.9, 12.0, 12.0, 12.0, 12.0, 12.0, 12.0, 12.0, 12.0, 12.0, 12.0, 12.0, 12.0, 12.0, 12.0, 12.0, 12.0, 11.7, 11.7, 11.7, 10.6, 10.6, 10.6, 10.6, 10.6, 10.6, 11.1, 11.1, 11.1, 11.1, 11.1, 11.1, 11.1, 11.1, 11.1, 10.8, 10.8, 10.8, 10.8, 10.8, 10.8, 10.8, 7.7, 7.7, 7.7, 7.7, 7.7, 7.7, 7.7, 7.7, 7.7, 7.9, 7.9, 7.9, 7.9, 7.9, 7.9, 7.9, 7.9, 7.9, 7.9, 7.9, 7.9, 7.9, 7.9] },
  { name: 'Mexico', code: 'MX', color: '#7f77dd', values: [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 3.0, 3.6, 3.6, 3.6, 3.6, 5.7, 5.7, 5.7, 5.7, 5.6, 5.6, 5.6, 5.6, 6.4, 6.4, 6.4, 6.4, 6.3, 6.3, 6.3, 6.3, 6.3, 6.5, 6.5, 6.8, 6.8, 6.8, 6.8, 6.8, 6.8, 6.8, 6.8, 6.9, 6.9, 6.9, 7.6, 7.6, 7.6, 7.6, 7.6, 7.6, 7.6, 7.6, 7.6, 7.6, 7.6, 7.7, 7.7, 7.6, 7.6, 7.6, 6.5, 6.5, 6.5, 6.5, 6.5, 6.5, 6.8, 6.8, 6.8, 6.8, 6.8, 6.8, 6.8, 6.8, 6.8, 6.7, 6.7, 6.7, 6.7, 6.7, 6.7, 6.7, 6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.4] },
  { name: 'United Kingdom', code: 'GB', color: '#f0997b', values: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.5, 1.5, 1.5, 1.5, 10.9, 10.9, 10.9, 10.9, 11.2, 11.2, 11.2, 11.2, 11.4, 11.4, 11.4, 11.4, 8.2, 8.2, 8.2, 8.2, 8.2, 8.2, 8.2, 9.5, 9.5, 9.5, 9.5, 9.5, 9.5, 9.5, 9.5, 9.5, 9.5, 9.5, 9.7, 9.7, 9.7, 9.7, 9.7, 9.7, 9.7, 9.7, 9.7, 9.7, 9.7, 9.7, 9.7, 9.1, 9.1, 9.1, 7.4, 7.4, 7.4, 7.4, 7.4, 7.4, 9.1, 9.1, 9.1, 9.1, 9.1, 9.1, 9.1, 9.1, 9.1, 8.7, 8.7, 8.7, 8.7, 8.7, 8.7, 8.7, 6.0, 6.0, 6.0, 6.0, 6.0, 6.0, 6.0, 6.0, 6.0, 6.1, 6.1, 6.1, 6.1, 6.1, 6.1, 6.1, 6.1, 6.1, 6.1, 6.1, 6.1, 6.1, 6.1] },
  { name: 'Canada', code: 'CA', color: '#378add', values: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 1.7, 3.0, 3.0, 3.0, 3.0, 4.2, 4.2, 4.2, 4.2, 4.2, 4.2, 4.2, 4.2, 5.7, 5.7, 5.7, 5.7, 5.4, 5.4, 5.4, 5.4, 5.4, 6.2, 6.2, 6.5, 6.5, 6.5, 6.5, 6.5, 6.5, 6.5, 6.5, 6.7, 6.7, 6.7, 6.9, 6.9, 6.9, 6.9, 6.9, 6.9, 6.9, 6.9, 6.9, 6.9, 6.9, 6.9, 6.9, 6.9, 6.9, 6.9, 5.4, 5.4, 5.4, 5.4, 5.4, 5.4, 5.3, 5.3, 5.3, 5.3, 5.3, 5.3, 5.3, 5.3, 5.3, 5.3, 5.3, 5.3, 5.3, 5.3, 5.3, 5.3, 5.1, 5.1, 5.1, 5.1, 5.1, 5.1, 5.1, 5.1, 5.1, 5.3, 5.3, 5.3, 5.3, 5.3, 5.3, 5.3, 5.3, 5.3, 5.3, 5.3, 5.3, 5.3, 5.3] },
];

// US-wide import-weighted effective rate across all partners (daily_overall.csv).
export const OVERALL: TimelineSeries = {
  name: 'All imports (avg)', code: 'AVG', color: '#a4a4a4',
  values: [2.7, 2.7, 2.7, 2.7, 2.7, 4.0, 4.0, 4.0, 4.0, 6.0, 6.7, 6.7, 6.7, 6.7, 19.1, 22.8, 22.8, 22.8, 22.1, 12.8, 12.8, 12.8, 13.7, 13.7, 13.7, 13.7, 13.5, 13.5, 13.5, 13.5, 13.5, 13.7, 15.7, 16.3, 16.6, 16.6, 16.4, 16.2, 16.2, 15.6, 15.6, 15.7, 15.7, 15.7, 15.9, 14.5, 14.2, 14.2, 14.2, 14.0, 14.0, 14.0, 14.0, 14.2, 14.2, 14.2, 14.2, 13.7, 13.3, 13.3, 9.9, 9.9, 9.9, 9.9, 9.9, 9.9, 10.9, 10.9, 10.9, 10.9, 10.9, 10.9, 10.9, 10.9, 10.9, 10.8, 10.8, 10.8, 10.8, 10.8, 10.8, 10.8, 8.2, 8.2, 8.2, 8.2, 8.2, 8.2, 8.2, 8.2, 8.2, 8.5, 8.5, 8.5, 8.5, 8.5, 8.5, 8.6, 8.6, 8.6, 8.6, 8.6, 8.6, 8.6, 8.6],
};

export const STEPS: TimelineStep[] = [
  {
    date: "Jan 2025",
    at: "2025-01-20",
    title: "Inauguration of the Tariff Man",
    body: (
      <>
        {" "}
        Having dubbed himself the "Tariff Man", Trump took office with the
        stated goal of imposing broad tariffs on America's trading partners. He
        promptly issued the "America First Trade Policy"{" "}
        <a href="https://www.whitehouse.gov/presidential-actions/2025/01/america-first-trade-policy/" className="text-blue-400 underline">
          Executive Order{" "}
        </a>
        on his inauguration day, ordering agencies to investigate trade
        deficits, unfair trade practices, et al, and explore a global
        supplemental tariff.
      </>
    ),
    quote: (
      <>
        {" "}
        I will immediately begin the overhaul of our trade system to protect
        American workers and families. Instead of taxing our citizens to enrich
        other countries, we will tariff and tax foreign countries to enrich our
        citizens.
      </>
    ),
  },
  {
    date: "Apr 2025",
    at: "2025-04-23",
    title: "The China shock",
    body: "A wave of measures sends China’s effective rate spiking to roughly 117% — briefly an order of magnitude above everyone else.",
  },
  {
    date: "Jul 2025",
    at: "2025-07-02",
    title: "A high plateau",
    body: "China settles around 41%, while Japan, South Korea and the EU climb into the teens as new duties stack across sectors.",
  },
  {
    date: "Oct 2025",
    at: "2025-10-01",
    title: "The pack catches up",
    body: "India (~35%) and Brazil (~29%) push higher behind China. The gap between the most- and least-exposed economies is at its widest.",
  },
  {
    date: "Jan 2026",
    at: "2026-01-07",
    title: "De-escalation begins",
    body: "Deals and rollbacks start to bite — China eases toward 33%, and the steepest rates begin to retreat.",
  },
  {
    date: "Apr 2026",
    at: "2026-04-01",
    title: "Broad declines",
    body: "Rates fall across the board: China near 20%, with most other partners back into single digits.",
  },
  {
    date: "Jul 2026",
    at: "2026-07-01",
    title: "Settling down",
    body: "The picture stabilises — China around 19%, the rest clustered between 6% and 13%.",
  },
  {
    date: "Oct 2026",
    at: "2026-10-07",
    title: "A new equilibrium",
    body: "Rates hold well above where they began: the overall average near 8.5%, roughly triple its January-2025 level.",
  },
];
