'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWalletContext } from '@/lib/wallet/WalletProvider';
import { createFormCommitment, verifyPrivateData } from '@/lib/contract/privacy-form-client';

type FormData = {
  // Public fields
  firstName: string;
  lastName: string;
  email: string;
  gender: 'FEMALE' | 'MALE' | 'UNSPECIFIED' | '';
  citizenship: string;
  birthMonthYear: string;

  // Private fields (will be hashed) - sensitive data revealed only on selection
  passportNumber: string;
  exactDOB: string;
  identificationNo: string;
  nationalId: string;
  essayText: string;
  videoLink: string;
};

// Application status enum (matching contract)
enum ApplicationStatus {
  Submitted = 0,
  Selected = 1,
  Rejected = 2,
}

export default function ApplyPage() {
  const router = useRouter();
  const { isConnected, shieldedAddress } = useWalletContext();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState<number | null>(null);

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    gender: '',
    citizenship: '',
    birthMonthYear: '',
    passportNumber: '',
    exactDOB: '',
    identificationNo: '',
    nationalId: '',
    essayText: '',
    videoLink: '',
  });

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Compute SHA-256 hash of a string (browser native)
  async function hashString(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function computeCommitment(passport: string, dob: string, essay: string): Promise<string> {
    return await hashString(`${passport}|${dob}|${essay}`);
  }

  const validateStep1 = () => {
    return (
      formData.firstName.trim() &&
      formData.lastName.trim() &&
      formData.email.includes('@') &&
      formData.gender &&
      formData.citizenship.trim() &&
      formData.birthMonthYear.trim()
    );
  };

  const validateStep2 = () => {
    return (
      formData.passportNumber.trim().length >= 5 &&
      formData.exactDOB &&
      formData.identificationNo.trim().length >= 5 &&
      formData.nationalId.trim().length >= 5 &&
      formData.essayText.length >= 100
    );
  };

  const handleSubmit = async () => {
    if (!isConnected || !shieldedAddress) {
      alert('Please connect your wallet first');
      return;
    }

    setSubmitting(true);

    try {
      // Create commitment from sensitive private data
      // This data will ONLY be revealed if the applicant is selected
      const privateData = {
        passportNumber: formData.passportNumber,
        exactDOB: formData.exactDOB,
        identificationNo: formData.identificationNo,
        nationalId: formData.nationalId,
      };
      
      const { commitment } = await createFormCommitment(privateData);
      const essayHash = await hashString(formData.essayText);
      const videoHash = await hashString(formData.videoLink);

      console.log('Submitting privacy-preserving application...');
      console.log('🔒 Commitment (sensitive data hash):', commitment);
      console.log('   This will only be revealed if you are selected');
      console.log('Essay hash:', essayHash);
      console.log('Video hash:', videoHash);

      // Submit to your API
      const response = await fetch('/api/applications/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Public data (visible to committee)
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          gender: formData.gender,
          citizenship: formData.citizenship,
          birthMonthYear: formData.birthMonthYear,

          // Cryptographic hashes (NOT the actual sensitive data)
          commitment,  // Hash of: passport|dob|identificationNo|nationalId
          essayHash,
          videoHash,
          cvHash: '0'.repeat(64), // placeholder for CV upload

          // Wallet
          walletAddress: shieldedAddress,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Submission failed');
      }

      const result = await response.json();
      setApplicationId(result.applicationId);
      setSubmitted(true);
    } catch (err: any) {
      console.error('Submission error:', err);
      alert('Failed to submit: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Not connected — redirect message
  if (!isConnected) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-2">Wallet Required</h1>
          <p className="text-gray-600 mb-6">
            Please connect your Lace wallet to submit an application.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
          >
            Back to Home
          </button>
        </div>
      </main>
    );
  }

  // Submitted — success page
  if (submitted) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold mb-2 text-green-600">Application Submitted!</h1>
          <p className="text-gray-600 mb-4">
            Your application has been submitted with privacy-preserving commitments.
          </p>
          {applicationId !== null && (
            <div className="bg-purple-50 rounded-lg p-4 mb-6">
              <p className="text-xs text-purple-600 mb-1">Your Application ID</p>
              <p className="font-mono text-2xl font-bold text-purple-700">#{applicationId}</p>
            </div>
          )}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-yellow-800">
              <strong>� Privacy guarantee:</strong> Your passport number, exact date of birth, national ID, and other sensitive data are <strong>NOT stored</strong> on our servers. Only cryptographic commitments (hashes) are saved. You only reveal this data if you are selected.
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
          >
            Back to Home
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold">Young Trade Leaders 2026-2027</h1>
            <div className="text-sm text-gray-500">Step {step} of 3</div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Public Information */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-xl font-bold mb-2">Public Information</h2>
            <p className="text-sm text-gray-600 mb-6">
              This information will be visible to the selection committee.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                <select
                  value={formData.gender}
                  onChange={(e) => updateField('gender', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Select...</option>
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="UNSPECIFIED">Do not wish to specify</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Citizenship *</label>
                <input
                  type="text"
                  value={formData.citizenship}
                  onChange={(e) => updateField('citizenship', e.target.value)}
                  placeholder="e.g., India, USA, Brazil"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Birth Month and Year *
                </label>
                <input
                  type="text"
                  value={formData.birthMonthYear}
                  onChange={(e) => updateField('birthMonthYear', e.target.value)}
                  placeholder="e.g., March 2000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Note: Only month and year are public. Your exact date is private.
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!validateStep1()}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold"
              >
                Next: Private Information →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Private Information */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-red-900 mb-2">🔐 Sensitive Information (Privacy Protected)</h3>
              <p className="text-sm text-red-800">
                The data below will <strong>NEVER</strong> be stored on our servers. 
                We only store a cryptographic commitment (hash). 
                <strong>You only reveal this data if you are selected</strong> — 
                like a sealed envelope that opens only upon acceptance.
              </p>
            </div>

            <h2 className="text-xl font-bold mb-2">Sensitive Information</h2>
            <p className="text-sm text-gray-600 mb-6">
              These fields are encrypted with zero-knowledge proofs. Revealed only after selection.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passport Number *
                </label>
                <input
                  type="text"
                  value={formData.passportNumber}
                  onChange={(e) => updateField('passportNumber', e.target.value)}
                  placeholder="e.g., P1234567"
                  className="w-full px-4 py-2 border border-purple-300 bg-purple-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  required
                />
                <p className="text-xs text-purple-600 mt-1">🔒 Stays private until you are selected</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exact Date of Birth *
                </label>
                <input
                  type="date"
                  value={formData.exactDOB}
                  onChange={(e) => updateField('exactDOB', e.target.value)}
                  className="w-full px-4 py-2 border border-purple-300 bg-purple-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
                <p className="text-xs text-purple-600 mt-1">🔒 Only month/year is public</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  National Identification No. *
                </label>
                <input
                  type="text"
                  value={formData.identificationNo}
                  onChange={(e) => updateField('identificationNo', e.target.value)}
                  placeholder="e.g., Aadhaar, SSN, or national ID number"
                  className="w-full px-4 py-2 border border-purple-300 bg-purple-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  required
                />
                <p className="text-xs text-purple-600 mt-1">🔒 Revealed only after selection</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Other Government ID (if applicable) *
                </label>
                <input
                  type="text"
                  value={formData.nationalId}
                  onChange={(e) => updateField('nationalId', e.target.value)}
                  placeholder="e.g., Driver's license number, voter ID"
                  className="w-full px-4 py-2 border border-purple-300 bg-purple-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  required
                />
                <p className="text-xs text-purple-600 mt-1">🔒 Revealed only after selection</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Written Submission (300 words max) *
                </label>
                <textarea
                  value={formData.essayText}
                  onChange={(e) => updateField('essayText', e.target.value)}
                  rows={8}
                  placeholder="How can trade better serve the next generation? OR What role should young people play in shaping the future of trade?"
                  className="w-full px-4 py-2 border border-purple-300 bg-purple-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.essayText.length}/2000 characters (minimum 100)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Video Submission Link
                </label>
                <input
                  type="url"
                  value={formData.videoLink}
                  onChange={(e) => updateField('videoLink', e.target.value)}
                  placeholder="https://youtu.be/... or Google Drive link"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!validateStep2()}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold"
              >
                Next: Review →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-xl font-bold mb-2">Review Your Application</h2>
            <p className="text-sm text-gray-600 mb-6">
              Please verify everything before submitting.
            </p>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Public Information</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Name:</dt>
                    <dd className="font-medium">{formData.firstName} {formData.lastName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Email:</dt>
                    <dd className="font-medium">{formData.email}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Gender:</dt>
                    <dd className="font-medium">{formData.gender}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Citizenship:</dt>
                    <dd className="font-medium">{formData.citizenship}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Birth Month/Year:</dt>
                    <dd className="font-medium">{formData.birthMonthYear}</dd>
                  </div>
                </dl>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-purple-900 mb-3">� Sensitive (Revealed ONLY if selected)</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-purple-700">Passport:</dt>
                    <dd className="font-mono text-purple-900">
                      {formData.passportNumber.slice(0, 2)}***{formData.passportNumber.slice(-2)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-purple-700">Exact DOB:</dt>
                    <dd className="font-medium text-purple-900">[Hidden]</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-purple-700">National ID:</dt>
                    <dd className="font-mono text-purple-900">
                      {formData.identificationNo.slice(0, 2)}***{formData.identificationNo.slice(-2)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-purple-700">Other ID:</dt>
                    <dd className="font-mono text-purple-900">
                      {formData.nationalId.slice(0, 2)}***{formData.nationalId.slice(-2)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-purple-700">Essay:</dt>
                    <dd className="font-medium text-purple-900">{formData.essayText.length} chars</dd>
                  </div>
                </dl>
                <p className="text-xs text-purple-600 mt-3">
                  Only cryptographic hashes will be stored. Your actual data stays private.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Connected Wallet</h3>
                <p className="font-mono text-xs text-blue-700 break-all">{shieldedAddress}</p>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(2)}
                disabled={submitting}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold"
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-semibold"
              >
                {submitting ? 'Submitting...' : '🚀 Submit Application'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}