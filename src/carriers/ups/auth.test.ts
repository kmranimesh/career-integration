import axios from 'axios';
import { UPSAuthClient } from './auth';
import { CarrierErrorCode } from '../../types';

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

describe('UPSAuthClient', () => {
    let authClient: UPSAuthClient;

    beforeEach(() => {
        authClient = new UPSAuthClient();
        authClient.clearCache();
        jest.clearAllMocks();
    });

    describe('getAccessToken', () => {
        it('should fetch a new token when cache is empty', async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    access_token: 'test-token-123',
                    token_type: 'Bearer',
                    expires_in: 3600,
                },
            });

            const token = await authClient.getAccessToken();

            expect(token).toBe('test-token-123');
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://onlinetools.ups.com/security/v1/oauth/token',
                'grant_type=client_credentials',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Content-Type': 'application/x-www-form-urlencoded',
                    }),
                })
            );
        });

        it('should return cached token on subsequent calls', async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    access_token: 'cached-token',
                    token_type: 'Bearer',
                    expires_in: 3600,
                },
            });

            const token1 = await authClient.getAccessToken();
            const token2 = await authClient.getAccessToken();

            expect(token1).toBe('cached-token');
            expect(token2).toBe('cached-token');
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        });

        it('should handle 401 authentication failure', async () => {
            mockedAxios.post.mockRejectedValueOnce({
                isAxiosError: true,
                response: { status: 401, data: { error: 'invalid_client' } },
            });

            await expect(authClient.getAccessToken()).rejects.toMatchObject({
                code: CarrierErrorCode.AUTH_FAILED,
                carrier: 'UPS',
            });
        });

        it('should handle rate limiting (429)', async () => {
            mockedAxios.post.mockRejectedValueOnce({
                isAxiosError: true,
                response: { status: 429 },
            });

            await expect(authClient.getAccessToken()).rejects.toMatchObject({
                code: CarrierErrorCode.RATE_LIMIT_EXCEEDED,
                retryable: true,
            });
        });

        it('should handle timeout', async () => {
            mockedAxios.post.mockRejectedValueOnce({
                isAxiosError: true,
                code: 'ECONNABORTED',
            });

            await expect(authClient.getAccessToken()).rejects.toMatchObject({
                code: CarrierErrorCode.TIMEOUT,
                retryable: true,
            });
        });

        it('should handle network error', async () => {
            mockedAxios.post.mockRejectedValueOnce({
                isAxiosError: true,
                request: {},
            });

            await expect(authClient.getAccessToken()).rejects.toMatchObject({
                code: CarrierErrorCode.NETWORK_ERROR,
                retryable: true,
            });
        });
    });
});
