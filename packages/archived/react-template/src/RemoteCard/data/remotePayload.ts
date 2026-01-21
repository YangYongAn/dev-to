export type RemotePayload = {
  server: 'vite'
  generatedAt: string
  todos: Array<{ id: string, title: string, done: boolean }>
}

export const payload: RemotePayload = {
  server: 'vite',
  generatedAt: new Date().toISOString(),
  todos: [
    { id: '1', title: 'State + derived memo', done: true },
    { id: '2', title: 'Async dynamic import', done: true },
    { id: '3', title: 'CSS Modules + Less', done: true },
    { id: '4', title: 'Assets + SVG', done: true },
  ],
}
