import { Contract, JsonRpcProvider, parseEther, Wallet } from 'ethers';
import { readData } from './src/data';
import { rndKeyPair } from './src/pumpUtils';
import { retry, sleep, timeout } from './src/utils';
import { CONFIG_CONSTANTS } from './deps/config';
import { ADDRESSES } from './src/angle/constants';
import { ABI } from './src/constants';
import { bridgeGnosis } from './src/angle/bridge';
import { refuelGnosis } from './src/angle/refuel';
import { swapCelo } from './src/angle/swap';
import { angleDB } from './src/angle/angleStats';

const gnosisProviders = CONFIG_CONSTANTS.gnosisRpcs.map((rpc) => new JsonRpcProvider(rpc));
const celoProviders = CONFIG_CONSTANTS.celoRpcs.map((rpc) => new JsonRpcProvider(rpc));
const gnosisEuras = gnosisProviders.map(
  (provider) => new Contract(ADDRESSES.GNOSIS.token, ABI, provider),
);
const celoEuras = celoProviders.map(
  (provider) => new Contract(ADDRESSES.CELO.token, ABI, provider),
);

async function main() {
  const { keys, proxies } = readData();
  angleDB.load();

  while (true) {
    try {
      if (keys.length === 0) {
        console.log('No wallets left.');
        angleDB.save();

        break;
      }

      const { key, proxy, index } = rndKeyPair(keys, proxies);

      const wallet = new Wallet(key);
      const address = wallet.address;
      console.log(`\nUsing wallet ${address}\n`);

      const finished = angleDB.get(address);

      if (finished) {
        console.log('Wallet already finished, skipping');
        keys.splice(index, 1);
        proxies.splice(index, 1);
        continue;
      }

      const gnosisBalance = await retry(() =>
        Promise.any(gnosisEuras.map((eur) => eur.balanceOf(address))),
      );

      if (gnosisBalance !== 0n) {
        const bridge = await bridgeGnosis(wallet, gnosisProviders, gnosisBalance);

        if (!bridge) {
          continue;
        }

        console.log(`Bridged EURA from Gnosis to CELO, tx: https://gnosisscan.io/tx/${bridge}`);
      }

      const xdaiBalance = await retry(() =>
        Promise.any(gnosisProviders.map((provider) => provider.getBalance(address))),
      );

      if (xdaiBalance > parseEther('0.03')) {
        const refuel = await refuelGnosis(wallet, proxy, gnosisProviders);

        if (!refuel) {
          continue;
        }

        console.log(`Refueled xDAI to POL, tx: https://gnosisscan.io/tx/${refuel}`);
      }

      let celoBalance = 0n;
      while (celoBalance === 0n) {
        celoBalance = await retry(() =>
          Promise.any(celoEuras.map((eur) => eur.balanceOf(address))),
        );

        console.log('Waiting for EURA balance on Celo');

        await sleep({ seconds: 15 });
      }

      const celoSwap = await swapCelo(wallet, celoBalance, proxy);

      if (!celoSwap) {
        continue;
      }

      console.log(`Swapped EURA to CELO, tx: https://celoscan.io/tx/${celoSwap}`);

      console.log(`\nWallet ${address} completed the cycle\n`);

      angleDB.set(address, true);
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

  angleDB.save();

  process.exit();
});

// catching unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);

  angleDB.save();

  process.exit();
});

// catching uncaught exception
process.on('uncaughtException', (err, origin) => {
  console.log(`Caught exception: ${err}\n Exception origin: ${origin}`);

  angleDB.save();

  process.exit();
});

main();
