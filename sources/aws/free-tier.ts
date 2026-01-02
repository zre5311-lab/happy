/**
 * AWS Free Tier Limits & Cost Optimization
 *
 * This module helps track and stay within AWS Free Tier limits.
 * Updated: January 2025
 */

// =============================================================================
// FREE TIER LIMITS
// =============================================================================

export const FREE_TIER = {
    // Always Free (never expires)
    ALWAYS_FREE: {
        LAMBDA: {
            requests: 1_000_000,        // 1M requests/month
            computeGBSeconds: 400_000,  // 400,000 GB-seconds/month
        },
        DYNAMODB: {
            storageGB: 25,              // 25 GB storage
            readCapacityUnits: 25,      // 25 RCU
            writeCapacityUnits: 25,     // 25 WCU
        },
        SNS: {
            publishes: 1_000_000,       // 1M publishes
            httpDeliveries: 100_000,    // 100K HTTP deliveries
        },
        SQS: {
            requests: 1_000_000,        // 1M requests
        },
        CLOUDWATCH: {
            metrics: 10,                // 10 custom metrics
            alarms: 10,                 // 10 alarms
            logDataGB: 5,               // 5 GB log data ingestion
        },
        COGNITO: {
            monthlyActiveUsers: 50_000, // 50K MAUs (Cognito User Pools)
        },
    },

    // 12 Months Free (from account creation)
    TWELVE_MONTHS_FREE: {
        S3: {
            storageGB: 5,               // 5 GB standard storage
            getRequests: 20_000,        // 20K GET requests
            putRequests: 2_000,         // 2K PUT requests
        },
        CLOUDFRONT: {
            dataTransferOutGB: 1_000,   // 1 TB data transfer out
            httpRequests: 10_000_000,   // 10M HTTP/HTTPS requests
        },
        EC2: {
            hours: 750,                 // 750 hours t2.micro or t3.micro
        },
        RDS: {
            hours: 750,                 // 750 hours db.t2.micro
            storageGB: 20,              // 20 GB storage
        },
        API_GATEWAY: {
            apiCalls: 1_000_000,        // 1M API calls/month
        },
    },

    // Bedrock has NO free tier - use cheapest models
    BEDROCK: {
        hasFreeToer: false,
        cheapestModel: 'anthropic.claude-3-haiku-20240307-v1:0',
        // Pricing per 1K tokens (as of Jan 2025):
        pricing: {
            'claude-3-haiku': { input: 0.00025, output: 0.00125 },
            'claude-3-5-haiku': { input: 0.0008, output: 0.004 },
            'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
            'claude-sonnet-4': { input: 0.003, output: 0.015 },
            'claude-opus-4-5': { input: 0.015, output: 0.075 },
        },
    },
};

// =============================================================================
// COST-OPTIMIZED BEDROCK USAGE
// =============================================================================

import { CLAUDE_MODELS } from './bedrock';

/**
 * Model tiers by cost (cheapest first)
 */
export const MODELS_BY_COST = {
    // Tier 1: Cheapest - Use for simple tasks
    CHEAPEST: CLAUDE_MODELS.CLAUDE_3_HAIKU,

    // Tier 2: Budget - Good balance of cost/quality
    BUDGET: CLAUDE_MODELS.CLAUDE_3_5_HAIKU,

    // Tier 3: Standard - Default for most tasks
    STANDARD: CLAUDE_MODELS.CLAUDE_3_5_SONNET,

    // Tier 4: Premium - Complex reasoning tasks
    PREMIUM: CLAUDE_MODELS.CLAUDE_SONNET_4,

    // Tier 5: Best - Only for critical tasks
    BEST: CLAUDE_MODELS.CLAUDE_OPUS_4_5,
};

/**
 * Estimate cost for a Bedrock request
 */
export function estimateCost(
    model: string,
    inputTokens: number,
    outputTokens: number
): number {
    const pricing = FREE_TIER.BEDROCK.pricing;

    let rates = pricing['claude-3-haiku']; // default

    if (model.includes('opus-4')) {
        rates = pricing['claude-opus-4-5'];
    } else if (model.includes('sonnet-4')) {
        rates = pricing['claude-sonnet-4'];
    } else if (model.includes('3-5-sonnet')) {
        rates = pricing['claude-3-5-sonnet'];
    } else if (model.includes('3-5-haiku')) {
        rates = pricing['claude-3-5-haiku'];
    } else if (model.includes('3-haiku')) {
        rates = pricing['claude-3-haiku'];
    }

    const inputCost = (inputTokens / 1000) * rates.input;
    const outputCost = (outputTokens / 1000) * rates.output;

    return inputCost + outputCost;
}

/**
 * Get the cheapest model for a task type
 */
export function getCheapestModelFor(taskType: 'simple' | 'moderate' | 'complex' | 'critical'): string {
    switch (taskType) {
        case 'simple':
            // Simple classification, extraction, formatting
            return MODELS_BY_COST.CHEAPEST;
        case 'moderate':
            // Summarization, basic analysis
            return MODELS_BY_COST.BUDGET;
        case 'complex':
            // Code generation, detailed analysis
            return MODELS_BY_COST.STANDARD;
        case 'critical':
            // Complex reasoning, important decisions
            return MODELS_BY_COST.PREMIUM;
        default:
            return MODELS_BY_COST.CHEAPEST;
    }
}

// =============================================================================
// FREE TIER TIPS
// =============================================================================

export const FREE_TIER_TIPS = `
AWS Free Tier Optimization Tips:

1. S3 (5GB free for 12 months)
   - Use for static assets, user uploads
   - Enable intelligent tiering for cost savings
   - Set lifecycle rules to delete old objects

2. CloudFront (1TB transfer free for 12 months)
   - Put CloudFront in front of S3 for caching
   - Reduces S3 GET requests (saves money)
   - Faster delivery to users

3. Lambda (1M requests free ALWAYS)
   - Use for API endpoints instead of EC2
   - Perfect for serverless backends
   - No cost when not running

4. DynamoDB (25GB free ALWAYS)
   - Use for user data, sessions, metadata
   - On-demand mode auto-scales
   - 25 RCU/WCU free forever

5. Cognito (50K users free ALWAYS)
   - Use for authentication
   - Handles OAuth, MFA, password reset
   - Free up to 50,000 monthly active users

6. Bedrock (NO free tier)
   - Use Claude 3 Haiku for cost savings ($0.25/1M input tokens)
   - Cache responses when possible
   - Batch requests to reduce overhead
   - Use shorter prompts

COST COMPARISON (per 1M tokens):
┌─────────────────────┬──────────┬──────────┐
│ Model               │ Input    │ Output   │
├─────────────────────┼──────────┼──────────┤
│ Claude 3 Haiku      │ $0.25    │ $1.25    │ ← CHEAPEST
│ Claude 3.5 Haiku    │ $0.80    │ $4.00    │
│ Claude 3.5 Sonnet   │ $3.00    │ $15.00   │
│ Claude Sonnet 4     │ $3.00    │ $15.00   │
│ Claude Opus 4.5     │ $15.00   │ $75.00   │ ← MOST EXPENSIVE
└─────────────────────┴──────────┴──────────┘

For 1000 simple queries (~500 tokens each):
- Claude 3 Haiku:    ~$0.38
- Claude 3.5 Haiku:  ~$1.20
- Claude 3.5 Sonnet: ~$4.50
- Claude Opus 4.5:   ~$22.50
`;
