import { getQuickJS } from 'quickjs-emscripten'

export interface LogEntry {
  args: string[]
  delay: number // ms delay from setTimeout (0 if immediate)
}

export interface PathResult {
  position: number
  ioTrace: LogEntry[]
}

export interface RunResult {
  mode: 'interference' | 'collapse'
  paths: PathResult[]
  chosenPath?: number
  screenPosition: number
}

export async function runExperiment(
  code: string,
  runSeed?: number,
): Promise<RunResult> {
  const seed = runSeed ?? Math.floor(Math.random() * 2147483647)
  const QuickJS = await getQuickJS()
  const vm = QuickJS.newContext()

  try {
    // Inject the runtime that handles pre-execution internally
    const runtimeCode = `
      (function() {
        var _Math = Math;
        var _console = typeof console !== 'undefined' ? console : { log: function(){} };

        // Eval user code in an isolated scope with no access to internal state
        function _exec(code, which, Math, console, setTimeout) {
          eval(code);
        }

        return function(userCode, seed) {
          // Polyfill setTimeout - runs callback synchronously (pre-execution flattens time)
          // but tracks the delay for real-time playback
          var timers = [];
          var currentDelay = 0;
          function setTimeout(fn, delay) {
            timers.push({ fn: fn, delay: delay || 0 });
            return timers.length;
          }
          function flushTimers() {
            var toRun = timers.slice();
            timers = [];
            for (var i = 0; i < toRun.length; i++) {
              currentDelay = toRun[i].delay;
              try { toRun[i].fn(); } catch(e) {}
              currentDelay = 0;
            }
            if (timers.length > 0) flushTimers();
          }

          // Mulberry32 PRNG
          function mulberry32(s) {
            return function() {
              var t = (s += 0x6d2b79f5);
              t = _Math.imul(t ^ (t >>> 15), t | 1);
              t ^= t + _Math.imul(t ^ (t >>> 7), t | 61);
              return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
          }

          // Create isolated path seed
          function createPathSeed(runSeed, pathIndex) {
            var h = runSeed ^ (pathIndex * 2654435761);
            h = _Math.imul(h ^ (h >>> 16), 2246822507);
            h = _Math.imul(h ^ (h >>> 13), 3266489909);
            return (h ^= h >>> 16) >>> 0;
          }

          // First pass: discover number of closures
          var numClosures = 0;
          var closures = [];

          var discoverWhich = function() {
            closures = Array.prototype.slice.call(arguments);
            numClosures = closures.length;
          };

          timers = [];
          try {
            _exec(userCode, discoverWhich, _Math, _console, setTimeout);
          } catch(e) {}

          if (numClosures === 0) {
            return JSON.stringify({
              mode: 'interference',
              paths: [],
              screenPosition: 0
            });
          }

          // Pre-execute each path
          var pathResults = [];

          for (var pathIndex = 0; pathIndex < numClosures; pathIndex++) {
            var ioTrace = [];
            var whichResult = 0;
            var pathRandom = mulberry32(createPathSeed(seed, pathIndex));

            var pathConsole = {
              log: function() {
                var args = [];
                for (var i = 0; i < arguments.length; i++) {
                  args.push(String(arguments[i]));
                }
                ioTrace.push({ args: args, delay: currentDelay });
              }
            };

            var pathMath = {};
            for (var k in _Math) {
              if (typeof _Math[k] === 'function') {
                pathMath[k] = _Math[k].bind(_Math);
              } else {
                pathMath[k] = _Math[k];
              }
            }
            pathMath.random = pathRandom;

            var pathWhich = (function(idx) {
              return function() {
                var fns = Array.prototype.slice.call(arguments);
                if (idx < fns.length) {
                  whichResult = fns[idx]();
                }
              };
            })(pathIndex);

            timers = [];
            try {
              _exec(userCode, pathWhich, pathMath, pathConsole, setTimeout);
              flushTimers();
            } catch(e) {}

            pathResults.push({
              position: typeof whichResult === 'number' ? whichResult : 0,
              ioTrace: ioTrace
            });
          }

          // Compare IO traces
          var allEqual = true;
          if (pathResults.length > 1) {
            var firstTrace = JSON.stringify(pathResults[0].ioTrace);
            for (var i = 1; i < pathResults.length; i++) {
              if (JSON.stringify(pathResults[i].ioTrace) !== firstTrace) {
                allEqual = false;
                break;
              }
            }
          }

          var result;
          if (allEqual) {
            result = {
              mode: 'interference',
              paths: pathResults,
              screenPosition: 0
            };
          } else {
            var chosenPath = _Math.floor(mulberry32(seed)() * pathResults.length);
            result = {
              mode: 'collapse',
              paths: pathResults,
              chosenPath: chosenPath,
              screenPosition: pathResults[chosenPath].position
            };
          }

          return JSON.stringify(result);
        };
      })()
    `

    // Evaluate the runtime function
    const runtimeResult = vm.evalCode(runtimeCode)
    if (runtimeResult.error) {
      const err = vm.dump(runtimeResult.error)
      runtimeResult.error.dispose()
      vm.dispose()
      throw new Error(String(err))
    }

    const runtimeFn = runtimeResult.value

    // Call the runtime with user code and seed
    const codeHandle = vm.newString(code)
    const seedHandle = vm.newNumber(seed)
    const callResult = vm.callFunction(
      runtimeFn,
      vm.undefined,
      codeHandle,
      seedHandle,
    )

    codeHandle.dispose()
    seedHandle.dispose()
    runtimeFn.dispose()

    if (callResult.error) {
      const err = vm.dump(callResult.error)
      callResult.error.dispose()
      vm.dispose()
      throw new Error(String(err))
    }

    const resultJson = vm.dump(callResult.value)
    callResult.value.dispose()
    vm.dispose()

    return JSON.parse(resultJson as string)
  } catch (err) {
    vm.dispose()
    // Return a default interference result on error
    return {
      mode: 'interference',
      paths: [
        { position: 0, ioTrace: [] as LogEntry[] },
        { position: 0, ioTrace: [] as LogEntry[] },
      ],
      screenPosition: 0,
    }
  }
}
