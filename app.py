"""GeoUBS — aplicação Flask para visualizar e administrar UBS de Três Lagoas/MS."""

import json
import math
import os
from pathlib import Path

import psycopg
import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request
from psycopg.rows import dict_row

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

app = Flask(__name__)
app.config["JSON_AS_ASCII"] = False
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "troque-esta-chave-no-arquivo-env")
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()


def get_connection():
    """Abre uma conexão PostgreSQL. A URL vem do arquivo .env."""
    if not DATABASE_URL or "SUA_SENHA" in DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL não foi configurada. Copie .env.example para .env e informe a senha do PostgreSQL."
        )
    return psycopg.connect(DATABASE_URL, row_factory=dict_row, connect_timeout=5)


def parse_json_list(value):
    """Normaliza colunas JSONB para listas Python."""
    if isinstance(value, list):
        return value
    if value is None or value == "":
        return []
    if isinstance(value, str):
        try:
            data = json.loads(value)
            if isinstance(data, list):
                return data
            return [] if data is None else [str(data)]
        except (ValueError, TypeError):
            return [item.strip() for item in value.split(",") if item.strip()]
    return []


def normalizar_ubs(row):
    if row is None:
        return None
    row = dict(row)
    for field in ("servicos", "equipe", "especialidades"):
        row[field] = parse_json_list(row.get(field))
    row["aberta"] = bool(row.get("aberta", True))
    return row


def parse_coordinate(value, field, minimum, maximum):
    if value is None or value == "":
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field} precisa ser um número.")
    if not math.isfinite(number) or not minimum <= number <= maximum:
        raise ValueError(f"{field} está fora do intervalo permitido.")
    return number


def payload_ubs(data):
    """Valida e normaliza os dados enviados pelo painel administrativo."""
    if not isinstance(data, dict):
        raise ValueError("Envie os dados da UBS em formato JSON.")

    nome = str(data.get("nome") or "").strip()
    endereco = str(data.get("endereco") or "").strip()
    if not nome or not endereco:
        raise ValueError("Os campos Nome e Endereço são obrigatórios.")

    latitude = parse_coordinate(data.get("latitude"), "Latitude", -90, 90)
    longitude = parse_coordinate(data.get("longitude"), "Longitude", -180, 180)

    aberta_raw = data.get("aberta", True)
    if isinstance(aberta_raw, str):
        aberta = aberta_raw.strip().lower() not in {"false", "0", "nao", "não", "off", ""}
    else:
        aberta = bool(aberta_raw)

    def text_value(key, default=None):
        value = data.get(key, default)
        if value is None:
            return None
        value = str(value).strip()
        return value or None

    return {
        "nome": nome,
        "cnes": text_value("cnes"),
        "endereco": endereco,
        "bairro": text_value("bairro"),
        "cidade": text_value("cidade", "Três Lagoas") or "Três Lagoas",
        "estado": (text_value("estado", "MS") or "MS").upper()[:2],
        "cep": text_value("cep"),
        "latitude": latitude,
        "longitude": longitude,
        "telefone": text_value("telefone"),
        "email": text_value("email"),
        "horario_funcionamento": text_value("horario_funcionamento"),
        "atendimento": text_value("atendimento"),
        "aberta": aberta,
        "servicos": json.dumps(parse_json_list(data.get("servicos")), ensure_ascii=False),
        "equipe": json.dumps(parse_json_list(data.get("equipe")), ensure_ascii=False),
        "especialidades": json.dumps(parse_json_list(data.get("especialidades")), ensure_ascii=False),
        "descricao": text_value("descricao"),
        "imagem_url": text_value("imagem_url"),
    }


def database_error(exc, message="Não foi possível acessar o banco de dados."):
    app.logger.exception("Erro de banco de dados no GeoUBS")
    return jsonify({"erro": message, "detalhe": str(exc)}), 503


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/admin")
def admin():
    return render_template("admin.html")


@app.route("/api/health", methods=["GET"])
def health():
    """Verificação simples da conexão e quantidade de unidades."""
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT current_database() AS banco, COUNT(*) AS total FROM ubs")
                data = dict(cur.fetchone())
        return jsonify({"ok": True, **data})
    except Exception as exc:
        return database_error(exc, "A API está ativa, mas não conseguiu consultar a tabela ubs.")


@app.route("/api/ubs", methods=["GET"])
def listar_ubs():
    busca = request.args.get("busca", "").strip()
    bairro = request.args.get("bairro", "").strip()
    somente_ativas = request.args.get("abertas", "").lower() == "true"
    servico = request.args.get("servico", "").strip()

    query = "SELECT * FROM ubs WHERE TRUE"
    params = []

    if busca:
        query += " AND (nome ILIKE %s OR COALESCE(bairro, '') ILIKE %s OR endereco ILIKE %s OR COALESCE(cnes, '') ILIKE %s)"
        term = f"%{busca}%"
        params.extend([term, term, term, term])
    if bairro:
        query += " AND COALESCE(bairro, '') ILIKE %s"
        params.append(f"%{bairro}%")
    if somente_ativas:
        query += " AND aberta = TRUE"
    if servico:
        query += " AND servicos @> %s::jsonb"
        params.append(json.dumps([servico], ensure_ascii=False))
    query += " ORDER BY nome"

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                records = [normalizar_ubs(row) for row in cur.fetchall()]
        return jsonify(records)
    except Exception as exc:
        return database_error(exc, "Falha ao listar as UBS. Confira a conexão e execute 1_CONFIGURAR_BANCO.bat.")


@app.route("/api/ubs/<int:ubs_id>", methods=["GET"])
def obter_ubs(ubs_id):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM ubs WHERE id = %s", (ubs_id,))
                record = cur.fetchone()
        if not record:
            return jsonify({"erro": "UBS não encontrada."}), 404
        return jsonify(normalizar_ubs(record))
    except Exception as exc:
        return database_error(exc)


@app.route("/api/ubs", methods=["POST"])
def criar_ubs():
    try:
        payload = payload_ubs(request.get_json(silent=True) or {})
    except ValueError as exc:
        return jsonify({"erro": str(exc)}), 400

    sql = """
        INSERT INTO ubs (
            nome, cnes, endereco, bairro, cidade, estado, cep, latitude, longitude,
            telefone, email, horario_funcionamento, atendimento, aberta,
            servicos, equipe, especialidades, descricao, imagem_url
        ) VALUES (
            %(nome)s, %(cnes)s, %(endereco)s, %(bairro)s, %(cidade)s, %(estado)s, %(cep)s,
            %(latitude)s, %(longitude)s, %(telefone)s, %(email)s, %(horario_funcionamento)s,
            %(atendimento)s, %(aberta)s, %(servicos)s::jsonb, %(equipe)s::jsonb,
            %(especialidades)s::jsonb, %(descricao)s, %(imagem_url)s
        ) RETURNING *
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, payload)
                record = normalizar_ubs(cur.fetchone())
        return jsonify(record), 201
    except Exception as exc:
        return database_error(exc, "Não foi possível cadastrar a UBS.")


@app.route("/api/ubs/<int:ubs_id>", methods=["PUT"])
def atualizar_ubs(ubs_id):
    try:
        payload = payload_ubs(request.get_json(silent=True) or {})
    except ValueError as exc:
        return jsonify({"erro": str(exc)}), 400

    payload["id"] = ubs_id
    sql = """
        UPDATE ubs SET
            nome=%(nome)s, cnes=%(cnes)s, endereco=%(endereco)s, bairro=%(bairro)s,
            cidade=%(cidade)s, estado=%(estado)s, cep=%(cep)s,
            latitude=%(latitude)s, longitude=%(longitude)s, telefone=%(telefone)s,
            email=%(email)s, horario_funcionamento=%(horario_funcionamento)s,
            atendimento=%(atendimento)s, aberta=%(aberta)s,
            servicos=%(servicos)s::jsonb, equipe=%(equipe)s::jsonb,
            especialidades=%(especialidades)s::jsonb, descricao=%(descricao)s,
            imagem_url=%(imagem_url)s, atualizado_em=CURRENT_TIMESTAMP
        WHERE id=%(id)s
        RETURNING *
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, payload)
                record = cur.fetchone()
        if not record:
            return jsonify({"erro": "UBS não encontrada."}), 404
        return jsonify(normalizar_ubs(record))
    except Exception as exc:
        return database_error(exc, "Não foi possível atualizar a UBS.")


@app.route("/api/ubs/<int:ubs_id>", methods=["DELETE"])
def excluir_ubs(ubs_id):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM ubs WHERE id=%s RETURNING id", (ubs_id,))
                deleted = cur.fetchone()
        if not deleted:
            return jsonify({"erro": "UBS não encontrada."}), 404
        return jsonify({"mensagem": "UBS removida com sucesso."})
    except Exception as exc:
        return database_error(exc, "Não foi possível excluir a UBS.")


@app.route("/api/geocode", methods=["GET"])
def geocode():
    address = request.args.get("endereco", "").strip()
    if not address:
        return jsonify({"erro": "Informe um endereço."}), 400

    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": address, "format": "jsonv2", "limit": 1, "countrycodes": "br"},
            headers={"User-Agent": "GeoUBS-Estudantil/1.0 (projeto acadêmico)"},
            timeout=12,
        )
        response.raise_for_status()
        results = response.json()
    except requests.RequestException as exc:
        app.logger.warning("Falha de geocodificação: %s", exc)
        return jsonify({"erro": "Não foi possível consultar o serviço de mapas agora."}), 502

    if not results:
        return jsonify({"erro": "Endereço não encontrado. Tente incluir rua, número e bairro."}), 404

    result = results[0]
    return jsonify({
        "latitude": float(result["lat"]),
        "longitude": float(result["lon"]),
        "display_name": result.get("display_name", address),
    })


@app.route("/api/nearest", methods=["GET"])
def nearest_ubs():
    try:
        latitude = parse_coordinate(request.args.get("lat"), "Latitude", -90, 90)
        longitude = parse_coordinate(request.args.get("lon"), "Longitude", -180, 180)
        if latitude is None or longitude is None:
            return jsonify({"erro": "Informe latitude e longitude."}), 400
    except ValueError as exc:
        return jsonify({"erro": str(exc)}), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM ubs WHERE latitude IS NOT NULL AND longitude IS NOT NULL")
                records = [normalizar_ubs(row) for row in cur.fetchall()]
    except Exception as exc:
        return database_error(exc, "Não foi possível buscar as UBS mais próximas.")

    def distance_km(record):
        lat2 = math.radians(float(record["latitude"]))
        lon2 = math.radians(float(record["longitude"]))
        lat1 = math.radians(latitude)
        lon1 = math.radians(longitude)
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
        return 6371.0 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    for record in records:
        record["distancia_km"] = round(distance_km(record), 2)
    records.sort(key=lambda item: item["distancia_km"])
    return jsonify(records[:10])


@app.route("/api/estatisticas", methods=["GET"])
def estatisticas():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE aberta = TRUE) AS ativas FROM ubs")
                resumo = dict(cur.fetchone())
                cur.execute("SELECT bairro, COUNT(*) AS quantidade FROM ubs WHERE bairro IS NOT NULL AND bairro <> '' GROUP BY bairro ORDER BY quantidade DESC, bairro")
                bairros = [dict(row) for row in cur.fetchall()]
        return jsonify({"resumo": resumo, "bairros": bairros})
    except Exception as exc:
        return database_error(exc, "Não foi possível calcular as estatísticas.")


if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "0").strip().lower() in {"1", "true", "yes"}
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")), debug=debug)
