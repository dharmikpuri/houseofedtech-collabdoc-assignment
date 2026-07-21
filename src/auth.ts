import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";
import { signInSchema } from "@/lib/validation/auth";

/**
 * Full Auth.js instance (Node runtime). Adds the Credentials provider whose
 * `authorize` step verifies the email + password against the database.
 *
 * Security notes:
 * - We return `null` for both "no such user" and "wrong password" so an
 *   attacker can't tell which emails are registered.
 * - Passwords are compared with bcrypt against a stored hash — the plaintext
 *   is never persisted or logged.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = signInSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});
