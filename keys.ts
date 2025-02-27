import chalk from 'chalk';
import { Wallet } from 'ethers';
import fs from 'fs';
import readline from 'readline';
import os from 'os';

function text(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(chalk.cyanBright(prompt), (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

(async () => {
  const amount = parseInt(process.env.AMOUNT!);

  if (isNaN(amount)) {
    console.error('Invalid AMOUNT provided.');
    process.exit(1);
  }

  console.log(`Generating ${amount} wallets...\n`);

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

  if (os.platform() === 'win32') {
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

      console.log(`Successfully saved ${exisingKeys.length} wallets.`);
    } else {
      fs.writeFileSync('./deps/generated-keys.txt', keys.join('\n'));
      fs.writeFileSync('./deps/generated-wallets.json', JSON.stringify(wallets, null, 2));

      console.log(`Successfully saved ${amount} wallets.`);
    }
  } else {
    const filename = await text('ENTER FILENAME TO SAVE WALLETS TO: ');

    fs.writeFileSync(`./deps/generated-keys-${filename}.txt`, keys.join('\n'));
    fs.writeFileSync(`./deps/generated-wallets-${filename}.json`, JSON.stringify(wallets, null, 2));

    console.log(
      `Successfully saved ${amount} wallets to files: ` +
        chalk.greenBright(`generated-keys-${filename}.txt`) +
        ` and ` +
        chalk.greenBright(`generated-wallets-${filename}.json`) +
        ' in "deps" folder.',
    );
  }
})();
