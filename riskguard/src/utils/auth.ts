// src/utils/auth.ts
// Authentication helpers for RiskGuard API access

import jwt from 'jsonwebtoken';

// DEMO VULN #2 — CWE-798: Use of Hard-coded Credentials
// The JWT signing secret is embedded directly in source code.
// Anyone with read access to this repository (including public forks, CI logs,
// or a leaked git history) can forge valid tokens for any user/role.
// Combined with CWE-347 (Improper Verification of Cryptographic Signature):
// the verify() call below uses the same hardcoded secret, so a forged token
// signed with this key will pass all auth checks.
//
// CVSS v3.1: AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H = 10.0 (Critical)
const JWT_SECRET = 'riskguard-super-secret-do-not-share-1234';

export interface TokenPayload {
  userId: string;
  role: 'admin' | 'analyst' | 'viewer';
  portfolioId: string;
}

/**
 * Sign a JWT for the given payload.
 * VULNERABLE: uses the hardcoded secret above; any party who reads this file
 * can mint tokens with any userId/role, including "admin".
 */
export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verify and decode a JWT from the Authorization header.
 * VULNERABLE: trusts the hardcoded secret — a forged token will pass.
 */
export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

/**
 * Middleware-style helper: extract and verify the Bearer token from a header string.
 * Returns null if missing or invalid.
 */
export function extractAndVerify(authHeader: string | null): TokenPayload | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    return verifyToken(authHeader.slice(7));
  } catch {
    return null;
  }
}
