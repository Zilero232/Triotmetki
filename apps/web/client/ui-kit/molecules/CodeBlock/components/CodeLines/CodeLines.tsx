import { Fragment } from 'react';

import { codeLines } from '@/shared/lib/code-lines';

import type { CodeLinesProps } from './CodeLines.types';

export const CodeLines = ({ code }: CodeLinesProps) => {
  const lines = codeLines(code);

  return lines.map(({ key, isFirst, className, tokens }) => (
    <Fragment key={key}>
      {!isFirst && '\n'}
      <span className={className}>
        {tokens.map((token) => (
          <span key={token.key} className={token.className} style={token.style}>
            {token.value}
          </span>
        ))}
      </span>
    </Fragment>
  ));
};
