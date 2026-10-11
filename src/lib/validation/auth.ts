import { z } from "zod";

// Kept in one place so the same rules apply on the client form, the server
// action, and the Credentials `authorize` callback.

/**
 * Rules for any *new* password (sign-up, change, reset). Sign-in deliberately
 * doesn't apply them, so accounts created under older rules still work.
 */
const newPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password is too long")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/\d/, "Password must contain a number");

const nameSchema = z.string().trim().min(1, "Name is required").max(80, "Name is too long");

export const signUpSchema = z.object({
  name: nameSchema,
  email: z.email("Enter a valid email address"),
  password: newPasswordSchema,
});

export const signInSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().regex(/^[A-Za-z0-9_-]{43}$/, "This reset link is not valid."),
    password: newPasswordSchema,
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    message: "The passwords don't match",
    path: ["confirm"],
  });

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    password: newPasswordSchema,
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    message: "The new passwords don't match",
    path: ["confirm"],
  })
  .refine((value) => value.password !== value.current, {
    message: "Choose a password different from your current one",
    path: ["password"],
  });

export const profileSchema = z.object({ name: nameSchema });

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
