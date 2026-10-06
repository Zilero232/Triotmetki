import type { RichImageRun, RichTextRun } from '@/shared/lib/rich-text';

import { optionalRem } from '@/shared/lib/css-unit';

import type { RunStyle } from './run-style.types';

export const textStyle = ({ style }: RichTextRun): RunStyle => ({ color: style.color, fontSize: optionalRem(style.size) });

export const imageStyle = ({ width, height }: RichImageRun): RunStyle => ({ width: optionalRem(width), height: optionalRem(height) });
