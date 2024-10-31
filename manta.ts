import { Wallet } from 'ethers';
import { sleep, timeout } from './src/utils';
import { readKeys } from './src/data';
import { getBalances, mantaDB } from './src/manta';
import { makeSwapTx, makeUtilityTx } from './src/manta/protocols';
import { LIMITS } from './deps/config';

const originalConsoleLog = console.log;

console.log = function (...args: any[]) {
  const unwantedMessages = [
    'JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)',
  ];

  const shouldLog = args.every(
    (arg) =>
      !unwantedMessages.some((unwanted) => typeof arg === 'string' && arg.includes(unwanted)),
  );

  if (shouldLog) {
    originalConsoleLog.apply(console, args);
  }
};

async function main() {
  const keys = readKeys();
  mantaDB.load();

  while (true) {
    try {
      if (keys.length === 0) {
        console.log('No wallets left.');
        mantaDB.save();
        break;
      }

      const index = Math.floor(Math.random() * keys.length);
      const key = keys[index];

      const wallet = new Wallet(key);
      const address = wallet.address;
      console.log(`\nUsing wallet ${address}\n`);

      const stats = mantaDB.getAll(address);

      let actions: Array<'swap' | 'utility'> = ['swap', 'utility'];

      if (stats.currentSwapTxs >= stats.totalSwapTxs) {
        actions = actions.filter((action) => action !== 'swap');
      }

      if (stats.currentUtilityTxs >= stats.totalUtilityTxs) {
        actions = actions.filter((action) => action !== 'utility');
      }

      if (actions.length === 0) {
        console.log(`Limits reached on wallet: ${address}, removing it from the list.`);
        keys.splice(index, 1);
        continue;
      }

      const action = actions[Math.floor(Math.random() * actions.length)];

      const balances = await getBalances(address);

      if (!balances) {
        console.log('\nError while getting balances\n');
        await sleep({ seconds: LIMITS.errorTimeout });
        continue;
      }

      mantaDB.set(address, 'balances', balances.balancesInEther);

      if (action === 'utility') {
        const hash = await makeUtilityTx(wallet, balances);

        if (!hash) {
          await sleep({ seconds: LIMITS.errorTimeout });
          continue;
        }

        console.log(`\nTx: https://pacific-explorer.manta.network/tx/${hash}\n\n`);
        mantaDB.incr(address, 'currentUtilityTxs');
      } else {
        const hash = await makeSwapTx(wallet, balances);

        if (!hash) {
          await sleep({ seconds: LIMITS.errorTimeout });
          continue;
        }

        console.log(`\nTx: https://pacific-explorer.manta.network/tx/${hash}\n\n`);
        mantaDB.incr(address, 'currentSwapTxs');
      }

      const balancesAfter = await getBalances(address);

      if (balancesAfter) {
        mantaDB.set(address, 'balances', balancesAfter.balancesInEther);
      }

      await timeout();
    } catch (e: any) {
      console.log(`\nCaught error: ${e}\n`);
      await sleep({ seconds: LIMITS.errorTimeout });
    }
  }
}

// catching ctrl+c event
process.on('SIGINT', function () {
  console.log('Caught interrupt signal');

  mantaDB.save();

  process.exit();
});

// catching unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);

  mantaDB.save();

  process.exit();
});

// catching uncaught exception
process.on('uncaughtException', (err, origin) => {
  console.log(`Caught exception: ${err}\n Exception origin: ${origin}`);

  mantaDB.save();

  process.exit();
});

main();
