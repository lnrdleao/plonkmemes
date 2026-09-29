#!/usr/bin/env bash
set -euo pipefail

# 1. Configuração de ambiente e paths
export PATH="/home/leonardo/.npm-global/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
PROJECT_DIR="/home/leonardo/.openclaw/workspace/memesounds"
cd "$PROJECT_DIR"

echo "=================================================="
echo "🚀 [$(date '+%Y-%m-%d %H:%M:%S')] Iniciando sincronização diária PlonkMemes"
echo "=================================================="

# 2. Executar script de extração, normalização EBU R128 e upload CDN
"$PROJECT_DIR/.venv/bin/python3" "$PROJECT_DIR/scripts/sync_trends_daily.py"

# 3. Se houver alterações em app/data/, realizar build, commit, push e deploy Vercel
if ! git diff --quiet app/data/; then
    echo "📦 [$(date '+%Y-%m-%d %H:%M:%S')] Atualizações no catálogo detectadas! Executando build..."
    npm run build

    echo "🐙 [$(date '+%Y-%m-%d %H:%M:%S')] Realizando commit e push para o repositório..."
    git add app/data/ scripts/sync_trends_daily.py scripts/daily_sync.sh .gitignore
    git commit -m "chore(sync): sincronização diária MyInstants ($(date +'%Y-%m-%d'))"
    git push origin main

    echo "🚀 [$(date '+%Y-%m-%d %H:%M:%S')] Realizando deploy na Vercel (Produção)..."
    printf 'n\n' | npx vercel --prod --yes
    echo "✅ [$(date '+%Y-%m-%d %H:%M:%S')] Deploy em produção concluído!"
else
    echo "ℹ️ [$(date '+%Y-%m-%d %H:%M:%S')] Nenhuma nova alteração no catálogo detectada."
fi

# 4. Enviar ping de atividade para evitar pausa por inatividade no Supabase
echo "📡 [$(date '+%Y-%m-%d %H:%M:%S')] Enviando ping Keep-Alive para Supabase..."
curl -s -f "https://plonkmemes.lol/api/v1/cron/keep-alive" || echo "⚠️ Aviso: Falha ao chamar endpoint keep-alive."
echo "🎉 [$(date '+%Y-%m-%d %H:%M:%S')] Rotina diária concluída com sucesso!"
