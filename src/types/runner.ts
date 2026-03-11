export interface RunnerStatus {
  requestId: string;
  chainId: number;
  sourceChainId: number;
  initiator: string;
  runnerAddress: string;
  token: string;
  amountExpected: string;
  deadline: number;
  salt: string;
  txHash?: string;
  fundsTxHash?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
