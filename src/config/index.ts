import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const ConfigSchema = z.object({
    ups: z.object({
        clientId: z.string().min(1, 'UPS_CLIENT_ID is required'),
        clientSecret: z.string().min(1, 'UPS_CLIENT_SECRET is required'),
        baseUrl: z.string().url().default('https://onlinetools.ups.com'),
    }),
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Config = z.infer<typeof ConfigSchema>;

function loadConfig(): Config {
    const result = ConfigSchema.safeParse({
        ups: {
            clientId: process.env.UPS_CLIENT_ID,
            clientSecret: process.env.UPS_CLIENT_SECRET,
            baseUrl: process.env.UPS_BASE_URL,
        },
        nodeEnv: process.env.NODE_ENV,
        logLevel: process.env.LOG_LEVEL,
    });

    if (!result.success) {
        const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        throw new Error(`Config validation failed:\n${errors.join('\n')}`);
    }

    return result.data;
}

export const config = loadConfig();
