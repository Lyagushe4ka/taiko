import fs from 'fs';

export let PUMP_STATS: Record<string, boolean>;

export const pumpDB = {
  load() {
    if (fs.existsSync('./deps/pumpstats.json')) {
      const fileData = fs.readFileSync('./deps/pumpstats.json', 'utf8');

      if (fileData === '') {
        PUMP_STATS = {};
        return;
      }

      PUMP_STATS = JSON.parse(fileData);
    } else {
      PUMP_STATS = {};
    }
  },

  init(wallet: string) {
    PUMP_STATS[wallet] = false;
  },

  get(wallet: string) {
    if (!PUMP_STATS[wallet]) {
      this.init(wallet);
    }
    return PUMP_STATS[wallet];
  },

  set(wallet: string, value: boolean) {
    if (!PUMP_STATS[wallet]) {
      this.init(wallet);
    }

    PUMP_STATS[wallet] = value;
  },

  save() {
    fs.writeFileSync(
      './deps/pumpstats.json',
      PUMP_STATS ? JSON.stringify(PUMP_STATS, null, 2) : '',
    );
  },
};
