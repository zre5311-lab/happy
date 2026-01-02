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

// Bedrock Operations (Claude AI)
export {
    getBedrockClient,
    getBedrockRuntimeClient,
    CLAUDE_MODELS,
    invokeClaudeConverse,
    streamClaudeConverse,
    invokeClaudeNative,
    listFoundationModels,
    getModelDetails,
    chat,
    streamChat,
    type ClaudeModelId,
    type Message,
    type ClaudeRequestOptions,
    type ClaudeResponse,
} from './bedrock';

// Free Tier & Cost Optimization
export {
    FREE_TIER,
    MODELS_BY_COST,
    estimateCost,
    getCheapestModelFor,
    FREE_TIER_TIPS,
} from './free-tier';
