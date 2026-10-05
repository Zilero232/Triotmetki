-- One-off backfill of the random-mode row of account_mode_stats from the latest random account snapshot, with the time
-- each lifetime record was first seen. Runs only while no random row exists; the collector keeps the rows current.

INSERT INTO account_mode_stats (
  account_id, mode, battles, wins, losses, draws, damage_dealt, damage_received, frags, spotted, xp, survived_battles, hits, shots,
  capture_points, dropped_capture_points, avg_damage_blocked, avg_damage_assisted, max_damage, max_xp, max_frags, updated_at,
  max_damage_at, max_xp_at, max_frags_at
)
SELECT
  latest.account_id, latest.mode, latest.battles, latest.wins, latest.losses, latest.draws, latest.damage_dealt, latest.damage_received,
  latest.frags, latest.spotted, latest.xp, latest.survived_battles, latest.hits, latest.shots, latest.capture_points,
  latest.dropped_capture_points, latest.avg_damage_blocked, latest.avg_damage_assisted, latest.max_damage, latest.max_xp, latest.max_frags,
  now(),
  (SELECT min(s.captured_at) FROM account_snapshot s
    WHERE s.account_id = latest.account_id AND s.mode = latest.mode AND s.max_damage = latest.max_damage),
  (SELECT min(s.captured_at) FROM account_snapshot s
    WHERE s.account_id = latest.account_id AND s.mode = latest.mode AND s.max_xp = latest.max_xp),
  (SELECT min(s.captured_at) FROM account_snapshot s
    WHERE s.account_id = latest.account_id AND s.mode = latest.mode AND s.max_frags = latest.max_frags)
FROM (
  SELECT DISTINCT ON (s.account_id) s.*
  FROM account_snapshot s
  JOIN player p ON p.account_id = s.account_id
  WHERE s.mode = 'random' AND NOT EXISTS (SELECT 1 FROM account_mode_stats WHERE mode = 'random')
  ORDER BY s.account_id, s.captured_at DESC
) AS latest
ON CONFLICT DO NOTHING;
