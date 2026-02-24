```typescript
const { UptimeKumaClient, MonitorType } = require('@ruslanpdf/uptime-kuma-api');

const url = process.env.UPTIME_KUMA_URL || 'http://localhost:3001';
const username = process.env.UPTIME_KUMA_USER || '';
const password = process.env.UPTIME_KUMA_PASSWORD || ''; 

async function main() {
  const client = new UptimeKumaClient({ url });

  try {
    console.log('Connecting to', url, '...');
    await client.connect();

    if (!username || !password) {
      console.error('Set UPTIME_KUMA_USER and UPTIME_KUMA_PASSWORD (and optionally UPTIME_KUMA_URL).');
      process.exit(1);
    }
    console.log('Logging in...');
    await client.login({ username, password });

    const monitors = await client.getMonitors();
    console.log('Monitors count:', monitors.length);
    if (monitors.length > 0) {
      console.log('First monitor:', monitors[0].name, '(id:', monitors[0].id + ')');
    }

    client.disconnect();
    console.log('Done.');
  } catch (err) {
    console.error('Error:', err.message);
    if (err.message.includes('connect') || err.code === 'ECONNREFUSED' || err.message.includes('poll error')) {
      console.log('Make sure Uptime Kuma is running at', url);
      console.log('Or set UPTIME_KUMA_URL, UPTIME_KUMA_USER, UPTIME_KUMA_PASSWORD');
    }
    process.exit(1);
  }
}

main();
```