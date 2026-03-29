import {
  buildReauthPath,
  readAccessToken,
  sanitizeNextPath,
  verifyAdminSession
} from './session';

function maskToken(token) {
  if (!token) return null;
  if (token.length <= 12) return `${token.slice(0, 3)}...`;
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

export async function runAuthHarness() {
  const token = readAccessToken();
  const forced = await verifyAdminSession({ force: true });
  const cached = await verifyAdminSession();

  const report = {
    checkedAt: new Date().toISOString(),
    tokenPresent: Boolean(token),
    tokenPreview: maskToken(token),
    statusForced: forced?.status || 'unknown',
    statusCached: cached?.status || 'unknown',
    safeNextExamples: {
      valid: sanitizeNextPath('/admin?tab=security'),
      blockedAbsolute: sanitizeNextPath('https://evil.example/phish'),
      blockedProtocolRelative: sanitizeNextPath('//evil.example/phish')
    },
    reauthPathExample: buildReauthPath('/admin?tab=security')
  };

  console.table({
    tokenPresent: report.tokenPresent,
    statusForced: report.statusForced,
    statusCached: report.statusCached
  });
  console.log('[auth-harness]', report);
  return report;
}
