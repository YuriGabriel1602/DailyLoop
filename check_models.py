import urllib.request
import json
import ssl

# --- COLE SUA CHAVE ABAIXO (Mantenha as aspas) ---
API_KEY = "AIzaSyAnRBcVWrgO5YBlStG2zO_ycVDqoMTsk-U" 
# -------------------------------------------------

def check_models():
    if API_KEY == "":
        print("❌ ERRO: Você esqueceu de colocar a chave API no código!")
        return

    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}"
    
    print(f"📡 Testando conexão com a chave: {API_KEY[:6]}...")

    try:
        # Cria um contexto SSL seguro (ignora erros de certificado locais se houver)
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        with urllib.request.urlopen(url, context=ctx) as response:
            data = json.loads(response.read().decode())
            
            print("\n✅ CONEXÃO ESTABELECIDA! Modelos encontrados:")
            print("="*50)
            
            valid_models = []
            for model in data.get('models', []):
                # Filtra apenas modelos de texto/chat
                if 'generateContent' in model['supportedGenerationMethods']:
                    name = model['name'].replace('models/', '')
                    print(f"🔹 {name}")
                    valid_models.append(name)
            
            print("="*50)
            
            if valid_models:
                print(f"\n🚀 RECOMENDAÇÃO: Vá no arquivo PrometheusTerminal.tsx")
                print(f"   e mude a variável MODEL_NAME para: \"{valid_models[0]}\"")
            else:
                print("⚠️ A chave é válida, mas nenhum modelo de chat foi listado.")

    except urllib.error.HTTPError as e:
        print(f"\n❌ ERRO DE API ({e.code}):")
        print(f"   Motivo: {e.reason}")
        if e.code == 400: print("   -> Chave inválida ou mal formatada.")
        if e.code == 403: print("   -> Chave sem permissão ou quota excedida.")
    except Exception as e:
        print(f"\n❌ ERRO NO SCRIPT: {e}")

if __name__ == "__main__":
    check_models()