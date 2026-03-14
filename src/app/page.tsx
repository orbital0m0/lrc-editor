'use client'
import LrcEditor from '@/components/LrcEditor'

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      {/* header */}
      <div className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-[var(--accent)] flex items-center justify-center text-white text-sm font-bold">
            L
          </div>
          <span className="font-semibold text-[var(--text)] tracking-tight">LRC Editor</span>
          <span className="text-xs text-[var(--text3)] ml-1">for Play Leaf</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-[var(--text3)]">
              whisperweb.app / stable-ts → LRC
            </span>
          </div>
        </div>
      </div>

      {/* body */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* step guide */}
        <div className="flex items-center gap-2 mb-6 text-[11px] text-[var(--text3)] flex-wrap">
          <span className="px-2 py-0.5 rounded bg-[var(--surface2)] border border-[var(--border)] text-[var(--accent2)]">1 JSON 붙여넣기</span>
          <span>→</span>
          <span className="px-2 py-0.5 rounded bg-[var(--surface2)] border border-[var(--border)]">2 Suno 가사 붙여넣기</span>
          <span>→</span>
          <span className="px-2 py-0.5 rounded bg-[var(--surface2)] border border-[var(--border)]">3 매칭 확인 + 편집</span>
          <span>→</span>
          <span className="px-2 py-0.5 rounded bg-[var(--surface2)] border border-[var(--border)]">4 LRC 다운로드</span>
        </div>

        <LrcEditor />
      </div>
    </main>
  )
}
