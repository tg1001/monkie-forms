// Privacy Form Contract - Midnight Compact
// This contract handles privacy-preserving form submissions
// Sensitive data is revealed only when an applicant is selected

import { Contract, ContractError, Data } from '@midnight-ntwrk/compact-runtime';
import { bytesToHex, hexToBytes } from '@midnight-ntwrk/compact-structures';

// Application status
export enum ApplicationStatus {
  Submitted = 0,
  Selected = 1,
  Rejected = 2,
}

// Public application data (visible to everyone)
export interface PublicApplication {
  applicant: Data<Uint8Array>;        // Shielded address of applicant
  firstName: Data<Uint8Array>;        // Hashed first name
  lastName: Data<Uint8Array>;         // Hashed last name  
  email: Data<Uint8Array>;            // Hashed email
  gender: Data<Uint8Array>;           // Hashed gender
  citizenship: Data<Uint8Array>;       // Hashed citizenship
  birthMonthYear: Data<Uint8Array>;   // Hashed birth month/year
  commitment: Data<Uint8Array>;       // Commitment to private data
  essayHash: Data<Uint8Array>;        // Hash of essay
  videoHash: Data<Uint8Array>;        // Hash of video link
  status: Data<number>;               // Application status
  timestamp: Data<bigint>;            // Submission timestamp
}

// Private data revealed only when selected
export interface PrivateData {
  passportNumber: string;
  exactDOB: string;
  identificationNo: string;
  nationalId: string;
}

// Full application with private data (only revealed after selection)
export interface FullApplication {
  publicData: PublicApplication;
  privateData: PrivateData | null;
}

// Contract state
export interface PrivacyFormState {
  applications: Map<number, PublicApplication>;
  applicationCount: number;
  adminAddress: Data<Uint8Array>;
  requiredTokenAmount: bigint;
}

// Input for submitting a new application
export interface SubmitApplicationInput {
  firstName: string;
  lastName: string;
  email: string;
  gender: string;
  citizenship: string;
  birthMonthYear: string;
  privateData: PrivateData;
  essayText: string;
  videoLink: string;
}

// Input for selecting an application
export interface SelectApplicationInput {
  applicationId: number;
}

// Input for rejecting an application
export interface RejectApplicationInput {
  applicationId: number;
}

// Input for revealing private data (only after selection)
export interface RevealPrivateDataInput {
  applicationId: number;
  privateData: PrivateData;
}

// Helper: Hash string to bytes
function hashToBytes(data: string): Uint8Array {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);
  // Simple hash - in production use proper cryptographic hash
  let hash = 0;
  for (let i = 0; i < bytes.length; i++) {
    hash = ((hash << 5) - hash) + bytes[i];
    hash = hash & hash;
  }
  const result = new Uint8Array(32);
  const hashBytes = new TextEncoder().encode(hash.toString(16).padStart(32, '0'));
  result.set(hashBytes.slice(0, 32));
  return result;
}

// Helper: Create commitment from private data
function createCommitment(privateData: PrivateData): Uint8Array {
  const data = `${privateData.passportNumber}|${privateData.exactDOB}|${privateData.identificationNo}|${privateData.nationalId}`;
  return hashToBytes(data);
}

// Helper: Verify private data matches commitment
function verifyPrivateData(privateData: PrivateData, commitment: Uint8Array): boolean {
  const computed = createCommitment(privateData);
  for (let i = 0; i < 32; i++) {
    if (computed[i] !== commitment[i]) return false;
  }
  return true;
}

// Main contract
export const privacyFormContract: Contract<PrivacyFormState, SubmitApplicationInput | SelectApplicationInput | RejectApplicationInput | RevealPrivateDataInput> = {
  initialState: {
    applications: new Map(),
    applicationCount: 0,
    adminAddress: new Uint8Array(32), // Will be set by deployer
    requiredTokenAmount: 1000000n, // 1 MINA equivalent
  },

  // Deploy the contract
  deploy: (state, _input) => {
    return { state };
  },

  // Apply different transaction types
  apply: (state, input) => {
    // Handle SubmitApplicationInput
    if ('firstName' in input && input.firstName) {
      return submitApplication(state, input);
    }
    // Handle SelectApplicationInput
    if ('applicationId' in input && typeof input.applicationId === 'number' && !('firstName' in input)) {
      return selectApplication(state, input);
    }
    // Handle RejectApplicationInput
    if ('applicationId' in input && typeof input.applicationId === 'number') {
      return rejectApplication(state, input);
    }
    // Handle RevealPrivateDataInput
    if ('privateData' in input && input.privateData) {
      return revealPrivateData(state, input);
    }
    throw new ContractError('Unknown input type');
  },

  // Serialize state for storage
  serialize: (state) => {
    const appArray: Array<[number, any]> = [];
    state.applications.forEach((value, key) => {
      appArray.push([key, value]);
    });
    return JSON.stringify({
      applications: appArray,
      applicationCount: state.applicationCount,
      requiredTokenAmount: state.requiredTokenAmount.toString(),
    });
  },

  // Deserialize state from storage
  deserialize: (data) => {
    const parsed = JSON.parse(data);
    const apps = new Map<number, any>();
    parsed.applications.forEach(([key, value]: [number, any]) => {
      apps.set(key, value);
    });
    return {
      applications: apps,
      applicationCount: parsed.applicationCount,
      adminAddress: new Uint8Array(32),
      requiredTokenAmount: BigInt(parsed.requiredTokenAmount),
    };
  },
};

// Submit a new application
function submitApplication(state: PrivacyFormState, input: SubmitApplicationInput): { state: PrivacyFormState } {
  const appId = state.applicationCount;
  const commitment = createCommitment(input.privateData);
  
  const application: PublicApplication = {
    applicant: new Uint8Array(32), // Will be set by wallet
    firstName: hashToBytes(input.firstName),
    lastName: hashToBytes(input.lastName),
    email: hashToBytes(input.email),
    gender: hashToBytes(input.gender),
    citizenship: hashToBytes(input.citizenship),
    birthMonthYear: hashToBytes(input.birthMonthYear),
    commitment: commitment,
    essayHash: hashToBytes(input.essayText),
    videoHash: hashToBytes(input.videoLink),
    status: ApplicationStatus.Submitted,
    timestamp: BigInt(Date.now()),
  };

  state.applications.set(appId, application);
  state.applicationCount++;

  return { state };
}

// Select an application (admin action)
function selectApplication(state: PrivacyFormState, input: SelectApplicationInput): { state: PrivacyFormState } {
  const app = state.applications.get(input.applicationId);
  if (!app) {
    throw new ContractError('Application not found');
  }

  app.status = ApplicationStatus.Selected;
  state.applications.set(input.applicationId, app);

  return { state };
}

// Reject an application (admin action)
function rejectApplication(state: PrivacyFormState, input: RejectApplicationInput): { state: PrivacyFormState } {
  const app = state.applications.get(input.applicationId);
  if (!app) {
    throw new ContractError('Application not found');
  }

  app.status = ApplicationStatus.Rejected;
  state.applications.set(input.applicationId, app);

  return { state };
}

// Reveal private data (only after selection)
function revealPrivateData(state: PrivacyFormState, input: RevealPrivateDataInput): { state: PrivacyFormState } {
  const app = state.applications.get(input.applicationId);
  if (!app) {
    throw new ContractError('Application not found');
  }

  // Verify the application is selected
  if (app.status !== ApplicationStatus.Selected) {
    throw new ContractError('Application must be selected before revealing private data');
  }

  // Verify private data matches commitment
  if (!verifyPrivateData(input.privateData, app.commitment)) {
    throw new ContractError('Private data does not match commitment');
  }

  return { state };
}

// Export types for use in frontend
export type { PrivacyFormState, SubmitApplicationInput, SelectApplicationInput, RejectApplicationInput, RevealPrivateDataInput };