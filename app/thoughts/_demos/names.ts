// Names an article can use as `demo` in its metadata. Shared by the server
// (to validate metadata) and the client registry in `./index.tsx`.
export const demoNames = ['cobe', 'gpu-lexer'] as const

export type DemoName = (typeof demoNames)[number]

export function isDemoName(name: unknown): name is DemoName {
  return demoNames.includes(name as DemoName)
}
