import commonjs from "@rollup/plugin-commonjs";
import {nodeResolve} from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import vue from "rollup-plugin-vue2"
import {uglify} from 'rollup-plugin-uglify';

const isProd = (process.env.BUILD === 'production');

export default {
	input: 'src/main.ts',
	output: {
		file: 'main.js',
		format: 'cjs',
		sourcemap: 'inline',
		exports: 'default'

	},

	external: ['obsidian'],
	plugins: [
		vue(),
		typescript(),
		nodeResolve({browser: true}),
		commonjs(),
		(process.env.NODE_ENV === 'production' && uglify())

	]
}