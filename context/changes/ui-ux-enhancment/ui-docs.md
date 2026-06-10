# Ocean Breeze Theme – UI Documentation

Shadcn/ui theme configuration for BarkBuddy using the **Ocean Breeze (tweakcn)** palette. Calming coastal colors suited for a dog-walking community app.

## Theme Source

- **Name**: Ocean Breeze (tweakcn)
- **Author**: @mike
- **URL**: https://shadcnthemer.com/themes/bcf98433-75da-45df-afc0-2535257a6cb0
- **Tool**: [tweakcn](https://github.com/jnsahaj/tweakcn) – visual no-code theme editor for shadcn/ui

## Design Intent

Ocean Breeze uses refreshing aqua tones reminiscent of tropical/coastal waters. Key characteristics:

- **Primary**: Bright aqua — `oklch(0.72 0.19 149.58)` (light), `oklch(0.77 0.15 163.22)` (dark)
- **Mood**: Calm, fresh, outdoors — fits a dog-walking/outdoor activity app
- **Font**: DM Sans, sans-serif (recommended by tweakcn preset)

## Installation

### Option A: CLI (recommended)

```bash
npx shadcn@latest add https://tweakcn-picker.vercel.app/r/theme-ocean-breeze.json
```

### Option B: Manual CSS variables

Replace the `:root` and `.dark` blocks in `src/app/globals.css` with the Ocean Breeze palette below.

## CSS Variables (OKLCH)

Paste into `src/app/globals.css`, replacing the current `:root` and dark-mode blocks:

```css
:root {
  --radius: 0.625rem;
  --background: oklch(0.98 0.01 200);
  --foreground: oklch(0.20 0.03 230);
  --card: oklch(0.99 0.005 200);
  --card-foreground: oklch(0.20 0.03 230);
  --popover: oklch(0.99 0.005 200);
  --popover-foreground: oklch(0.20 0.03 230);
  --primary: oklch(0.72 0.19 149.58);
  --primary-foreground: oklch(0.99 0.005 200);
  --secondary: oklch(0.94 0.03 200);
  --secondary-foreground: oklch(0.25 0.04 230);
  --muted: oklch(0.94 0.02 200);
  --muted-foreground: oklch(0.50 0.04 230);
  --accent: oklch(0.90 0.05 180);
  --accent-foreground: oklch(0.20 0.03 230);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.90 0.02 200);
  --input: oklch(0.90 0.02 200);
  --ring: oklch(0.72 0.19 149.58);
  --chart-1: oklch(0.72 0.19 149.58);
  --chart-2: oklch(0.60 0.12 185);
  --chart-3: oklch(0.50 0.08 220);
  --chart-4: oklch(0.80 0.15 100);
  --chart-5: oklch(0.75 0.10 60);
  --sidebar: oklch(0.96 0.02 200);
  --sidebar-foreground: oklch(0.20 0.03 230);
  --sidebar-primary: oklch(0.72 0.19 149.58);
  --sidebar-primary-foreground: oklch(0.99 0.005 200);
  --sidebar-accent: oklch(0.92 0.04 180);
  --sidebar-accent-foreground: oklch(0.20 0.03 230);
  --sidebar-border: oklch(0.90 0.02 200);
  --sidebar-ring: oklch(0.72 0.19 149.58);
}

.dark {
  --background: oklch(0.18 0.03 220);
  --foreground: oklch(0.94 0.02 200);
  --card: oklch(0.22 0.03 220);
  --card-foreground: oklch(0.94 0.02 200);
  --popover: oklch(0.22 0.03 220);
  --popover-foreground: oklch(0.94 0.02 200);
  --primary: oklch(0.77 0.15 163.22);
  --primary-foreground: oklch(0.15 0.03 220);
  --secondary: oklch(0.26 0.03 220);
  --secondary-foreground: oklch(0.94 0.02 200);
  --muted: oklch(0.26 0.03 220);
  --muted-foreground: oklch(0.65 0.03 200);
  --accent: oklch(0.30 0.05 200);
  --accent-foreground: oklch(0.94 0.02 200);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(0.30 0.03 220);
  --input: oklch(0.30 0.03 220);
  --ring: oklch(0.77 0.15 163.22);
  --chart-1: oklch(0.77 0.15 163.22);
  --chart-2: oklch(0.65 0.12 185);
  --chart-3: oklch(0.55 0.08 220);
  --chart-4: oklch(0.70 0.18 100);
  --chart-5: oklch(0.65 0.14 60);
  --sidebar: oklch(0.20 0.03 220);
  --sidebar-foreground: oklch(0.94 0.02 200);
  --sidebar-primary: oklch(0.77 0.15 163.22);
  --sidebar-primary-foreground: oklch(0.94 0.02 200);
  --sidebar-accent: oklch(0.28 0.04 200);
  --sidebar-accent-foreground: oklch(0.94 0.02 200);
  --sidebar-border: oklch(0.30 0.03 220);
  --sidebar-ring: oklch(0.77 0.15 163.22);
}
```

## `@theme inline` Block

Keep the existing `@theme inline` block in `globals.css` — it maps CSS variables to Tailwind color utilities. No changes needed; all shadcn/ui components pick up the new colors automatically.

## Dark Mode Strategy

Current project uses `@media (prefers-color-scheme: dark)` in `globals.css`. The theme above uses a `.dark` class strategy (shadcn/ui standard). To adopt:

1. Switch from `@media (prefers-color-scheme: dark)` → `.dark` class on `<html>`
2. Add `@custom-variant dark (&:is(.dark *));` (already present)
3. Use `next-themes` package for toggle support (optional)

## Font Recommendation

tweakcn Ocean Breeze pairs with **DM Sans**. Current project uses Geist — both are clean sans-serifs that work well with this palette. Keep Geist for consistency with Vercel ecosystem, or swap to DM Sans for the full Ocean Breeze feel.

## Integration Notes

- **No component changes needed** — shadcn/ui components read CSS variables directly
- **Tailwind 4 compatible** — uses `@theme inline` mapping (already set up)
- **OKLCH color space** — modern, perceptually uniform; supported in all modern browsers
- **components.json** is already configured with `cssVariables: true`
