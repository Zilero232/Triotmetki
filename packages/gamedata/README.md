# @otmetki/gamedata

The pure «Мир танков» loadout calculator and the game-data model it reads, plus the ballistics, dispersion, spotting and armor-penetration math. No I/O and no runtime dependencies, so the client's build constructor and 3D armor viewer and the server run the same maths. The importer that produces this data (XML parsers, GitHub reader, database writer) lives in the server: [apps/web/server/src/modules/gamedata](../../apps/web/server/src/modules/gamedata/README.md).

## Usage

```ts
import { calculateLoadout } from '@otmetki/gamedata';

const stats = calculateLoadout({
  vehicle: is,
  modules: 'top',
  optionalDevices: [{ device: rammer }, { device: aimDrives, specialized: true }],
  consumables: [ration],
  directives: [rammerDirective],
  crew: { level: 100, skills: [{ skill: brotherhood }, { skill: smoothTurret }] },
  fieldModifications: [modification],
  state: { still: false }
});
```

The root exports `calculateLoadout` with its input and output types (`LoadoutInput`, `FinalStats`, …), `resolveModules`, the model types (`VehicleSpec`, `OptionalDevice`, `Equipment`, `CrewSkill`, `FieldModification`, …), the ballistics, dispersion and spotting math (`ballisticsCurve`, `aimTimeline`, `spottingDuel`, …), the armor math (`traceArmorRay`, `penetrationAtDistance`, `ARMOR_FLAGS`, the geometry codec `encodeArmorGeometry` / `decodeArmorGeometry`) and the modifier model (`Modifier`, `MODIFIER_OPS`).

## Layout

| Folder          | Concern                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| `src/model`     | the data shapes the importer produces and the calculator reads                                       |
| `src/modifiers` | the structured modifier model and its application                                                    |
| `src/loadout`   | `calculateLoadout` → final stats                                                                     |
| `src/math`      | ballistics, aiming and dispersion curves, handling scenarios and spotting                            |
| `src/armor`     | penetration math, armor flags and the binary geometry codec shared by the importer and the 3D viewer |

## Testing

Tests live in `src/**/_tests`; the calculator is checked in `src/loadout/_tests/loadout.test.ts` against fixtures of parsed vehicles and devices (`src/loadout/_tests/fixtures.ts`). Run them from the repo root with `bun run test`.

## Reference

### Modifier model

Every effect is a `Modifier`:

```ts
type Modifier = {
  attribute: string; // 'miscAttrs/gunReloadTimeFactor', 'gun/reloadTime', 'engine/power', …
  op: 'add' | 'mul';
  value: number; // normal slot
  specValue?: number; // specialization slot (optional devices: valueByLevel[1])
  condition?: 'active' | 'still' | 'tracked' | 'wheeled';
  requiresDevice?: { required: string[]; incompatible: string[] }; // equipment directives
};
```

- `miscAttrs/*` are **static** vehicle attributes (`VehicleDescriptor.miscAttrs` in the client). Optional devices (`<factors>`) and field modifications (`<modifiers>`) write them.
- Everything else is a **dynamic** factor (`vehicleAttributeFactors` in the client). Consumables, directives, still-only devices and the crew write them.
- `physics/*` covers grousers (terrain resistance, rolling friction).
- `invisibility/*` and `economy/*` are recorded for completeness but not yet shown as final stats.
- Devices with a script instead of factors are mapped explicitly. Stereoscope becomes `circularVisionRadius` (`still`). Camouflage net becomes `invisibility/additive` (`still`). Low-noise tracks become `miscAttrs/invisibilityAdditiveTerm`. Rotation mechanisms become `onMove/onStillRotationSpeedFactor` (`tracked`/`wheeled`). Grousers become `physics/terrainResistance`.
- Skill directives carry `skillBoost: { skill, perkLevelMultiplier?, efficiencyFactor? }` instead of modifiers.

### Loadout calculator: order of application

This follows `items/vehicles.py` (`_updateAttributes`), `items/utils.py` (`updateVehicleAttrFactors`, `getReloadTime`…), `items/VehicleDescrCrew.py` and `gui/shared/items_parameters/params.py` of the 1.45 client:

1. **Modules.** `'stock'` takes the first module of each list. `'top'` takes the highest tier (the last one on ties), and the gun comes from the chosen turret. An object selects modules by name.
2. **Static attributes.** Start from the defaults. Apply field modifications first, then optional devices (the normal value, or `specValue` when `specialized`). `mul` multiplies and `add` sums. Modifiers conditioned on `tracked`/`wheeled` apply only to the matching chassis.
3. **Dynamic factors.** Start from the defaults. Apply consumables (`active` ones only with `state.consumablesActive`). Apply directives: for each attribute, the first level whose device filter matches an installed device. Apply still-only devices (`state.still`). The stereoscope compensates for `circularVisionRadiusFactor` the way the client does.
4. **Crew.** `crewLevelIncrease` = ventilation (static) + food and directives (dynamic) + brotherhood (`5 × level / 100`). The commander's level is `L + increase`. Every other role is `L + increase + commander / 10`. The role factor is `0.57 + 0.43 × level / 100`. The loader divides reload by it. The gunner divides aiming time and base dispersion by it and multiplies turret and gun traverse by it. The commander multiplies view range. The radio operator multiplies radio range. The driver divides terrain resistance.
5. **Skills.** A skill's level is its learned level + increase (+ commander bonus for non-commanders). A skill directive raises an unlearned or partial skill to `100 + increase`, or multiplies a full one by `perkLevelMultiplier`. Per-level params give factors `1 + perLevel × level`: smooth turret, smooth driving (movement dispersion), virtuoso (hull traverse), inventor (radio). Eagle eye and finder add `perLevel × round(level)` to the view-range bonus.
6. **Final stats.**
   - reload = `gun.reloadTime × gunReloadTimeFactor × factors.gun/reloadTime`. Clip, autoreload and dual-gun times scale the same way.
   - aim = `aimingTime × gunAimingTimeFactor × factors`.
   - dispersion = `radius × multShotDispersionFactor × factor / gunnerFactor`. Movement, hull and turret rotation dispersion use `additiveShotDispersionFactor`.
   - view range = `turret radius × base × factor × crew × (1 + bonus)`, capped at 445 m (`viewRangeUncapped` is also returned).
   - engine = `power × enginePowerFactor × factors.engine/power`.
   - speed = `limit + forward/backwardMaxSpeedKMHTerm`.
   - hull traverse = `rotationSpeed × max(onMove, onStill) × virtuoso / (driver × grousers resistance)`.
   - turret traverse = `rotationSpeed × crew × fuel × turretRotationSpeed`.
   - HP = `(hull + turret) × healthFactor`.
   - weight = the sum of all module weights.

#### Assumptions and limitations

- The crew is uniform: every member has the same major qualification level, and skills are applied as if the best member has them. Mixed crews, wounded crew, and the universalist and desperado situational bonuses are not modelled.
- Default crew = 100 %, so non-commanders are at 110 %, exactly as the client computes it. Final stats therefore differ slightly from raw XML values.
- Rate of fire: regular guns `60 / reload`. Clip guns `count × 60 / (reload + (count − 1) × interval)`. Autoreload `count × 60 / Σ times`. Dual guns `60 × n / Σ times`. These are approximations for comparison, not exact DPM.
- Siege mode, turboshaft/rocket boosts, battle modifiers (event rules), camouflage and invisibility values, and spotting-time perks are parsed but not turned into final stats yet.
- Grousers are applied to terrain resistance as an average. Bad-roads-king and other terrain-specific perks are not applied.
