'use client';

import { isNation } from '@otmetki/icons';
import { ReactFlowProvider } from '@xyflow/react';
import { useTranslations } from 'next-intl';

import { useTree } from '../../../model/context';
import { useTreeStage } from '../../../model/hooks';
import { TreeFlow } from '../TreeFlow';
import { TreeSkeleton } from '../TreeSkeleton';
import { TreeTierList } from '../TreeTierList';

import s from './TreeCanvas.module.scss';

export const TreeCanvas = () => {
  const t = useTranslations('tree.canvas');
  const tNations = useTranslations('game.nations');
  const { tree } = useTree();
  const { isHydrated, isList } = useTreeStage();

  if (!isHydrated) {
    return <TreeSkeleton />;
  }

  const label = t('label', { nation: isNation(tree.nation) ? tNations(tree.nation) : tree.nation });

  if (isList) {
    return (
      <section aria-label={label}>
        <TreeTierList />
      </section>
    );
  }

  return (
    <section aria-label={label} className={s.root}>
      <ReactFlowProvider>
        <TreeFlow />
      </ReactFlowProvider>
    </section>
  );
};
