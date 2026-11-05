"""Instala/atualiza o schema e carrega as UBS iniciais no banco configurado em .env.

Este script não apaga a tabela nem recria o banco. O seed remove somente as
unidades demonstrativas conhecidas e versões anteriores das 15 UBS incluídas.
"""

import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()


def read_sql(filename: str) -> str:
    path = ROOT / "database" / filename
    if not path.exists():
        raise FileNotFoundError(f"Arquivo SQL não encontrado: {path}")
    return path.read_text(encoding="utf-8")


def execute_sql_file(conn, filename: str) -> None:
    sql = read_sql(filename)
    # O arquivo seed.sql permite uso manual no pgAdmin/psql com BEGIN/COMMIT.
    # Aqui removemos esses marcadores para deixar a transação sob controle do psycopg.
    if filename == "seed.sql":
        sql = sql.replace("BEGIN;", "", 1)
        sql = sql.rsplit("COMMIT;", 1)[0]
    # prepare=False utiliza o protocolo simples e permite executar arquivos SQL
    # que contêm múltiplos comandos (incluindo funções/trigger no schema.sql).
    with conn.cursor() as cur:
        cur.execute(sql, prepare=False)
    conn.commit()
    print(f"[OK] {filename} executado.")


def main() -> int:
    if not DATABASE_URL or "SUA_SENHA" in DATABASE_URL:
        print("ERRO: DATABASE_URL ainda está como exemplo.")
        print("Abra o arquivo .env e informe a conexão correta do PostgreSQL.")
        return 1

    try:
        print("Conectando ao PostgreSQL configurado no .env...")
        with psycopg.connect(DATABASE_URL, connect_timeout=8) as conn:
            execute_sql_file(conn, "schema.sql")
            execute_sql_file(conn, "seed.sql")
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT COUNT(*) AS total,
                           COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) AS com_coordenadas,
                           COUNT(*) FILTER (WHERE coordenadas_aproximadas = TRUE) AS aproximadas
                    FROM ubs
                """)
                total, coordinates, approximate = cur.fetchone()
        print()
        print("Banco configurado com sucesso!")
        print(f"Unidades cadastradas na tabela: {total}")
        print(f"Unidades com latitude e longitude: {coordinates}")
        print(f"Unidades com coordenadas aproximadas para revisar: {approximate}")
        print()
        print("Próximo passo: execute 2_INICIAR_GEoubs.bat e abra http://127.0.0.1:5000")
        return 0
    except FileNotFoundError as exc:
        print(f"ERRO: {exc}")
        return 1
    except Exception as exc:
        print("\nNÃO FOI POSSÍVEL CONFIGURAR O BANCO.")
        print(f"Detalhe: {exc}")
        print("\nConfira estes pontos:")
        print("  1. O PostgreSQL está iniciado.")
        print("  2. O banco informado em DATABASE_URL existe.")
        print("  3. Usuário, senha, host e porta no arquivo .env estão corretos.")
        print("  4. A conexão aponta para o MESMO banco usado pelo GeoUBS.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
