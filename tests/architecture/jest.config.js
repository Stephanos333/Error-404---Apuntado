/** Configuración de Jest para las fitness functions arquitectónicas. */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	rootDir: __dirname,
	testMatch: ['<rootDir>/**/*.spec.ts'],
	testPathIgnorePatterns: ['/node_modules/', '/fixtures/'],
	testTimeout: 120000,
	transform: { '^.+\\.ts$': ['ts-jest', {}] },
};
