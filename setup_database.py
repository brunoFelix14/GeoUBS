import os
from pathlib import Path
import argparse
import psycopg
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / '.env')

DB_URL = os.getenv('DATABASE_URL')
DB_NAME = os.getenv('DB_NAME', 'geoubs')


def admin_dsn():
    if DB_URL:
        # Connect to postgres database using same credentials/host as DATABASE_URL.
        from urllib.parse import urlsplit, urlunsplit
        p = urlsplit(DB_URL)
        return urlunsplit((p.scheme, p.netloc, p.path.replace('/' + DB_NAME, '/postgres'), p.query, p.fragment))
    return os.getenv('POSTGRES_ADMIN_URL', 'postgresql://postgres:postgres@localhost:5432/postgres')


def ensure_database():
    dsn = admin_dsn()
    with psycopg.connect(dsn, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT 1 FROM pg_database WHERE datname = %s', (DB_NAME,))
            if cur.fetchone() is None:
                cur.execute(f'CREATE DATABASE "{DB_NAME}"')
                print(f'Banco "{DB_NAME}" criado.')
            else:
                print(f'Banco "{DB_NAME}" já existe.')


def run_sql(filename):
    if not DB_URL:
        raise RuntimeError('DATABASE_URL não configurada no .env')
    sql = (ROOT / 'database' / filename).read_text(encoding='utf-8')
    with psycopg.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
    print(f'Executado: database/{filename}')


def main():
    parser = argparse.ArgumentParser(description='Prepara o banco de dados do GeoUBS.')
    parser.add_argument('--sem-seed', action='store_true', help='Cria a estrutura sem inserir dados demonstrativos.')
    args = parser.parse_args()

    ensure_database()
    run_sql('schema.sql')
    if not args.sem_seed:
        run_sql('seed.sql')
    print('\nGeoUBS pronto para uso.')


if __name__ == '__main__':
    main()
