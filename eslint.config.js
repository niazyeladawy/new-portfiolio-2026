import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import unUsedImports from 'eslint-plugin-unused-imports';
import reactPlugin from 'eslint-plugin-react';

export default tseslint.config(
	{ ignores: ['.next', 'out', 'next-env.d.ts'] },
	{
		extends: [js.configs.recommended, ...tseslint.configs.recommended],
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser,
		},
		plugins: {
			'react-hooks': reactHooks,
			import: importPlugin,
			'unused-imports': unUsedImports,
			react: reactPlugin,
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			'import/order': [
				'warn',
				{
					groups: ['builtin', 'external', 'internal'],
					'newlines-between': 'always',
				},
			],
			'import/no-duplicates': 'error',

			'@typescript-eslint/no-unused-vars': 'off',

			'@typescript-eslint/no-explicit-any': 'warn',
			'no-unused-vars': 'off',
			'unused-imports/no-unused-imports': 'warn',
			'unused-imports/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrors: 'all',
					destructuredArrayIgnorePattern: '^_',
				},
			],
			'react/jsx-no-useless-fragment': ['warn', { allowExpressions: true }],
		},
	},
);
