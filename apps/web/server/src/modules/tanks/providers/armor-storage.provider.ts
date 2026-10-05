import { ARMOR_VIEWER } from '../../../config';
import { createArmorStorage } from '../../gamedata';
import { ARMOR_STORAGE } from '../config/armor.constants';

export const armorStorageProvider = {
  provide: ARMOR_STORAGE,
  useFactory: () => createArmorStorage(ARMOR_VIEWER.storageDir)
};
