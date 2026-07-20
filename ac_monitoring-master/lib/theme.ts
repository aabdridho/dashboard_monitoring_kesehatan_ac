/**
 * Centralized theme tokens for the AC Monitoring dashboard.
 *
 * The dusty-pink / rose palette is mirrored in `app/globals.css` via CSS
 * custom properties. Keeping the names here means components can import
 * semantic tokens (e.g. `COLORS.primary`) instead of hardcoding hex values.
 */

export const COLORS = {
  // Brand
  primary: "var(--primary)",
  "primary-foreground": "var(--primary-foreground)",

  secondary: "var(--secondary)",
  "secondary-foreground": "var(--secondary-foreground)",

  accent: "var(--accent)",
  "accent-foreground": "var(--accent-foreground)",

  // Surfaces
  background: "var(--background)",
  foreground: "var(--foreground)",
  card: "var(--card)",
  "card-foreground": "var(--card-foreground)",
  muted: "var(--muted)",
  "muted-foreground": "var(--muted-foreground)",

  // Lines / focus
  border: "var(--border)",
  input: "var(--input)",
  ring: "var(--ring)",

  // Status
  success: "var(--success)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
  "destructive-foreground": "var(--destructive-foreground)",
} as const;

export type ColorToken = keyof typeof COLORS;
