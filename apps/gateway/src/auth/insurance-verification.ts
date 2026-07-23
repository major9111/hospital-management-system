export interface InsuranceVerificationResult {
  verified: boolean;
  reason: string;
}

/**
 * STUB verifier — this is NOT a real eligibility check. It only confirms
 * the policy number is present and roughly well-formed. Do not treat
 * `verified: true` from this as a guarantee of coverage for billing
 * purposes; it exists so the registration flow has a concrete field to
 * populate rather than leaving insurance_verified permanently false.
 *
 * Swap point for a real check: most Nigerian insurers/HMOs and NHIS don't
 * expose a public real-time eligibility API the way US clearinghouses
 * (Availity, Change Healthcare) do — in practice this usually means either
 * a per-insurer integration or a manual verification step by staff. Model
 * a real implementation as async (it'll be a network call) and keep this
 * same return shape so nothing else has to change.
 */
export async function verifyInsurance(
  provider: string | undefined,
  policyNumber: string | undefined,
): Promise<InsuranceVerificationResult> {
  if (!provider || !policyNumber) {
    return { verified: false, reason: 'No insurance details provided — self-pay by default' };
  }
  if (policyNumber.trim().length < 4) {
    return { verified: false, reason: 'Policy number looks incomplete — flagged for manual review' };
  }
  return {
    verified: true,
    reason: 'Format check passed (STUB — not a real eligibility verification, see comment above)',
  };
}
