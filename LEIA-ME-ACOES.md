# Monitor de Ações — Android e Windows

Cotações (B3 e EUA), gráfico de candles com volume (diário ou semanal), médias móveis configuráveis
(padrão MM 9/21/50/80, como no Profit), IFR com média e linhas 70/30, alertas de compra/venda por
preço-alvo, cruzamento de médias ou IFR, e carteira com listas, metas, rebalanceamento,
evolução mensal e importação do Excel da Área do Investidor da B3. Dados do Yahoo Finance
(B3 com atraso de ~15 min).

## Como gerar
Copie as pastas `acoes/`, `pc/` e `.github/` para a raiz do repositório orca-metal e faça o commit.
- **Gerar APK Ações** → artefato `MonitorAcoes-apk` (instalar no celular).
- **Gerar EXE Ações (Windows)** → artefato `MonitorAcoes-Windows` (instalador do PC).
Os dois também podem ser rodados manualmente em Actions › Run workflow.

## Alertas
- Celular: conferidos a cada ~15 min com o app fechado (mínimo do Android). Libere as notificações
  e, se possível, tire o app da economia de bateria (Config › Apps › Monitor de Ações › Bateria › Sem restrições).
- PC: a cada 5 min, enquanto o programa estiver aberto ou minimizado perto do relógio. Inicia com o Windows
  (dá para desligar no menu do ícone).
- Cada alerta dispara uma vez e fica pausado; ligue a chave para reativar.
- Celular e PC têm listas separadas.

## Estrutura
- `acoes/app/src/main/assets/index.html` — a tela (usada pelos dois).
- `acoes/app/src/main/java/...` — app Android (verificação em segundo plano e notificações).
- `pc/` — programa Windows (Electron).
