import { JsonRpcProvider, Wallet } from 'ethers';
import { keysLeft } from './src/services';
import { CONFIG_CONSTANTS } from './deps/config';
import { retry, sleep, timeout } from './src/utils';
import { readKeys, soneiumDB } from './src/data';
import { approveTxSony, makeWrapTxSony } from './src/sony.services';

async function main() {
  const keys = readKeys();
  soneiumDB.load();
  const provider = new JsonRpcProvider(CONFIG_CONSTANTS.soneium.rpc);

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

      const balance = await retry(() => provider.getBalance(address));

      if (balance === 0n) {
        console.log('Wallet has no balance, skipping');
        keys.splice(index, 1);
        await sleep({ seconds: 2 });
        continue;
      }

      const approveLimit = soneiumDB.get(address, 'approveLimit') as number;
      const approveCurrent = soneiumDB.get(address, 'approveCurrent') as number;
      const wrapLimit = soneiumDB.get(address, 'wrapLimit') as number;
      const wrapCurrent = soneiumDB.get(address, 'wrapCurrent') as number;

      const rndBool = Math.random() < 0.5;

      if (rndBool) {
        if (approveCurrent < approveLimit) {
          await approveTxSony(wallet);
        } else if (wrapCurrent < wrapLimit) {
          await makeWrapTxSony(wallet);
        } else {
          console.log('Limits reached on wallet:', wallet.address);
          keys.splice(index, 1);
          await sleep({ seconds: 2 });
          continue;
        }
      } else {
        if (wrapCurrent < wrapLimit) {
          await makeWrapTxSony(wallet);
        } else if (approveCurrent < approveLimit) {
          await approveTxSony(wallet);
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

  soneiumDB.save();

  process.exit();
});

// catching unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);

  soneiumDB.save();

  process.exit();
});

// catching uncaught exception
process.on('uncaughtException', (err, origin) => {
  console.log(`Caught exception: ${err}\n Exception origin: ${origin}`);

  soneiumDB.save();

  process.exit();
});

main();
