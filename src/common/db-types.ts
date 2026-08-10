// Nullable Date columns reflect as `Object`, so TypeORM can't infer their type
// and needs it stated explicitly. Postgres uses `timestamp`; sqlite/sql.js (tests)
// use `datetime`. DB_TYPE is read at import time (set before the app loads).
export const TIMESTAMP_TYPE: 'timestamp' | 'datetime' =
  process.env.DB_TYPE === 'sqljs' ? 'datetime' : 'timestamp';
