import dns from 'dns';
import util from 'util';

const lookup = util.promisify(dns.lookup);

async function main() {
  const hosts = [
    'aws-1-eu-central-2.pooler.supabase.com',
    'db.ajpsbldwhmqltvuconwk.supabase.co'
  ];

  for (const host of hosts) {
    console.log(`Looking up ${host}...`);
    try {
      const res = await lookup(host, { all: true });
      console.log('Result:', JSON.stringify(res, null, 2));
    } catch (err) {
      console.error('Lookup failed:', err);
    }
  }
}

main();
