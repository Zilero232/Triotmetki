-- Cumulative snapshots and per-change deltas become hypertables partitioned by captured_at.
-- create_default_indexes is off: every index the tables need is declared in the Prisma schema,
-- so `prisma db push` never sees an index it does not know about and never tries to drop it.

SELECT create_hypertable(
  'account_snapshot',
  by_range('captured_at', INTERVAL '7 days'),
  create_default_indexes => FALSE,
  if_not_exists => TRUE,
  migrate_data => TRUE
);

SELECT create_hypertable(
  'tank_snapshot',
  by_range('captured_at', INTERVAL '3 days'),
  create_default_indexes => FALSE,
  if_not_exists => TRUE,
  migrate_data => TRUE
);

SELECT create_hypertable(
  'tank_battle_delta',
  by_range('captured_at', INTERVAL '7 days'),
  create_default_indexes => FALSE,
  if_not_exists => TRUE,
  migrate_data => TRUE
);

-- create_hypertable keeps the interval of an existing hypertable; this moves it for the chunks created from now on.
SELECT set_chunk_time_interval('tank_battle_delta', INTERVAL '7 days');

-- Compression settings can only change while no chunk is compressed: a hypertable whose settings differ from the
-- wanted ones has its chunks decompressed and the settings applied again; the compression policy recompresses them.
DO $$
DECLARE
  target RECORD;
  existing RECORD;
BEGIN
  FOR target IN
    SELECT * FROM (VALUES
      ('account_snapshot', 'account_id, mode', 'captured_at DESC'),
      ('tank_snapshot', 'account_id, mode', 'captured_at DESC'),
      ('tank_battle_delta', 'account_id, mode', 'captured_at DESC')
    ) AS t(relation, segment_by, order_by)
  LOOP
    SELECT settings.segmentby, settings.orderby INTO existing
    FROM timescaledb_information.hypertable_compression_settings settings
    WHERE settings.hypertable = target.relation::regclass;

    CONTINUE WHEN FOUND
      AND replace(existing.segmentby, ' ', '') = replace(target.segment_by, ' ', '')
      AND replace(existing.orderby, ' ', '') = replace(target.order_by, ' ', '');

    PERFORM decompress_chunk(chunk, if_compressed => TRUE) FROM show_chunks(target.relation::regclass) AS chunk;

    EXECUTE format(
      'ALTER TABLE %I SET (timescaledb.compress, timescaledb.compress_segmentby = %L, timescaledb.compress_orderby = %L)',
      target.relation,
      target.segment_by,
      target.order_by
    );
  END LOOP;
END
$$;
