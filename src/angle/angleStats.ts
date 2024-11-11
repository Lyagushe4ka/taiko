import fs from 'fs';

export let ANGLE_STATS: Record<string, boolean>;

export const angleDB = {
  load() {
    if (fs.existsSync('./deps/anglestats.json')) {
      const fileData = fs.readFileSync('./deps/anglestats.json', 'utf8');

      if (fileData === '') {
        ANGLE_STATS = {};
        return;
      }

      ANGLE_STATS = JSON.parse(fileData);
    } else {
      ANGLE_STATS = {};
    }
  },

  init(wallet: string) {
    ANGLE_STATS[wallet] = false;
  },

  get(wallet: string) {
    if (!ANGLE_STATS[wallet]) {
      this.init(wallet);
    }
    return ANGLE_STATS[wallet];
  },

  set(wallet: string, value: boolean) {
    if (!ANGLE_STATS[wallet]) {
      this.init(wallet);
    }

    ANGLE_STATS[wallet] = value;
  },

  save() {
    fs.writeFileSync(
      './deps/anglestats.json',
      ANGLE_STATS ? JSON.stringify(ANGLE_STATS, null, 2) : '',
    );
  },
};
