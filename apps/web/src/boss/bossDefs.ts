export type BossId = "bear" | "shark" | "boar" | "octopus" | "robot";
export type Lane = "low" | "high";

export type BossDef = {
  id: BossId;
  name: string;
  color: string;
  notes: string;
};

export const BOSSES: BossDef[] = [
  {
    id: "bear",
    name: "Медведь «Вратарь»",
    color: "#f58c35",
    notes: "Учебный бой: низкая / высокая шайба",
  },
  {
    id: "shark",
    name: "Акула «Снайпер»",
    color: "#ef4555",
    notes: "Быстрее и точнее",
  },
  {
    id: "boar",
    name: "Кабан «Таран»",
    color: "#a066ea",
    notes: "Тяжёлая шайба",
  },
  {
    id: "octopus",
    name: "Осьминог «Фокусник»",
    color: "#20cdd1",
    notes: "Ложный замах — жди нижний удар",
  },
  {
    id: "robot",
    name: "Робот «Ледокол»",
    color: "#f4c52c",
    notes: "Броня; урон только в перегреве",
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
