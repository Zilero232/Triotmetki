import { FileInterceptor } from '@nestjs/platform-express';

import { REPLAY_UPLOAD } from '../config/upload.constants';

export const ReplayMulterInterceptor = FileInterceptor(REPLAY_UPLOAD.field, {
  dest: REPLAY_UPLOAD.tempDir,
  limits: {
    fileSize: REPLAY_UPLOAD.maxBytes,
    files: 1,
    fields: REPLAY_UPLOAD.maxFields,
    fieldSize: REPLAY_UPLOAD.maxFieldBytes,
    parts: REPLAY_UPLOAD.maxFields + 1
  }
});
