// Mission Control Configuration
export const CONFIG = {
  // Paths to OpenClaw data
  workspacePath: '/Users/carayim/.openclaw/workspace',
  memoryPath: '/Users/carayim/.openclaw/workspace/memory',
  activityLogPath: '/Users/carayim/.openclaw/workspace/logs/activity.jsonl',
  
  // OpenClaw Gateway (for cron data)
  gatewayUrl: process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:4141',
  gatewayToken: process.env.OPENCLAW_GATEWAY_TOKEN || '',
};
