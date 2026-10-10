# EDU Mobile

## Conexao com o backend

O aplicativo consome somente o API Gateway dos microsservicos. Copie `.env.example`
para `.env` e configure `EXPO_PUBLIC_API_URL` com a URL do gateway, sem o sufixo
`/api`.

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080
```

- Android Emulator: use `http://10.0.2.2:8080`.
- Dispositivo fisico: use `http://<IP-DA-MAQUINA>:8080` e mantenha o aparelho na
  mesma rede da maquina que executa o Docker.
- Gateway publicado: use a URL HTTPS publica do gateway.

Depois de alterar o `.env`, reinicie o Expo limpando o cache:

```sh
npx expo start --clear
```
