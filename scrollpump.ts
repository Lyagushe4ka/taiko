import { Wallet } from 'ethers';
import { rndArrElement, sleep, timeout } from './src/utils';
import { readData } from './src/data';
import { pumpDB } from './src/pumpStats';
import { claim, getSig, isClaimed, readRefs, rndKeyPair } from './src/pumpUtils';

async function main() {
  const { keys, proxies } = readData();
  pumpDB.load();

  const refs = readRefs();

  while (true) {
    try {
      if (keys.length === 0) {
        console.log('No wallets left.');
        pumpDB.save();

        break;
      }

      const { key, proxy, index } = rndKeyPair(keys, proxies);

      const wallet = new Wallet(key);
      const address = wallet.address;
      console.log(`\nUsing wallet ${address}\n`);

      if (pumpDB.get(address)) {
        console.log('Wallet already claimed, skipping');
        keys.splice(index, 1);
        proxies.splice(index, 1);
        continue;
      }

      const claimed = await isClaimed(key);

      if (claimed) {
        console.log('Wallet already claimed, skipping');
        pumpDB.set(address, true);
        keys.splice(index, 1);
        proxies.splice(index, 1);
        continue;
      }

      const data = await getSig(address, proxy);

      if (!data) {
        keys.splice(index, 1);
        proxies.splice(index, 1);
        continue;
      }

      const ref = rndArrElement(refs);

      const claiming = await claim(key, data.sign, data.amount, ref);

      if (!claiming) {
        continue;
      }

      pumpDB.set(address, true);
      keys.splice(index, 1);
      proxies.splice(index, 1);

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

  pumpDB.save();

  process.exit();
});

// catching unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);

  pumpDB.save();

  process.exit();
});

// catching uncaught exception
process.on('uncaughtException', (err, origin) => {
  console.log(`Caught exception: ${err}\n Exception origin: ${origin}`);

  pumpDB.save();

  process.exit();
});

main();
