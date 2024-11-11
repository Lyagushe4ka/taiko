import { Contract, JsonRpcProvider, solidityPacked, Wallet, ZeroAddress } from 'ethers';
import { ADDRESSES } from './constants';
import { AngleABI } from './abi';
import { CONFIG_CONSTANTS } from '../../deps/config';
import { ABI } from '../constants';
import { execTx, makeApproveTx, retry } from '../utils';

export const bridgeGnosis = async (
  wallet: Wallet,
  providers: JsonRpcProvider[],
  balance: bigint,
) => {
  const routers = providers.map(
    (provider) => new Contract(ADDRESSES.GNOSIS.router, AngleABI, provider),
  );

  const approve = await makeApproveTx(
    wallet,
    ADDRESSES.GNOSIS.token,
    ADDRESSES.GNOSIS.router,
    balance,
    CONFIG_CONSTANTS.gnosisRpcs,
  );

  if (!approve) {
    console.log('Error while approving token');
    return null;
  }

  console.log('EURA approved');

  const adapterParams = solidityPacked(['uint16', 'uint256'], [1, 200_000]);

  const [fee] = await retry(() =>
    Promise.any(
      routers.map((router) =>
        router.estimateSendFee(125, wallet.address, balance, false, adapterParams),
      ),
    ),
  );

  const txData = await retry(() =>
    Promise.any(
      routers.map((router) =>
        router.send.populateTransaction(
          125,
          wallet.address,
          balance,
          wallet.address,
          ZeroAddress,
          adapterParams,
          { value: fee },
        ),
      ),
    ),
  );

  const receipt = await execTx(CONFIG_CONSTANTS.gnosisRpcs, txData, wallet.privateKey);

  if (!receipt || receipt.status === 0) {
    console.log('Error while sending token');
    return null;
  }

  return receipt.hash;
};
