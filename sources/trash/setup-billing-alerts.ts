#!/usr/bin/env npx tsx
/**
 * AWS Billing Alerts Setup
 *
 * Sets up CloudWatch billing alarms to avoid unexpected charges.
 * Run: npx tsx sources/trash/setup-billing-alerts.ts
 */

import {
    CloudWatchClient,
    PutMetricAlarmCommand,
} from '@aws-sdk/client-cloudwatch';
import {
    SNSClient,
    CreateTopicCommand,
    SubscribeCommand,
} from '@aws-sdk/client-sns';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

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

// Billing alarms must be created in us-east-1
const region = 'us-east-1';

async function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function main() {
    console.log('💰 AWS Billing Alerts Setup\n');

    if (!credentials.accessKeyId || !credentials.secretAccessKey) {
        console.error('❌ AWS credentials not found in .env.local');
        process.exit(1);
    }

    // Get email for alerts
    const email = await prompt('Enter your email for billing alerts: ');
    if (!email || !email.includes('@')) {
        console.error('❌ Invalid email');
        process.exit(1);
    }

    const snsClient = new SNSClient({ region, credentials });
    const cwClient = new CloudWatchClient({ region, credentials });

    try {
        // Step 1: Create SNS topic for billing alerts
        console.log('\n📧 Creating SNS topic for billing alerts...');
        const topicResponse = await snsClient.send(
            new CreateTopicCommand({ Name: 'BillingAlerts' })
        );
        const topicArn = topicResponse.TopicArn;
        console.log('  ✅ Topic created:', topicArn);

        // Step 2: Subscribe email to topic
        console.log('\n📨 Subscribing email to alerts...');
        await snsClient.send(
            new SubscribeCommand({
                TopicArn: topicArn,
                Protocol: 'email',
                Endpoint: email,
            })
        );
        console.log('  ✅ Subscription created (check email to confirm!)');

        // Step 3: Create billing alarms
        console.log('\n⏰ Creating billing alarms...');

        const alarms = [
            { name: 'BillingAlarm-1USD', threshold: 1, description: 'Alert when charges exceed $1' },
            { name: 'BillingAlarm-5USD', threshold: 5, description: 'Alert when charges exceed $5' },
            { name: 'BillingAlarm-10USD', threshold: 10, description: 'Alert when charges exceed $10' },
            { name: 'BillingAlarm-20USD', threshold: 20, description: 'Alert when charges exceed $20' },
        ];

        for (const alarm of alarms) {
            await cwClient.send(
                new PutMetricAlarmCommand({
                    AlarmName: alarm.name,
                    AlarmDescription: alarm.description,
                    MetricName: 'EstimatedCharges',
                    Namespace: 'AWS/Billing',
                    Statistic: 'Maximum',
                    Period: 21600, // 6 hours
                    EvaluationPeriods: 1,
                    Threshold: alarm.threshold,
                    ComparisonOperator: 'GreaterThanThreshold',
                    Dimensions: [{ Name: 'Currency', Value: 'USD' }],
                    ActionsEnabled: true,
                    AlarmActions: [topicArn!],
                })
            );
            console.log(`  ✅ ${alarm.name}: Alert at $${alarm.threshold}`);
        }

        console.log('\n' + '═'.repeat(50));
        console.log('✅ BILLING ALERTS CONFIGURED!');
        console.log('═'.repeat(50));
        console.log(`
IMPORTANT: Check your email (${email}) and confirm the subscription!

You'll receive alerts when your AWS charges exceed:
  • $1   - Early warning
  • $5   - Monitor usage
  • $10  - Review immediately
  • $20  - Action required

View billing: https://console.aws.amazon.com/billing/home
View alarms: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#alarmsV2:
        `);
    } catch (error: any) {
        console.error('\n❌ Error:', error.message);

        if (error.name === 'AccessDeniedException') {
            console.log(`
Your IAM user needs these permissions:
- sns:CreateTopic
- sns:Subscribe
- cloudwatch:PutMetricAlarm

Or attach the managed policies:
- AmazonSNSFullAccess
- CloudWatchFullAccess
            `);
        }
    }
}

main();
