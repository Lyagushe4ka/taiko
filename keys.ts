import { Wallet } from 'ethers';
import fs from 'fs';

(() => {
  const amount = parseInt(process.env.AMOUNT!);

  if (isNaN(amount)) {
    console.error('Invalid AMOUNT provided.');
    process.exit(1);
  }

  console.log(`Generating ${amount} keys...`);

  let keys: string[] = [];
  let wallets: {
    address: string;
    key: string;
    mnemonic: string;
  }[] = [];
  for (let i = 0; i < amount; i++) {
    const wallet = Wallet.createRandom();

    keys.push(wallet.privateKey);
    wallets.push({
      address: wallet.address,
      key: wallet.privateKey,
      mnemonic: wallet.mnemonic?.phrase || '',
    });
  }

  fs.writeFileSync('./deps/generated-keys.txt', keys.join('\n'));
  fs.writeFileSync('./deps/generated-wallets.json', JSON.stringify(wallets, null, 2));
})();
