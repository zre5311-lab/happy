#!/usr/bin/env npx tsx
/**
 * Test AWS Bedrock Claude Models
 *
 * Models are auto-enabled on first invoke (no manual setup needed).
 * For Anthropic models, first-time users may need to submit use case details.
 *
 * Run: npx tsx sources/trash/enable-bedrock-models.ts
 */

import {
    BedrockRuntimeClient,
    ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
function loadEnv() {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();
                if ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                process.env[key] = value;
            }
        }
    }
}

loadEnv();

const credentials = {
    accessKeyId: process.env.EXPO_PUBLIC_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
};

const region = process.env.EXPO_PUBLIC_AWS_REGION || 'us-east-1';

const MODELS_TO_TEST = [
    { id: 'anthropic.claude-opus-4-5-20251101-v1:0', name: 'Claude Opus 4.5' },
    { id: 'anthropic.claude-sonnet-4-20250514-v1:0', name: 'Claude Sonnet 4' },
    { id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', name: 'Claude 3.5 Sonnet' },
    { id: 'anthropic.claude-3-5-haiku-20241022-v1:0', name: 'Claude 3.5 Haiku' },
    { id: 'anthropic.claude-3-haiku-20240307-v1:0', name: 'Claude 3 Haiku' },
];

async function main() {
    console.log('🔧 AWS Bedrock - Claude Models Test\n');

    if (!credentials.accessKeyId || !credentials.secretAccessKey) {
        console.error('❌ AWS credentials not found in .env.local');
        process.exit(1);
    }

    console.log('Region:', region);
    console.log('Access Key:', credentials.accessKeyId.slice(0, 8) + '...\n');
    console.log('Models are auto-enabled on first invoke.\n');

    const client = new BedrockRuntimeClient({ region, credentials });

    console.log('🧪 Testing models...\n');

    for (const model of MODELS_TO_TEST) {
        try {
            const response = await client.send(
                new ConverseCommand({
                    modelId: model.id,
                    messages: [{ role: 'user', content: [{ text: 'Say "hello" only.' }] }],
                    inferenceConfig: { maxTokens: 10 },
                })
            );

            const outputText = response.output?.message?.content?.[0];
            const text = outputText && 'text' in outputText ? outputText.text : '';
            console.log(`  ✅ ${model.name}: "${text.trim()}"`);
        } catch (error: any) {
            if (error.message?.includes('use case details')) {
                console.log(`  📝 ${model.name}: Submit use case details at AWS console first`);
            } else if (error.name === 'AccessDeniedException') {
                console.log(`  🔒 ${model.name}: Need IAM bedrock:InvokeModel permission`);
            } else if (error.name === 'ValidationException') {
                console.log(`  ❌ ${model.name}: Not available in ${region}`);
            } else {
                console.log(`  ⚠️  ${model.name}: ${error.message}`);
            }
        }
    }

    console.log('\n✅ Done!\n');
}

main().catch(console.error);
