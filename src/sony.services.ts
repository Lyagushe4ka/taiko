import { Contract, formatUnits, parseUnits, TransactionResponse, Wallet } from 'ethers';
import { readKeys, soneiumDB } from './data';
import { ABI, CONTRACTS } from './constants';
import { randomBetween, retry, rndArrElement } from './utils';
import { CONFIG_CONSTANTS, LIMITS } from '../deps/config';
import axios from 'axios';
const wrap = async (wallet: Wallet): Promise<boolean> => {
  const contract = new Contract('0x4200000000000000000000000000000000000006', ABI, wallet);

  const balance = await retry(() => wallet.provider!.getBalance(wallet.address));

  const percent = randomBetween(LIMITS.wrapPercentMin, LIMITS.wrapPercentMax, 0);

  const amount = (balance / 100n) * BigInt(percent);

  try {
    const feeData = await wallet.provider!.getFeeData();

    const tx: TransactionResponse = await contract.deposit({
      value: amount,
      gasPrice: feeData.gasPrice,
    });

    const receipt = await tx.wait();

    if (!receipt) {
      console.log('Error while wrapping ETH on wallet: ', wallet.address);
      return false;
    }

    console.log('ETH wrapped on wallet: ', wallet.address);
    console.log(`TX: https://soneium.blockscout.com/tx/${receipt.hash}`);
    soneiumDB.incr(wallet.address, 'wrapCurrent');
    return true;
  } catch (e) {
    console.log('Error while wrapping ETH on wallet: ', wallet.address);
    return false;
  }
};

const unwrap = async (wallet: Wallet): Promise<boolean> => {
  const contract = new Contract('0x4200000000000000000000000000000000000006', ABI, wallet);

  const wethBalance = await retry(() => contract.balanceOf(wallet.address));

  try {
    const feeData = await wallet.provider!.getFeeData();

    const tx: TransactionResponse = await contract.withdraw(wethBalance, {
      gasPrice: feeData.gasPrice,
    });

    const receipt = await tx.wait();

    if (!receipt) {
      console.log('Error while unwrapping WETH on wallet: ', wallet.address);
      return false;
    }

    console.log('WETH unwrapped on wallet: ', wallet.address);
    console.log(`TX: https://soneium.blockscout.com/tx/${receipt.hash}`);
    soneiumDB.incr(wallet.address, 'wrapCurrent');
    return true;
  } catch (e) {
    console.log('Error while unwrapping WETH on wallet: ', wallet.address);
    return false;
  }
};

export const makeWrapTxSony = async (wallet: Wallet): Promise<boolean> => {
  const contract = new Contract('0x4200000000000000000000000000000000000006', ABI, wallet);

  const wethBalance = await retry(() => contract.balanceOf(wallet.address));

  if (wethBalance === 0n) {
    const wrapping = await wrap(wallet);

    if (!wrapping) {
      return false;
    }
  }

  return unwrap(wallet);
};

export const approveTxSony = async (wallet: Wallet): Promise<boolean> => {
  const tokenAddress = rndArrElement(CONFIG_CONSTANTS.soneium.tokensToApprove);
  const spender = rndArrElement(CONFIG_CONSTANTS.soneium.contractsToApprove);
  if (!tokenAddress || tokenAddress === '' || !spender || spender === '') {
    console.log('Error getting random token or spender, check config');
    return false;
  }
  const contract = new Contract(tokenAddress, ABI, wallet);

  const amount = randomBetween(0, 1000, 0);

  try {
    const feeData = await wallet.provider!.getFeeData();

    const tx: TransactionResponse = await contract.approve(spender, amount, {
      gasPrice: feeData.gasPrice,
    });

    const receipt = await tx.wait();

    if (!receipt) {
      console.log('Error while approving on wallet: ', wallet.address);
      return false;
    }

    console.log('Approved on wallet: ', wallet.address);
    console.log(`TX: https://soneium.blockscout.com/tx/${receipt.hash}`);
    soneiumDB.incr(wallet.address, 'approveCurrent');
    return true;
  } catch (e: any) {
    console.log('Error while approving on wallet: ', wallet.address, 'error: ', e.message);
    return false;
  }
};
