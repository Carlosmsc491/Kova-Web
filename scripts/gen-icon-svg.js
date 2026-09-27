// One-off icon source — square, edge-to-edge gradient, no baked-in corner
// rounding (iOS/Android apply their own mask). "K" kept within the inner
// ~80% safe zone so it also works as a maskable icon.
export const ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6C63FF"/>
      <stop offset="100%" stop-color="#4A1D8F"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <text x="256" y="336" font-family="Arial, sans-serif" font-size="280" font-weight="700"
        fill="#FFFFFF" text-anchor="middle">K</text>
</svg>
`
