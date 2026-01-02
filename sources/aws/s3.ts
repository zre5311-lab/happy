/**
 * AWS S3 Client
 *
 * Provides S3 operations like uploading, downloading, and generating presigned URLs.
 */

import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    ListObjectsV2Command,
    HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AWS_CONFIG, isAWSConfigured } from './config';

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
    if (!isAWSConfigured()) {
        throw new Error('AWS credentials not configured. Please set EXPO_PUBLIC_AWS_ACCESS_KEY_ID and EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY environment variables.');
    }

    if (!s3Client) {
        s3Client = new S3Client({
            region: AWS_CONFIG.region,
            credentials: AWS_CONFIG.credentials,
        });
    }

    return s3Client;
}

export interface UploadOptions {
    bucket: string;
    key: string;
    body: Blob | Buffer | ReadableStream | string;
    contentType?: string;
    metadata?: Record<string, string>;
}

export async function uploadToS3(options: UploadOptions): Promise<string> {
    const client = getS3Client();

    const command = new PutObjectCommand({
        Bucket: options.bucket,
        Key: options.key,
        Body: options.body,
        ContentType: options.contentType,
        Metadata: options.metadata,
    });

    await client.send(command);

    return `s3://${options.bucket}/${options.key}`;
}

export interface DownloadOptions {
    bucket: string;
    key: string;
}

export async function downloadFromS3(options: DownloadOptions): Promise<ReadableStream | null> {
    const client = getS3Client();

    const command = new GetObjectCommand({
        Bucket: options.bucket,
        Key: options.key,
    });

    const response = await client.send(command);
    return response.Body?.transformToWebStream() || null;
}

export async function deleteFromS3(options: DownloadOptions): Promise<void> {
    const client = getS3Client();

    const command = new DeleteObjectCommand({
        Bucket: options.bucket,
        Key: options.key,
    });

    await client.send(command);
}

export interface ListOptions {
    bucket: string;
    prefix?: string;
    maxKeys?: number;
}

export async function listS3Objects(options: ListOptions) {
    const client = getS3Client();

    const command = new ListObjectsV2Command({
        Bucket: options.bucket,
        Prefix: options.prefix,
        MaxKeys: options.maxKeys || 1000,
    });

    const response = await client.send(command);
    return response.Contents || [];
}

export async function getObjectMetadata(options: DownloadOptions) {
    const client = getS3Client();

    const command = new HeadObjectCommand({
        Bucket: options.bucket,
        Key: options.key,
    });

    return client.send(command);
}

export interface PresignedUrlOptions {
    bucket: string;
    key: string;
    expiresIn?: number; // seconds, default 3600 (1 hour)
    operation: 'get' | 'put';
    contentType?: string; // required for 'put' operation
}

export async function getPresignedUrl(options: PresignedUrlOptions): Promise<string> {
    const client = getS3Client();

    const command = options.operation === 'put'
        ? new PutObjectCommand({
            Bucket: options.bucket,
            Key: options.key,
            ContentType: options.contentType,
        })
        : new GetObjectCommand({
            Bucket: options.bucket,
            Key: options.key,
        });

    return getSignedUrl(client, command, {
        expiresIn: options.expiresIn || 3600,
    });
}
