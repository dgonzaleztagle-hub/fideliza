/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const { spawn } = require('child_process');

// Read and parse .env.local
const content = fs.readFileSync('.env.local', 'utf8');
const envs = {};
content.split(/\r?\n/).forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const parts = line.split('=');
    const key = parts.shift();
    let value = parts.join('=');
    if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
        value = value.replace(/\\n/g, '\n');
    }
    envs[key] = value;
});

// Override for production
envs['NEXT_PUBLIC_APP_URL'] = 'https://fidelizacion.vercel.app';
// Ensure Supabase URL is correct (already in file, but good to ensure)

// Skip already added
delete envs['NEXT_PUBLIC_SUPABASE_URL'];

async function addEnv(key, value) {
    return new Promise((resolve, reject) => {
        console.log(`Adding ${key}...`);

        // Remove existing first to avoid duplicates/errors
        const rm = spawn('npx', ['vercel', 'env', 'rm', key, 'production', '-y'], { shell: true, stdio: 'inherit' });

        rm.on('close', () => {
            // Add new
            const add = spawn('npx', ['vercel', 'env', 'add', key, 'production'], { shell: true, stdio: ['pipe', 'inherit', 'inherit'] });

            add.stdin.write(value);
            add.stdin.end();

            add.on('close', (code) => {
                if (code === 0) {
                    console.log(`✅ ${key} added.`);
                    resolve();
                } else {
                    console.error(`❌ Failed to add ${key}`);
                    reject(new Error(`Exit code ${code}`));
                }
            });
        });
    });
}

(async () => {
    for (const [key, value] of Object.entries(envs)) {
        try {
            await addEnv(key, value);
        } catch (e) {
            console.error(e);
        }
    }
})();
