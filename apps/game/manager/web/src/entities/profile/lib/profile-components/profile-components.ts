import type { NeedsInstallInput } from './profile-components.types';

export const needsInstall = ({ installed, enabled }: NeedsInstallInput): boolean => {
  if (installed === null) {
    return false;
  }

  const current = new Set(enabled);

  return installed.length !== current.size || installed.some((id) => !current.has(id));
};
