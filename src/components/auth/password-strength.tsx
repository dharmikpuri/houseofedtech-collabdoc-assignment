import { cn } from "@/lib/utils";

/**
 * A lightweight password strength hint. It encourages length and variety;
 * the hard rules (8+ characters, a letter and a number) are enforced by the
 * server-side schema, not here.
 */
function score(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  let points = 0;
  if (password.length >= 8) points += 1;
  if (password.length >= 12) points += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) points += 1;
  if (/^(.)\1+$/.test(password) || /^(password|12345678|qwerty)/i.test(password)) points = 1;
  return Math.min(points, 4) as 0 | 1 | 2 | 3 | 4;
}

const LABELS = ["", "Weak", "Fair", "Good", "Strong"] as const;
const COLORS = ["bg-border", "bg-danger", "bg-warning", "bg-info", "bg-success"] as const;

export function PasswordStrength({ password }: { password: string }) {
  const value = score(password);
  if (!password) return null;

  return (
    <div className="mt-1.5" aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={cn("h-1 flex-1 rounded-full", step <= value ? COLORS[value] : "bg-border")}
          />
        ))}
      </div>
      <p className="text-muted-foreground mt-1 text-[11px]">
        Strength: <span className="text-foreground font-medium">{LABELS[value]}</span>
        {value < 3 && " — longer, with mixed case and a symbol, is stronger."}
      </p>
    </div>
  );
}
