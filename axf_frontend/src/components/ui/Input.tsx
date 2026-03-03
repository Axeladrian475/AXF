import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

interface Option {
  value: string | number;
  label: string;
}

// Combinamos atributos de input y select para que el componente sea flexible
interface InputProps extends InputHTMLAttributes<
  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
> {
  label?: string;
  name: string;
  error?: string;
  type?: string;
  options?: Option[];
}

export default function Input({
  label,
  name,
  error,
  type = "text",
  options = [],
  required = false,
  className = "",
  ...rest
}: InputProps) {
  const inputClass = `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    error ? "border-red-400 bg-red-50" : "border-gray-300"
  } ${className}`;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {type === "select" ? (
        <select
          name={name}
          className={inputClass}
          {...(rest as SelectHTMLAttributes<HTMLSelectElement>)}
        >
          <option value="">— Selecciona —</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          name={name}
          rows={4}
          className={inputClass}
          {...(rest as any)}
        />
      ) : (
        <input
          type={type}
          name={name}
          className={inputClass}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
