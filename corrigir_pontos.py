import psycopg
from geopy.geocoders import ArcGIS
import time
import re

DB_URL = "postgresql://postgres:postgres@127.0.0.1:5432/geoubs"

def limpar_endereco(endereco):
    # Remove "S/N" e descrições adicionais como "ESQUINA COM..." para não confundir a API
    endereco_limpo = re.sub(r',\s*S/N.*?,', ',', endereco, flags=re.IGNORECASE)
    # Garante que números soltos sem rua também tenham chance (ex: PELOPEDES GOUVEIA)
    return endereco_limpo

def corrigir_coordenadas():
    # Inicializa o serviço do ArcGIS (excelente tolerância a falhas em endereços BR)
    geolocator = ArcGIS()
    
    with psycopg.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT cnes, nome, endereco, latitude, longitude FROM ubs WHERE coordenadas_aproximadas = TRUE")
            unidades = cur.fetchall()
            
            print("Iniciando correção de coordenadas com ArcGIS...\n" + "="*50)
            
            for cnes, nome, endereco, lat_atual, lon_atual in unidades:
                try:
                    endereco_buscado = limpar_endereco(endereco)
                    location = geolocator.geocode(endereco_buscado)
                    
                    if location:
                        cur.execute(
                            "UPDATE ubs SET latitude = %s, longitude = %s, coordenadas_aproximadas = FALSE WHERE cnes = %s",
                            (location.latitude, location.longitude, cnes)
                        )
                        print(f"[CORRIGIDO] {nome}")
                        print(f"   De: {lat_atual}, {lon_atual}")
                        print(f" Para: {location.latitude}, {location.longitude}")
                        print(f" Mapa: {location.address}\n")
                    else:
                        print(f"[FALHA] API não encontrou precisão para: {nome}")
                        print(f"        Endereço filtrado tentado: {endereco_buscado}\n")
                        
                    # Pausa leve apenas para evitar sobrecarga de requisições
                    time.sleep(0.5)
                    
                except Exception as e:
                    print(f"[ERRO] Falha ao processar {nome}: {e}\n")
            
            conn.commit()
            print("="*50 + "\nProcesso finalizado.")

if __name__ == "__main__":
    corrigir_coordenadas()