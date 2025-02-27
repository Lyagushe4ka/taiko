import { Wallet } from 'ethers';
import fs from 'fs';

(() => {
  const amount = parseInt(process.env.AMOUNT!);

  let keys: string[] = [];
  for (let i = 0; i < amount; i++) {
    keys.push(Wallet.createRandom().privateKey);
  }

  fs.writeFileSync('./deps/generated-keys.txt', keys.join('\n'));
})();
