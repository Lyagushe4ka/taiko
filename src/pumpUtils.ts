import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { pumpDB } from './pumpStats';
import { Contract, TransactionResponse, Wallet } from 'ethers';
import { retry } from './utils';
import fs from 'fs';

export function readRefs() {
  const keys = fs.readFileSync('./deps/refs.txt', 'utf8').replaceAll('\r', '').split('\n');

  keys.every((key, index) => {
    if (!(key.startsWith('0x') && key.length === 42)) {
      throw new Error(`Invalid key length at line ${index + 1}.`);
    }
    return true;
  });

  return keys;
}

export const rndKeyPair = (
  keys: string[],
  proxies: string[],
): { key: string; proxy: string; index: number } => {
  const rnd = Math.floor(Math.random() * keys.length);
  return { key: keys[rnd], proxy: proxies[rnd], index: rnd };
};

export const getSig = async (address: string, proxy: string) => {
  const agent = new HttpsProxyAgent(proxy, { rejectUnauthorized: false });

  try {
    const { data } = await axios.get(
      `https://api.scrollpump.xyz/api/Airdrop/GetSign?address=${address}`,
      { httpsAgent: agent, httpAgent: agent },
    );

    if (data && data.success) {
      return data.data as { sign: string; amount: string };
    }

    pumpDB.set(address, true);
    return false;
  } catch (e) {
    console.log('Error while getting sig:');
    return false;
  }
};

export const isClaimed = async (wallet: Wallet): Promise<boolean> => {
  const contract = new Contract(
    '0xCe64dA1992Cc2409E0f0CdCAAd64f8dd2dBe0093',
    [
      {
        inputs: [{ internalType: 'address', name: '', type: 'address' }],
        name: 'claimed',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    wallet,
  );

  try {
    const claimed = await contract.claimed(wallet.address);

    return claimed as boolean;
  } catch (e) {
    return false;
  }
};

export const claim = async (wallet: Wallet, sign: string, amount: string, ref: string) => {
  const contract = new Contract(
    '0xCe64dA1992Cc2409E0f0CdCAAd64f8dd2dBe0093',
    'function claim(uint256 amount, bytes calldata signature, address refUser)',
    wallet,
  );

  try {
    const tx: TransactionResponse = await retry(() => contract.claim(amount, sign, ref), 2);

    const receipt = await tx.wait();

    if (!receipt) {
      return false;
    }

    console.log('Claimed on wallet: ', wallet.address);
    console.log('\n');
    console.log(`TX: https://scrollscan.com/tx/${receipt.hash}`);
    console.log('\n\n');

    return true;
  } catch (e) {
    return false;
  }
};
