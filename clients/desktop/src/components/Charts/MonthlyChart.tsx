import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { DayHistoryItem, DayStats } from '../../store/useAppStore';
import { buildMonthlyChartData } from './chartData';

interface Props {
  history: DayHistoryItem[];
  currentDay: DayStats;
}

export function MonthlyChart({ history, currentDay }: Props) {
  const { t } = useTranslation();
  const chartData = useMemo(() => buildMonthlyChartData(history, currentDay), [history, currentDay]);

  return (
    <div style={{ width: '100%', height: 300, marginTop: 20 }}>
      <h3 style={{ color: 'rgba(255,255,255,0.9)', marginBottom: 10, fontSize: 16 }}>{t('stats.monthly_overview')}</h3>
      <ResponsiveContainer>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#00ff88" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.1)" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="rgba(255,255,255,0.5)" 
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            dy={10}
            interval={2}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.5)" 
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            label={{ value: t('stats.health_degree'), angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8 }}
            itemStyle={{ color: '#00ff88' }}
            labelStyle={{ color: '#aaa' }}
            cursor={{ stroke: 'rgba(255,255,255,0.2)' }}
          />
          <Area 
            type="monotone" 
            dataKey="score" 
            name={t('stats.health_degree')} 
            stroke="#00ff88" 
            fillOpacity={1} 
            fill="url(#colorScore)" 
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
