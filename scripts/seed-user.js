#!/usr/bin/env node
const { Redis } = require('@upstash/redis');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envFile = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envFile)) {
	for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
		const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
		if (m) process.env[m[1].trim()] = m[2].trim();
	}
}

const username = process.argv[2];
if (!username) {
	console.error('Usage: node scripts/seed-user.js <username>');
	process.exit(1);
}

const RESTAURANTS = [
	"McDonald's",
	"Church's Chicken",
	"Popeyes",
	"Wendy's",
	"HEB",
	"Chick-fil-A",
	"Sonic",
	"Dairy Queen",

];

async function main() {
	const redis = Redis.fromEnv();

	await redis.sadd('users', username);

	const ratings = {};
	for (const restaurant of RESTAURANTS) {
		ratings[restaurant] = String(Math.floor(Math.random() * 10) + 1);
	}
	await redis.hset(`ratings:${username}`, ratings);

	console.log(`Seeded ratings for "${username}":\n`);
	for (const [r, s] of Object.entries(ratings)) {
		console.log(`  ${r.padEnd(20)} ${s}/10`);
	}
	console.log('\nDone.');
}

main().catch((err) => { console.error(err); process.exit(1); });
