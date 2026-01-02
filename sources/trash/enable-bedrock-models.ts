#!/usr/bin/env npx tsx
/**
 * Enable Claude models on AWS Bedrock
 *
 * Run locally with: npx tsx sources/trash/enable-bedrock-models.ts
 *
 * Requires .env.local with:
 *   EXPO_PUBLIC_AWS_ACCESS_KEY_ID=your_key
 *   EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY=your_secret
 */

import {
    BedrockClient,
    ListFoundationModelsCommand,
} from '@aws-sdk/client-bedrock';
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
                // Remove quotes if present
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

async function main() {
    console.log('🔧 AWS Bedrock - Claude Models Setup\n');

    if (!credentials.accessKeyId || !credentials.secretAccessKey) {
        console.error('❌ AWS credentials not found.');
        console.error('   Make sure .env.local exists with:');
        console.error('   EXPO_PUBLIC_AWS_ACCESS_KEY_ID=your_key');
        console.error('   EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY=your_secret');
        process.exit(1);
    }

    console.log('Region:', region);
    console.log('Access Key:', credentials.accessKeyId.slice(0, 8) + '...');
    console.log('');

    const bedrockClient = new BedrockClient({ region, credentials });
    const runtimeClient = new BedrockRuntimeClient({ region, credentials });

    // Step 1: List available models
    console.log('📋 Checking available Claude models...\n');

    try {
        const listResponse = await bedrockClient.send(
            new ListFoundationModelsCommand({ byProvider: 'Anthropic' })
        );

        const models = listResponse.modelSummaries || [];

        if (models.length === 0) {
            console.log('⚠️  No Claude models found. You need to enable model access.\n');
        } else {
            console.log(`Found ${models.length} Claude models:\n`);
            for (const model of models) {
                console.log(`  • ${model.modelId}`);
                console.log(`    └─ ${model.modelName} (${model.modelLifecycle?.status || 'N/A'})`);
            }
        }
    } catch (error: any) {
        console.error('❌ Error listing models:', error.message);

        if (error.name === 'AccessDeniedException') {
            console.log('\n⚠️  Your IAM user needs Bedrock permissions.');
            console.log('   Add AmazonBedrockFullAccess policy to your IAM user.');
        }
        return;
    }

    // Step 2: Test model invocation
    console.log('\n\n🧪 Testing model invocation...\n');

    const modelsToTest = [
        { id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', name: 'Claude 3.5 Sonnet' },
        { id: 'anthropic.claude-3-haiku-20240307-v1:0', name: 'Claude 3 Haiku' },
    ];

    for (const model of modelsToTest) {
        try {
            const response = await runtimeClient.send(
                new ConverseCommand({
                    modelId: model.id,
                    messages: [{ role: 'user', content: [{ text: 'Say "hello" and nothing else.' }] }],
                    inferenceConfig: { maxTokens: 10 },
                })
            );

            const outputText = response.output?.message?.content?.[0];
            const text = outputText && 'text' in outputText ? outputText.text : '';
            console.log(`  ✅ ${model.name}: Working! Response: "${text.trim()}"`);
        } catch (error: any) {
            if (error.name === 'AccessDeniedException') {
                console.log(`  🔒 ${model.name}: Not enabled - needs activation in console`);
            } else if (error.name === 'ValidationException') {
                console.log(`  ❌ ${model.name}: Model not available in ${region}`);
            } else {
                console.log(`  ⚠️  ${model.name}: ${error.message}`);
            }
        }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('📌 ENABLE MODELS IN AWS CONSOLE:');
    console.log('═'.repeat(60));
    console.log(`
1. Open: https://console.aws.amazon.com/bedrock/home?region=${region}#/modelaccess

2. Click "Manage model access" (orange button)

3. Check these models:
   ☐ Claude Opus 4.5
   ☐ Claude Sonnet 4
   ☐ Claude 3.5 Sonnet v2
   ☐ Claude 3.5 Haiku
   ☐ Claude 3 Opus
   ☐ Claude 3 Sonnet
   ☐ Claude 3 Haiku

4. Click "Save changes"

5. Accept Anthropic's EULA when prompted

Access is granted instantly after accepting.
`);
}

main().catch(console.error);
