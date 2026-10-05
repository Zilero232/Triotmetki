// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import { optionNoticeSchema } from '../../model/schemas';
import { OptionNoticeWidget } from '../OptionNoticeWidget';

const data = optionNoticeSchema.parse(readWidgetFixture('option_notice'));

describe(OptionNoticeWidget, () => {
  it('names the option and its new state', () => {
    const html = render(<OptionNoticeWidget data={data} />).container;

    expect(html.textContent).toBe(`${data.option}${data.state}`);
  });
});
