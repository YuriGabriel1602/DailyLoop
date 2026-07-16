const LEVELS = [
  { label: "Fraca", className: "bg-[#d03b3b]" },
  { label: "Razoável", className: "bg-[#fab219]" },
  { label: "Boa", className: "bg-[#c98500]" },
  { label: "Forte", className: "bg-[#0ca30c]" },
];

function scorePassword(password: string): number {
  if (!password) return -1;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  const score = scorePassword(password);
  if (score < 0) return null;
  const level = LEVELS[Math.max(score - 1, 0)];

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-4 gap-1">
        {LEVELS.map((l, i) => (
          <div key={l.label} className={`h-1 rounded-full transition-colors ${i < score ? level.className : "bg-muted"}`} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Força da senha: <span className="font-medium text-foreground">{level.label}</span></p>
    </div>
  );
}
