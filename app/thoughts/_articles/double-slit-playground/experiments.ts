export interface Experiment {
  id: string
  title: string
  description: string
  code: string
}

export const experiments: Experiment[] = [
  {
    id: 'classic-double-slit',
    title: '1. Classic Double Slit — No Observation',
    description:
      'Both paths are pure functions with no IO. The runtime cannot distinguish which path was taken. Result: interference fringes.',
    code: `which(
  function () { return 1 },
  function () { return 0 }
)`,
  },
  {
    id: 'path-observation',
    title: '2. Path Observation → Collapse',
    description:
      'Each path logs different content — which-path information leaks. Result: two diffraction blobs, no fringes.',
    code: `which(
  function () {
    console.log('path1')
    return 1
  },
  function () {
    console.log('path2')
    return 0
  }
)`,
  },
  {
    id: 'one-sided-observation',
    title: '3. One-Sided Observation',
    description:
      "Only path1 has a detector. One path has IO, the other doesn't — always distinguishable. Result: collapse, even though path2 has no detector.",
    code: `which(
  function () {
    console.log('detected')
    return 1
  },
  function () { return 0 }
)`,
  },
  {
    id: 'quantum-erasure',
    title: '4. Quantum Erasure',
    description:
      'Both paths have detectors, but they output identical strings. The observer cannot determine which path — information is "erased." Result: interference restored.',
    code: `which(
  function () {
    console.log('photon detected')
    return 1
  },
  function () {
    console.log('photon detected')
    return 0
  }
)`,
  },
  {
    id: 'imperfect-detector',
    title: '5. Imperfect Detector (50% efficiency)',
    description:
      'The detector on path1 fires randomly. Some runs: IO differs → collapse. Other runs: both paths have no IO → interference. Over many runs, fringe visibility decreases.',
    code: `which(
  function () {
    if (Math.random() > 0.5) console.log('click')
    return 1
  },
  function () { return 0 }
)`,
  },
  {
    id: 'delayed-choice',
    title: "6. Delayed Observation (Wheeler's Delayed Choice)",
    description:
      'The return value executes first (photon "passes through slits"), the observation happens later in setTimeout. Pre-execution flattens time — result is still collapse.',
    code: `which(
  function () {
    setTimeout(function () {
      console.log('path1')
    }, 1000)
    return 1
  },
  function () {
    setTimeout(function () {
      console.log('path2')
    }, 1000)
    return 0
  }
)`,
  },
  {
    id: 'delayed-imperfect',
    title: '7. Delayed Choice + Imperfect Detector',
    description:
      'After the photon passes, a future random event decides whether to observe. Statistically identical to Experiment 5.',
    code: `which(
  function () {
    setTimeout(function () {
      if (Math.random() > 0.5) console.log('delayed click')
    }, 1000)
    return 1
  },
  function () { return 0 }
)`,
  },
  {
    id: 'delayed-eraser',
    title: '8. Delayed Quantum Eraser + Post-Selection',
    description:
      'Kim et al. (1999) experiment. Run 10000 times. Filter by mode: interference subset shows fringes, collapse subset shows blob. This is post-selection.',
    code: `which(
  function () {
    setTimeout(function () {
      if (Math.random() > 0.5) console.log('which-path: path1')
    }, 500)
    return 1
  },
  function () { return 0 }
)`,
  },
  {
    id: 'independent-detectors',
    title: '9. Independent Detectors',
    description:
      'Both paths have independent detectors (independent random seeds). ~25% both silent (interference), ~25% both fire with different content (collapse), ~50% one fires one doesn\'t (collapse). Only ~25% of dots show interference.',
    code: `which(
  function () {
    if (Math.random() > 0.5) console.log('left')
    return 1
  },
  function () {
    if (Math.random() > 0.5) console.log('right')
    return 0
  }
)`,
  },
  {
    id: 'efficiency-sweep',
    title: '10. Detection Efficiency Sweep',
    description:
      'Vary efficiency from 0 to 1. At 0: pure interference. At 1: pure collapse. Fringes gradually disappear.',
    code: `var efficiency = 0.3 // Change: 0, 0.25, 0.5, 0.75, 1.0

which(
  function () {
    if (Math.random() < efficiency) console.log('click')
    return 1
  },
  function () { return 0 }
)`,
  },
  {
    id: 'indirect-observation',
    title: '11. Indirect Observation (Wrapped Side Effects)',
    description:
      "The observation is wrapped in another function. The runtime doesn't analyze code — it actually executes and compares IO. No matter how you wrap it, if IO differs, collapse.",
    code: `var detect = function (label) {
  console.log(label)
}

which(
  function () { detect('path1'); return 1 },
  function () { detect('path2'); return 0 }
)`,
  },
  {
    id: 'schrodinger-closed',
    title: "12. Schrödinger's Cat — Box Closed",
    description:
      "The cat's state is modified inside the closures, but there's no console.log anywhere. The box is never opened. Result: interference. The cat is in superposition.",
    code: `var cat = { status: 'alive' }

which(
  function () { cat.status = 'dead';  return 1 },
  function () { cat.status = 'alive'; return 0 }
)`,
  },
  {
    id: 'schrodinger-opened',
    title: "13. Schrödinger's Cat — Box Opened",
    description:
      'The only change is console.log(cat.status) after which. Pre-execution covers the entire program. The two paths produce different IO. Result: collapse.',
    code: `var cat = { status: 'alive' }

which(
  function () { cat.status = 'dead';  return 1 },
  function () { cat.status = 'alive'; return 0 }
)

console.log(cat.status)`,
  },
  {
    id: 'decoherence',
    title: '14. Decoherence — Information Leaks from Memory to IO',
    description:
      'Path information is first stored in memory (reversible), then later "amplified" to IO via setTimeout. Result: collapse. Once information couples to the environment (IO), decoherence is irreversible.',
    code: `var detector = { data: null }

which(
  function () {
    detector.data = 'path1'
    setTimeout(function () {
      console.log(detector.data)
    }, 1000)
    return 1
  },
  function () {
    detector.data = 'path2'
    setTimeout(function () {
      console.log(detector.data)
    }, 1000)
    return 0
  }
)`,
  },
  {
    id: 'uncomputation',
    title: '15. Uncomputation — Write Then Erase',
    description:
      'Path information briefly exists in memory but is erased before any IO occurs. Result: interference. This corresponds to quantum uncomputation — reversible operations preserve coherence.',
    code: `var detector = { data: null }

which(
  function () {
    detector.data = 'path1'
    detector.data = null
    return 1
  },
  function () {
    detector.data = 'path2'
    detector.data = null
    return 0
  }
)`,
  },
  {
    id: 'wigner-friend-closed',
    title: "16a. Wigner's Friend — Friend Doesn't Tell",
    description:
      'The friend "observes" inside the closure (writes to a global variable), but doesn\'t tell the outside world (no console.log). From Wigner\'s perspective: the friend is in superposition. Result: interference.',
    code: `var friendSaw = null

which(
  function () { friendSaw = 'path1'; return 1 },
  function () { friendSaw = 'path2'; return 0 }
)`,
  },
  {
    id: 'wigner-friend-open',
    title: "16b. Wigner's Friend — Friend Tells",
    description:
      'The friend calls Wigner (IO leaks to outside). Result: collapse.',
    code: `var friendSaw = null

which(
  function () {
    friendSaw = 'path1'
    console.log('friend: path1')
    return 1
  },
  function () {
    friendSaw = 'path2'
    console.log('friend: path2')
    return 0
  }
)`,
  },
  {
    id: 'env-noise-uncoupled',
    title: '17. Environment Noise — Not Coupled to Path',
    description:
      'Both paths call the same noisy environment function from the same initial state. The noise is identical in both paths. Result: interference. Noise alone doesn\'t cause decoherence.',
    code: `var logCount = 0
var noisyEnv = function () {
  logCount++
  if (logCount % 3 === 0) console.log('env heartbeat')
}

which(
  function () { noisyEnv(); return 1 },
  function () { noisyEnv(); return 0 }
)`,
  },
  {
    id: 'env-noise-coupled',
    title: '18. Environment Noise — Coupled to Path',
    description:
      'The noise now contains path information. Result: collapse. Compare with Experiment 17.',
    code: `which(
  function () {
    console.log('heartbeat from path1')
    return 1
  },
  function () {
    console.log('heartbeat from path2')
    return 0
  }
)`,
  },
  {
    id: 'bomb-test',
    title: '19. Elitzur-Vaidman Bomb Test',
    description:
      'A "live bomb" has console.log (a working detector). When testing: if path2 is chosen, the bomb doesn\'t explode but we know it\'s live because a dud would show interference. Interaction-free measurement!',
    code: `// Test a live bomb:
which(
  function () {
    console.log('boom')
    return 1
  },
  function () { return 0 }
)`,
  },
  {
    id: 'zeno-no-collapse',
    title: '20a. Quantum Zeno — Observation Without Path Info',
    description:
      "Repeated observation that doesn't carry path info. Result: interference (IO identical each time).",
    code: `which(
  function () {
    console.log('check')
    return 1
  },
  function () {
    console.log('check')
    return 0
  }
)`,
  },
  {
    id: 'zeno-collapse',
    title: '20b. Quantum Zeno — Observation With Path Info',
    description:
      'Repeated observation that carries path info. Result: collapse every time — system locked in particle state.',
    code: `which(
  function () {
    console.log('path1 check')
    return 1
  },
  function () {
    console.log('path2 check')
    return 0
  }
)`,
  },
  {
    id: 'complementarity-wave',
    title: '21a. Complementarity — See Fringes',
    description:
      "Don't read cat.status → see fringes. You can see the wave pattern.",
    code: `var cat = { status: 'alive' }

which(
  function () { cat.status = 'dead';  return 1 },
  function () { cat.status = 'alive'; return 0 }
)`,
  },
  {
    id: 'complementarity-particle',
    title: '21b. Complementarity — Know Which Path',
    description:
      'Read cat.status → fringes disappear. You can know which path, but not both. This is complementarity.',
    code: `var cat = { status: 'alive' }

which(
  function () { cat.status = 'dead';  return 1 },
  function () { cat.status = 'alive'; return 0 }
)

console.log(cat.status)`,
  },
  {
    id: 'counterfactual',
    title: '22. Counterfactual Computation',
    description:
      "~50% of runs choose path2 — dangerousFunction never executes. But we know it has IO (otherwise we'd see interference). We learned a property of the function without running it.",
    code: `function dangerousFunction() {
  console.log('launched the missiles')
  return 1
}

which(
  function () { return dangerousFunction() },
  function () { return 0 }
)`,
  },
  {
    id: 'weak-measurement',
    title: '23. Weak Measurement',
    description:
      'Detector efficiency is 0.1%. Run 100,000 times. The screen shows near-perfect interference fringes. But ~100 dots came from collapse events. Minimal disturbance per shot.',
    code: `which(
  function () {
    if (Math.random() < 0.001) console.log('weak click')
    return 1
  },
  function () { return 0 }
)`,
  },
  {
    id: 'triple-slit',
    title: '24a. Triple Slit — Interference',
    description:
      'Three paths → sharper principal maxima, secondary maxima appear. A richer interference pattern than double-slit.',
    code: `which(
  function () { return 0 },
  function () { return 1 },
  function () { return 2 }
)`,
  },
  {
    id: 'triple-slit-collapse',
    title: '24b. Triple Slit — Observe One',
    description:
      'Observing any single path destroys ALL interference. Collapse.',
    code: `which(
  function () {
    console.log('path1')
    return 0
  },
  function () { return 1 },
  function () { return 2 }
)`,
  },
]
