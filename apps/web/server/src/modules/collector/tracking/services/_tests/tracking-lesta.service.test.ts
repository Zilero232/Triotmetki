import { describe, expect, it } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import type { LestaClients } from '../../../../../core';

import { LestaApiError } from '../../../../../lib/lesta';
import { TRACKING } from '../../config/tracking.constants';
import { TrackingLestaService } from '../tracking-lesta.service';

const createLesta = () => {
  const clients = mockDeep<LestaClients>();

  return { clients, service: new TrackingLestaService(clients) };
};

describe('TrackingLestaService.port', () => {
  it('routes every call through the chosen lane', async () => {
    const { clients, service } = createLesta();

    clients.bulk.account.info.mockResolvedValue({});

    await service.port('bulk').accountInfo([1]);

    expect(clients.bulk.account.info).toHaveBeenCalledWith(expect.objectContaining({ accountIds: [1] }));
    expect(clients.priority.account.info).not.toHaveBeenCalled();
  });

  it('maps tank achievements to marks per tank, defaulting to zero marks', async () => {
    const { clients, service } = createLesta();

    clients.priority.tanks.achievements.mockResolvedValue([
      { tank_id: 10, achievements: { [TRACKING.lesta.marksAchievement]: 3 } },
      { tank_id: 11, achievements: {} }
    ]);

    const marks = await service.port('priority').tankMarks({ accountId: 1, tankIds: [10, 11] });

    expect(Object.fromEntries(marks)).toEqual({ 10: 3, 11: 0 });
  });
});

describe('TrackingLestaService field selection', () => {
  it('asks Lesta only for the fields the poll uses and rejects a response missing one', async () => {
    const { clients, service } = createLesta();

    clients.bulk.account.info.mockResolvedValue({ 1: { account_id: 1, nickname: 'tanker' } });

    await expect(service.port('bulk').accountInfo([1])).rejects.toThrow();
    expect(clients.bulk.account.info).toHaveBeenCalledWith(expect.objectContaining({ fields: TRACKING.lesta.accountFields }));
  });

  it('keeps an account Lesta did not return as missing', async () => {
    const { clients, service } = createLesta();

    clients.bulk.account.info.mockResolvedValue({ 1: null });

    expect(await service.port('bulk').accountInfo([1])).toEqual({ 1: null });
  });
});

describe('TrackingLestaService mode extras', () => {
  it('asks for the mode blocks and falls back to the base extras once Lesta rejects them', async () => {
    const { clients, service } = createLesta();

    clients.bulk.account.info.mockRejectedValueOnce(new LestaApiError({ code: 'INVALID_EXTRA', method: 'account/info', field: 'extra' }));
    clients.bulk.account.info.mockResolvedValue({ 1: null });

    await service.port('bulk').accountInfo([1]);
    await service.port('bulk').accountInfo([2]);

    const extras = clients.bulk.account.info.mock.calls.map(([input]) => input.extra);

    expect(extras[0]).toEqual([...TRACKING.lesta.accountExtra, ...TRACKING.lesta.accountModeExtra]);
    expect(extras.slice(1)).toEqual([TRACKING.lesta.accountExtra, TRACKING.lesta.accountExtra]);
  });

  it('rethrows any other failure', async () => {
    const { clients, service } = createLesta();

    clients.bulk.tanks.stats.mockRejectedValue(new LestaApiError({ code: 'SOURCE_NOT_AVAILABLE', method: 'tanks/stats' }));

    await expect(service.port('bulk').tankStats({ accountId: 1, tankIds: [2] })).rejects.toThrow('SOURCE_NOT_AVAILABLE');
  });
});
