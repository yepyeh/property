export class ValidationError extends Error {
  field: string;

  constructor(field: string, message: string) {
    super(message);
    this.field = field;
    this.name = "ValidationError";
  }
}

interface TextOptions {
  required?: boolean;
  maxLength?: number;
  defaultValue?: string;
}

interface NumberOptions {
  required?: boolean;
  min?: number;
  max?: number;
}

export function readText(form: FormData, key: string, options: TextOptions = {}) {
  const value = String(form.get(key) || options.defaultValue || "").trim();

  if (options.required && !value) {
    throw new ValidationError(key, `${key} is required`);
  }

  if (options.maxLength && value.length > options.maxLength) {
    throw new ValidationError(key, `${key} is too long`);
  }

  return value;
}

export function readOptionalText(form: FormData, key: string, options: Omit<TextOptions, "required"> = {}) {
  return readText(form, key, { ...options, required: false });
}

export function readNumber(form: FormData, key: string, options: NumberOptions = {}) {
  const raw = String(form.get(key) || "").trim();

  if (!raw) {
    if (options.required) {
      throw new ValidationError(key, `${key} is required`);
    }
    return undefined;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new ValidationError(key, `${key} must be a number`);
  }

  if (typeof options.min === "number" && value < options.min) {
    throw new ValidationError(key, `${key} is too small`);
  }

  if (typeof options.max === "number" && value > options.max) {
    throw new ValidationError(key, `${key} is too large`);
  }

  return value;
}

export function readEnum<T extends string>(form: FormData, key: string, values: readonly T[], fallback?: T) {
  const value = String(form.get(key) || "").trim();
  if (values.includes(value as T)) {
    return value as T;
  }

  if (fallback !== undefined) return fallback;
  throw new ValidationError(key, `${key} is invalid`);
}

export function readBoolean(form: FormData, key: string) {
  return form.has(key);
}
