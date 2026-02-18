import { z, ZodError } from 'zod';
import { NextResponse } from 'next/server';

// Re-export all schemas
export * from './auth';
export * from './items';
export * from './bookings';
export * from './reviews';
export * from './profile';
export * from './chat';

// Validation helper
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: NextResponse };

export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return {
        success: false,
        error: NextResponse.json(
          { error: 'Ошибка валидации', details: errors },
          { status: 400 }
        ),
      };
    }

    return { success: true, data: result.data };
  } catch {
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Некорректный JSON' },
        { status: 400 }
      ),
    };
  }
}

export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const result = schema.safeParse(params);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    return {
      success: false,
      error: NextResponse.json(
        { error: 'Ошибка валидации параметров', details: errors },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: result.data };
}

