import axios from 'axios';
import { UPSClient } from './client';
import { UPSAuthClient } from './auth';
import { RateRequest, CarrierErrorCode } from '../../types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('../../config', () => ({
    config: {
        ups: {
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
            baseUrl: 'https://onlinetools.ups.com',
        },
    },
}));

const mockAuthClient = {
    getAccessToken: jest.fn().mockResolvedValue('mock-token'),
    clearCache: jest.fn(),
} as unknown as UPSAuthClient;

const validRateRequest: RateRequest = {
    origin: {
        street1: '123 Sender St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
        isResidential: false,
    },
    destination: {
        street1: '456 Receiver Ave',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90001',
        country: 'US',
        isResidential: true,
    },
    packages: [
        {
            weight: { value: 5, unit: 'LB' },
            dimensions: { length: 10, width: 8, height: 6, unit: 'IN' },
            isSignatureRequired: false,
        },
    ],
};

const upsSuccessResponse = {
    RateResponse: {
        Response: {
            ResponseStatus: { Code: '1', Description: 'Success' },
        },
        RatedShipment: [
            {
                Service: { Code: '03', Description: 'UPS Ground' },
                TotalCharges: { CurrencyCode: 'USD', MonetaryValue: '15.50' },
                GuaranteedDelivery: { BusinessDaysInTransit: '5' },
            },
            {
                Service: { Code: '02', Description: 'UPS 2nd Day Air' },
                TotalCharges: { CurrencyCode: 'USD', MonetaryValue: '28.75' },
                GuaranteedDelivery: { BusinessDaysInTransit: '2' },
            },
        ],
    },
};

describe('UPSClient', () => {
    let client: UPSClient;

    beforeEach(() => {
        client = new UPSClient(mockAuthClient);
        jest.clearAllMocks();
    });

    describe('getRates', () => {
        it('should fetch and parse rates successfully', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: upsSuccessResponse });

            const response = await client.getRates(validRateRequest);

            expect(response.success).toBe(true);
            expect(response.quotes).toHaveLength(2);
            expect(response.quotes[0]).toMatchObject({
                carrier: 'UPS',
                service: 'UPS Ground',
                totalPrice: 15.50,
                currency: 'USD',
                transitDays: 5,
            });
            expect(response.quotes[1]).toMatchObject({
                carrier: 'UPS',
                service: 'UPS 2nd Day Air',
                totalPrice: 28.75,
                transitDays: 2,
            });
        });

        it('should build correct UPS request payload', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: upsSuccessResponse });

            await client.getRates(validRateRequest);

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://onlinetools.ups.com/api/rating/v1/Rate',
                expect.objectContaining({
                    RateRequest: expect.objectContaining({
                        Request: { RequestOption: 'Shop' },
                        Shipment: expect.objectContaining({
                            Shipper: expect.objectContaining({
                                Address: expect.objectContaining({
                                    City: 'New York',
                                    StateProvinceCode: 'NY',
                                    PostalCode: '10001',
                                }),
                            }),
                            Package: expect.arrayContaining([
                                expect.objectContaining({
                                    PackageWeight: {
                                        UnitOfMeasurement: { Code: 'LBS' },
                                        Weight: '5',
                                    },
                                }),
                            ]),
                        }),
                    }),
                }),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: 'Bearer mock-token',
                    }),
                })
            );
        });

        it('should handle single rated shipment response', async () => {
            const singleResponse = {
                RateResponse: {
                    Response: { ResponseStatus: { Code: '1', Description: 'Success' } },
                    RatedShipment: {
                        Service: { Code: '03' },
                        TotalCharges: { CurrencyCode: 'USD', MonetaryValue: '12.00' },
                    },
                },
            };
            mockedAxios.post.mockResolvedValueOnce({ data: singleResponse });

            const response = await client.getRates(validRateRequest);

            expect(response.quotes).toHaveLength(1);
            expect(response.quotes[0].totalPrice).toBe(12.00);
        });

        it('should validate input and reject invalid requests', async () => {
            const invalidRequest = {
                origin: { city: 'NYC' },
                destination: {},
                packages: [],
            } as unknown as RateRequest;

            await expect(client.getRates(invalidRequest as RateRequest)).rejects.toMatchObject({
                code: CarrierErrorCode.VALIDATION_ERROR,
            });

            expect(mockedAxios.post).not.toHaveBeenCalled();
        });

        it('should handle 401 authentication error', async () => {
            mockedAxios.post.mockRejectedValueOnce({
                isAxiosError: true,
                response: { status: 401, data: { error: 'unauthorized' } },
            });

            await expect(client.getRates(validRateRequest)).rejects.toMatchObject({
                code: CarrierErrorCode.AUTH_FAILED,
                statusCode: 401,
            });
        });

        it('should handle 429 rate limiting', async () => {
            mockedAxios.post.mockRejectedValueOnce({
                isAxiosError: true,
                response: { status: 429 },
            });

            await expect(client.getRates(validRateRequest)).rejects.toMatchObject({
                code: CarrierErrorCode.RATE_LIMIT_EXCEEDED,
                retryable: true,
            });
        });

        it('should handle 500 server error', async () => {
            mockedAxios.post.mockRejectedValueOnce({
                isAxiosError: true,
                response: { status: 500, data: { error: 'internal error' } },
            });

            await expect(client.getRates(validRateRequest)).rejects.toMatchObject({
                code: CarrierErrorCode.SERVICE_UNAVAILABLE,
                retryable: true,
            });
        });

        it('should handle timeout', async () => {
            mockedAxios.post.mockRejectedValueOnce({
                isAxiosError: true,
                code: 'ECONNABORTED',
            });

            await expect(client.getRates(validRateRequest)).rejects.toMatchObject({
                code: CarrierErrorCode.TIMEOUT,
                retryable: true,
            });
        });

        it('should handle network error', async () => {
            mockedAxios.post.mockRejectedValueOnce({
                isAxiosError: true,
                request: {},
            });

            await expect(client.getRates(validRateRequest)).rejects.toMatchObject({
                code: CarrierErrorCode.NETWORK_ERROR,
                retryable: true,
            });
        });
    });
});
