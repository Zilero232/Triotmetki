export const REPORT = {
  parts: ['environment', 'manager_log', 'python_log', 'otmetki_log'],
  messageMaxLength: 2000,
  fileName: 'otmetki-report.zip',
  receiptPrefixLength: 8
} as const;
