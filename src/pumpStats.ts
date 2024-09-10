import fs from 'fs';

export let PUMP_STATS: Map<string, boolean>;

export const pumpDB = {
  load() {
    if (fs.existsSync('./deps/pumpstats.json')) {
      const fileData = fs.readFileSync('./deps/pumpstats.json', 'utf8');

      if (fileData === '') {
        PUMP_STATS = new Map();
        return;
      }

      PUMP_STATS = JSON.parse(fileData);
    } else {
      PUMP_STATS = new Map();
    }
  },

  init(wallet: string) {
    PUMP_STATS.set(wallet, false);
  },

  get(wallet: string) {
    if (!PUMP_STATS.has(wallet)) {
      this.init(wallet);
    }
    return PUMP_STATS.get(wallet) ?? false;
  },

  set(wallet: string, value: boolean) {
    if (!PUMP_STATS.has(wallet)) {
      this.init(wallet);
    }

    PUMP_STATS.set(wallet, value);
  },

  save() {
    fs.writeFileSync('./deps/stats.json', PUMP_STATS ? JSON.stringify(PUMP_STATS, null, 2) : '');
  },
};
