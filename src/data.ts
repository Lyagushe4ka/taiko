import fs from 'fs';
import { StatNames, Stats } from './types';
import { randomBetween } from './utils';
import { LIMITS } from '../deps/config';

export let WALLETS_STATS: Record<string, Stats>;
export let WALLETS_SONY: Record<string, Omit<Stats, 'hasPoints' | 'claimedPoints'>>;

export const statsDB = {
  load() {
    if (fs.existsSync('./deps/stats.json')) {
      const fileData = fs.readFileSync('./deps/stats.json', 'utf8');

      if (fileData === '') {
        WALLETS_STATS = {};
        return;
      }

      WALLETS_STATS = JSON.parse(fileData);
    } else {
      WALLETS_STATS = {};
    }
  },

  init(wallet: string) {
    const approveLimit = randomBetween(LIMITS.approveTxMin, LIMITS.approveTxMax, 0);
    const wrapLimit = randomBetween(LIMITS.wrapTxMin, LIMITS.wrapTxMax, 0);
    WALLETS_STATS[wallet] = {
      approveLimit,
      approveCurrent: 0,
      wrapLimit,
      wrapCurrent: 0,
      hasPoints: undefined,
      claimedPoints: false,
    };
  },

  get(wallet: string, statName: StatNames) {
    if (!WALLETS_STATS[wallet]) {
      this.init(wallet);
    }
    return WALLETS_STATS[wallet][statName];
  },

  incr(wallet: string, statName: 'approveCurrent' | 'wrapCurrent') {
    if (!WALLETS_STATS[wallet]) {
      this.init(wallet);
    }

    const value = this.get(wallet, statName) as number;

    WALLETS_STATS[wallet][statName] = value + 1;
  },

  set(wallet: string, statName: 'hasPoints' | 'claimedPoints', value: boolean) {
    if (!WALLETS_STATS[wallet]) {
      this.init(wallet);
    }

    WALLETS_STATS[wallet][statName] = value;
  },

  save() {
    fs.writeFileSync(
      './deps/stats.json',
      WALLETS_STATS ? JSON.stringify(WALLETS_STATS, null, 2) : '',
    );
  },
};

export const soneiumDB = {
  load() {
    if (fs.existsSync('./deps/sony.json')) {
      const fileData = fs.readFileSync('./deps/sony.json', 'utf8');

      if (fileData === '') {
        WALLETS_SONY = {};
        return;
      }

      WALLETS_SONY = JSON.parse(fileData);
    } else {
      WALLETS_SONY = {};
    }
  },

  init(wallet: string) {
    const approveLimit = randomBetween(LIMITS.approveTxMin, LIMITS.approveTxMax, 0);
    const wrapLimit = randomBetween(LIMITS.wrapTxMin, LIMITS.wrapTxMax, 0);
    WALLETS_SONY[wallet] = {
      approveLimit,
      approveCurrent: 0,
      wrapLimit,
      wrapCurrent: 0,
    };
  },

  get(wallet: string, statName: keyof Omit<Stats, 'hasPoints' | 'claimedPoints'>) {
    if (!WALLETS_SONY[wallet]) {
      this.init(wallet);
    }
    return WALLETS_SONY[wallet][statName];
  },

  incr(wallet: string, statName: 'approveCurrent' | 'wrapCurrent') {
    if (!WALLETS_SONY[wallet]) {
      this.init(wallet);
    }

    const value = this.get(wallet, statName) as number;

    WALLETS_SONY[wallet][statName] = value + 1;
  },

  save() {
    fs.writeFileSync('./deps/sony.json', WALLETS_SONY ? JSON.stringify(WALLETS_SONY, null, 2) : '');
  },
};

export function readKeys(): string[] {
  const keys = fs.readFileSync('./deps/keys.txt', 'utf8').replaceAll('\r', '').split('\n');

  keys.every((key, index) => {
    if (!((key.startsWith('0x') && key.length === 66) || key.length === 64)) {
      throw new Error(`Invalid key length at line ${index + 1}.`);
    }
    return true;
  });

  return keys;
}

export function readData(): { keys: string[]; proxies: string[] } {
  const keys = fs.readFileSync('./deps/keys.txt', 'utf8').replaceAll('\r', '').split('\n');

  keys.every((key, index) => {
    if (!((key.startsWith('0x') && key.length === 66) || key.length === 64)) {
      throw new Error(`Invalid key length at line ${index + 1}.`);
    }
    return true;
  });

  let proxies = fs.readFileSync('./deps/proxies.txt', 'utf8').replaceAll('\r', '').split('\n');

  const proxyRegex = /^[a-zA-Z0-9]+:[a-zA-Z0-9]+@[0-9.]+:[0-9]+$/;

  proxies.every((proxy, index) => {
    if (!proxyRegex.test(proxy)) {
      throw new Error(`Invalid proxy at line ${index + 1}.`);
    }
    return true;
  });

  proxies = proxies.map((proxy) => {
    return (proxy = 'http://' + proxy);
  });

  if (keys.length !== proxies.length) {
    throw new Error('Number of keys and proxies must be equal.');
  }

  return { keys, proxies };
}
