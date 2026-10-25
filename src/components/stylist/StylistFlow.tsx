'use client'

// Owns the AI Stylist state machine and the one `fetch` call to
// `POST /api/stylist`. Nothing below renders catalog data directly —
// `StylistResult` does that — this component's only job is to turn a
// `Questionnaire` submission into a request, read the NDJSON response
// line by line, and hold whatever has arrived so far.
//
// `idle` → user hasn't submitted yet.
// `pending` → request in flight, nothing has arrived yet.
// `partial` → the `analysis` line arrived; `explain` (stage 2) is still
//   running. This is the state the route.ts module comment describes as
//   "typically several seconds" — rendering here instead of waiting for
//   `result` is the entire reason the backend stages the response.
// `done` → the `result` line arrived; the full outcome is ready.
// `error` → the request did not produce a usable stream — a true network
//   failure, a malformed response, or the route rejecting the request
//   outright (400/413/415). `errorKind` distinguishes *why*, so the copy
//   can say what actually happened instead of defaulting every failure to
//   "the network is flaky" — a 413/415 is the user's photo being rejected,
//   not a connection problem, and blaming the network there just invites
//   an endless retry of a request that will fail the same way every time.
//
// ADR-012: `input.photo` (the `File` the user chose) is only ever placed
// into a `FormData` and hand off to `fetch`. Never logged, never kept
// around after the request is built.

import { useState } from 'react'
import Link from 'next/link'
import type { AnalysisStage, StylistOutcome } from '@/features/stylist/pipeline'
import { Questionnaire, type QuestionnaireSubmission } from './Questionnaire'
import { StylistResult } from './StylistResult'
import type { ItemAttribute } from '@/types/stylist'

type ErrorKind = 'photo-too-large' | 'photo-type-unsupported' | 'network'

type State =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'partial'; analysis: AnalysisStage }
  | { status: 'done'; outcome: StylistOutcome }
  | { status: 'error'; errorKind: ErrorKind }

// Maps the route's own status codes (see the validation-order comment in
// `src/app/api/stylist/route.ts`) to why the request failed. Everything
// else — a dropped connection, a malformed stream, a 400/500 — is treated
// as `'network'`, the one case where "try again" is actually good advice.
function errorKindForStatus(status: number): ErrorKind {
  if (status === 413) return 'photo-too-large'
  if (status === 415) return 'photo-type-unsupported'
  return 'network'
}

const ERROR_COPY: Record<ErrorKind, string> = {
  'photo-too-large':
    'Ảnh bạn gửi đang lớn hơn dung lượng Bí Mặc nhận được. Hãy chọn một ảnh nhỏ hơn, hoặc nén/chụp lại ở độ phân giải thấp hơn, rồi gửi lại câu hỏi.',
  'photo-type-unsupported':
    'Bí Mặc chưa đọc được định dạng ảnh bạn vừa chọn. Hãy đổi sang ảnh JPEG, PNG hoặc WebP rồi gửi lại.',
  network:
    'Không gửi được yêu cầu lúc này — có thể do mạng chập chờn. Bạn có thể thử lại.',
}

type AnalysisLine = { type: 'analysis' } & AnalysisStage
type ResultLine = {
  type: 'result'
  outfits: StylistOutcome['outfits']
  items: StylistOutcome['items']
  providerId: StylistOutcome['providerId']
  degraded: StylistOutcome['degraded']
  degradedReason: StylistOutcome['degradedReason']
}

function isAnalysisLine(value: unknown): value is AnalysisLine {
  return typeof value === 'object' && value !== null && (value as { type?: unknown }).type === 'analysis'
}

function isResultLine(value: unknown): value is ResultLine {
  return typeof value === 'object' && value !== null && (value as { type?: unknown }).type === 'result'
}

// Builds the full outcome once both NDJSON lines have arrived. `goal`
// comes from the submitted answers rather than either wire line, since
// neither line carries it back on its own — the route only echoes
// catalog-derived fields.
function assembleOutcome(
  analysis: AnalysisStage,
  result: ResultLine,
  goal: StylistOutcome['goal'],
): StylistOutcome {
  return {
    goal,
    providerId: result.providerId,
    degraded: result.degraded,
    degradedReason: result.degradedReason,
    styleDirections: analysis.styleDirections,
    palette: analysis.palette,
    outfits: result.outfits,
    items: result.items,
    notes: analysis.notes,
  }
}

// Renders the stage-1 `analysis` line the moment it arrives, while stage 2
// (`explain`, the outfit prose) is still in flight. Deliberately does not
// reuse `StylistResult` here: that component treats an empty `outfits`
// array as "the catalog really has nothing to offer" and shows the
// explore-elsewhere empty state — which would be a false signal while
// outfits are simply still loading.
function PartialAnalysis({ analysis }: { analysis: AnalysisStage }) {
  return (
    <div className="space-y-10">
      {analysis.degraded && (
        <p role="status" className="border border-muted/40 bg-muted/35 px-4 py-3 font-body text-sm text-accent-soft">
          Đây là gợi ý từ chế độ dự phòng của Bí Mặc (không gọi được AI lúc này).
        </p>
      )}

      {analysis.notes.map((note) => (
        <p key={note} className="font-body text-sm text-accent-soft">
          {note}
        </p>
      ))}

      {analysis.styleDirections.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-2xl">Hướng style hợp với bạn</h2>
          <ul className="space-y-3">
            {analysis.styleDirections.map((direction) => (
              <li key={direction.slug} className="border-t border-muted/40 pt-3 font-body text-sm text-accent-soft">
                {direction.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      {analysis.palette.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-2xl">Bảng màu nên thử</h2>
          <ul className="flex flex-wrap gap-3">
            {analysis.palette.map((entry) => (
              <li key={entry.slug} className="flex items-center gap-2 font-body text-sm text-accent-soft">
                <span
                  aria-hidden="true"
                  className="h-5 w-5 rounded-full border border-muted/40"
                  style={{ backgroundColor: entry.hex }}
                />
                {entry.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p role="status" className="font-body text-sm text-accent-soft">
        Đang tạo outfit cụ thể cho bạn…
      </p>
    </div>
  )
}

type Props = {
  avoidOptions: ItemAttribute[]
}

export function StylistFlow({ avoidOptions }: Props) {
  const [state, setState] = useState<State>({ status: 'idle' })

  async function handleSubmit({ answers, photo }: QuestionnaireSubmission) {
    setState({ status: 'pending' })

    const formData = new FormData()
    formData.set('answers', JSON.stringify(answers))
    if (photo) {
      formData.set('photo', photo)
    }

    let response: Response
    try {
      response = await fetch('/api/stylist', { method: 'POST', body: formData })
    } catch {
      setState({ status: 'error', errorKind: 'network' })
      return
    }

    if (!response.ok || !response.body) {
      setState({ status: 'error', errorKind: errorKindForStatus(response.status) })
      return
    }

    let analysisStage: AnalysisStage | undefined
    try {
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) {
          break
        }
        buffer += value

        let newlineIndex = buffer.indexOf('\n')
        while (newlineIndex !== -1) {
          const line = buffer.slice(0, newlineIndex)
          buffer = buffer.slice(newlineIndex + 1)

          if (line.trim().length > 0) {
            const parsed: unknown = JSON.parse(line)

            if (isAnalysisLine(parsed)) {
              analysisStage = parsed
              setState({ status: 'partial', analysis: parsed })
            } else if (isResultLine(parsed) && analysisStage) {
              setState({ status: 'done', outcome: assembleOutcome(analysisStage, parsed, answers.goal) })
            }
          }

          newlineIndex = buffer.indexOf('\n')
        }
      }
    } catch {
      setState({ status: 'error', errorKind: 'network' })
    }
  }

  return (
    <div className="space-y-16">
      <Questionnaire avoidOptions={avoidOptions} onSubmit={handleSubmit} pending={state.status === 'pending'} />

      {state.status === 'error' && (
        <p className="font-body text-sm text-accent-soft">
          {ERROR_COPY[state.errorKind]} Bạn cũng có thể{' '}
          <Link href="/styles" className="underline-offset-4 hover:text-accent hover:underline">
            khám phá theo style
          </Link>{' '}
          trong lúc chờ.
        </p>
      )}

      {state.status === 'partial' && <PartialAnalysis analysis={state.analysis} />}

      {state.status === 'done' && <StylistResult outcome={state.outcome} />}
    </div>
  )
}
