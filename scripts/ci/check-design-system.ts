import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

type Rule = {
  name: string;
  pattern: RegExp;
  allow?: (path: string, line: string) => boolean;
};

type Violation = {
  rule: string;
  path: string;
  line: number;
  excerpt: string;
};

function listTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listTsxFiles(path);
    return entry.isFile() && entry.name.endsWith(".tsx") ? [path] : [];
  });
}

const palette =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const rules: Rule[] = [
  {
    name: "palette Tailwind native",
    pattern: new RegExp(
      `\\b(?:text|bg|border|ring|decoration|fill|stroke|from|to|via)-(?:${palette})-`,
    ),
  },
  {
    name: "noir pur",
    pattern: /\b(?:text|bg|border)-black(?:\/\d+)?\b/,
  },
  {
    name: "blanc pur hors glassmorphism",
    pattern: /\b(?:text|bg|border)-white(?:\/\d+)?\b/,
    allow: (_path, line) =>
      /\bbg-white\/80\b/.test(line) && /\bbackdrop-blur-md\b/.test(line),
  },
  {
    name: "tokens shadcn parasites",
    pattern:
      /muted-foreground|accent-foreground|border-input|ring-ring|ring-offset-background|bg-primary|text-primary(?:\s|"|')|bg-secondary(?:\s|"|')|text-secondary(?:\s|"|')|bg-accent(?:\s|"|')|bg-background|text-foreground|destructive|bg-popover|text-popover|bg-card|text-card/,
  },
  {
    name: "shadow non editorial",
    pattern:
      /\b(?:shadow-sm|shadow-md|shadow-lg|shadow-xl|shadow-2xl|drop-shadow-)/,
  },
  {
    name: "bordure dure",
    pattern: /\bborder-[2-9]\b|\bdivide-/,
  },
  {
    name: "rayon excessif",
    pattern: /\brounded-(?:2xl|3xl)\b/,
  },
  {
    name: "bouton HTML natif",
    pattern: /<button\b/,
    allow: (path) =>
      path === "src/features/game/components/Cell.tsx" ||
      path === "src/features/game/components/ResultScreen.tsx" ||
      !path.startsWith("src/features/"),
  },
  {
    name: "barre éditoriale dupliquée",
    pattern: /w-12 h-1 .* bg-brand|h-1 w-12 .* bg-brand/,
    allow: (path) =>
      path === "src/components/editorial/DisplayHeader.tsx" ||
      path === "src/components/editorial/AccentBar.tsx" ||
      path === "src/features/game/components/HowToPlayLink.tsx",
  },
  {
    name: "eyebrow dupliqué",
    pattern: /text-\[10px\].*tracking-widest.*uppercase/,
    allow: (path) =>
      path === "src/components/editorial/Eyebrow.tsx" ||
      path.endsWith("/DiversityMetricsPanel.tsx"),
  },
  {
    name: "pill admin dupliquée",
    pattern: /rounded-full.*text-\[10px\]/,
    allow: (path) =>
      !path.startsWith("src/features/admin/") ||
      /\/(?:DifficultyPill|StatusPill|TagPill|RarityBadge)\.tsx$/.test(path),
  },
  {
    name: "panel admin hors PanelCard",
    pattern: /<section[^>]*bg-surface-low/,
    allow: (path) =>
      !path.startsWith("src/features/admin/") ||
      path === "src/features/admin/components/PanelCard.tsx",
  },
  {
    name: "CTA surchargeant son variant",
    pattern: /bg-on-surface text-surface-lowest/,
    allow: (path) => path === "src/components/ui/button.tsx",
  },
  {
    name: "bouton secondary surchargé",
    pattern: /bg-surface-highest text-on-surface/,
    allow: (path) =>
      path === "src/components/ui/button.tsx" ||
      path === "src/components/ui/calendar.tsx" ||
      path.endsWith("/ScheduleCalendar.tsx"),
  },
];

const violations: Violation[] = [];
listTsxFiles("src").forEach((file) => {
  const path = relative(".", file);
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, index) => {
      rules.forEach((rule) => {
        if (rule.pattern.test(line) && !rule.allow?.(path, line)) {
          violations.push({
            rule: rule.name,
            path,
            line: index + 1,
            excerpt: line.trim(),
          });
        }
      });
    });
});

if (violations.length > 0) {
  violations.forEach((violation) => {
    console.error(
      `${violation.path}:${violation.line} [${violation.rule}] ${violation.excerpt}`,
    );
  });
  throw new Error(
    `${violations.length} violation(s) du design system détectée(s).`,
  );
}

console.log(`✓ Design system : ${rules.length} règles, aucune violation.`);
