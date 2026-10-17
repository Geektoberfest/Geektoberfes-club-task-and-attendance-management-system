// Loaded before every test file (see the "test" script in package.json).
import { register } from 'node:module'

// Route modules read these at import time. No database connection is made by the tests.
process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:1/clubtask_test'
process.env.JWT_SECRET ??= 'test-secret'

register('./alias-hooks.mjs', import.meta.url)
