import { JsonRpcProvider, Wallet } from 'ethers';
import {
  checkAndClaimPoints,
  keysLeft,
  makeApproveTx,
  makeWrapTx,
  startScript,
} from './src/services';
import { CONFIG_CONSTANTS } from './deps/config';
import { retry, sleep, timeout } from './src/utils';
import { statsDB } from './src/data';

async function main() {
  const keys = await startScript();
  const provider = new JsonRpcProvider(CONFIG_CONSTANTS.rpc);

  while (true) {
    try {
      if (!(await keysLeft(keys))) {
        break;
      }

      const index = Math.floor(Math.random() * keys.length);
      const key = keys[index];

      const wallet = new Wallet(key, provider);
      const address = wallet.address;
      console.log(`\nUsing wallet ${address}\n`);

      await checkAndClaimPoints(wallet);

      const balance = await retry(() => provider.getBalance(address));

      if (balance === 0n) {
        console.log('Wallet has no balance, skipping');
        keys.splice(index, 1);
        await sleep({ seconds: 2 });
        continue;
      }

      const approveLimit = statsDB.get(address, 'approveLimit') as number;
      const approveCurrent = statsDB.get(address, 'approveCurrent') as number;
      const wrapLimit = statsDB.get(address, 'wrapLimit') as number;
      const wrapCurrent = statsDB.get(address, 'wrapCurrent') as number;

      const rndBool = Math.random() < 0.5;

      if (rndBool) {
        if (approveCurrent < approveLimit) {
          await makeApproveTx(wallet);
        } else if (wrapCurrent < wrapLimit) {
          await makeWrapTx(wallet);
        } else {
          console.log('Limits reached on wallet:', wallet.address);
          keys.splice(index, 1);
          await sleep({ seconds: 2 });
          continue;
        }
      } else {
        if (wrapCurrent < wrapLimit) {
          await makeWrapTx(wallet);
        } else if (approveCurrent < approveLimit) {
          await makeApproveTx(wallet);
        } else {
          console.log('Limits reached on wallet:', wallet.address);
          keys.splice(index, 1);
          await sleep({ seconds: 2 });
          continue;
        }
      }

      await timeout();
    } catch (e: any) {
      console.log(`\nCaught error: ${e.message}\n`);
      await sleep({ seconds: 5 });
    }
  }
}

// catching ctrl+c event
process.on('SIGINT', function () {
  console.log('Caught interrupt signal');

  statsDB.save();

  process.exit();
});

// catching unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);

  statsDB.save();

  process.exit();
});

// catching uncaught exception
process.on('uncaughtException', (err, origin) => {
  console.log(`Caught exception: ${err}\n Exception origin: ${origin}`);

  statsDB.save();

  process.exit();
});

main();
