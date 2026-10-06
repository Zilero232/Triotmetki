import { rem } from '@/shared/lib/css-unit';
import { ScrollArea } from '@/ui-kit';

import type { ReplayListProps } from './ReplayList.types';

import { REPLAYS_BROWSER } from '../../../config';
import { useVirtualList } from '../../../model/hooks';
import { ReplayRow } from '../ReplayRow';

import s from './ReplayList.module.scss';

export const ReplayList = ({ items, selectedId, label, resetKey, onSelect }: ReplayListProps) => {
  const list = useVirtualList({ count: items.length, rowHeight: REPLAYS_BROWSER.rowHeight, overscan: REPLAYS_BROWSER.overscan });

  return (
    <ScrollArea contain key={resetKey} className={s.list} label={label} onMetrics={list.onMetrics}>
      <div ref={list.canvasRef} className={s.canvas} style={{ height: rem(list.total) }}>
        {items.slice(list.start, list.end).map((item, offset) => (
          <ReplayRow
            key={item.id}
            height={REPLAYS_BROWSER.rowHeight}
            item={item}
            selected={item.id === selectedId}
            top={(list.start + offset) * REPLAYS_BROWSER.rowHeight}
            onSelect={onSelect}
          />
        ))}
      </div>
    </ScrollArea>
  );
};
