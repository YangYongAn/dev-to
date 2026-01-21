declare global {
  type HTMLElement = object

  interface Window {
    location: {
      href: string
      origin: string
    }
    addEventListener: (type: string, listener: () => void) => void
    removeEventListener: (type: string, listener: () => void) => void
  }

  const window: Window
}

export {}
