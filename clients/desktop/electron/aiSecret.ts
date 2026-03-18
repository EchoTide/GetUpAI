import { app, safeStorage } from 'electron';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

function aiSecretPath() {
  return join(app.getPath('userData'), 'ai-api-key.bin');
}

export async function setAiApiKey(apiKey: string): Promise<boolean> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption is not available on this system');
  }
  const encrypted = safeStorage.encryptString(apiKey);
  await writeFile(aiSecretPath(), encrypted);
  return true;
}

export async function getAiApiKey(): Promise<string | null> {
  try {
    const buf = await readFile(aiSecretPath());
    if (!buf.length || !safeStorage.isEncryptionAvailable()) return null;
    const decrypted = safeStorage.decryptString(buf).trim();
    return decrypted || null;
  } catch {
    return null;
  }
}

export async function clearAiApiKey(): Promise<boolean> {
  await writeFile(aiSecretPath(), Buffer.from(''));
  return true;
}
