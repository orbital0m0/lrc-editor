export interface LrcRow {
  sec: number
  lrc: string
  text: string      // whisper 인식
  matched: string   // 최종 가사
  score: number
}

export function secToLrc(s: number): string {
  s = Math.max(0, s)
  const m = Math.floor(s / 60)
  const sec = (s % 60).toFixed(2).padStart(5, '0')
  return `[${String(m).padStart(2, '0')}:${sec}]`
}

export function lrcToSec(lrc: string): number | null {
  const m = lrc.match(/\[(\d+):(\d+(?:\.\d+)?)\]/)
  return m ? parseInt(m[1]) * 60 + parseFloat(m[2]) : null
}

export function normText(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
}

export function similarity(a: string, b: string): number {
  a = normText(a); b = normText(b)
  if (!a || !b) return 0
  if (a === b) return 1
  const wa = a.split(/\s+/), wb = b.split(/\s+/)
  const set = new Set(wb)
  return (2 * wa.filter(w => set.has(w)).length) / (wa.length + wb.length)
}

export function isNoise(t: string): boolean {
  const s = t.trim()
  if (!s) return true
  if (/^\[.*\]$/.test(s) || /^\(.*\)$/.test(s)) return true
  return !s.replace(/[♪♫\s.,!?\-]/g, '')
}

export function cleanText(t: string): string {
  return t.replace(/^[\s♪♫]+/, '').replace(/[\s♪♫]+$/, '').replace(/[♪♫]/g, '').trim()
}

// whisperweb.app JSON
export function parseWhisperWeb(raw: string): LrcRow[] | null {
  try {
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return null
    return data
      .filter((d: any) => d.timestamp && Array.isArray(d.timestamp) && !isNoise(d.text || ''))
      .map((d: any) => {
        const sec = d.timestamp[0]
        const text = cleanText(d.text || '')
        return { sec, lrc: secToLrc(sec), text, matched: text, score: 1 }
      })
  } catch { return null }
}

// stable-ts JSON
export function parseStableTs(raw: string): LrcRow[] | null {
  try {
    const data = JSON.parse(raw)
    const segs: any[] = data.segments || (Array.isArray(data) ? data : null)
    if (!segs) return null
    return segs
      .filter((s: any) => s.start != null && !isNoise(s.text || ''))
      .map((s: any) => {
        const sec = s.start
        const text = cleanText(s.text || '')
        return { sec, lrc: secToLrc(sec), text, matched: text, score: 1 }
      })
  } catch { return null }
}

export function autoParseJson(raw: string): LrcRow[] | null {
  try {
    const d = JSON.parse(raw)
    if (d?.segments) return parseStableTs(raw)
    if (Array.isArray(d) && d[0]?.timestamp) return parseWhisperWeb(raw)
  } catch {}
  return null
}

export function extractSunoUniq(raw: string): string[] {
  const seen = new Set<string>(), result: string[] = []
  raw.split('\n').forEach(l => {
    l = l.trim()
    if (!l || /^\[.*\]$/.test(l)) return
    const k = normText(l)
    if (!seen.has(k)) { seen.add(k); result.push(l) }
  })
  return result
}

export function matchRows(wLines: LrcRow[], sunoUniq: string[]): LrcRow[] {
  return wLines.map(wl => {
    if (!sunoUniq.length) return { ...wl }
    let best = '', bestScore = -1
    sunoUniq.forEach(sl => {
      const s = similarity(wl.text, sl)
      if (s > bestScore) { bestScore = s; best = sl }
    })
    return { ...wl, matched: best, score: bestScore }
  })
}

export function buildLrcText(rows: LrcRow[], title?: string, artist?: string): string {
  const meta: string[] = []
  if (title) meta.push(`[ti:${title}]`)
  if (artist) meta.push(`[ar:${artist}]`)
  if (meta.length) meta.push('')
  const body = rows.filter(r => r.matched.trim()).map(r => r.lrc + r.matched).join('\n')
  return meta.join('\n') + body
}
