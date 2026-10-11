/** Tokens de invitación: el enlace lleva el token; la base de datos solo guarda su hash. */
import { createHash, randomBytes } from "node:crypto";

export const newInviteToken = () => randomBytes(32).toString("base64url");

export const hashInviteToken = (token: string) => createHash("sha256").update(token).digest("hex");
