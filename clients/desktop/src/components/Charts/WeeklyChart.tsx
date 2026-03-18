import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { DayHistoryItem, DayStats } from '../../store/useAppStore';
import { buildWeeklyChartData } from './chartData';

interface Props {
  history: DayHistoryItem[];
  currentDay: DayStats;
}

export function WeeklyChart({ history, currentDay }: Props) {
  const { t } = useTranslation();
  const chartData = useMemo(() => buildWeeklyChartData(history, currentDay), [history, currentDay]);

  return (
    <div style={{ width: '100%', height: 300, marginTop: 20 }}>
      <h3 style={{ color: 'rgba(255,255,255,0.9)', marginBottom: 10, fontSize: 16 }}>{t('stats.weekly_overview')}</h3>
      <ResponsiveContainer>
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.1)" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="rgba(255,255,255,0.5)" 
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis 
            yAxisId="left"
            stroke="rgba(255,255,255,0.5)" 
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            label={{ value: t('stats.stand_count'), angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            stroke="rgba(255,255,255,0.5)" 
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            label={{ value: `${t('stats.sit_duration')}(h)`, angle: 90, position: 'insideRight', fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8 }}
            itemStyle={{ color: '#fff' }}
            labelStyle={{ color: '#aaa' }}
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
          />
          <Legend wrapperStyle={{ paddingTop: 10 }} />
          <Bar yAxisId="left" dataKey="standCount" name={t('stats.stand_count')} barSize={20} fill="#00ff88" radius={[4, 4, 0, 0]}>
             {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.standCount >= 6 ? '#00ff88' : 'rgba(255,68,68,0.8)'} />
             ))}
          </Bar>
          <Line yAxisId="right" type="monotone" dataKey="sitHours" name={t('stats.sit_duration')} stroke="#ffcc00" strokeWidth={2} dot={{ r: 3, fill: '#ffcc00' }} activeDot={{ r: 5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
