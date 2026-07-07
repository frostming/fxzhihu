import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: { configPath: './wrangler.toml' },
		}),
	],
	test: {
		exclude: [...configDefaults.exclude, '.agents/**'],
	},
});
