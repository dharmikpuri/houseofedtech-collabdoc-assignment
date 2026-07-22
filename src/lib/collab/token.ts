import { SignJWT } from "jose";
import type { Role } from "@/lib/authz/roles";

function secret() {
  const value = process.env.COLLAB_TOKEN_SECRET;
  if (!value) throw new Error("COLLAB_TOKEN_SECRET is not set");
  return new TextEncoder().encode(value);
}

export async function signCollabToken(input: { userId: string; documentId: string; role: Role }) {
  return new SignJWT({ documentId: input.documentId, role: input.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(secret());
}
