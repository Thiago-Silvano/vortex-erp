# DS-160 Server (local)

Ponte entre o ERP Vortex e o robô de preenchimento automático do DS-160.
Roda na máquina do operador, na porta **3004**.

## Instalação

```bash
cd ds160-server
npm install
cp .env.example .env   # edite com seus caminhos e chaves
```

## Executar

```bash
npm run ds160-server
# ou em produção, com PM2:
pm2 start ds160-server.js --name ds160-server
pm2 save
```

## Endpoints

- `GET  /ds160/health` — usado pelo ERP para verificar se o servidor está no ar.
- `POST /ds160/iniciar` — recebe `{ nome_cliente, form_id, dados }` do ERP,
  salva `CLIENTES/{NOME}/DS160_{NOME}.json` e abre o robô.
- `POST /ds160/concluido` — recebe `{ form_id, application_id, status, maquina }`
  do robô Python e atualiza o backend.

## Variáveis (.env)

| Variável              | Descrição                                            |
| --------------------- | ---------------------------------------------------- |
| `CLIENTES_DIR`        | Pasta dos JSONs (Google Drive ou local)              |
| `ROBO_EXE`            | Caminho do `DS160-Robot-Vortex.exe`                  |
| `SUPABASE_URL`        | URL do backend Vortex                                |
| `SUPABASE_SERVICE_KEY`| Chave service_role (fica somente nesta máquina)      |