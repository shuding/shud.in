'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Editor } from 'codice'
import { runExperiment, type RunResult } from './sandbox'
import { sampleInterference, sampleDiffraction, SCREEN_RANGE } from './physics'
import { experiments } from './experiments'

// Types for accumulated dots
interface Dot {
  x: number // sampled screen position
  y: number // random spread for 2D visualization
  logValue: string // first log output for this run (empty string if no output)
}

export function DoubleSlitPlayground() {
  const [code, setCode] = useState(experiments[0].code)
  const [selectedExperiment, setSelectedExperiment] = useState(
    experiments[0].id,
  )
  const [dots, setDots] = useState<Dot[]>([])
  const [consoleLogs, setConsoleLogs] = useState<string[]>([])
  const [lastResult, setLastResult] = useState<RunResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
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

  // Draw dots on canvas
  const drawCanvas = useCallback(() => {
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
    const padding = 24

    // Light paper background
    ctx.fillStyle = '#faf9f7'
    ctx.fillRect(0, 0, width, height)

    // Subtle grid
    ctx.strokeStyle = '#e8e6e3'
    ctx.lineWidth = 0.5
    const gridSpacing = 20
    for (let x = padding; x <= width - padding; x += gridSpacing) {
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, height - padding)
      ctx.stroke()
    }
    for (let y = padding; y <= height - padding; y += gridSpacing) {
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // Center line
    ctx.strokeStyle = '#d0cec9'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(width / 2, padding)
    ctx.lineTo(width / 2, height - padding)
    ctx.stroke()

    // Filter dots
    const filteredDots = dots.filter((dot) => {
      if (filter === 'all') return true
      return dot.logValue === filter
    })

    // Draw dots
    for (const dot of filteredDots) {
      const normalizedX =
        (dot.x - SCREEN_RANGE.min) / (SCREEN_RANGE.max - SCREEN_RANGE.min)
      const canvasX = padding + normalizedX * (width - 2 * padding)
      const canvasY = padding + dot.y * (height - 2 * padding)

      ctx.beginPath()
      ctx.arc(canvasX, canvasY, 1.8, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(60, 60, 70, 0.5)'
      ctx.fill()
    }

    // Axis labels
    ctx.fillStyle = '#9ca3af'
    ctx.font = '9px var(--mono)'
    ctx.textAlign = 'center'
    ctx.fillText(`${SCREEN_RANGE.min}`, padding, height - 6)
    ctx.fillText(`${SCREEN_RANGE.max}`, width - padding, height - 6)
    ctx.fillText('0', width / 2, height - 6)
  }, [dots, filter])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  // Run a single experiment
  const runOnce = useCallback(async () => {
    if (!isLoaded) return

    const seed = Date.now() + runCountRef.current++
    try {
      const result = await runExperiment(code, seed)

      // Get slit positions from the paths
      const slitPositions = result.paths.map((p) => p.position)

      // Sample screen position based on mode
      let screenY: number
      if (result.mode === 'interference') {
        screenY = sampleInterference(slitPositions, seed + 1000)
      } else {
        const chosenPosition = slitPositions[result.chosenPath ?? 0]
        screenY = sampleDiffraction(chosenPosition, seed + 1000)
      }

      result.screenPosition = screenY
      setLastResult(result)

      // Get log value from the chosen path (first log entry, or empty string)
      const pathIndex = result.mode === 'collapse' ? (result.chosenPath ?? 0) : 0
      const logs = result.paths[pathIndex]?.ioTrace.map((entry) => entry.join(' ')) ?? []
      const logValue = logs[0] ?? ''

      setDots((prev) => [
        ...prev,
        { x: screenY, y: Math.random(), logValue },
      ])
      if (logs.length > 0) {
        setConsoleLogs((prev) => [...prev, ...logs])
      }
    } catch (err) {
      console.error('Execution error:', err)
    }
  }, [code, isLoaded])

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
                  screenY = sampleInterference(slitPositions, seed + 1000)
                } else {
                  const chosenPosition = slitPositions[result.chosenPath ?? 0]
                  screenY = sampleDiffraction(chosenPosition, seed + 1000)
                }

                // Get log value from the chosen path
                const pathIndex = result.mode === 'collapse' ? (result.chosenPath ?? 0) : 0
                const logs = result.paths[pathIndex]?.ioTrace.map((entry) => entry.join(' ')) ?? []
                const logValue = logs[0] ?? ''

                setDots((prev) => [
                  ...prev,
                  { x: screenY, y: Math.random(), logValue },
                ])
                batchLogs.push(...logs)

                if (i === batch - 1) {
                  result.screenPosition = screenY
                  setLastResult(result)
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

        // Yield to UI
        await new Promise((r) => setTimeout(r, 0))
      }

      setIsRunning(false)
    },
    [code, isLoaded, isRunning],
  )

  const stopRunning = useCallback(() => {
    stopRef.current = true
  }, [])

  const clearScreen = useCallback(() => {
    setDots([])
    setConsoleLogs([])
    setLastResult(null)
    setFilter('all')
  }, [])

  const resetExperiment = useCallback(() => {
    const exp =
      experiments.find((e) => e.id === selectedExperiment) || experiments[0]
    isSettingCodeRef.current = true
    setCode(exp.code)
    setSelectedExperiment(exp.id)
    setDots([])
    setLastResult(null)
  }, [selectedExperiment])

  // Handle experiment selection
  const handleExperimentChange = useCallback(
    (id: string) => {
      const exp = experiments.find((e) => e.id === id)
      if (exp) {
        isSettingCodeRef.current = true
        setSelectedExperiment(id)
        setCode(exp.code)
        clearScreen()
      }
    },
    [clearScreen],
  )

  // Get unique log values for filtering (up to 5)
  const uniqueLogValues = useMemo(() => {
    const values = new Set<string>()
    for (const dot of dots) {
      if (dot.logValue) values.add(dot.logValue)
      if (values.size >= 5) break
    }
    return Array.from(values)
  }, [dots])

  // Deduplicate consecutive console logs
  const dedupedLogs = useMemo(() => {
    const result: { message: string; count: number }[] = []
    for (const log of consoleLogs) {
      const last = result[result.length - 1]
      if (last && last.message === log) {
        last.count++
      } else {
        result.push({ message: log, count: 1 })
      }
    }
    return result
  }, [consoleLogs])

  // Get current experiment description
  const currentExperiment = experiments.find((e) => e.id === selectedExperiment)

  return (
    <div className='mt-10 mb-4 w-full min-w-[50vw]'>
      <div className='border border-neutral-200 rounded-lg bg-white shadow-sm overflow-hidden'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-neutral-100 bg-neutral-50/50'>
          <select
            value={selectedExperiment}
            onChange={(e) => handleExperimentChange(e.target.value)}
            className='bg-white border border-neutral-200 rounded-md px-3 py-1.5 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400'
          >
            {experiments.map((exp) => (
              <option key={exp.id} value={exp.id}>
                {exp.title}
              </option>
            ))}
          </select>

          <div className='flex items-center gap-1.5'>
            {isRunning ? (
              <button
                onClick={stopRunning}
                className='px-3 py-1.5 text-sm font-medium bg-red-50 hover:bg-red-100 border border-red-200 rounded-md text-red-600'
              >
                Stop
              </button>
            ) : (
              <>
                <button
                  onClick={runOnce}
                  disabled={!isLoaded}
                  className='px-3 py-1.5 text-sm font-medium bg-blue-500 hover:bg-blue-600 rounded-md text-white disabled:opacity-40'
                >
                  Run
                </button>
                <button
                  onClick={() => runMany(500)}
                  disabled={!isLoaded}
                  className='px-3 py-1.5 text-sm font-medium bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-md text-neutral-700 disabled:opacity-40'
                >
                  500x
                </button>
                <button
                  onClick={() => runMany(2000)}
                  disabled={!isLoaded}
                  className='px-3 py-1.5 text-sm font-medium bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-md text-neutral-700 disabled:opacity-40'
                >
                  2000x
                </button>
              </>
            )}
            <div className='w-px h-5 bg-neutral-200 mx-1' />
            <button
              onClick={clearScreen}
              className='px-2.5 py-1.5 text-sm bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-md text-neutral-500'
            >
              Clear
            </button>
            <button
              onClick={resetExperiment}
              className='px-2.5 py-1.5 text-sm bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-md text-neutral-500'
            >
              Reset
            </button>
          </div>
        </div>

        {/* Description */}
        {currentExperiment && (
          <div className='px-4 py-2.5 text-sm text-neutral-500 border-b border-neutral-100 bg-neutral-50/30'>
            {currentExperiment.description}
          </div>
        )}

        {/* Main content */}
        <div className='flex flex-col lg:flex-row'>
          {/* Code editor */}
          <div className='flex-1 min-w-0 border-b lg:border-b-0 lg:border-r border-neutral-100 bg-neutral-50/50 [&_pre]:!bg-transparent [&_pre]:!m-0 [&_pre]:!p-4 [&_pre]:min-h-[200px] [&_textarea]:!bg-transparent [&_.codice-editor]:!bg-transparent [&_.codice-title]:hidden'>
            <Editor
              value={code}
              lineNumbers={false}
              onChange={(text) => {
                setCode(text as string)
                if (isSettingCodeRef.current) {
                  isSettingCodeRef.current = false
                } else {
                  setSelectedExperiment('')
                }
              }}
              title='experiment.js'
            />
          </div>

          {/* Canvas */}
          <div className='w-full lg:w-[340px] flex flex-col'>
            <div className='relative aspect-[4/3] border-b border-neutral-100'>
              <canvas
                ref={canvasRef}
                className='w-full h-full'
              />
              {!isLoaded && (
                <div className='absolute inset-0 flex items-center justify-center bg-white/90 text-neutral-400 text-sm'>
                  Loading runtime...
                </div>
              )}
            </div>

            {/* Stats & Filters */}
            <div className='px-3 py-2.5 bg-neutral-50/50'>
              <div className='flex items-center justify-between text-xs text-neutral-500 mb-2'>
                <span className='font-medium'>
                  {dots.length.toLocaleString()} samples
                </span>
              </div>
              {uniqueLogValues.length > 0 && (
                <div className='flex flex-wrap gap-1'>
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-2.5 py-1 rounded text-xs font-medium ${
                      filter === 'all'
                        ? 'bg-neutral-200 text-neutral-700'
                        : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                    }`}
                  >
                    All
                  </button>
                  {uniqueLogValues.map((value) => (
                    <button
                      key={value}
                      onClick={() => setFilter(value)}
                      className={`px-2.5 py-1 rounded text-xs font-medium font-mono ${
                        filter === value
                          ? 'bg-neutral-700 text-white'
                          : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Console output */}
        {dedupedLogs.length > 0 && (
          <div className='border-t border-neutral-100 px-4 py-2.5 bg-neutral-900 font-mono text-xs max-h-32 overflow-y-auto flex flex-col-reverse'>
            <div>
              {dedupedLogs.map((log, i) => (
                <div key={i} className='text-neutral-300'>
                  {log.message}
                  {log.count > 1 && (
                    <span className='text-neutral-500 ml-2'>×{log.count}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DoubleSlitPlayground
