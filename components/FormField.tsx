import { useId } from "react";

type Props = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  autoComplete?: string;
  optional?: boolean;
  textarea?: boolean;
  inputMode?: "text" | "numeric" | "tel" | "email";
};

export function FormField({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  error,
  autoComplete,
  optional,
  textarea,
  inputMode,
}: Props) {
  const id = useId();
  const errorId = `${id}-error`;
  const common = {
    id,
    name,
    value,
    placeholder,
    required,
    autoComplete,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errorId : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
    className: "field-input",
  };

  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
        {optional && <span className="ml-1 font-normal normal-case text-[var(--color-text-muted)]">(optional)</span>}
      </label>
      {textarea ? (
        <textarea {...common} rows={4} className="field-input min-h-[120px] resize-y" />
      ) : (
        <input {...common} type={type} inputMode={inputMode} />
      )}
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
