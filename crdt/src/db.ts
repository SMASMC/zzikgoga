//pSQL 커넥션 풀
//LF 변환

import { Pool, types } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config(); // .env 파일 로npx ts-node dbUtils.ts

const TIMESTAMPTZ_OID = 1184;
const TIMESTAMP_OID = 1114;
types.setTypeParser(TIMESTAMPTZ_OID, (val) => val);
types.setTypeParser(TIMESTAMP_OID, (val) => val);

// Spring의 DataSource/ConnectionPool과 동일한 역할
export const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

pool.on('connect', () => {
  console.log('PostgreSQL Connection Pool connected.');
});