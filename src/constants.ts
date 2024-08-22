export const CONTRACTS = {
  ruby: '0x4D1E2145082d0AB0fDa4a973dC4887C7295e21aB',
  weth: '0xA51894664A773981C6C112C43ce576f315d5b1B6',
  registrator: '0xD68BF51E2d73A7c7D023f1fd58e2F66F602A8088',
};

export const ABI = [
  'function vote()',
  'function approve(address _spender, uint256 _value)',
  'function deposit() payable',
  'function withdraw(uint256 _amount)',
  'function balanceOf(address _owner) view returns (uint256)',
  'function register()',
  'function alreadyRegistered(address wallet) view returns (bool)',
];
