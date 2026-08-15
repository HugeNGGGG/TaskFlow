export type PunchLike = {
  type: 'IN' | 'OUT';
  punchTime: Date;
};

const HKT_OFFSET_MS = 8 * 60 * 60 * 1000;

export function toLocalDateString(d: Date): string {
  return new Date(d.getTime() + HKT_OFFSET_MS).toISOString().slice(0, 10);
}

export function localDayStartUtc(date: string): Date {
  return new Date(`${date}T00:00:00+08:00`);
}

export function localDayEndUtc(date: string): Date {
  return new Date(`${date}T23:59:59.999+08:00`);
}

function toDayMinutes(d: Date): number {
  const hkt = new Date(d.getTime() + HKT_OFFSET_MS);
  return hkt.getUTCHours() * 60 + hkt.getUTCMinutes();
}

function parseTime(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

function lunchOverlapMinutes(
  start: Date,
  end: Date,
  lunchStart: string,
  lunchEnd: string,
): number {
  const startMin = toDayMinutes(start);
  const raw = minutesBetween(start, end);
  const endMin = Math.min(startMin + raw, 24 * 60);
  const ls = parseTime(lunchStart);
  const le = parseTime(lunchEnd);
  return Math.max(0, Math.min(endMin, le) - Math.max(startMin, ls));
}

export function pairDayPunches(
  punches: PunchLike[],
  options: { deductLunch: boolean; lunchStart: string; lunchEnd: string },
) {
  const sorted = [...punches].sort((a, b) => a.punchTime.getTime() - b.punchTime.getTime());
  const results: {
    date: string;
    startTime: Date;
    endTime: Date;
    durationMinutes: number;
    status: 'NORMAL' | 'MISSING_IN' | 'MISSING_OUT';
    note?: string;
  }[] = [];
  let pendingIn: PunchLike | null = null;
  let inCount = 0;

  const duration = (start: Date, end: Date) => {
    const raw = minutesBetween(start, end);
    if (!options.deductLunch) return Math.max(raw, 0);
    return Math.max(
      raw -
        lunchOverlapMinutes(start, end, options.lunchStart, options.lunchEnd),
      0,
    );
  };

  for (const punch of sorted) {
    if (punch.type === 'IN') {
      pendingIn = punch;
      inCount += 1;
    } else if (pendingIn) {
      results.push({
        date: toLocalDateString(pendingIn.punchTime),
        startTime: pendingIn.punchTime,
        endTime: punch.punchTime,
        durationMinutes: duration(pendingIn.punchTime, punch.punchTime),
        status: 'NORMAL',
        note: inCount > 1 ? '当天多次上班打卡，取最后一次与本次下班配对' : undefined,
      });
      pendingIn = null;
      inCount = 0;
    } else {
      results.push({
        date: toLocalDateString(punch.punchTime),
        startTime: punch.punchTime,
        endTime: punch.punchTime,
        durationMinutes: 0,
        status: 'MISSING_IN',
        note: '缺少上班打卡',
      });
    }
  }

  if (pendingIn) {
    results.push({
      date: toLocalDateString(pendingIn.punchTime),
      startTime: pendingIn.punchTime,
      endTime: pendingIn.punchTime,
      durationMinutes: 0,
      status: 'MISSING_OUT',
      note: inCount > 1 ? '当天多次上班打卡且未下班' : '缺少下班打卡',
    });
  }

  return results;
}
