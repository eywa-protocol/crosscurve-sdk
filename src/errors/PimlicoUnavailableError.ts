import { BaseError } from './BaseError.js';

export class PimlicoUnavailableError extends BaseError {
  constructor() {
    super('Pimlico proxy is not available on this server');
    this.name = 'PimlicoUnavailableError';
  }
}
