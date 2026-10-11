import { describe, expect, it } from "vitest";
import { hashInviteToken, newInviteToken } from "./invite-token";

describe("token de invitación", () => {
  it("32 bytes en base64url (43 caracteres) y distinto cada vez", () => {
    const a = newInviteToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newInviteToken()).not.toBe(a);
  });
  it("se guarda solo su sha256 en hex", () => {
    expect(hashInviteToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
