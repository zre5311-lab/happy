/**
 * AWS CloudFront Client
 *
 * Provides CloudFront operations including signed URL generation for private content.
 */

import {
    CloudFrontClient,
    CreateInvalidationCommand,
} from '@aws-sdk/client-cloudfront';
import { AWS_CONFIG, CLOUDFRONT_CONFIG, isAWSConfigured, isCloudFrontConfigured } from './config';

let cloudFrontClient: CloudFrontClient | null = null;

export function getCloudFrontClient(): CloudFrontClient {
    if (!isAWSConfigured()) {
        throw new Error('AWS credentials not configured.');
    }

    if (!cloudFrontClient) {
        cloudFrontClient = new CloudFrontClient({
            region: AWS_CONFIG.region,
            credentials: AWS_CONFIG.credentials,
        });
    }

    return cloudFrontClient;
}

export interface InvalidationOptions {
    distributionId: string;
    paths: string[];
}

export async function createInvalidation(options: InvalidationOptions): Promise<string | undefined> {
    const client = getCloudFrontClient();

    const command = new CreateInvalidationCommand({
        DistributionId: options.distributionId,
        InvalidationBatch: {
            CallerReference: `invalidation-${Date.now()}`,
            Paths: {
                Quantity: options.paths.length,
                Items: options.paths,
            },
        },
    });

    const response = await client.send(command);
    return response.Invalidation?.Id;
}

export interface SignedUrlOptions {
    url: string;
    expiresAt: Date;
}

/**
 * Generate a signed CloudFront URL for private content
 *
 * Note: For React Native, we use a simplified approach.
 * For production, consider using a backend service to generate signed URLs.
 */
export function generateSignedUrl(options: SignedUrlOptions): string {
    if (!isCloudFrontConfigured()) {
        throw new Error('CloudFront signing credentials not configured. Please set EXPO_PUBLIC_CLOUDFRONT_KEY_PAIR_ID and CLOUDFRONT_PRIVATE_KEY environment variables.');
    }

    const { url, expiresAt } = options;
    const expires = Math.floor(expiresAt.getTime() / 1000);

    // For CloudFront signed URLs, we need to create a policy and sign it
    // This is a simplified canned policy approach
    const policy = JSON.stringify({
        Statement: [
            {
                Resource: url,
                Condition: {
                    DateLessThan: {
                        'AWS:EpochTime': expires,
                    },
                },
            },
        ],
    });

    // Note: In React Native, crypto operations for RSA signing are limited
    // For production, generate signed URLs on your backend server
    // This function provides the structure but actual signing should be done server-side

    console.warn(
        'CloudFront URL signing should be done server-side for security. ' +
        'This client-side implementation is for development purposes only.'
    );

    // Return the URL with expiration parameter for development
    // In production, replace this with a call to your backend API
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}Expires=${expires}&Key-Pair-Id=${CLOUDFRONT_CONFIG.keyPairId}`;
}

export interface CloudFrontDistribution {
    id: string;
    domainName: string;
    enabled: boolean;
}
