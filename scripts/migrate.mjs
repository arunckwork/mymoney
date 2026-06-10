import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnvFile(filename) {
  try {
    const content = readFileSync(join(root, filename), 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // optional env file
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const password = process.env.SUPABASE_DB_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;

if (!supabaseUrl && !databaseUrl) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL or DATABASE_URL in .env');
  process.exit(1);
}

let connectionString = databaseUrl;
if (!connectionString) {
  if (!password) {
    console.error(
      'Set SUPABASE_DB_PASSWORD or DATABASE_URL in .env to run migrations'
    );
    process.exit(1);
  }
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  connectionString = `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`;
}

const migrationsDir = join(root, 'supabase', 'migrations');
const migrationOrder = [
  '20241209_create_user_accounts.sql',
  '20241209_create_user_expense_categories.sql',
  '20241209_create_user_expenses.sql',
  '20241209_alter_user_expense_categories.sql',
  '20251212153000_create_user_incomes.sql',
  '20251212180000_create_transfer_function.sql',
  '20251215120000_create_lendings.sql',
];
const files = migrationOrder.filter((file) =>
  readdirSync(migrationsDir).includes(file)
);

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

await client.query(`
  create schema if not exists supabase_migrations;
  create table if not exists supabase_migrations.schema_migrations (
    version text primary key,
    statements text[],
    name text
  );
`);

for (const file of files) {
  const version = file.replace(/\.sql$/, '');
  const { rows } = await client.query(
    'select 1 from supabase_migrations.schema_migrations where version = $1',
    [version]
  );

  if (rows.length > 0) {
    console.log(`skip ${file}`);
    continue;
  }

  const sql = readFileSync(join(migrationsDir, file), 'utf8');
  console.log(`apply ${file}`);

  await client.query('begin');
  try {
    await client.query(sql);
    await client.query(
      `insert into supabase_migrations.schema_migrations (version, statements, name)
       values ($1, $2, $3)`,
      [version, [sql], file]
    );
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    console.error(`failed on ${file}:`, error.message);
    process.exit(1);
  }
}

await client.end();
console.log('All migrations applied.');
