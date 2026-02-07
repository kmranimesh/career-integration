import { RateRequest, RateResponse } from '../types';

export interface CarrierClient {
    readonly name: string;

    getRates(request: RateRequest): Promise<RateResponse>;
}
