import { readFileSync } from 'node:fs';
import path from 'node:path';

import { hudWidgetSchema } from '@/shared/api/hud-protocol';

import { WIDGET_FIXTURE } from './widget-fixture.constants';

export const readWidget = (kind: string) =>
  hudWidgetSchema.parse(JSON.parse(readFileSync(path.join(WIDGET_FIXTURE.dir, `${kind}.sample.json`), 'utf8')));

export const readWidgetFixture = (kind: string): unknown => readWidget(kind).data;
