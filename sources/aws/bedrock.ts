/**
 * AWS Bedrock Client
 *
 * Provides access to Claude models via AWS Bedrock.
 */

import {
    BedrockClient,
    ListFoundationModelsCommand,
    GetFoundationModelCommand,
} from '@aws-sdk/client-bedrock';
import {
    BedrockRuntimeClient,
    InvokeModelCommand,
    InvokeModelWithResponseStreamCommand,
    ConverseCommand,
    ConverseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { AWS_CONFIG, isAWSConfigured } from './config';

let bedrockClient: BedrockClient | null = null;
let bedrockRuntimeClient: BedrockRuntimeClient | null = null;

// Claude model IDs available on Bedrock
export const CLAUDE_MODELS = {
    // Claude 4 models (latest)
    CLAUDE_OPUS_4_5: 'anthropic.claude-opus-4-5-20251101-v1:0',
    CLAUDE_SONNET_4: 'anthropic.claude-sonnet-4-20250514-v1:0',

    // Claude 3.5 models
    CLAUDE_3_5_SONNET: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    CLAUDE_3_5_HAIKU: 'anthropic.claude-3-5-haiku-20241022-v1:0',

    // Claude 3 models
    CLAUDE_3_OPUS: 'anthropic.claude-3-opus-20240229-v1:0',
    CLAUDE_3_SONNET: 'anthropic.claude-3-sonnet-20240229-v1:0',
    CLAUDE_3_HAIKU: 'anthropic.claude-3-haiku-20240307-v1:0',

    // Legacy models
    CLAUDE_2_1: 'anthropic.claude-v2:1',
    CLAUDE_2: 'anthropic.claude-v2',
    CLAUDE_INSTANT: 'anthropic.claude-instant-v1',
} as const;

export type ClaudeModelId = typeof CLAUDE_MODELS[keyof typeof CLAUDE_MODELS];

export function getBedrockClient(): BedrockClient {
    if (!isAWSConfigured()) {
        throw new Error('AWS credentials not configured.');
    }

    if (!bedrockClient) {
        bedrockClient = new BedrockClient({
            region: AWS_CONFIG.region,
            credentials: AWS_CONFIG.credentials,
        });
    }

    return bedrockClient;
}

export function getBedrockRuntimeClient(): BedrockRuntimeClient {
    if (!isAWSConfigured()) {
        throw new Error('AWS credentials not configured.');
    }

    if (!bedrockRuntimeClient) {
        bedrockRuntimeClient = new BedrockRuntimeClient({
            region: AWS_CONFIG.region,
            credentials: AWS_CONFIG.credentials,
        });
    }

    return bedrockRuntimeClient;
}

export interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export interface ClaudeRequestOptions {
    model?: ClaudeModelId;
    messages: Message[];
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
    stopSequences?: string[];
}

export interface ClaudeResponse {
    content: string;
    stopReason: string | null;
    usage: {
        inputTokens: number;
        outputTokens: number;
    };
}

/**
 * Invoke Claude model using the Converse API (recommended)
 */
export async function invokeClaudeConverse(options: ClaudeRequestOptions): Promise<ClaudeResponse> {
    const client = getBedrockRuntimeClient();

    const {
        model = CLAUDE_MODELS.CLAUDE_OPUS_4_5,
        messages,
        systemPrompt,
        maxTokens = 4096,
        temperature = 1,
        topP,
    } = options;

    const command = new ConverseCommand({
        modelId: model,
        messages: messages.map((msg) => ({
            role: msg.role,
            content: [{ text: msg.content }],
        })),
        system: systemPrompt ? [{ text: systemPrompt }] : undefined,
        inferenceConfig: {
            maxTokens,
            temperature,
            topP,
        },
    });

    const response = await client.send(command);

    const outputContent = response.output?.message?.content?.[0];
    const text = outputContent && 'text' in outputContent ? outputContent.text : '';

    return {
        content: text || '',
        stopReason: response.stopReason || null,
        usage: {
            inputTokens: response.usage?.inputTokens || 0,
            outputTokens: response.usage?.outputTokens || 0,
        },
    };
}

/**
 * Stream Claude response using the Converse Stream API
 */
export async function* streamClaudeConverse(
    options: ClaudeRequestOptions
): AsyncGenerator<string, ClaudeResponse, unknown> {
    const client = getBedrockRuntimeClient();

    const {
        model = CLAUDE_MODELS.CLAUDE_OPUS_4_5,
        messages,
        systemPrompt,
        maxTokens = 4096,
        temperature = 1,
        topP,
    } = options;

    const command = new ConverseStreamCommand({
        modelId: model,
        messages: messages.map((msg) => ({
            role: msg.role,
            content: [{ text: msg.content }],
        })),
        system: systemPrompt ? [{ text: systemPrompt }] : undefined,
        inferenceConfig: {
            maxTokens,
            temperature,
            topP,
        },
    });

    const response = await client.send(command);

    let fullContent = '';
    let stopReason: string | null = null;
    let inputTokens = 0;
    let outputTokens = 0;

    if (response.stream) {
        for await (const event of response.stream) {
            if (event.contentBlockDelta?.delta && 'text' in event.contentBlockDelta.delta) {
                const text = event.contentBlockDelta.delta.text || '';
                fullContent += text;
                yield text;
            }

            if (event.messageStop?.stopReason) {
                stopReason = event.messageStop.stopReason;
            }

            if (event.metadata?.usage) {
                inputTokens = event.metadata.usage.inputTokens || 0;
                outputTokens = event.metadata.usage.outputTokens || 0;
            }
        }
    }

    return {
        content: fullContent,
        stopReason,
        usage: {
            inputTokens,
            outputTokens,
        },
    };
}

/**
 * Invoke Claude using the native Anthropic API format
 */
export async function invokeClaudeNative(options: ClaudeRequestOptions): Promise<ClaudeResponse> {
    const client = getBedrockRuntimeClient();

    const {
        model = CLAUDE_MODELS.CLAUDE_OPUS_4_5,
        messages,
        systemPrompt,
        maxTokens = 4096,
        temperature = 1,
        topP,
        topK,
        stopSequences,
    } = options;

    const body = JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
        })),
        temperature,
        top_p: topP,
        top_k: topK,
        stop_sequences: stopSequences,
    });

    const command = new InvokeModelCommand({
        modelId: model,
        contentType: 'application/json',
        accept: 'application/json',
        body: new TextEncoder().encode(body),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    return {
        content: responseBody.content?.[0]?.text || '',
        stopReason: responseBody.stop_reason || null,
        usage: {
            inputTokens: responseBody.usage?.input_tokens || 0,
            outputTokens: responseBody.usage?.output_tokens || 0,
        },
    };
}

/**
 * List available foundation models
 */
export async function listFoundationModels() {
    const client = getBedrockClient();

    const command = new ListFoundationModelsCommand({
        byProvider: 'Anthropic',
    });

    const response = await client.send(command);
    return response.modelSummaries || [];
}

/**
 * Get details about a specific model
 */
export async function getModelDetails(modelId: string) {
    const client = getBedrockClient();

    const command = new GetFoundationModelCommand({
        modelIdentifier: modelId,
    });

    return client.send(command);
}

/**
 * Simple helper to chat with Claude
 */
export async function chat(
    prompt: string,
    options?: Partial<Omit<ClaudeRequestOptions, 'messages'>>
): Promise<string> {
    const response = await invokeClaudeConverse({
        ...options,
        messages: [{ role: 'user', content: prompt }],
    });

    return response.content;
}

/**
 * Simple helper to stream chat with Claude
 */
export async function* streamChat(
    prompt: string,
    options?: Partial<Omit<ClaudeRequestOptions, 'messages'>>
): AsyncGenerator<string, ClaudeResponse, unknown> {
    return yield* streamClaudeConverse({
        ...options,
        messages: [{ role: 'user', content: prompt }],
    });
}
