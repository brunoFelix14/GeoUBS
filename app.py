import json
import math
import os
from urllib.parse import quote_plus

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request
import psycopg
from psycopg.rows import dict_row

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'geoubs-dev-key')
DATABASE_URL = os.getenv('DATABASE_URL')


def get_connection():
    if not DATABASE_URL:
        raise RuntimeError('DATABASE_URL não configurada. Crie o arquivo .env baseado no .env.example')
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def normalizar_ubs(row):
    if row is None:
        return None
    row = dict(row)
    for campo in ('servicos', 'equipe', 'especialidades'):
        valor = row.get(campo)
        if isinstance(valor, str):
            try:
                row[campo] = json.loads(valor)
            except Exception:
                row[campo] = []
        elif valor is None:
            row[campo] = []
    return row


def obter_todas_ubs():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT * FROM ubs ORDER BY nome')
            return [normalizar_ubs(row) for row in cur.fetchall()]


def distancia_km(lat1, lon1, lat2, lon2):
    raio = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * raio * math.asin(math.sqrt(a))


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/admin')
def admin():
    return render_template('admin.html')


@app.route('/api/ubs', methods=['GET'])
def listar_ubs():
    busca = request.args.get('busca', '').strip()
    bairro = request.args.get('bairro', '').strip()
    somente_abertas = request.args.get('abertas', '').lower() == 'true'
    servico = request.args.get('servico', '').strip()

    query = 'SELECT * FROM ubs WHERE 1=1'
    params = []
    if busca:
        termo = f'%{busca}%'
        query += ' AND (nome ILIKE %s OR bairro ILIKE %s OR endereco ILIKE %s OR cnes ILIKE %s)'
        params.extend([termo, termo, termo, termo])
    if bairro:
        query += ' AND bairro ILIKE %s'
        params.append(f'%{bairro}%')
    if somente_abertas:
        query += ' AND aberta = TRUE'
    if servico:
        query += ' AND servicos @> %s::jsonb'
        params.append(json.dumps([servico]))
    query += ' ORDER BY nome'

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            dados = [normalizar_ubs(row) for row in cur.fetchall()]
    return jsonify(dados)


@app.route('/api/ubs/<int:ubs_id>', methods=['GET'])
def obter_ubs(ubs_id):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT * FROM ubs WHERE id = %s', (ubs_id,))
            dado = cur.fetchone()
    if not dado:
        return jsonify({'erro': 'UBS não encontrada'}), 404
    return jsonify(normalizar_ubs(dado))


def payload_ubs(dados):
    return {
        'nome': dados.get('nome'), 'cnes': dados.get('cnes'), 'endereco': dados.get('endereco'),
        'bairro': dados.get('bairro'), 'cidade': dados.get('cidade', 'Três Lagoas'),
        'estado': dados.get('estado', 'MS'), 'cep': dados.get('cep'),
        'latitude': dados.get('latitude'), 'longitude': dados.get('longitude'),
        'telefone': dados.get('telefone'), 'email': dados.get('email'),
        'horario_funcionamento': dados.get('horario_funcionamento'), 'atendimento': dados.get('atendimento'),
        'aberta': dados.get('aberta', True), 'servicos': json.dumps(dados.get('servicos', [])),
        'equipe': json.dumps(dados.get('equipe', [])), 'especialidades': json.dumps(dados.get('especialidades', [])),
        'descricao': dados.get('descricao'), 'imagem_url': dados.get('imagem_url')
    }


@app.route('/api/ubs', methods=['POST'])
def criar_ubs():
    dados = request.get_json(silent=True) or {}
    faltando = [c for c in ('nome', 'endereco') if not dados.get(c)]
    if faltando:
        return jsonify({'erro': f'Campos obrigatórios: {", ".join(faltando)}'}), 400

    sql = '''
    INSERT INTO ubs
    (nome,cnes,endereco,bairro,cidade,estado,cep,latitude,longitude,telefone,email,horario_funcionamento,
     atendimento,aberta,servicos,equipe,especialidades,descricao,imagem_url)
    VALUES
    (%(nome)s,%(cnes)s,%(endereco)s,%(bairro)s,%(cidade)s,%(estado)s,%(cep)s,%(latitude)s,%(longitude)s,
     %(telefone)s,%(email)s,%(horario_funcionamento)s,%(atendimento)s,%(aberta)s,%(servicos)s::jsonb,
     %(equipe)s::jsonb,%(especialidades)s::jsonb,%(descricao)s,%(imagem_url)s)
    RETURNING *'''
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, payload_ubs(dados))
            novo = normalizar_ubs(cur.fetchone())
        conn.commit()
    return jsonify(novo), 201


@app.route('/api/ubs/<int:ubs_id>', methods=['PUT'])
def atualizar_ubs(ubs_id):
    dados = request.get_json(silent=True) or {}
    payload = payload_ubs(dados)
    payload['id'] = ubs_id
    sql = '''
    UPDATE ubs SET
      nome=%(nome)s,cnes=%(cnes)s,endereco=%(endereco)s,bairro=%(bairro)s,cidade=%(cidade)s,estado=%(estado)s,
      cep=%(cep)s,latitude=%(latitude)s,longitude=%(longitude)s,telefone=%(telefone)s,email=%(email)s,
      horario_funcionamento=%(horario_funcionamento)s,atendimento=%(atendimento)s,aberta=%(aberta)s,
      servicos=%(servicos)s::jsonb,equipe=%(equipe)s::jsonb,especialidades=%(especialidades)s::jsonb,
      descricao=%(descricao)s,imagem_url=%(imagem_url)s
    WHERE id=%(id)s RETURNING *'''
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, payload)
            atualizado = cur.fetchone()
        conn.commit()
    if not atualizado:
        return jsonify({'erro': 'UBS não encontrada'}), 404
    return jsonify(normalizar_ubs(atualizado))


@app.route('/api/ubs/<int:ubs_id>', methods=['DELETE'])
def excluir_ubs(ubs_id):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute('DELETE FROM ubs WHERE id=%s RETURNING id', (ubs_id,))
            removido = cur.fetchone()
        conn.commit()
    if not removido:
        return jsonify({'erro': 'UBS não encontrada'}), 404
    return jsonify({'mensagem': 'UBS removida com sucesso'})


@app.route('/api/geocode', methods=['GET'])
def geocode():
    endereco = request.args.get('endereco', '').strip()
    if not endereco:
        return jsonify({'erro': 'Informe um endereço'}), 400
    try:
        resposta = requests.get(
            'https://nominatim.openstreetmap.org/search',
            params={'q': endereco, 'format': 'json', 'limit': 1, 'countrycodes': 'br'},
            headers={'User-Agent': 'GeoUBS-Academic-Project/2.0'}, timeout=10)
        resposta.raise_for_status()
        resultado = resposta.json()
    except requests.RequestException as exc:
        return jsonify({'erro': f'Falha na geocodificação: {exc}'}), 502
    if not resultado:
        return jsonify({'erro': 'Endereço não encontrado'}), 404
    local = resultado[0]
    return jsonify({'latitude': float(local['lat']), 'longitude': float(local['lon']), 'display_name': local['display_name']})


@app.route('/api/nearest', methods=['GET'])
def nearest():
    try:
        lat, lon = float(request.args['lat']), float(request.args['lon'])
    except (KeyError, ValueError):
        return jsonify({'erro': 'Informe lat e lon válidos'}), 400
    unidades = obter_todas_ubs()
    calculadas = []
    for u in unidades:
        if u['latitude'] is None or u['longitude'] is None:
            continue
        u['distancia_km'] = round(distancia_km(lat, lon, float(u['latitude']), float(u['longitude'])), 2)
        calculadas.append(u)
    calculadas.sort(key=lambda x: x['distancia_km'])
    return jsonify(calculadas[:5])


@app.route('/api/estatisticas', methods=['GET'])
def estatisticas():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE aberta) AS abertas FROM ubs')
            resumo = dict(cur.fetchone())
            cur.execute('SELECT COUNT(*) AS georreferenciadas FROM ubs WHERE latitude IS NOT NULL AND longitude IS NOT NULL')
            resumo.update(dict(cur.fetchone()))
            cur.execute('SELECT bairro, COUNT(*) AS quantidade FROM ubs WHERE bairro IS NOT NULL GROUP BY bairro ORDER BY quantidade DESC, bairro')
            bairros = [dict(x) for x in cur.fetchall()]
    return jsonify({'resumo': resumo, 'bairros': bairros})


@app.route('/health')
def health():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute('SELECT 1')
        return jsonify({'status': 'ok', 'servico': 'GeoUBS'})
    except Exception as exc:
        return jsonify({'status': 'erro', 'detalhe': str(exc)}), 503


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)
