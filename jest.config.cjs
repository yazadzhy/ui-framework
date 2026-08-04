module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/test/**/*.test.js'],
    setupFiles: ['<rootDir>/test/setup-dom.cjs'],
    transform: {
        '^.+\\.js$': ['@swc/jest', {
            jsc: {
                parser: {syntax: 'ecmascript', jsx: true},
                transform: {react: {runtime: 'classic'}}
            },
            module: {type: 'commonjs'}
        }]
    }
}
