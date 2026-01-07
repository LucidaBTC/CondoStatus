import { z } from 'zod';

// Common validators
export const uuidSchema = z.string().uuid('Invalid UUID format');

export const emailSchema = z.string().email('Invalid email format');

// File upload validation
export const fileUploadSchema = z.object({
  type: z.literal('application/pdf', {
    errorMap: () => ({ message: 'Only PDF files are allowed' }),
  }),
  size: z.number().max(50 * 1024 * 1024, 'File size must be less than 50MB'),
  name: z.string().min(1, 'File name is required'),
});

// Report validation
export const reportIdSchema = z.object({
  id: uuidSchema,
});

export const reportUpdateSchema = z.object({
  id: uuidSchema,
  status: z.enum(['draft', 'reviewed', 'sent']).optional(),
  notes: z.string().max(10000, 'Notes too long').optional(),
});

// Note validation
export const noteSchema = z.object({
  reportId: uuidSchema,
  itemId: z.string().min(1, 'Item ID is required').max(100, 'Item ID too long'),
  note: z.string().max(5000, 'Note too long'),
});

// Verification validation
export const verificationSchema = z.object({
  reportId: uuidSchema,
  itemId: z.string().min(1, 'Item ID is required').max(100, 'Item ID too long'),
  verified: z.boolean(),
});

// Billing validation
export const checkoutSchema = z.object({
  plan: z.enum(['monthly', 'yearly'], {
    errorMap: () => ({ message: 'Invalid plan. Must be monthly or yearly.' }),
  }),
});

// Auth validation
export const signupSchema = z.object({
  email: emailSchema,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long'),
  fullName: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  firmName: z.string().max(200, 'Firm name too long').optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Profile validation
export const profileUpdateSchema = z.object({
  fullName: z.string().max(100, 'Name too long').optional(),
  firmName: z.string().max(200, 'Firm name too long').optional(),
  phone: z.string().max(20, 'Phone number too long').optional(),
});

// Search/filter validation
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const reportFilterSchema = z.object({
  status: z.enum(['draft', 'reviewed', 'sent']).optional(),
  search: z.string().max(200).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).merge(paginationSchema);

// Utility function to validate and parse input
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  // Format error message
  const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
  return { success: false, error: errors.join(', ') };
}

// Sanitize string input (basic XSS prevention)
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Validate file upload
export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  if (file.type !== 'application/pdf') {
    return { valid: false, error: 'Only PDF files are allowed' };
  }
  
  if (file.size > 50 * 1024 * 1024) {
    return { valid: false, error: 'File size must be less than 50MB' };
  }
  
  if (!file.name || file.name.length > 255) {
    return { valid: false, error: 'Invalid file name' };
  }
  
  // Check for suspicious file names
  const suspiciousPatterns = [/\.\./, /[<>:"|?*]/, /^\./, /\x00/];
  if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
    return { valid: false, error: 'Invalid file name' };
  }
  
  return { valid: true };
}
