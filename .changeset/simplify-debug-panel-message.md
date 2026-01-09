---
'@dev-to/react-plugin': patch
---

Simplify and optimize debug panel startup message display

- Simplified debug panel display to show only the essential localhost URL instead of all network addresses
- Moved debug panel message to appear after Vite's server startup info using `setImmediate`
- Reduced visual clutter by removing duplicate IP addresses (127.0.0.1, LAN IPs) and JSON endpoint from startup log
- Added eye-catching cyan background badge styling to "DevTo" label for better visibility
- Improved alignment with Vite's native URL display format using the same `➜` symbol

Before:
```
[dev_to:react] Debug panel:
  http://localhost:5173/__dev_to__/debug.html
  http://127.0.0.1:5173/__dev_to__/debug.html
  http://192.168.137.122:5173/__dev_to__/debug.html
  JSON: http://localhost:5173/__dev_to__/debug.json
```

After:
```
  VITE v5.4.21  ready in 400 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.137.122:5173/
  ➜  DevTo    http://localhost:5173/__dev_to__
```

This change provides a cleaner, more professional developer experience that aligns with Vite's UI patterns.
