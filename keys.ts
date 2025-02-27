import { Wallet } from 'ethers';
import fs from 'fs';

(() => {
  const amount = parseInt(process.env.AMOUNT!);

  if (isNaN(amount)) {
    console.error('Invalid AMOUNT provided.');
    process.exit(1);
  }

  console.log(`\nGenerating ${amount} wallets...`);

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

  if (
    fs.existsSync('./deps/generated-keys.txt') ||
    fs.existsSync('./deps/generated-wallets.json')
  ) {
    const parsedExisingKeys = fs
      .readFileSync('./deps/generated-keys.txt', 'utf8')
      .replaceAll('\r', '') // Remove carriage returns from Windows
      .split('\n');
    const exisingKeys = parsedExisingKeys.filter((key) => key !== '');

    const parsedExistingWallets = fs.readFileSync('./deps/generated-wallets.json', 'utf8');
    const existingWallets = parsedExistingWallets ? JSON.parse(parsedExistingWallets) : [];

    if (exisingKeys.length > 0) {
      console.log(`\nFound ${exisingKeys.length} existing wallets, merging...\n`);
    }

    exisingKeys.push(...keys);
    existingWallets.push(...wallets);

    fs.writeFileSync('./deps/generated-keys.txt', exisingKeys.join('\n'));
    fs.writeFileSync('./deps/generated-wallets.json', JSON.stringify(existingWallets, null, 2));
  } else {
    fs.writeFileSync('./deps/generated-keys.txt', keys.join('\n'));
    fs.writeFileSync('./deps/generated-wallets.json', JSON.stringify(wallets, null, 2));
  }
})();
