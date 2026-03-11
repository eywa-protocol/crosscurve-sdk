export interface IPricesApi {
  getPrice(token: string, chainId: number): Promise<string>;
}
