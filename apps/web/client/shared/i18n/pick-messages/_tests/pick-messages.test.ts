import { describe, expect, it } from 'vitest';

import { pickMessages } from '../pick-messages';

const MESSAGES = {
  nav: { home: 'Главная', tanks: 'Танки' },
  tank: { meta: { title: 'Танк', description: 'Описание' }, tabs: { stats: 'Статистика' } },
  mod: { title: 'Модпак' }
};

describe('pickMessages', () => {
  it('keeps whole namespaces and nested subtrees and drops the rest', () => {
    expect(pickMessages({ messages: MESSAGES, paths: ['nav', 'tank.meta'] })).toEqual({
      nav: { home: 'Главная', tanks: 'Танки' },
      tank: { meta: { title: 'Танк', description: 'Описание' } }
    });
  });

  it('merges several paths under one namespace and keeps single leaves', () => {
    expect(pickMessages({ messages: MESSAGES, paths: ['tank.tabs', 'tank.meta.title'] })).toEqual({
      tank: { tabs: { stats: 'Статистика' }, meta: { title: 'Танк' } }
    });
  });

  it('ignores paths the messages do not hold', () => {
    expect(pickMessages({ messages: MESSAGES, paths: ['nothing', 'mod.missing'] })).toEqual({});
  });
});
