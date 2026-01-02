/**
 * AWS Configuration
 *
 * This module provides AWS credentials and configuration for the app.
 * Credentials are loaded from environment variables for security.
 */

export const AWS_CONFIG = {
    region: 'us-east-1',
    credentials: {
        accessKeyId: process.env.EXPO_PUBLIC_AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
    },
};

export const CLOUDFRONT_CONFIG = {
    keyPairId: process.env.EXPO_PUBLIC_CLOUDFRONT_KEY_PAIR_ID || '',
    privateKey: process.env.CLOUDFRONT_PRIVATE_KEY || '',
};

export const AWS_ACCOUNT_ID = '209042753353';

export function isAWSConfigured(): boolean {
    return !!(
        AWS_CONFIG.credentials.accessKeyId &&
        AWS_CONFIG.credentials.secretAccessKey
    );
}

export function isCloudFrontConfigured(): boolean {
    return !!(
        CLOUDFRONT_CONFIG.keyPairId &&
        CLOUDFRONT_CONFIG.privateKey
    );
}
