import { InputHTMLAttributes, forwardRef, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, ...props }, ref) => {
    const generatedId = useId();
    const id = props.id ?? generatedId;
    const errorId = `${id}-error`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`block w-full rounded-lg border ${
            error
              ? "border-red-300 dark:border-red-600"
              : "border-stone-200 dark:border-stone-600"
          } bg-white/90 px-3 py-2 text-stone-900 placeholder-stone-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/15 dark:bg-stone-800/90 dark:text-white sm:text-sm ${className}`}
          {...props}
          id={id}
        />
        {error && (
          <p id={errorId} className="mt-1 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
