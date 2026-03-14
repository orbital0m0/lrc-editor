'use client'
import { useRef, useState, useEffect, useCallback } from 'react'

interface Props {
  onTimeUpdate?: (t: number) => void
  seekTo?: { time: number; seq: number }
}

export default function AudioPlayer({ onTimeUpdate, seekTo }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const rafRef = useRef<number>()
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [rate, setRate] = useState(1)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!audioRef.current || seekTo == null) return
    audioRef.current.currentTime = seekTo.time
  }, [seekTo])

  const tick = useCallback(() => {
    const a = audioRef.current
    if (!a) return
    setCurrent(a.currentTime)
    onTimeUpdate?.(a.currentTime)
    rafRef.current = requestAnimationFrame(tick)
  }, [onTimeUpdate])

  const togglePlay = () => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) { a.play(); setPlaying(true); rafRef.current = requestAnimationFrame(tick) }
    else { a.pause(); setPlaying(false); cancelAnimationFrame(rafRef.current!) }
  }

  const seekRel = (s: number) => {
    const a = audioRef.current
    if (!a) return
    a.currentTime = Math.max(0, a.currentTime + s)
  }

  const seekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current
    if (!a || !a.duration) return
    const r = e.currentTarget.getBoundingClientRect()
    a.currentTime = ((e.clientX - r.left) / r.width) * a.duration
  }

  const loadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const a = audioRef.current
    if (!a) return
    if (a.src) URL.revokeObjectURL(a.src)
    a.src = URL.createObjectURL(f)
    a.onloadedmetadata = () => { setDuration(a.duration); setLoaded(true) }
    a.onended = () => { setPlaying(false); cancelAnimationFrame(rafRef.current!) }
  }

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(1).padStart(4, '0')}`

  const pct = duration ? (current / duration) * 100 : 0

  return (
    <div className="space-y-2">
      <audio ref={audioRef} />
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs text-[var(--text2)] whitespace-nowrap">오디오</label>
        <input
          type="file" accept="audio/*" onChange={loadFile}
          className="text-xs text-[var(--text2)] flex-1 min-w-0
            file:mr-2 file:py-1 file:px-3 file:rounded file:border-0
            file:text-xs file:bg-[var(--surface2)] file:text-[var(--text2)]
            file:cursor-pointer hover:file:bg-[var(--border)]"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={togglePlay} disabled={!loaded}
          className="w-8 h-8 flex items-center justify-center rounded bg-[var(--surface2)]
            border border-[var(--border)] text-sm disabled:opacity-30 hover:bg-[var(--border)]
            transition-colors">
          {playing ? '⏸' : '▶'}
        </button>
        <button onClick={() => seekRel(-2)} disabled={!loaded}
          className="px-2 h-8 rounded bg-[var(--surface2)] border border-[var(--border)]
            text-xs disabled:opacity-30 hover:bg-[var(--border)] transition-colors">
          -2s
        </button>
        <button onClick={() => seekRel(2)} disabled={!loaded}
          className="px-2 h-8 rounded bg-[var(--surface2)] border border-[var(--border)]
            text-xs disabled:opacity-30 hover:bg-[var(--border)] transition-colors">
          +2s
        </button>
        <span className="font-mono text-xs text-[var(--text2)] min-w-[58px]">
          {fmt(current)}
        </span>
        <select
          value={rate}
          onChange={e => {
            const v = parseFloat(e.target.value)
            setRate(v)
            if (audioRef.current) audioRef.current.playbackRate = v
          }}
          className="h-8 px-2 rounded bg-[var(--surface2)] border border-[var(--border)]
            text-xs text-[var(--text2)] outline-none">
          {[0.7, 0.85, 1, 1.2].map(v => (
            <option key={v} value={v}>{v}x</option>
          ))}
        </select>
      </div>

      <div
        className="w-full h-7 rounded bg-[var(--surface2)] border border-[var(--border)]
          cursor-pointer relative overflow-hidden"
        onClick={seekClick}
      >
        <div
          className="absolute left-0 top-0 bottom-0 bg-[var(--accent)] opacity-20 pointer-events-none transition-none"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-400 pointer-events-none"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  )
}
