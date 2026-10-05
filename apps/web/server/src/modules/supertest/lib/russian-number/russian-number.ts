export const parseRussianNumber = (text: string): number | null => {
  const normalized = text
    .trim()
    .replaceAll(/[ \xA0\u202F]/g, '')
    .replace(/^[−–]/u, '-')
    .replace(',', '.');

  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) {
    return null;
  }

  const value = Number(normalized);

  return Number.isFinite(value) ? value : null;
};
