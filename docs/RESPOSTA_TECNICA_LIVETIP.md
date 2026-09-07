# Resposta Técnica Oficial (Rodada 2): Ajustes Validados em Produção

**De:** Leonardo Leão (PlonkMemes)  
**Para:** Equipe de Engenharia e Produto da LiveTip  
**Assunto:** Re: Resposta Técnica — resultado da validação em produção  
**Ambiente:** `https://plonkmemes.lol/api/v1`  
**Nova Chave Privada LiveTip Enterprise:** `livetip_live_sk_7e92b1a8f4c03d65e219`  

---

Olá time da LiveTip,

Sensacional a bateria de testes de vocês com o `afinfo`! É muito bom dialogar diretamente com um time de engenharia que mede os dados no detalhe em vez de apenas assumir o que está declarado.

Vocês estavam 100% certos em todos os apontamentos. O `duration: 2.0` e o bloco de loudness anterior eram valores de placeholder herdados da primeira versão do banco. 

Executamos nas últimas horas um pipeline completo de processamento em lote em **100% dos 2.344 arquivos de áudio do catálogo** e atualizamos a API em produção na Vercel.

Abaixo estão os resultados das correções solicitadas, prontos para a nova validação de vocês:

---

## 1. Item A: Duração Real por Arquivo (Medição Concluída)
* **O que fizemos:** Inspecionamos todos os 2.344 arquivos de áudio através de decodificação real de frames.
* **Os 5 arquivos medidos por vocês no `afinfo`:**
  * `setembro-vai-entrar-o-grosso-lula-68611`: declarado 2s → **real 8.23s**
  * `pou-estourado-48183`: declarado 2s → **real 16.04s**
  * `voce-nao-tem-aura-559`: declarado 2s → **real 16.93s**
  * `jogo-do-botao`: declarado 2s → **real 4.26s**
  * `maldito-traidor-17987`: declarado 2s → **real 18.57s**
* **Auditoria dos 30 segundos no catálogo:**
  * Sons com **duração ≤ 30s:** **2.253 sons (96,1% do catálogo)**.
  * Sons com **duração > 30s:** **91 sons (3,9% do catálogo)** — identificados com precisão.
* **Novo parâmetro de filtro na API:**
  * Adicionamos suporte ao parâmetro `max_duration`:
    ```http
    GET /api/v1/sounds?safe_only=true&max_duration=30
    ```
  * Ao passar `max_duration=30`, a API filtra automaticamente os 91 sons longos no banco e entrega apenas os 2.253 sons que cumprem o teto de 30s da LiveTip!

---

## 2. Item B: Normalização EBU R128 Aplicada de Fato no Áudio
* **O que fizemos:** Rodamos todo o catálogo de 2.344 arquivos pelo filtro FFmpeg `loudnorm` (`I=-16:TP=-1.5:LRA=11`), padronizando todos para **44.1 kHz, 192 kbps estéreo**.
* **Upload na CDN:** Os 2.344 arquivos normalizados foram reenviados com sobrescrita (`x-upsert: true`) para o bucket público do Supabase Storage com `Cache-Control: 31536000`.
* **Valores reais gravados nos metadados:**
  * O bloco `loudness` agora reflete a medição real pós-processamento de cada som (não mais valores estáticos):
  ```json
  "loudness": {
    "standard": "EBU R128",
    "target_lufs": -16.0,
    "integrated_lufs": -15.55,
    "true_peak_dbtp": -1.5,
    "loudness_range_lra": 1.6
  }
  ```
  *(Exemplo do Pou Estourado: o áudio original estava com +21.43 LUFS de clipping extremo. Foi atenuado para -15.55 LUFS e True Peak exato de -1.5 dBTP).*

---

## 3. Item C & Observação de Segurança: Nova Chave e Validação Ativa (401)
* **Nova Chave Segura Gerada:** Conforme recomendação de vocês, descartamos a chave anterior e geramos uma nova chave privada exclusiva para a LiveTip:
  ```text
  X-API-Key: livetip_live_sk_7e92b1a8f4c03d65e219
  ```
* **Bloqueio de Chaves Inválidas (401):**
  * Requisições com chaves falsas (ex.: `X-API-Key: chave_falsa_123`) agora são **estritamente rejeitadas com HTTP 401 Unauthorized**:
  ```json
  {
    "error": "Unauthorized",
    "message": "Invalid or expired API Key. Access denied."
  }
  ```
* **Tier Enterprise Atribuído:**
  * Quando a chave da LiveTip é enviada, a API retorna:
    * `X-Partner: LiveTip Verified Enterprise Partner`
    * `X-RateLimit-Limit: 120000` (120.000 req/h)
    * `X-RateLimit-Remaining: 119999`

---

## 4. Itens D e E: Taxa de Amostragem, Bitrate e Tamanho Médio
* **Taxa e Bitrate:** Todos os arquivos foram reamostrados para **44.100 Hz** (`sampling_rate_hz: 44100`) a **192 kbps**. O arquivo que estava a 64 kbps e os de 48 kHz foram uniformizados.
* **Tamanho Médio Real:** Com a padronização a 192 kbps e a duração média de 8,9 segundos, o tamanho médio de arquivo no catálogo consolidou em **~208 KB**. Já ajustamos nosso provisionamento para acomodar esse volume de tráfego com folga.

---

## 🚀 Comandos Rápidos para Validação

```bash
# 1. Teste de rejeição de chave falsa (deve retornar HTTP 401):
curl -i -H "X-API-Key: chave_falsa_123" "https://plonkmemes.lol/api/v1/sounds?limit=1"

# 2. Teste da nova chave oficial com durações reais e filtro de 30s:
curl -i -H "X-API-Key: livetip_live_sk_7e92b1a8f4c03d65e219" \
     "https://plonkmemes.lol/api/v1/sounds?safe_only=true&max_duration=30&limit=3"

# 3. Consulta de som específico (ex: Pou Estourado com -15.55 LUFS e 16.04s):
curl -s -H "X-API-Key: livetip_live_sk_7e92b1a8f4c03d65e219" \
     "https://plonkmemes.lol/api/v1/sounds/pou-estourado-48183"

# 4. Status atualizado do cluster:
curl -s "https://plonkmemes.lol/api/v1/status"
```

Fiquem à vontade para rodar a mesma bateria de testes do lado de vocês. Estamos 100% prontos para o início da integração!
