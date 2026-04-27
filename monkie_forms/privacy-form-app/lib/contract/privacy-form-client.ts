// Privacy Form Contract Client
// Interacts with the Midnight contract for privacy-preserving form submissions

import type { InitialAPI } from '@/lib/wallet/types';

export interface PrivateData {
  passportNumber: string;
  exactDOB: string;
  identificationNo: string;
  nationalId: string;
}

export interface PublicFormData {
  firstName: string;
  lastName: string;
  email: string;
  gender: string;
  citizenship: string;
  birthMonthYear: string;
  essayText: string;
  videoLink: string;
}

export interface FormCommitment {
  commitment: string;
  privateDataHash: string;
}

export interface Application {
  id: number;
  applicant: string;
  firstNameHash: string;
  lastNameHash: string;
  emailHash: string;
  genderHash: string;
  citizenshipHash: string;
  birthMonthYearHash: string;
  commitment: string;
  essayHash: string;
  videoHash: string;
  status: number;
  timestamp: bigint;
}

export type ApplicationStatus = 0 | 1 | 2; // Submitted | Selected | Rejected

// Contract address (will be deployed)
const CONTRACT_ADDRESS = 'kt1...'; // To be filled after deployment

// Helper: Compute SHA-256 hash
async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Create commitment from private data
export async function createFormCommitment(privateData: PrivateData): Promise<FormCommitment> {
  const combined = `${privateData.passportNumber}|${privateData.exactDOB}|${privateData.identificationNo}|${privateData.nationalId}`;
  const commitment = await sha256(combined);
  const privateDataHash = await sha256(JSON.stringify(privateData));
  
  return { commitment, privateDataHash };
}

// Verify private data matches commitment
export async function verifyPrivateData(
  privateData: PrivateData,
  commitment: string
): Promise<boolean> {
  const computed = await createFormCommitment(privateData);
  return computed.commitment === commitment;
}

// Submit application to contract
export async function submitApplication(
  walletApi: InitialAPI,
  publicData: PublicFormData,
  privateData: PrivateData
): Promise<number> {
  // Create commitment
  const { commitment } = await createFormCommitment(privateData);
  
  // Hash public data
  const firstNameHash = await sha256(publicData.firstName);
  const lastNameHash = await sha256(publicData.lastName);
  const emailHash = await sha256(publicData.email);
  const genderHash = await sha256(publicData.gender);
  const citizenshipHash = await sha256(publicData.citizenship);
  const birthMonthYearHash = await sha256(publicData.birthMonthYear);
  const essayHash = await sha256(publicData.essayText);
  const videoHash = await sha256(publicData.videoLink);
  
  // Create transaction
  const tx = {
    kind: 'submit_application' as const,
    firstName: firstNameHash,
    lastName: lastNameHash,
    email: emailHash,
    gender: genderHash,
    citizenship: citizenshipHash,
    birthMonthYear: birthMonthYearHash,
    commitment: commitment,
    essayHash: essayHash,
    videoHash: videoHash,
  };
  
  // Submit via wallet
  const result = await walletApi.transact({
    contract: CONTRACT_ADDRESS,
    payload: tx,
  });
  
  return result.applicationId;
}

// Select an application (admin only)
export async function selectApplication(
  walletApi: InitialAPI,
  applicationId: number
): Promise<void> {
  const tx = {
    kind: 'select_application' as const,
    applicationId,
  };
  
  await walletApi.transact({
    contract: CONTRACT_ADDRESS,
    payload: tx,
  });
}

// Reject an application (admin only)
export async function rejectApplication(
  walletApi: InitialAPI,
  applicationId: number
): Promise<void> {
  const tx = {
    kind: 'reject_application' as const,
    applicationId,
  };
  
  await walletApi.transact({
    contract: CONTRACT_ADDRESS,
    payload: tx,
  });
}

// Reveal private data after selection
export async function revealPrivateData(
  walletApi: InitialAPI,
  applicationId: number,
  privateData: PrivateData
): Promise<void> {
  const tx = {
    kind: 'reveal_private_data' as const,
    applicationId,
    privateData,
  };
  
  await walletApi.transact({
    contract: CONTRACT_ADDRESS,
    payload: tx,
  });
}

// Query application from contract
export async function getApplication(
  walletApi: InitialAPI,
  applicationId: number
): Promise<Application | null> {
  const result = await walletApi.query({
    contract: CONTRACT_ADDRESS,
    payload: { kind: 'get_application', applicationId },
  });
  
  return result.application;
}

// Query all applications
export async function getAllApplications(
  walletApi: InitialAPI
): Promise<Application[]> {
  const result = await walletApi.query({
    contract: CONTRACT_ADDRESS,
    payload: { kind: 'get_all_applications' },
  });
  
  return result.applications;
}

// Get application count
export async function getApplicationCount(
  walletApi: InitialAPI
): Promise<number> {
  const result = await walletApi.query({
    contract: CONTRACT_ADDRESS,
    payload: { kind: 'get_application_count' },
  });
  
  return result.count;
}

// Export contract address setter
export function setContractAddress(address: string): void {
  (CONTRACT_ADDRESS as any) = address;
}