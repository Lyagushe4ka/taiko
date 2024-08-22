import { Contract, TransactionResponse, Wallet } from 'ethers';
import { readKeys, statsDB } from './data';
import { ABI, CONTRACTS } from './constants';
import { randomBetween, retry, rndArrElement } from './utils';
import { CONFIG_CONSTANTS, LIMITS } from '../deps/config';
import axios from 'axios';

export async function checkAndClaimPoints(wallet: Wallet): Promise<boolean> {
  let hasPoints = statsDB.get(wallet.address, 'hasPoints');
  const claimedPoints = statsDB.get(wallet.address, 'claimedPoints');

  if (claimedPoints === true) {
    return true;
  }

  if (hasPoints === undefined) {
    try {
      const response = await axios.get(
        `https://trailblazer.mainnet.taiko.xyz/user/galxe?address=${wallet.address}`,
        {
          headers: {
            referer: 'https://trailblazers.taiko.xyz/',
            origin: 'https://trailblazers.taiko.xyz',
            authority: 'trailblazer.mainnet.taiko.xyz',
            accept: 'application/json, text/plain, */*',
            path: `/user/galxe?address=${wallet.address}`,
            priority: 'u=1, i',
            'accept-encoding': 'gzip, deflate, br, zstd',
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
          },
        },
      );

      const data = response.data;

      console.log('Points data: ', data);

      if (data && parseInt(data.value)) {
        hasPoints = true;
        statsDB.set(wallet.address, 'hasPoints', true);
      } else {
        hasPoints = false;
        statsDB.set(wallet.address, 'hasPoints', false);
      }
    } catch (e: any) {
      console.log('Error while checking points', e.message);
      return false;
    }
  }

  if (hasPoints === false) {
    statsDB.set(wallet.address, 'hasPoints', false);
    return true;
  }

  const contract = new Contract(CONTRACTS.registrator, ABI, wallet);

  const alreadyRegistered = await retry(() => contract.alreadyRegistered(wallet.address));

  if (alreadyRegistered) {
    console.log('Already registered on wallet: ', wallet.address);
    statsDB.set(wallet.address, 'claimedPoints', true);
    return true;
  }

  const feeData = await wallet.provider!.getFeeData();

  const tx: TransactionResponse = await contract.register({
    maxFeePerGas: (feeData.maxFeePerGas! / 100n) * 120n,
    maxPriorityFeePerGas: (feeData.maxPriorityFeePerGas! / 100n) * 120n,
  });

  const receipt = await tx.wait();

  if (!receipt) {
    console.log('Error while claiming points on wallet: ', wallet.address);
    return false;
  }

  console.log('Points claimed on wallet: ', wallet.address);
  console.log(`TX: https://taikoscan.io/tx/${receipt.hash}`);
  statsDB.set(wallet.address, 'claimedPoints', true);
  return true;
}

const wrap = async (wallet: Wallet): Promise<boolean> => {
  const contract = new Contract(CONTRACTS.weth, ABI, wallet);

  const balance = await retry(() => wallet.provider!.getBalance(wallet.address));

  const percent = randomBetween(LIMITS.wrapPercentMin, LIMITS.wrapPercentMax, 0);

  const amount = (balance / 100n) * BigInt(percent);

  try {
    const feeData = await wallet.provider!.getFeeData();

    const tx: TransactionResponse = await contract.deposit({
      value: amount,
      maxFeePerGas: (feeData.maxFeePerGas! / 100n) * 120n,
      maxPriorityFeePerGas: (feeData.maxPriorityFeePerGas! / 100n) * 120n,
    });

    const receipt = await tx.wait();

    if (!receipt) {
      console.log('Error while wrapping ETH on wallet: ', wallet.address);
      return false;
    }

    console.log('ETH wrapped on wallet: ', wallet.address);
    console.log(`TX: https://taikoscan.io/tx/${receipt.hash}`);
    statsDB.incr(wallet.address, 'wrapCurrent');
    return true;
  } catch (e) {
    console.log('Error while wrapping ETH on wallet: ', wallet.address);
    return false;
  }
};

const unwrap = async (wallet: Wallet): Promise<boolean> => {
  const contract = new Contract(CONTRACTS.weth, ABI, wallet);

  const wethBalance = await retry(() => contract.balanceOf(wallet.address));

  try {
    const feeData = await wallet.provider!.getFeeData();

    const tx: TransactionResponse = await contract.withdraw(wethBalance, {
      maxFeePerGas: (feeData.maxFeePerGas! / 100n) * 120n,
      maxPriorityFeePerGas: (feeData.maxPriorityFeePerGas! / 100n) * 120n,
    });

    const receipt = await tx.wait();

    if (!receipt) {
      console.log('Error while unwrapping WETH on wallet: ', wallet.address);
      return false;
    }

    console.log('WETH unwrapped on wallet: ', wallet.address);
    console.log(`TX: https://taikoscan.io/tx/${receipt.hash}`);
    statsDB.incr(wallet.address, 'wrapCurrent');
    return true;
  } catch (e) {
    console.log('Error while unwrapping WETH on wallet: ', wallet.address);
    return false;
  }
};

export const makeWrapTx = async (wallet: Wallet): Promise<boolean> => {
  const contract = new Contract(CONTRACTS.weth, ABI, wallet);

  const wethBalance = await retry(() => contract.balanceOf(wallet.address));

  if (wethBalance === 0n) {
    return wrap(wallet);
  }

  return unwrap(wallet);
};

export const makeApproveTx = async (wallet: Wallet): Promise<boolean> => {
  const rndBool = Math.random() < 0.5;

  if (rndBool) {
    return rubyTx(wallet);
  } else {
    return approveTx(wallet);
  }
};

export const rubyTx = async (wallet: Wallet): Promise<boolean> => {
  const contract = new Contract(CONTRACTS.ruby, ABI, wallet);

  try {
    const feeData = await wallet.provider!.getFeeData();

    const tx: TransactionResponse = await contract.vote({
      maxFeePerGas: (feeData.maxFeePerGas! / 100n) * 120n,
      maxPriorityFeePerGas: (feeData.maxPriorityFeePerGas! / 100n) * 120n,
    });

    const receipt = await tx.wait();

    if (!receipt) {
      console.log('Error while voting on wallet: ', wallet.address);
      return false;
    }

    console.log('Voted on wallet: ', wallet.address);
    console.log(`TX: https://taikoscan.io/tx/${receipt.hash}`);
    statsDB.incr(wallet.address, 'approveCurrent');
    return true;
  } catch (e) {
    console.log('Error while voting on wallet: ', wallet.address);
    return false;
  }
};

export const approveTx = async (wallet: Wallet): Promise<boolean> => {
  const tokenAddress = rndArrElement(CONFIG_CONSTANTS.tokensToApprove);
  const spender = rndArrElement(CONFIG_CONSTANTS.contractsToApprove);
  if (!tokenAddress || tokenAddress === '' || !spender || spender === '') {
    console.log('Error getting random token or spender, check config');
    return false;
  }
  const contract = new Contract(tokenAddress, ABI, wallet);

  const amount = randomBetween(0, 1000, 0);

  try {
    const feeData = await wallet.provider!.getFeeData();

    const tx: TransactionResponse = await contract.approve(spender, amount, {
      maxFeePerGas: (feeData.maxFeePerGas! / 100n) * 120n,
      maxPriorityFeePerGas: (feeData.maxPriorityFeePerGas! / 100n) * 120n,
    });

    const receipt = await tx.wait();

    if (!receipt) {
      console.log('Error while approving on wallet: ', wallet.address);
      return false;
    }

    console.log('Approved on wallet: ', wallet.address);
    console.log(`TX: https://taikoscan.io/tx/${receipt.hash}`);
    statsDB.incr(wallet.address, 'approveCurrent');
    return true;
  } catch (e) {
    console.log('Error while approving on wallet: ', wallet.address);
    return false;
  }
};

export async function startScript() {
  const keys = readKeys();

  statsDB.load();

  return keys;
}

export const keysLeft = async (keys: string[]): Promise<boolean> => {
  if (keys.length === 0) {
    console.log('No wallets left.');
    statsDB.save();
    return false;
  }

  return true;
};
