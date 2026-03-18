import React, { useMemo } from 'react';
import { ActivityLog } from '../../store/useAppStore';

interface Props {
  logs: ActivityLog[];
}

export function HeatmapChart({ logs }: Props) {
  const data = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    const pad2 = (n: number) => n.toString().padStart(2, '0');
    const getDayKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

    return days.map(day => {
      const dayKey = getDayKey(day);
      const dayLogs = logs.filter(log => {
          const logDate = new Date(log.at);
          return getDayKey(logDate) === dayKey;
      });

      const hours = Array.from({ length: 24 }, (_, h) => {
        const hourLogs = dayLogs.filter(log => new Date(log.at).getHours() === h);
        let standMs = 0;
        hourLogs.forEach(log => {
          if (log.type === 'stood' || log.type === 'stand_work_end') {
             const payload = log.payload as { standDurationMs?: number };
             if (payload?.standDurationMs) {
               standMs += payload.standDurationMs;
             }
          }
        });

        const sitMinutes = Math.max(0, 60 - Math.round(standMs / 60000));
        return { hour: h, sitMinutes };
      });

      return {
        date: dayKey.slice(5),
        hours
      };
    });
  }, [logs]);

  const getColor = (minutes: number) => {
    if (minutes < 15) return 'rgba(0, 255, 136, 0.15)';
    if (minutes < 30) return 'rgba(255, 255, 255, 0.1)';
    if (minutes < 45) return 'rgba(255, 204, 0, 0.4)';
    return 'rgba(255, 68, 68, 0.6)';
  };

  return (
    <div style={{ width: '100%', marginTop: 20 }}>
      <div style={{ display: 'flex', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4, paddingLeft: 40 }}>
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>{i * 2}</div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {data.map(day => (
          <div key={day.date} style={{ display: 'flex', alignItems: 'center', height: 24 }}>
            <div style={{ width: 40, fontSize: 10, color: 'rgba(255,255,255,0.6)', textAlign: 'right', paddingRight: 8 }}>
              {day.date}
            </div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 1, height: '100%' }}>
              {day.hours.map(h => (
                <div
                  key={h.hour}
                  title={`${h.hour}:00 - sit ${h.sitMinutes}m`}
                  style={{
                    backgroundColor: getColor(h.sitMinutes),
                    borderRadius: 1,
                    cursor: 'default'
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
        <span>Less Sedentary</span>
        <div style={{ display: 'flex', gap: 1 }}>
           <div style={{ width: 8, height: 8, background: 'rgba(0, 255, 136, 0.15)' }} />
           <div style={{ width: 8, height: 8, background: 'rgba(255, 255, 255, 0.1)' }} />
           <div style={{ width: 8, height: 8, background: 'rgba(255, 204, 0, 0.4)' }} />
           <div style={{ width: 8, height: 8, background: 'rgba(255, 68, 68, 0.6)' }} />
        </div>
        <span>More Sedentary</span>
      </div>
    </div>
  );
}
