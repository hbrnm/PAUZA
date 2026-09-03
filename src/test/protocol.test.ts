import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWallClockTimer } from '../hooks/useWallClockTimer';
import {
  ACCIDENTAL_EXIT_THRESHOLD_SECONDS,
  EXTENSION_SECONDS,
  INITIAL_DURATION_SECONDS,
  MAX_DURATION_SECONDS,
  normalizeEpisode,
  getEpisodeStartedAt,
  PROTOCOL_VERSION
} from '../types';
import {
  buildExportPayload,
  clearActiveSession,
  db,
  exportDataSafe,
  loadActiveSession,
  loadEpisodesSafe,
  saveActiveSession,
  saveEpisodeValidated
} from '../db';

describe('protocol timing constants', () => {
  it('starts at 180 seconds', () => {
    expect(INITIAL_DURATION_SECONDS).toBe(180);
  });

  it('extends by 120 seconds', () => {
    expect(EXTENSION_SECONDS).toBe(120);
  });

  it('caps at 300 seconds', () => {
    expect(MAX_DURATION_SECONDS).toBe(300);
    expect(INITIAL_DURATION_SECONDS + EXTENSION_SECONDS).toBe(300);
  });
});

describe('useWallClockTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts down from 180 seconds', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useWallClockTimer({
        isActive: true,
        initialDurationSeconds: INITIAL_DURATION_SECONDS,
        onComplete
      })
    );

    expect(result.current.secondsLeft).toBe(180);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.secondsLeft).toBe(175);
    expect(result.current.elapsedSeconds).toBe(5);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('extends by +120 and reaches max 300 total duration', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useWallClockTimer({
        isActive: true,
        initialDurationSeconds: INITIAL_DURATION_SECONDS,
        onComplete
      })
    );

    act(() => {
      result.current.extend(EXTENSION_SECONDS);
    });

    expect(result.current.totalDuration).toBe(300);
    expect(result.current.secondsLeft).toBe(300);
  });

  it('completes when wall-clock reaches zero', () => {
    const onComplete = vi.fn();
    renderHook(() =>
      useWallClockTimer({
        isActive: true,
        initialDurationSeconds: 3,
        onComplete
      })
    );

    act(() => {
      vi.advanceTimersByTime(3500);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe('early exit rules', () => {
  it('treats exits under 5 seconds as accidental', () => {
    expect(4 < ACCIDENTAL_EXIT_THRESHOLD_SECONDS).toBe(true);
  });

  it('keeps exits at or above 5 seconds', () => {
    expect(5 >= ACCIDENTAL_EXIT_THRESHOLD_SECONDS).toBe(true);
  });
});

describe('Dexie persistence & export', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('skips accidental saves under 5s without trigger', async () => {
    const result = await saveEpisodeValidated({
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationSeconds: 3,
      extendedTime: false,
      outcome: 'iesire_rapida',
      protocolVersion: PROTOCOL_VERSION
    });
    expect(result.saved).toBe(false);
    if (!result.saved) expect(result.reason).toBe('skipped');
    expect(await db.episodes.count()).toBe(0);
  });

  it('saves outcome and trigger', async () => {
    const startedAt = '2026-01-01T10:00:00.000Z';
    const completedAt = '2026-01-01T10:03:00.000Z';
    const result = await saveEpisodeValidated({
      startedAt,
      completedAt,
      durationSeconds: 180,
      extendedTime: true,
      trigger: 'stres',
      outcome: 'depasit',
      protocolVersion: PROTOCOL_VERSION,
      timestamp: completedAt
    });

    expect(result.saved).toBe(true);
    const loaded = await loadEpisodesSafe();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.episodes).toHaveLength(1);
    expect(loaded.episodes[0].outcome).toBe('depasit');
    expect(loaded.episodes[0].trigger).toBe('stres');
    expect(loaded.episodes[0].extendedTime).toBe(true);
    expect(loaded.episodes[0].protocolVersion).toBe(1);
  });

  it('persists active crisis session in IndexedDB', async () => {
    await saveActiveSession({
      step: 'RUNNING_3_MIN',
      startedAtMs: Date.now(),
      endsAtMs: Date.now() + 180_000,
      extendedOnce: false,
      elapsedSeconds: 12
    });

    const session = await loadActiveSession();
    expect(session).not.toBeNull();
    expect(session?.elapsedSeconds).toBe(12);
    expect(session?.step).toBe('RUNNING_3_MIN');

    await clearActiveSession();
    expect(await loadActiveSession()).toBeNull();
  });

  it('exports JSON with metadata envelope', async () => {
    await saveEpisodeValidated({
      startedAt: '2026-01-01T08:00:00.000Z',
      completedAt: '2026-01-01T08:03:00.000Z',
      durationSeconds: 180,
      extendedTime: false,
      trigger: 'oboseala',
      outcome: 'amanat',
      protocolVersion: PROTOCOL_VERSION
    });

    const loaded = await loadEpisodesSafe();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const payload = buildExportPayload(loaded.episodes);
    expect(payload.exportVersion).toBe(1);
    expect(payload.appVersion).toBe('1.0.1');
    expect(payload.exportedAt).toBeTruthy();
    expect(payload.episodes).toHaveLength(1);
    expect(payload.episodes[0].outcome).toBe('amanat');

    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL
    });

    const click = vi.fn();
    const originalCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreate(tag);
      if (tag === 'a') {
        Object.defineProperty(el, 'click', { value: click });
      }
      return el;
    });

    const result = await exportDataSafe();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.method).toBe('download');
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();

    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('normalizes legacy episodes for hour analysis', () => {
    const legacy = normalizeEpisode({
      timestamp: '2026-01-01T15:30:00.000Z',
      durationSeconds: 90,
      outcome: 'a_trecut',
      trigger: 'nervi'
    });

    expect(legacy.startedAt).toBeTruthy();
    expect(legacy.completedAt).toBe('2026-01-01T15:30:00.000Z');
    expect(legacy.protocolVersion).toBe(1);
    expect(getEpisodeStartedAt(legacy)).toBe(legacy.startedAt);
    expect(new Date(getEpisodeStartedAt(legacy)).getUTCHours()).toBe(
      new Date(Date.parse(legacy.completedAt) - 90_000).getUTCHours()
    );
  });
});
