import fs from 'fs';
import { randomBetween } from '../utils';
import { LIMITS } from '../../deps/config';

interface MantaStats {
  currentSwapTxs: number;
  totalSwapTxs: number;

  currentUtilityTxs: number;
  totalUtilityTxs: number;
}

interface MantaStatsWithBalances extends MantaStats {
  balances: Record<string, string>;
  fees: number;
}

export let MANTA_STATS: Record<string, MantaStatsWithBalances>;

export const mantaDB = {
  load() {
    if (fs.existsSync('./deps/mantaStats.json')) {
      const fileData = fs.readFileSync('./deps/mantaStats.json', 'utf8');

      if (fileData === '') {
        MANTA_STATS = {};
        return;
      }

      MANTA_STATS = JSON.parse(fileData);
    } else {
      MANTA_STATS = {};
    }
  },

  init(wallet: string) {
    const totalSwapTxs = randomBetween(LIMITS.swapTxMin, LIMITS.swapTxMax, 0);
    const totalUtilityTxs = randomBetween(LIMITS.utilityTxMin, LIMITS.utilityTxMax, 0);

    MANTA_STATS[wallet] = {
      currentSwapTxs: 0,
      totalSwapTxs,
      currentUtilityTxs: 0,
      totalUtilityTxs,

      balances: {},

      fees: 0,
    };
  },

  get(wallet: string, statName: keyof MantaStats) {
    if (!MANTA_STATS[wallet]) {
      this.init(wallet);
    }
    return MANTA_STATS[wallet][statName];
  },

  getAll(wallet: string) {
    if (!MANTA_STATS[wallet]) {
      this.init(wallet);
    }
    return MANTA_STATS[wallet];
  },

  incr(wallet: string, statName: keyof MantaStats) {
    if (!MANTA_STATS[wallet]) {
      this.init(wallet);
    }

    MANTA_STATS[wallet][statName] += 1;
  },

  set(wallet: string, statName: keyof MantaStatsWithBalances, value: any) {
    if (!MANTA_STATS[wallet]) {
      this.init(wallet);
    }

    MANTA_STATS[wallet][statName] = value;
  },

  save() {
    fs.writeFileSync(
      './deps/mantaStats.json',
      MANTA_STATS ? JSON.stringify(MANTA_STATS, null, 2) : '',
    );
  },
};
