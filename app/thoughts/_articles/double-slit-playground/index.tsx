'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Editor } from 'codice'
import { runExperiment, type LogEntry } from './sandbox'
import {
  sampleInterference,
  sampleDiffraction,
  computePhaseOffset,
  SCREEN_RANGE,
} from './physics'

// Types for accumulated dots
interface Dot {
  x: number // sampled screen position
  y: number // random spread for 2D visualization
  logValue: string // first log output for this run (empty string if no output)
}

interface PlaygroundProps {
  code: string
  simple?: boolean
  description?: string
}

export function DoubleSlitPlayground({
  code: initialCode,
  description,
  simple,
}: PlaygroundProps) {
  const [code, setCode] = useState(initialCode)
  const [dots, setDots] = useState<Dot[]>([])
  const [consoleLogs, setConsoleLogs] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [isRunningOnce, setIsRunningOnce] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [isLoaded, setIsLoaded] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const runCountRef = useRef(0)
  const stopRef = useRef(false)
  const isSettingCodeRef = useRef(false)

  // Load QuickJS on mount
  useEffect(() => {
    import('quickjs-emscripten').then(({ getQuickJS }) => {
      getQuickJS().then(() => setIsLoaded(true))
    })
  }, [])

  const filteredDots = useMemo(
    () =>
      filter === 'all' ? dots : dots.filter((dot) => dot.logValue === filter),
    [dots, filter],
  )

  // Draw dots on canvas (only for full mode)
  const drawCanvas = useCallback(() => {
    if (simple) return
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Handle DPI scaling
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const padding = 28

    // Transparent background
    ctx.fillStyle = 'transparent'
    ctx.fillRect(0, 0, width, height)

    // Very subtle dot grid pattern
    ctx.fillStyle = 'rgba(0, 0, 0, 0.035)'
    const gridSpacing = 16
    for (let x = padding; x <= width - padding; x += gridSpacing) {
      for (let y = padding; y <= height - padding; y += gridSpacing) {
        ctx.beginPath()
        ctx.arc(x, y, 0.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Center line with dashed style
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(width / 2, padding)
    ctx.lineTo(width / 2, height - padding)
    ctx.stroke()
    ctx.setLineDash([])

    // Draw dots with subtle glow
    for (const dot of filteredDots) {
      const normalizedX =
        (dot.x - SCREEN_RANGE.min) / (SCREEN_RANGE.max - SCREEN_RANGE.min)
      const canvasX = padding + normalizedX * (width - 2 * padding)
      const canvasY = padding + dot.y * (height - 2 * padding)

      // Outer glow
      ctx.beginPath()
      ctx.arc(canvasX, canvasY, 3.5, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(55, 65, 81, 0.06)'
      ctx.fill()

      // Inner dot
      ctx.beginPath()
      ctx.arc(canvasX, canvasY, 1.5, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(55, 65, 81, 0.55)'
      ctx.fill()
    }

    // Axis labels
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.font =
      '9px mono, ui-monospace, SFMono-Regular, Menlo, Monaco, monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`${SCREEN_RANGE.min}`, padding, height - 8)
    ctx.fillText(`${SCREEN_RANGE.max}`, width - padding, height - 8)
    ctx.fillText('0', width / 2, height - 8)
  }, [filteredDots, simple])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  // Run a single experiment with real setTimeout delays
  const runOnce = useCallback(async () => {
    if (!isLoaded || isRunningOnce) return

    const seed = Date.now() + runCountRef.current++
    try {
      const result = await runExperiment(code, seed)
      const pathIndex =
        result.mode === 'collapse' ? (result.chosenPath ?? 0) : 0
      const logEntries: LogEntry[] = result.paths[pathIndex]?.ioTrace ?? []

      // Check if there are any delayed logs
      const maxDelay = Math.max(0, ...logEntries.map((e) => e.delay))

      if (simple) {
        // Simple mode: show 0, 1, or 0.5 for superposition
        let whichResult: string
        if (result.mode === 'interference') {
          const positions = result.paths.map((p) => p.position)
          const avg = positions.reduce((a, b) => a + b, 0) / positions.length
          whichResult = avg.toString()
        } else {
          const chosenPos = result.paths[result.chosenPath ?? 0]?.position ?? 0
          whichResult = chosenPos.toString()
        }

        // Handle delayed logs with real setTimeout
        if (maxDelay > 0) {
          setIsRunningOnce(true)
          const immediateLogs = logEntries.filter((e) => e.delay === 0)
          const delayedLogs = logEntries.filter((e) => e.delay > 0)

          // Show immediate logs and which result right away
          setConsoleLogs((prev) => [
            ...prev,
            ...immediateLogs.map((e) => e.args.join(' ')),
            `__WHICH__:${whichResult}`,
          ])

          // Show delayed console logs after the timeout
          if (delayedLogs.length > 0) {
            await new Promise<void>((resolve) => {
              setTimeout(
                () => {
                  setConsoleLogs((prev) => [
                    ...prev,
                    ...delayedLogs.map((e) => e.args.join(' ')),
                  ])
                  resolve()
                },
                Math.min(maxDelay, 2000),
              )
            })
          }
          setIsRunningOnce(false)
        } else {
          // No delays, add logs and which result immediately
          setConsoleLogs((prev) => [
            ...prev,
            ...logEntries.map((e) => e.args.join(' ')),
            `__WHICH__:${whichResult}`,
          ])
        }
        return
      }

      // Full mode: sample from physics distribution
      const slitPositions = result.paths.map((p) => p.position)

      let screenX: number
      if (result.mode === 'interference') {
        // Interference: use phase offset from common log value (quantum eraser effect)
        const commonLog = result.paths[0]?.ioTrace[0]?.args.join(' ') ?? ''
        const offset = computePhaseOffset(commonLog)
        screenX = sampleInterference(slitPositions, seed + 1000, offset)
      } else {
        // Collapse: single-slit diffraction from the chosen path
        const chosenPosition = slitPositions[result.chosenPath ?? 0]
        screenX = sampleDiffraction(chosenPosition, seed + 1000)
      }

      const whichResult = screenX.toString()

      result.screenPosition = screenX

      const logValue = logEntries[0]?.args.join(' ') ?? ''

      setDots((prev) => [...prev, { x: screenX, y: Math.random(), logValue }])

      // Handle delayed logs with real setTimeout
      if (maxDelay > 0) {
        setIsRunningOnce(true)
        const immediateLogs = logEntries.filter((e) => e.delay === 0)
        const delayedLogs = logEntries.filter((e) => e.delay > 0)

        // Show immediate logs and which result right away
        setConsoleLogs((prev) => [
          ...prev,
          ...immediateLogs.map((e) => e.args.join(' ')),
          `__WHICH__:${whichResult}`,
        ])

        if (delayedLogs.length > 0) {
          await new Promise<void>((resolve) => {
            setTimeout(
              () => {
                setConsoleLogs((prev) => [
                  ...prev,
                  ...delayedLogs.map((e) => e.args.join(' ')),
                ])
                resolve()
              },
              Math.min(maxDelay, 2000),
            )
          })
        }
        setIsRunningOnce(false)
      } else {
        setConsoleLogs((prev) => [
          ...prev,
          ...logEntries.map((e) => e.args.join(' ')),
          `__WHICH__:${whichResult}`,
        ])
      }
    } catch (err) {
      console.error('Execution error:', err)
      setIsRunningOnce(false)
    }
  }, [code, isLoaded, isRunningOnce, simple])

  // Run multiple times
  const runMany = useCallback(
    async (count: number) => {
      if (!isLoaded || isRunning) return

      setIsRunning(true)
      stopRef.current = false

      const batchSize = 50
      let completed = 0

      while (completed < count && !stopRef.current) {
        const batch = Math.min(batchSize, count - completed)
        const batchLogs: string[] = []
        const promises: Promise<void>[] = []

        for (let i = 0; i < batch; i++) {
          const seed = Date.now() + runCountRef.current++
          promises.push(
            (async () => {
              try {
                const result = await runExperiment(code, seed)
                const slitPositions = result.paths.map((p) => p.position)

                let screenY: number
                if (result.mode === 'interference') {
                  // Interference: use phase offset from common log value (quantum eraser effect)
                  const commonLog = result.paths[0]?.ioTrace[0]?.args.join(' ') ?? ''
                  const offset = computePhaseOffset(commonLog)
                  screenY = sampleInterference(slitPositions, seed + 1000, offset)
                } else {
                  // Collapse: single-slit diffraction from the chosen path
                  const chosenPosition = slitPositions[result.chosenPath ?? 0]
                  screenY = sampleDiffraction(chosenPosition, seed + 1000)
                }

                const pathIndex =
                  result.mode === 'collapse' ? (result.chosenPath ?? 0) : 0
                const logEntries = result.paths[pathIndex]?.ioTrace ?? []
                const logs = logEntries.map((entry) => entry.args.join(' '))
                const logValue = logs[0] ?? ''

                setDots((prev) => [
                  ...prev,
                  { x: screenY, y: Math.random(), logValue },
                ])
                batchLogs.push(...logs, `__WHICH__:${screenY}`)

                if (i === batch - 1) {
                  result.screenPosition = screenY
                }
              } catch (err) {
                console.error('Batch execution error:', err)
              }
            })(),
          )
        }

        await Promise.all(promises)
        if (batchLogs.length > 0) {
          setConsoleLogs((prev) => [...prev, ...batchLogs])
        }
        completed += batch

        await new Promise((r) => setTimeout(r, 0))
      }

      setIsRunning(false)
    },
    [code, isLoaded, isRunning],
  )

  const resetCode = useCallback(() => {
    if (initialCode) {
      isSettingCodeRef.current = true
      setCode(initialCode)
    }

    setDots([])
    setConsoleLogs([])
    setFilter('all')
  }, [initialCode])

  const uniqueLogValues = useMemo(() => {
    const values = new Set<string>()
    for (const dot of dots) {
      if (dot.logValue) values.add(dot.logValue)
      if (values.size >= 5) break
    }
    return Array.from(values)
  }, [dots])

  // Simple mode UI - refined, minimal
  if (simple) {
    return (
      <div className='my-7'>
        <div className='overflow-hidden border border-rurikon-border rounded-xs bg-[#fefefe]'>
          {/* Code editor area */}
          <div
            className='[&_pre]:!bg-transparent [&_pre]:!m-0 tracking-normal [&_pre]:min-h-[80px] [&_textarea]:!bg-transparent [&_.codice-editor]:!bg-transparent [&_.codice-title]:hidden [&_textarea]:[word-spacing:0] [&_[data-codice-header-controls]]:!hidden bg-transparent'
            style={
              {
                '--codice-font-family': `var(--mono)`,
                '--codice-font-size': '13px',
                '--codice-caret-color': '#374151',
              } as any
            }
          >
            <Editor
              value={code}
              lineNumbers={false}
              onChange={(text) => {
                setCode(text as string)
                if (isSettingCodeRef.current) {
                  isSettingCodeRef.current = false
                }
              }}
              title={undefined}
            />
          </div>

          {/* Controls */}
          <div className='flex items-center gap-2 px-3 py-2 border-t border-rurikon-border'>
            <button
              onClick={runOnce}
              disabled={!isLoaded || isRunningOnce}
              className={`transition-all duration-150 px-3.5 py-1 text-xs font-medium tracking-[0.01em] rounded border-none ${
                isRunningOnce
                  ? 'bg-rurikon-100 text-rurikon-800 cursor-not-allowed'
                  : 'bg-rurikon-800 text-white cursor-pointer'
              } ${!isLoaded ? 'opacity-50' : ''}`}
            >
              {isRunningOnce ? 'Running...' : 'Run'}
            </button>
            <button
              onClick={resetCode}
              className='transition-colors duration-150 hover:bg-rurikon-50 px-2.5 py-1 text-xs text-rurikon-500 hover:text-rurikon-800 bg-transparent rounded border-none cursor-pointer'
            >
              Reset
            </button>
          </div>

          {/* Console output */}
          {consoleLogs.length > 0 && (
            <div className='max-h-[9.7rem] overflow-y-auto border-t border-rurikon-border px-3.5 py-2.5 bg-black/[0.02] font-mono text-xs leading-[1.6] flex flex-col-reverse'>
              {consoleLogs.toReversed().map((log, i) =>
                log.startsWith('__WHICH__:') ? (
                  <div
                    key={i}
                    className='text-blue-600 font-semibold flex items-center gap-1'
                  >
                    <span className=''>which = {log.slice(10)}</span>
                  </div>
                ) : (
                  <div key={i} className='text-rurikon-400'>
                    {log}
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Full mode UI - refined laboratory aesthetic
  return (
    <div className='my-10 w-full min-w-[50vw]'>
      <div className='overflow-hidden border border-rurikon-border rounded-xs bg-[#fefefe]'>
        {/* Description */}
        {description && (
          <div className='px-4 py-2.5 text-[13px] text-gray-500 border-b border-black/[0.04] bg-black/[0.01]'>
            {description}
          </div>
        )}

        {/* Main content */}
        <div className='flex flex-col lg:flex-row'>
          {/* Code editor */}
          <div
            className='flex-1 min-w-0 [&_pre]:!bg-transparent [&_pre]:!m-0 [&_pre]:min-h-[200px] [&_textarea]:!bg-transparent [&_.codice-editor]:!bg-transparent [&_.codice-title]:hidden [&_textarea]:[word-spacing:0] [&_[data-codice-header-controls]]:!hidden border-r border-rurikon-border'
            style={
              {
                '--codice-font-family': `var(--mono)`,
                '--codice-font-size': '13px',
                '--codice-caret-color': '#374151',
              } as any
            }
          >
            <Editor
              value={code}
              lineNumbers={false}
              onChange={(text) => {
                setCode(text as string)
                isSettingCodeRef.current = false
              }}
              title={undefined}
            />
          </div>

          {/* Canvas */}
          <div className='w-full lg:w-[340px] flex flex-col bg-[#fdfcfa]'>
            <div className='relative flex flex-col'>
              <canvas ref={canvasRef} className='w-full h-full aspect-[4/3]' />
              {!isLoaded && (
                <div className='absolute inset-0 flex items-center justify-center bg-white/90 text-gray-400 text-[13px]'>
                  Loading runtime...
                </div>
              )}
              {/* Stats & Filters */}
              <div className='px-3 pb-1 text-[11px] text-gray-400'>
                <span className='font-medium tabular-nums'>
                  {filter === 'all'
                    ? dots.length.toLocaleString()
                    : filteredDots.length.toLocaleString() +
                      ' / ' +
                      dots.length.toLocaleString()}{' '}
                  samples
                </span>
              </div>
              {uniqueLogValues.length > 0 ? (
                <div className='px-3 pb-2 -mt-1 flex flex-row gap-2 items-center leading-3'>
                  <div className='flex flex-wrap gap-1'>
                    <button
                      onClick={() => setFilter('all')}
                      className={`px-2 py-1 text-[11px] font-medium border-none rounded cursor-pointer select-none tracking-tight ${
                        filter === 'all'
                          ? 'bg-rurikon-700 text-white'
                          : 'bg-rurikon-50 text-rurikon-400'
                      }`}
                    >
                      All
                    </button>
                    {uniqueLogValues.map((value) => (
                      <button
                        key={value}
                        onClick={() => setFilter(value)}
                        className={`px-2 py-1 text-[11px] font-medium font-mono border-none rounded cursor-pointer select-none tracking-tight ${
                          filter === value
                            ? 'bg-rurikon-700 text-white'
                            : 'bg-rurikon-50 text-rurikon-400'
                        }`}
                      >
                        log: {value}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className='flex items-center gap-2 px-3 py-2 border-t border-rurikon-border'>
          <div className='flex items-center gap-1.5'>
            {
              <>
                <button
                  onClick={runOnce}
                  disabled={!isLoaded || isRunningOnce}
                  className={`transition-all duration-150 px-3.5 py-1 text-xs font-medium tracking-[0.01em] rounded border-none ${
                    isRunningOnce
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-800 text-white cursor-pointer'
                  } ${!isLoaded ? 'opacity-50' : ''}`}
                >
                  {isRunningOnce ? 'Running...' : 'Run'}
                </button>
                <button
                  onClick={() => runMany(500)}
                  disabled={!isLoaded}
                  className={`duration-150 hover:bg-rurikon-50 px-2.5 py-1 text-xs text-rurikon-500 hover:text-rurikon-800 bg-rurikon-50/50 rounded border-none ${
                    !isLoaded
                      ? 'cursor-not-allowed opacity-50'
                      : 'cursor-pointer'
                  }`}
                >
                  500×
                </button>
                <button
                  onClick={() => runMany(2000)}
                  disabled={!isLoaded}
                  className={`duration-150 hover:bg-rurikon-50 px-2.5 py-1 text-xs text-rurikon-500 hover:text-rurikon-800 bg-rurikon-50/50 rounded border-none ${
                    !isLoaded
                      ? 'cursor-not-allowed opacity-50'
                      : 'cursor-pointer'
                  }`}
                >
                  2000×
                </button>
              </>
            }
            <div className='w-px h-6 bg-rurikon-border/50 mx-1' />
            <button
              onClick={resetCode}
              className='duration-150 hover:bg-rurikon-50 px-2.5 py-1 text-xs text-rurikon-500 hover:text-rurikon-800 bg-transparent rounded border-none cursor-pointer'
            >
              Reset
            </button>
          </div>
        </div>

        {/* Console output */}
        {consoleLogs.length > 0 && (
          <div className='max-h-[9.7rem] overflow-y-auto border-t border-rurikon-border px-4 py-2.5 bg-white font-mono text-xs leading-[1.6] flex flex-col-reverse'>
            {consoleLogs.toReversed().map((log, i) =>
              log.startsWith('__WHICH__:') ? (
                <div
                  key={i}
                  className='text-blue-600 font-semibold flex items-center gap-1'
                >
                  <span className=''>which = {log.slice(10)}</span>
                </div>
              ) : (
                <div key={i} className='text-rurikon-400'>
                  {log}
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DoubleSlitPlayground
