export type BossId = "bear" | "shark" | "boar" | "octopus" | "robot";
export type Lane = "low" | "high";

export type BossDef = {
  id: BossId;
  name: string;
  color: string;
  notes: string;
};

export type PowerKind =
  | "double"
  | "volley"
  | "ram"
  | "fake"
  | "icebreaker";

export type BossPowerAttack = {
  kind: PowerKind;
  /** Extra delay between multi-puck shots (ms). */
  gapMs?: number;
  /** Override projectile FX key for this power. */
  projectile?: string;
};

export const BOSSES: BossDef[] = [
  {
    id: "bear",
    name: "Медведь «Вратарь»",
    color: "#f58c35",
    notes: "Учебный бой; двойной удар low→high с паузой",
  },
  {
    id: "shark",
    name: "Акула «Снайпер»",
    color: "#ef4555",
    notes: "Быстрее; снайперский залп в одну линию",
  },
  {
    id: "boar",
    name: "Кабан «Таран»",
    color: "#a066ea",
    notes: "Тяжёлая шайба; таран low+high с паузой",
  },
  {
    id: "octopus",
    name: "Осьминог «Фокусник»",
    color: "#20cdd1",
    notes: "Ложный замах — ложная шайба + удар в другую линию",
  },
  {
    id: "robot",
    name: "Робот «Ледокол»",
    color: "#f4c52c",
    notes: "Броня; 3-й выстрел — только прыжок",
  },
];

export type BattleConfig = {
  id: BossId;
  name: string;
  hero: {
    hp: number;
    damage: number;
    invulnerabilityMs: number;
    attackCooldownMs: number;
  };
  boss: {
    hp: number;
    damage: number;
    attackWindupMs: number;
    attackCooldownMs: number;
    projectile: string;
    projectileSpeedPxPerSec: number;
    lanePattern: Lane[];
    interruptAttackOnHurt: boolean;
    /** Fire a power attack every N normal shots (0 = never). Robot uses burst instead. */
    powerEvery?: number;
    power?: BossPowerAttack;
  };
  arena: {
    groundY: number;
    lowLaneY: number;
    highLaneY: number;
    heroJumpHeight: number;
  };
  robot?: {
    shotsPerBurst: number;
    shotIntervalMs: number;
    overheatMs: number;
    onlyTakesDamageWhileOverheated: boolean;
  };
};

export function isBossId(v: string): v is BossId {
  return BOSSES.some((b) => b.id === v);
}
