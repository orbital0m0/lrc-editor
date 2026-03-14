'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import {
  LrcRow, secToLrc, lrcToSec, matchRows, extractSunoUniq,
  autoParseJson, buildLrcText
} from '@/lib/lrc'
import AudioPlayer from './AudioPlayer'

// ── small helpers ────────────────────────────────────────
const Badge = ({ children, color = 'accent' }: { children: React.ReactNode; color?: string }) => {
  const cls: Record<string, string> = {
    accent: 'bg-[#2a2060] text-[var(--accent2)]',
    green:  'bg-[#0d2e1e] text-[var(--green)]',
    amber:  'bg-[#2e1e00] text-[var(--amber)]',
    gray:   'bg-[var(--surface2)] text-[var(--text2)]',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${cls[color] || cls.accent}`}>
      {children}
    </span>
  )
}

const Btn = ({ children, onClick, disabled, variant = 'default', className = '' }:
  { children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: string; className?: string }) => {
  const v: Record<string, string> = {
    default: 'bg-[var(--surface2)] border-[var(--border)] text-[var(--text2)] hover:bg-[var(--border)] hover:text-[var(--text)]',
    primary: 'bg-[var(--accent)] border-[var(--accent)] text-white hover:opacity-90',
    danger:  'bg-transparent border-[var(--red)] text-[var(--red)] hover:bg-[#2e0a0a]',
    ghost:   'bg-transparent border-transparent text-[var(--text2)] hover:text-[var(--text)]',
  }
  return (
    <button
      onClick={onClick} disabled={disabled}
      className={`px-3 py-1.5 rounded border text-xs font-medium transition-all
        disabled:opacity-30 disabled:cursor-default active:scale-[0.97]
        ${v[variant] || v.default} ${className}`}
    >
      {children}
    </button>
  )
}

// ── main component ───────────────────────────────────────
export default function LrcEditor() {
  // setup state
  const [jsonInput, setJsonInput] = useState('')
  const [sunoInput, setSunoInput] = useState('')
  const [metaTitle, setMetaTitle] = useState('')
  const [metaArtist, setMetaArtist] = useState('')
  const [setupMsg, setSetupMsg] = useState('')

  // editor state
  const [rows, setRows] = useState<LrcRow[]>([])
  const [sunoUniq, setSunoUniq] = useState<string[]>([])
  const [step, setStep] = useState<'setup' | 'edit'>('setup')
  const [dedupPreview, setDedupPreview] = useState<string[]>([])

  // offset
  const [offsetVal, setOffsetVal] = useState(0)

  // audio
  const [audioTime, setAudioTime] = useState(0)
  const [seekTo, setSeekTo] = useState<{ time: number; seq: number } | undefined>()

  // ts editing
  const [editingTs, setEditingTs] = useState<number | null>(null)
  const [tsInputVal, setTsInputVal] = useState('')

  // lrc output
  const [lrcOut, setLrcOut] = useState('')
  const [copied, setCopied] = useState(false)

  // ── setup ──────────────────────────────────────────────
  const handlePreviewDedup = () => {
    if (!sunoInput.trim()) return
    setDedupPreview(extractSunoUniq(sunoInput))
  }

  const handleStart = () => {
    if (!jsonInput.trim()) { setSetupMsg('JSON을 입력해주세요'); return }
    const parsed = autoParseJson(jsonInput)
    if (!parsed || !parsed.length) { setSetupMsg('JSON 파싱 실패 — 형식을 확인해주세요'); return }
    const uniq = extractSunoUniq(sunoInput)
    const matched = matchRows(parsed, uniq)
    setSunoUniq(uniq)
    setRows(matched)
    setStep('edit')
    setSetupMsg('')
  }

  // ── editor ─────────────────────────────────────────────
  const updateRow = useCallback((i: number, patch: Partial<LrcRow>) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }, [])

  const deleteRow = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i))

  const moveRow = (i: number, dir: -1 | 1) => {
    const j = i + dir
    setRows(prev => {
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const addRow = () => {
    const lastSec = rows.length ? rows[rows.length - 1].sec + 3 : 0
    setRows(prev => [...prev, { sec: lastSec, lrc: secToLrc(lastSec), text: '', matched: '', score: 0 }])
  }

  // offset
  const applyOffset = () => {
    if (offsetVal === 0) return
    setRows(prev => prev.map(r => {
      const s = Math.max(0, r.sec + offsetVal)
      return { ...r, sec: s, lrc: secToLrc(s) }
    }))
    setOffsetVal(0)
  }

  // ts edit
  const startTsEdit = (i: number) => {
    setEditingTs(i)
    setTsInputVal(rows[i].lrc)
    setSeekTo(prev => ({ time: rows[i].sec, seq: (prev?.seq ?? 0) + 1 }))
  }

  const commitTsEdit = (i: number) => {
    const val = tsInputVal.trim()
    let sec: number | null = null
    if (/^\d+(\.\d+)?$/.test(val)) sec = parseFloat(val)
    else sec = lrcToSec(val.includes('[') ? val : `[${val}]`)
    if (sec !== null && sec >= 0) updateRow(i, { sec, lrc: secToLrc(sec) })
    setEditingTs(null)
  }

  // build lrc
  const buildLrc = () => {
    const out = buildLrcText(rows, metaTitle, metaArtist)
    setLrcOut(out)
    return out
  }

  const copyLrc = async () => {
    const out = buildLrc()
    await navigator.clipboard.writeText(out)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const downloadLrc = () => {
    const out = buildLrc()
    const blob = new Blob([out], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${metaTitle || 'lyrics'}.lrc`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const lowCount = rows.filter(r => r.score < 0.5).length
  const activeIdx = rows.reduce((cur, r, i) => r.sec <= audioTime ? i : cur, -1)
  const activeRowRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeIdx])

  // ── render ─────────────────────────────────────────────
  if (step === 'setup') {
    return (
      <div className="fade-in space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* json input */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-[var(--text2)] uppercase tracking-widest">
              Whisper JSON
            </label>
            <textarea
              value={jsonInput} onChange={e => setJsonInput(e.target.value)}
              placeholder={'whisperweb.app:\n[{"timestamp":[20,23],"text":" Took the new ones..."},...]\n\nstable-ts:\n{"segments":[{"start":20.0,"text":"Took..."},...]}'}
              className="w-full h-52 font-mono text-xs bg-[var(--surface2)] border border-[var(--border)]
                rounded-lg p-3 text-[var(--text)] placeholder-[var(--text3)] resize-none
                focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
            <p className="text-[11px] text-[var(--text3)]">whisperweb.app 또는 stable-ts JSON 자동 감지</p>
          </div>

          {/* suno input */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-[var(--text2)] uppercase tracking-widest">
              Suno 원본 가사
            </label>
            <textarea
              value={sunoInput} onChange={e => setSunoInput(e.target.value)}
              placeholder={'[Verse]\nTook the new ones out of the box\nWalked them around the apartment first\n\n[Chorus]\nNew shoes weather\nThe best kind of morning'}
              className="w-full h-52 font-mono text-xs bg-[var(--surface2)] border border-[var(--border)]
                rounded-lg p-3 text-[var(--text)] placeholder-[var(--text3)] resize-none
                focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
            <p className="text-[11px] text-[var(--text3)]">섹션 태그 포함 전체 붙여넣기 — 중복 자동 제거</p>
          </div>
        </div>

        {/* meta */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-[var(--text2)]">제목</span>
          <input value={metaTitle} onChange={e => setMetaTitle(e.target.value)}
            placeholder="곡 제목"
            className="w-36 h-8 px-3 rounded bg-[var(--surface2)] border border-[var(--border)]
              text-xs text-[var(--text)] placeholder-[var(--text3)] outline-none
              focus:border-[var(--accent)] transition-colors" />
          <span className="text-xs text-[var(--text2)]">아티스트</span>
          <input value={metaArtist} onChange={e => setMetaArtist(e.target.value)}
            placeholder="아티스트"
            className="w-36 h-8 px-3 rounded bg-[var(--surface2)] border border-[var(--border)]
              text-xs text-[var(--text)] placeholder-[var(--text3)] outline-none
              focus:border-[var(--accent)] transition-colors" />
        </div>

        {/* actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Btn onClick={handlePreviewDedup}>가사 추출 미리보기</Btn>
          <Btn onClick={handleStart} variant="primary">매칭 시작 →</Btn>
          {setupMsg && <span className="text-xs text-[var(--amber)]">{setupMsg}</span>}
        </div>

        {/* dedup preview */}
        {dedupPreview.length > 0 && (
          <div className="fade-in space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[var(--text2)] uppercase tracking-widest">추출된 고유 가사</span>
              <Badge color="gray">{dedupPreview.length}줄</Badge>
            </div>
            <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-lg p-3
              max-h-32 overflow-y-auto font-mono text-xs text-[var(--text2)] space-y-0.5">
              {dedupPreview.map((l, i) => (
                <div key={i}><span className="text-[var(--text3)] mr-2">{i + 1}.</span>{l}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── edit step ──────────────────────────────────────────
  return (
    <div className="fade-in space-y-4">
      {/* audio */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
        <AudioPlayer onTimeUpdate={setAudioTime} seekTo={seekTo} />
      </div>

      {/* offset */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-[var(--text2)] whitespace-nowrap">전체 오프셋</span>
          <input type="range" min={-5} max={5} step={0.1} value={offsetVal}
            onChange={e => setOffsetVal(parseFloat(e.target.value))}
            className="flex-1 min-w-24" />
          <span className="font-mono text-xs text-[var(--accent)] min-w-[52px]">
            {offsetVal >= 0 ? '+' : ''}{offsetVal.toFixed(1)}s
          </span>
          <Btn onClick={applyOffset} variant="primary">적용</Btn>
          <Btn onClick={() => setOffsetVal(0)}>초기화</Btn>
          <span className="text-[11px] text-[var(--text3)] w-full">전체 싱크가 일정하게 밀릴 때 사용</span>
        </div>
      </div>

      {/* table header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-semibold text-[var(--text2)] uppercase tracking-widest">매칭 결과</span>
        <Badge>{rows.length}줄</Badge>
        {lowCount > 0 && <Badge color="amber">낮은 신뢰도 {lowCount}줄</Badge>}
        {lowCount === 0 && rows.length > 0 && <Badge color="green">매칭 완료</Badge>}
        <span className="text-[11px] text-[var(--text3)]">타임스탬프 클릭 → 직접 편집</span>
        <Btn onClick={addRow} className="ml-auto">+ 줄 추가</Btn>
      </div>

      {/* table */}
      <div className="border border-[var(--border)] rounded-xl overflow-hidden">
        {/* header */}
        <div className="grid grid-cols-[88px_1fr_1fr_56px] bg-[var(--surface2)] border-b border-[var(--border)]
          text-[11px] font-medium text-[var(--text3)] uppercase tracking-wider">
          <div className="px-3 py-2">타임스탬프</div>
          <div className="px-3 py-2">Whisper 인식</div>
          <div className="px-3 py-2">Suno 매칭 가사</div>
          <div />
        </div>

        {/* rows */}
        <div className="max-h-[440px] overflow-y-auto">
          {rows.map((r, i) => {
            const isActive = i === activeIdx
            const isLow = r.score < 0.5
            const isTsEdit = editingTs === i
            const selIdx = sunoUniq.indexOf(r.matched)

            return (
              <div key={i}
                ref={isActive ? activeRowRef : undefined}
                className={`grid grid-cols-[88px_1fr_1fr_56px] border-b last:border-0
                  transition-colors text-xs
                  ${isActive
                    ? 'bg-[#2a1f5e] border-[var(--accent)] border-l-2'
                    : isLow
                    ? 'bg-[#1e1500] border-[var(--border)]'
                    : 'bg-[var(--surface)] border-[var(--border)]'}
                  ${isTsEdit ? '!bg-[#0d2e1e]' : ''}`}
              >
                {/* timestamp cell */}
                <div className="flex items-center border-r border-[var(--border)]">
                  {isTsEdit ? (
                    <input
                      autoFocus
                      value={tsInputVal}
                      onChange={e => setTsInputVal(e.target.value)}
                      onBlur={() => commitTsEdit(i)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') commitTsEdit(i) }}
                      className="w-full font-mono text-[11px] text-[var(--green)] bg-transparent
                        px-2 py-2 outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => startTsEdit(i)}
                      className="w-full font-mono text-[11px] text-[var(--accent2)] px-2 py-2
                        text-left hover:text-[var(--accent)] hover:underline transition-colors"
                    >
                      {r.lrc}
                    </button>
                  )}
                </div>

                {/* whisper text */}
                <div className="px-2 py-2 flex items-center gap-1.5 border-r border-[var(--border)]">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isLow ? 'bg-[var(--amber)]' : 'bg-[var(--green)]'}`} />
                  <span className="text-[var(--text3)] truncate">{r.text || '—'}</span>
                </div>

                {/* suno matched */}
                <div className="px-2 py-1.5 flex flex-col gap-1 border-r border-[var(--border)]">
                  {sunoUniq.length > 0 ? (
                    <>
                      <select
                        value={selIdx >= 0 ? selIdx : -1}
                        onChange={e => {
                          const v = parseInt(e.target.value)
                          updateRow(i, v === -1
                            ? { matched: '', score: 0 }
                            : { matched: sunoUniq[v], score: 1 }
                          )
                        }}
                        className="w-full bg-[var(--surface2)] text-[var(--text)] text-xs outline-none
                          border border-[var(--border)] rounded px-1.5 py-1
                          focus:border-[var(--accent)]"
                      >
                        <option value={-1}>— 직접 입력 —</option>
                        {sunoUniq.map((l, si) => (
                          <option key={si} value={si}>{l}</option>
                        ))}
                      </select>
                      {selIdx < 0 && (
                        <input
                          value={r.matched}
                          onChange={e => updateRow(i, { matched: e.target.value, score: e.target.value ? 1 : 0 })}
                          placeholder="직접 입력"
                          className="w-full bg-transparent text-[var(--text)] text-xs outline-none
                            border border-[var(--border)] rounded px-1.5 py-1
                            focus:border-[var(--accent)] placeholder-[var(--text3)]"
                        />
                      )}
                    </>
                  ) : (
                    <input
                      value={r.matched}
                      onChange={e => updateRow(i, { matched: e.target.value })}
                      className="w-full bg-transparent text-[var(--text)] text-xs outline-none
                        border border-[var(--border)] rounded px-1.5 py-1
                        focus:border-[var(--accent)]"
                    />
                  )}
                </div>

                {/* actions */}
                <div className="flex flex-col items-center justify-center gap-0.5 py-1">
                  <button onClick={() => moveRow(i, -1)} disabled={i === 0}
                    className="text-[var(--text3)] hover:text-[var(--text)] disabled:opacity-20
                      transition-colors leading-none px-1 text-[10px]">
                    ▲
                  </button>
                  <button onClick={() => moveRow(i, 1)} disabled={i === rows.length - 1}
                    className="text-[var(--text3)] hover:text-[var(--text)] disabled:opacity-20
                      transition-colors leading-none px-1 text-[10px]">
                    ▼
                  </button>
                  <button onClick={() => deleteRow(i)}
                    className="text-[var(--text3)] hover:text-[var(--red)] transition-colors leading-none px-1 text-[10px]">
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* output */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <Btn onClick={buildLrc} variant="primary">LRC 생성</Btn>
        <Btn onClick={copyLrc}>{copied ? '복사됨!' : '복사'}</Btn>
        <Btn onClick={downloadLrc}>다운로드</Btn>
        <Btn onClick={() => {
          setStep('setup')
          setRows([]); setSunoUniq([]); setDedupPreview([])
          setJsonInput(''); setSunoInput('')
          setMetaTitle(''); setMetaArtist('')
          setOffsetVal(0); setLrcOut(''); setSetupMsg('')
          setEditingTs(null); setSeekTo(undefined)
        }}>← 처음으로</Btn>
      </div>

      {lrcOut && (
        <textarea readOnly value={lrcOut}
          className="w-full h-32 font-mono text-xs bg-[var(--surface2)] border border-[var(--border)]
            rounded-lg p-3 text-[var(--text2)] resize-none focus:outline-none" />
      )}
    </div>
  )
}
