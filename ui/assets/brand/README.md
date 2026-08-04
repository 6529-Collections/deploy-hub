# Deploy Hub brand assets

These files are saved for the live UI task and are not wired into the current
static shell yet.

## Source

`deploy-hub-icon-master.png` is an exact copy of the user-supplied 2400×2400 PNG.
No generated or redrawn variant is used.

## Saved sizes

| File                         |      Size | Intended use         |
| ---------------------------- | --------: | -------------------- |
| `deploy-hub-icon-master.png` | 2400×2400 | Preserved source     |
| `deploy-hub-icon-512.png`    |   512×512 | Large UI/app icon    |
| `deploy-hub-icon-192.png`    |   192×192 | Compact UI/app icon  |
| `apple-touch-icon-180.png`   |   180×180 | Apple touch icon     |
| `favicon-48.png`             |     48×48 | High-density favicon |
| `favicon-32.png`             |     32×32 | Standard favicon     |
| `favicon-16.png`             |     16×16 | Small favicon        |

All derivatives are deterministic resizes of the preserved source. The current
shell should adopt them during Task 2 together with accessible branding and
favicon markup.
