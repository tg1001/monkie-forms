import CryptoJS from 'crypto-js';

export function computeCommitment(
  passportNumber: string,
  exactDOB: string,
  essayText: string
): string {
  const data = `${passportNumber}|${exactDOB}|${essayText}`;
  return CryptoJS.SHA256(data).toString();
}

export function hashString(text: string): string {
  return CryptoJS.SHA256(text).toString();
}

export async function hashFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer as any);
  return CryptoJS.SHA256(wordArray).toString();
}
