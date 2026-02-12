import { BusinessType, EntityType, ArtifactType, ErrorCode } from "../types";

export class ValidationError extends Error {
  public code: ErrorCode = ErrorCode.VALIDATION_ERROR;
  public details: Record<string, string>;

  constructor(details: Record<string, string>) {
    const messages = Object.values(details).join("; ");
    super(`Validation failed: ${messages}`);
    this.details = details;
  }
}

export function validateEmail(email: unknown): string {
  if (typeof email !== "string" || !email) {
    throw new ValidationError({ email: "Email is required" });
  }
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    throw new ValidationError({ email: "Invalid email format" });
  }
  return trimmed;
}

export function validatePassword(password: unknown): string {
  if (typeof password !== "string" || !password) {
    throw new ValidationError({ password: "Password is required" });
  }
  if (password.length < 8) {
    throw new ValidationError({ password: "Password must be at least 8 characters" });
  }
  if (password.length > 128) {
    throw new ValidationError({ password: "Password must be at most 128 characters" });
  }
  return password;
}

export function validateIntake(body: Record<string, unknown>): {
  experience_level: number;
  business_type: BusinessType;
  budget: number;
  income_goal: number;
  weekly_hours: number;
} {
  const errors: Record<string, string> = {};

  const exp = body.experience_level;
  if (typeof exp !== "number" || !Number.isInteger(exp) || exp < 0 || exp > 10) {
    errors.experience_level = "Must be an integer between 0 and 10";
  }

  const bt = body.business_type;
  if (!bt || !Object.values(BusinessType).includes(bt as BusinessType)) {
    errors.business_type = `Must be one of: ${Object.values(BusinessType).join(", ")}`;
  }

  const budget = body.budget;
  if (typeof budget !== "number" || budget < 0) {
    errors.budget = "Must be a non-negative number";
  }

  const goal = body.income_goal;
  if (typeof goal !== "number" || goal < 0) {
    errors.income_goal = "Must be a non-negative number";
  }

  const hours = body.weekly_hours;
  if (typeof hours !== "number" || !Number.isInteger(hours) || hours < 0) {
    errors.weekly_hours = "Must be a non-negative integer";
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  return {
    experience_level: exp as number,
    business_type: bt as BusinessType,
    budget: budget as number,
    income_goal: goal as number,
    weekly_hours: hours as number,
  };
}

export function validateVentureUpdate(
  body: Record<string, unknown>
): Record<string, unknown> {
  const allowed = new Set([
    "name",
    "problem_statement",
    "solution_statement",
    "target_customer",
    "offer_description",
    "revenue_model",
    "distribution_channel",
    "estimated_costs",
    "advantage",
    "entity_type",
    "entity_state",
    "ein_obtained",
    "bank_account_opened",
  ]);

  const errors: Record<string, string> = {};
  const cleaned: Record<string, unknown> = {};

  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) {
      errors[key] = `Unknown field: ${key}`;
      continue;
    }
    const val = body[key];

    if (key === "entity_type" && val !== undefined) {
      if (!Object.values(EntityType).includes(val as EntityType)) {
        errors[key] = `Must be one of: ${Object.values(EntityType).join(", ")}`;
        continue;
      }
    }

    if (key === "estimated_costs" && val !== undefined) {
      if (
        typeof val !== "object" ||
        val === null ||
        typeof (val as Record<string, unknown>).startup !== "number" ||
        typeof (val as Record<string, unknown>).monthly !== "number"
      ) {
        errors[key] = "Must be { startup: number, monthly: number }";
        continue;
      }
      // LOGIC-5 fix: reject negative and non-finite values
      const startup = (val as Record<string, unknown>).startup as number;
      const monthly = (val as Record<string, unknown>).monthly as number;
      if (startup < 0 || monthly < 0 || !isFinite(startup) || !isFinite(monthly)) {
        errors[key] = "startup and monthly must be non-negative finite numbers";
        continue;
      }
    }

    if ((key === "ein_obtained" || key === "bank_account_opened") && val !== undefined) {
      if (typeof val !== "boolean") {
        errors[key] = "Must be a boolean";
        continue;
      }
    }

    // String fields — SEC-6 fix: enforce max length
    if (
      [
        "name", "problem_statement", "solution_statement", "target_customer",
        "offer_description", "revenue_model", "distribution_channel",
        "advantage", "entity_state",
      ].includes(key) && val !== undefined && val !== null
    ) {
      if (typeof val !== "string") {
        errors[key] = "Must be a string";
        continue;
      }
      const MAX_FIELD_LENGTH = 5000;
      if (val.length > MAX_FIELD_LENGTH) {
        errors[key] = `Must be at most ${MAX_FIELD_LENGTH} characters`;
        continue;
      }
    }

    cleaned[key] = val;
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  if (Object.keys(cleaned).length === 0) {
    throw new ValidationError({ _body: "No valid fields provided" });
  }

  return cleaned;
}

export function validateArtifactCreate(body: Record<string, unknown>): {
  phase_number: number;
  type: ArtifactType;
  content: Record<string, unknown>;
} {
  const errors: Record<string, string> = {};

  const phase = body.phase_number;
  if (typeof phase !== "number" || !Number.isInteger(phase) || phase < 1 || phase > 5) {
    errors.phase_number = "Must be an integer between 1 and 5";
  }

  const type = body.type;
  if (!type || !Object.values(ArtifactType).includes(type as ArtifactType)) {
    errors.type = `Must be one of: ${Object.values(ArtifactType).join(", ")}`;
  }

  const content = body.content;
  if (typeof content !== "object" || content === null || Array.isArray(content)) {
    errors.content = "Must be a JSON object";
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  return {
    phase_number: phase as number,
    type: type as ArtifactType,
    content: content as Record<string, unknown>,
  };
}
