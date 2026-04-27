// Witness for form submission - generates proof that private data matches commitment
// This allows submitting private data without revealing it on-chain

import { Witness, witness } from '@midnight-ntwrk/compact-runtime';

// Private data input
export interface PrivateDataWitnessInput {
  passportNumber: string;
  exactDOB: string;
  identificationNo: string;
  nationalId: string;
}

// Public commitment that was submitted
export interface CommitmentWitnessInput {
  commitment: Uint8Array;
}

// Witness output - proves private data matches commitment
export interface FormSubmissionWitnessOutput {
  commitment: Uint8Array;
  isValid: boolean;
}

// Simple hash function for commitment
function hashString(data: string): Uint8Array {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);
  
  // FNV-1a like hash (simplified for demo)
  let hash = 0x811c9dc5;
  const prime = 0x01000193;
  
  for (let i = 0; i < bytes.length; i++) {
    hash = BigInt(hash) ^ BigInt(bytes[i]);
    hash = (hash * BigInt(prime)) & BigInt(0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF);
  }
  
  // Convert to 32 bytes
  const result = new Uint8Array(32);
  const hex = hash.toString(16).padStart(64, '0');
  for (let i = 0; i < 32; i++) {
    result[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return result;
}

// Create commitment from private data
export function createCommitment(data: PrivateDataWitnessInput): Uint8Array {
  const combined = `${data.passportNumber}|${data.exactDOB}|${data.identificationNo}|${data.nationalId}`;
  return hashString(combined);
}

// Witness: Prove private data matches commitment without revealing data
export const submitFormWitness: Witness<
  PrivateDataWitnessInput,
  CommitmentWitnessInput,
  FormSubmissionWitnessOutput
> = witness(
  // Input: Private data that should not be revealed
  (input: PrivateDataWitnessInput) => {
    return {
      // Compute commitment from private data
      commitment: createCommitment(input),
      // Mark as valid if all fields are present
      isValid: Boolean(
        input.passportNumber &&
        input.exactDOB &&
        input.identificationNo &&
        input.nationalId
      ),
    };
  },
  // Output type
  'FormSubmissionWitnessOutput'
);

// Witness input for revealing private data after selection
export interface RevealWitnessInput {
  privateData: PrivateDataWitnessInput;
  applicationId: number;
}

// Witness output for reveal
export interface RevealWitnessOutput {
  passportHash: Uint8Array;
  dobHash: Uint8Array;
  idHash: Uint8Array;
  nationalIdHash: Uint8Array;
  isValid: boolean;
}

// Witness: Prove identity when revealing after selection
export const revealIdentityWitness: Witness<
  RevealWitnessInput,
  void,
  RevealWitnessOutput
> = witness(
  (input: RevealWitnessInput) => {
    return {
      passportHash: hashString(input.privateData.passportNumber),
      dobHash: hashString(input.privateData.exactDOB),
      idHash: hashString(input.privateData.identificationNo),
      nationalIdHash: hashString(input.privateData.nationalId),
      isValid: Boolean(
        input.privateData.passportNumber &&
        input.privateData.exactDOB &&
        input.privateData.identificationNo &&
        input.privateData.nationalId &&
        input.applicationId >= 0
      ),
    };
  },
  'RevealWitnessOutput'
);

// Verify commitment matches
export function verifyCommitment(
  privateData: PrivateDataWitnessInput,
  expectedCommitment: Uint8Array
): boolean {
  const computed = createCommitment(privateData);
  for (let i = 0; i < 32; i++) {
    if (computed[i] !== expectedCommitment[i]) {
      return false;
    }
  }
  return true;
}