import {
  Contract,
  formatEther,
  formatUnits,
  hexlify,
  parseEther,
  randomBytes,
  sha256,
  toUtf8Bytes,
  Wallet,
} from 'ethers';
import { ABI } from '../../constants';
import { execTx, randomBetween, retry, rndArrElement } from '../../utils';
import { MANTA_TOKENS, MANTA_WETH_ADDRESS, Tickers } from '../constants';
import { CONFIG_CONSTANTS, LIMITS } from '../../../deps/config';
import { Balances, getRoute } from '../utils';
import { gullSwap } from './gull';
import { mantaDB } from '../stats';

export const approve = async (
  wallet: Wallet,
  tokenAddress: string,
  spender: string,
  amount: bigint,
) => {
  const contract = new Contract(tokenAddress, ABI);

  const txData = await retry(() => contract.approve.populateTransaction(spender, amount));

  const receipt = await execTx(CONFIG_CONSTANTS.mantaRpcs, txData, wallet.privateKey);

  if (!receipt) {
    return null;
  }

  if (amount === 0n) {
    console.log('Revoked on wallet: ', wallet.address);
  }

  const fee = parseFloat(formatEther(receipt.fee));
  const totalFees = mantaDB.getAll(wallet.address).fees + fee;
  mantaDB.set(wallet.address, 'fees', totalFees);

  return receipt.hash;
};

export const wrapOrUnwrap = async (wallet: Wallet, amount: bigint, isWrap: boolean) => {
  const contract = new Contract(MANTA_WETH_ADDRESS, ABI);

  const txData = isWrap
    ? await retry(() =>
        contract.deposit.populateTransaction({
          value: amount,
        }),
      )
    : await retry(() => contract.withdraw.populateTransaction(amount));

  const receipt = await execTx(CONFIG_CONSTANTS.mantaRpcs, txData, wallet.privateKey);

  if (!receipt) {
    console.log('Error while wrapping or unwrapping on wallet: ', wallet.address);
    return null;
  }

  const fee = parseFloat(formatEther(receipt.fee));
  const totalFees = mantaDB.getAll(wallet.address).fees + fee;
  mantaDB.set(wallet.address, 'fees', totalFees);

  console.log(isWrap ? 'Wrapped' : 'Unwrapped', 'on wallet: ', wallet.address);

  return receipt.hash;
};

const DMAIL_ABI = [
  {
    inputs: [
      {
        internalType: 'string',
        name: 'to',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'path',
        type: 'string',
      },
    ],
    name: 'send_mail',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

export const dmailMsg = async (wallet: Wallet) => {
  const contract = new Contract('0xc0b920c31c1d9047d043b201e6b3956edb1a0374', DMAIL_ABI);
  const from = sha256(toUtf8Bytes(wallet.address.toLowerCase() + '@dmail.ai')).slice(2);
  const toAddr = Wallet.createRandom().address;
  const to = sha256(toUtf8Bytes(toAddr.toLowerCase() + '@dmail.ai')).slice(2);

  const txData = await retry(() => contract.send_mail.populateTransaction(from, to));

  const receipt = await execTx(CONFIG_CONSTANTS.mantaRpcs, txData, wallet.privateKey);

  if (!receipt) {
    console.log('Error while sending dmail on wallet: ', wallet.address);
    return null;
  }

  const fee = parseFloat(formatEther(receipt.fee));
  const totalFees = mantaDB.getAll(wallet.address).fees + fee;
  mantaDB.set(wallet.address, 'fees', totalFees);

  console.log('Sent dmail on wallet: ', wallet.address);

  return receipt.hash;
};

export async function makeUtilityTx(wallet: Wallet, balances: Balances) {
  type Action = 'revoke' | 'wrap' | 'unwrap' | 'dmail';

  const actions: Action[] = ['revoke', 'wrap', 'unwrap', 'dmail'];

  if (+balances.balancesInUsd['WETH'] <= 0.02) {
    actions.splice(actions.indexOf('unwrap'), 1);
  }

  if (Number(balances.balancesInEther['ETH']) <= LIMITS.nativeBalanceMin) {
    actions.splice(actions.indexOf('wrap'), 1);
  }

  const action = actions[Math.floor(Math.random() * actions.length)];

  console.log('Making utility tx:', action);

  let receiptHash: string | null = null;
  switch (action) {
    case 'revoke': {
      const spender = rndArrElement(CONFIG_CONSTANTS.revokeContracts);
      const token = rndArrElement(CONFIG_CONSTANTS.revokeTokens);
      receiptHash = await approve(wallet, token, spender, 0n);
      break;
    }
    case 'wrap': {
      const balance = balances.balancesInWei['ETH'];
      const rndPercent = randomBetween(LIMITS.swapPercentMin, LIMITS.swapPercentMax, 0);

      let amount = (balance * BigInt(rndPercent)) / 100n;

      const minAmount = parseEther(LIMITS.nativeBalanceMin.toString());

      if (balance - amount < minAmount) {
        amount = amount - minAmount;

        if (amount < 0n) {
          return null;
        }
      }

      receiptHash = await wrapOrUnwrap(wallet, amount, true);
      break;
    }
    case 'unwrap':
      receiptHash = await wrapOrUnwrap(wallet, balances.balancesInWei['WETH'], false);
      break;
    case 'dmail':
      receiptHash = await dmailMsg(wallet);
      break;
  }

  return receiptHash;
}

export async function makeSwapTx(wallet: Wallet, balances: Balances) {
  const notZeroBalancesUsd = Object.entries(balances.balancesInUsd).filter(
    ([_, value]) => parseFloat(value) > 0.05,
  );

  let notZeroBalances: [string, bigint][] = notZeroBalancesUsd.map(([key, _]) => {
    return [key, balances.balancesInWei[key]];
  });

  notZeroBalances = notZeroBalances.filter(([key]) => key !== 'WETH');

  if (notZeroBalances.length === 0) {
    console.log('No tokens with balance found to swap');
    return null;
  }

  const tokenWithBal = rndArrElement(notZeroBalances);

  if (tokenWithBal[0] === 'ETH') {
    const minAmount = parseEther(LIMITS.nativeBalanceMin.toString());
    const bal = tokenWithBal[1];

    if (bal < minAmount) {
      console.log('ETH balance is too low to swap from it');
      return null;
    }

    const rndPercent = randomBetween(LIMITS.swapPercentMin, LIMITS.swapPercentMax, 0);
    let amount = (bal * BigInt(rndPercent)) / 100n;

    if (bal - amount < minAmount) {
      amount = amount - minAmount;

      if (amount < 0n) {
        console.log('ETH balance is too low to swap from it');

        return null;
      }
    }

    const toTicker = getRoute('WETH');

    if (!toTicker) {
      console.log('No route found for ETH');
      return null;
    }

    const tokenTo = MANTA_TOKENS[toTicker];

    console.log(`Swapping ETH to ${tokenTo.ticker} on:`, 'gull');

    return await gullSwap(wallet, MANTA_TOKENS.WETH, tokenTo, amount);
  } else {
    const [ticker, balance] = tokenWithBal;
    const tokenIn = MANTA_TOKENS[ticker as Tickers];

    const toData = getRoute(ticker as Tickers);

    if (!toData) {
      console.log('No route found for', ticker);
      return null;
    }

    const tokenOut = MANTA_TOKENS[toData];

    console.log(`Swapping ${tokenIn.ticker} to ${tokenOut.ticker} on:`, 'gull');

    return await gullSwap(wallet, tokenIn, tokenOut, balance);
  }
}
