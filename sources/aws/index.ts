/**
 * AWS Module
 *
 * Centralized AWS services for the Happy app.
 */

// Configuration
export {
    AWS_CONFIG,
    CLOUDFRONT_CONFIG,
    AWS_ACCOUNT_ID,
    isAWSConfigured,
    isCloudFrontConfigured,
} from './config';

// S3 Operations
export {
    getS3Client,
    uploadToS3,
    downloadFromS3,
    deleteFromS3,
    listS3Objects,
    getObjectMetadata,
    getPresignedUrl,
    type UploadOptions,
    type DownloadOptions,
    type ListOptions,
    type PresignedUrlOptions,
} from './s3';

// CloudFront Operations
export {
    getCloudFrontClient,
    createInvalidation,
    generateSignedUrl,
    type InvalidationOptions,
    type SignedUrlOptions,
    type CloudFrontDistribution,
} from './cloudfront';
