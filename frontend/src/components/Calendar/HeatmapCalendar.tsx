import { useEffect, useState } from 'react';
import { format, subDays, startOfWeek, differenceInCalendarDays } from 'date-fns';
import { entriesApi } from '../../api/client';
import type { Stats } from '../../types/journal';

const WEEKS = 52;
const DAYS = 7;

function intensityClass(wordCount: number): string {
  if (wordCount === 0) return 'fill-gray-100 dark:fill-gray-800';
  if (wordCount <= 200) return 'fill-journal-200';
  if (wordCount <= 500) return 'fill-journal-400';
  return 'fill-journal-600';
}

export function HeatmapCalendar() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    entriesApi.stats()
      .then((r) => setStats(r.data))
      .catch(() => {/* offline */})
      .finally(() => setLoading(false));
  }, []);

  const today = new Date();
  const startDate = subDays(startOfWeek(today, { weekStartsOn: 0 }), (WEEKS - 1) * 7);

  const dayMap = new Map<string, { count: number; wordCount: number }>();
  if (stats) {
    for (const d of stats.heatmap) {
      dayMap.set(d.date, { count: d.count, wordCount: d.wordCount });
    }
  }

  const cells: { date: Date; data: { count: number; wordCount: number } | undefined }[][] = [];

  for (let w = 0; w < WEEKS; w++) {
    const week: { date: Date; data: { count: number; wordCount: number } | undefined }[] = [];
    for (let d = 0; d < DAYS; d++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + w * 7 + d);
      const key = cellDate.toISOString().slice(0, 10);
      week.push({ date: cellDate, data: dayMap.get(key) });
    }
    cells.push(week);
  }

  const CELL = 13;
  const GAP = 2;
  const svgWidth = WEEKS * (CELL + GAP);
  const svgHeight = DAYS * (CELL + GAP);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Writing activity</h3>
        {stats && (
          <div className="flex gap-4 text-xs text-gray-500">
            <span>{stats.totalEntries} entries</span>
            <span>{stats.totalWords.toLocaleString()} words</span>
            <span className="text-journal-600 font-medium">{stats.streakDays}d streak</span>
          </div>
        )}
      </div>
      <svg width={svgWidth} height={svgHeight} className="overflow-visible">
        {cells.map((week, w) =>
          week.map((cell, d) => {
            const wc = cell.data?.wordCount ?? 0;
            const tooltip = `${format(cell.date, 'MMM d')}: ${cell.data?.count ?? 0} entries`;
            return (
              <rect
                key={`${w}-${d}`}
                x={w * (CELL + GAP)}
                y={d * (CELL + GAP)}
                width={CELL}
                height={CELL}
                rx={2}
                className={intensityClass(wc)}
              >
                <title>{tooltip}</title>
              </rect>
            );
          })
        )}
      </svg>
      <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
        <span>Less</span>
        {[0, 100, 300, 600].map((wc) => (
          <rect
            key={wc}
            className={`inline-block w-3 h-3 rounded-sm ${intensityClass(wc)}`}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
