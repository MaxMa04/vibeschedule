'use client';

import { FC, useEffect, useMemo, useRef } from 'react';
import DrawChart from 'chart.js/auto';
import { chunk } from 'lodash';
import useCookie from 'react-use-cookie';

interface TotalList {
  date: string;
  total: number;
}

function mergeDataPoints(data: TotalList[], numPoints: number): TotalList[] {
  const res = chunk(data, Math.ceil(data.length / numPoints));
  return res.map((row) => {
    return {
      date: `${row[0].date} - ${row?.at(-1)?.date}`,
      total: row.reduce((acc, curr) => acc + curr.total, 0),
    };
  });
}

// VibeLabs coral, teal and amber
const colorSchemes = {
  coral: { fill: 'rgba(255, 107, 74, 0.12)', border: 'rgb(255, 107, 74)' },
  teal: { fill: 'rgba(31, 182, 166, 0.12)', border: 'rgb(31, 182, 166)' },
  amber: { fill: 'rgba(232, 169, 75, 0.12)', border: 'rgb(232, 169, 75)' },
};

export const ChartSocial: FC<{
  data: TotalList[];
  color: keyof typeof colorSchemes;
}> = (props) => {
  const { data, color } = props;
  const [mode] = useCookie('mode', 'light');

  const list = useMemo(() => {
    const merged = data.length < 7 ? data : mergeDataPoints(data, 7);
    if (merged.length === 1) {
      return [
        // duplicating single datapoints metrics for chart to display a line on analytics
        merged[0],
        merged[0],
      ];
    }
    return merged;
  }, [data]);

  const ref = useRef<any>(null);
  const chart = useRef<null | DrawChart>(null);

  const colors = colorSchemes[color];

  useEffect(() => {
    chart.current = new DrawChart(ref.current!, {
      type: 'line',
      options: {
        maintainAspectRatio: false,
        responsive: true,
        animation: {
          duration: 750,
          easing: 'easeOutQuart',
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
        layout: {
          padding: {
            left: 0,
            right: 0,
            top: 4,
            bottom: 0,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            display: false,
          },
          x: {
            display: false,
            ticks: {
              stepSize: 10,
              maxTicksLimit: 7,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: true,
            backgroundColor: mode === 'dark' ? '#141518' : '#FFFFFF',
            titleColor: mode === 'dark' ? '#F2F2F2' : '#16232E',
            bodyColor: mode === 'dark' ? '#A8A8A8' : '#4A5A66',
            borderColor: mode === 'dark' ? '#232529' : '#E2E2DA',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            displayColors: false,
            titleFont: {
              size: 12,
              weight: 'normal',
            },
            bodyFont: {
              size: 14,
              weight: 'bold',
            },
          },
        },
      },
      data: {
        labels: list.map((row) => row.date),
        datasets: [
          {
            borderColor: colors.border,
            borderWidth: 2,
            label: '',
            backgroundColor: colors.fill,
            fill: true,
            data: list.map((row) => row.total),
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: colors.border,
            pointHoverBorderColor: mode === 'dark' ? '#141518' : '#FFFFFF',
            pointHoverBorderWidth: 2,
          },
        ],
      },
    });
    return () => {
      chart?.current?.destroy();
    };
  }, []);

  return <canvas className="w-full h-full" ref={ref} />;
};
