import { useEffect, useId, useState } from "react";
import { validateUpgradeLevel } from "../engine/upgrades/calculateUpgrades";

export function UpgradeLevelInput({
  label,
  value,
  onChange,
  effect,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  effect?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState("");
  const errorId = useId();
  useEffect(() => {
    setDraft(String(value));
    setError("");
  }, [value]);
  return (
    <div>
      <label>
        {label}
        <input
          type="number"
          min="0"
          step="1"
          value={draft}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => {
            const text = event.target.value;
            setDraft(text);
            try {
              if (!text.trim())
                throw new Error("Renseignez un entier positif ou nul.");
              const next = validateUpgradeLevel(Number(text));
              setError("");
              onChange(next);
            } catch {
              setError(
                `Niveau invalide. Le dernier niveau valide (${value}) reste appliqué.`,
              );
            }
          }}
        />
      </label>
      {effect && <p className="note">{effect}</p>}
      {error && (
        <p id={errorId} role="alert" className="warning">
          {error}
        </p>
      )}
    </div>
  );
}
