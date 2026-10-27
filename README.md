# @cubos/kube-templates

Biblioteca TypeScript que encapsula recursos do Kubernetes em classes tipadas e reutilizáveis.
Você descreve a aplicação em TypeScript e a biblioteca gera o YAML pronto para `kubectl apply`,
com autocompletar e checagem de tipos em tudo.

Mantida pela [Cubos](https://cubos.io). Repositório: `github.com/cubos-devops/kube-templates`
(até 2026-10-27 ficava em `git.cubos.io/cubos/kube-templates`).

## Índice

- [Instalação](#instalação)
- [Começando](#começando)
- [Recursos disponíveis](#recursos-disponíveis)
- [Exemplos](#exemplos)
- [Funções auxiliares](#funções-auxiliares)
- [Tipos do Kubernetes](#tipos-do-kubernetes)
- [Desenvolvimento](#desenvolvimento)
- [Publicação](#publicação)

## Instalação

Requer Node.js 24 ou superior.

```bash
npm install @cubos/kube-templates
```

## Começando

Todas as classes seguem o mesmo contrato: `new Classe(metadata, spec)` e o getter `.yaml`.

```typescript
import { Namespace, StatelessApp } from "@cubos/kube-templates";

const namespace = new Namespace({ name: "my-app" });

const app = new StatelessApp(
  { name: "api", namespace: "my-app" },
  {
    image: "my-registry/my-api:latest",
    replicas: 3,
    cpu: { request: "100m", limit: "500m" },
    memory: { request: "128Mi", limit: "512Mi" },
    ports: [
      {
        type: "http",
        port: 8080,
        publicUrl: "https://api.example.com",
        tlsCert: "api-tls-cert",
      },
    ],
    envs: {
      NODE_ENV: "production",
      DATABASE_URL: { secretName: "db-credentials", key: "url" },
    },
  },
);

console.log(namespace.yaml);
console.log(app.yaml);
```

## Recursos disponíveis

Todas as classes abaixo são exportadas pelo pacote.

### Recursos básicos do Kubernetes

`Namespace`, `Deployment`, `StatefulSet`, `DaemonSet`, `Service`, `IngressV1`, `ConfigMap`,
`Secret`, `Job`, `CronJob`, `PersistentVolumeClaim`, `HorizontalPodAutoscaler`,
`PodDisruptionBudget`, `NetworkPolicy`, `ServiceAccount`, `Role`, `RoleBinding`.

### Bancos de dados

| Classe | O que gera |
|---|---|
| `Postgres`, `PostgresV1` | PostgreSQL |
| `PgBouncer` | Pooler de conexões do PostgreSQL (com sidecar opcional de métricas Prometheus) |
| `StackgresCluster`, `StackgresInstanceProfile`, `StackgresPostgresConfig`, `StackgresBackupConfig` | PostgreSQL via operador StackGres |
| `Redis` | Redis |
| `Mongo` | MongoDB |
| `MySQL`, `MariaDB` | MySQL e MariaDB |
| `MSSQL` | SQL Server |
| `Cockroach` | CockroachDB |

### Aplicações

| Classe | O que gera |
|---|---|
| `StatelessApp` | Aplicação stateless completa: Deployment, Service, Ingress, HPA e PDB, conforme o spec |
| `Cron` | CronJob com configuração simplificada |
| `StaticSite` | Site estático |
| `WordPress` | WordPress com banco de dados |

### Escala, certificados e segredos

| Classe | O que gera |
|---|---|
| `ScaledObject`, `ScaledJob` | Autoescalonamento por eventos (KEDA) |
| `CertManagerV1Certificate`, `CertificateV1` | Certificados (cert-manager) |
| `ReplicatedSecret` | Secret replicado entre namespaces |

## Exemplos

### StatelessApp com autoescalonamento

`replicas` aceita um número fixo ou uma faixa `[mínimo, máximo]`. Com a faixa, a biblioteca gera
um `HorizontalPodAutoscaler` (e não escreve `replicas` no Deployment); com um número, o Deployment
fica com réplicas fixas (padrão `1`). `minAvailable` gera um `PodDisruptionBudget`.

```typescript
import { StatelessApp } from "@cubos/kube-templates";

const app = new StatelessApp(
  { name: "my-api", namespace: "production" },
  {
    image: "my-registry/api:v1.0.0",
    replicas: [2, 10],
    cpuUtilizationToScale: 70,
    cpu: { request: "100m", limit: "1" },
    memory: { request: "256Mi", limit: "512Mi" },
    ports: [
      {
        type: "http",
        port: 3000,
        publicUrl: "https://api.example.com",
        tlsCert: "api-tls",
        timeout: 60,
        maxBodySize: "10Mi",
      },
    ],
    envs: {
      NODE_ENV: "production",
      DATABASE_URL: { secretName: "db-secret", key: "connection-string" },
      POD_NAME: { fieldPath: "metadata.name" },
    },
    // repassa variáveis do processo que gera o YAML (ex.: do CI). Lança erro
    // se alguma não estiver definida: `Environment variable BUILD_VERSION not defined`
    forwardEnvs: ["BUILD_VERSION"],
    minAvailable: 1,
    // CronJobs que usam a mesma imagem
    crons: [
      {
        name: "cleanup",
        schedule: "0 2 * * *",
        command: ["node"],
        args: ["cleanup.js"],
      },
    ],
  },
);

console.log(app.yaml);
```

### Redis

```typescript
import { Redis } from "@cubos/kube-templates";

const cache = new Redis(
  { name: "cache", namespace: "production" },
  {
    version: "7-alpine",
    cpu: { request: "100m", limit: "500m" },
    memory: "256Mi",
    options: {
      maxmemory: "200mb",
      maxmemoryPolicy: "allkeys-lru",
    },
  },
);

console.log(cache.yaml);
```

### Cron

```typescript
import { Cron } from "@cubos/kube-templates";

const report = new Cron(
  { name: "daily-report", namespace: "production" },
  {
    schedule: "0 8 * * *",
    image: "my-registry/report-generator:latest",
    command: ["node"],
    args: ["generate-report.js"],
    cpu: { request: "100m", limit: "500m" },
    memory: { request: "128Mi", limit: "256Mi" },
    envs: {
      REPORT_TYPE: "daily",
      SMTP_PASSWORD: { secretName: "smtp", key: "password" },
    },
    timeoutSeconds: 3600,
  },
);

console.log(report.yaml);
```

Os specs de cada classe (campos obrigatórios e opcionais) estão tipados: o editor mostra tudo
com autocompletar, e o código-fonte em [`src/`](src) é a especificação de cada recurso.

## Funções auxiliares

```typescript
import { configFactory, env, parseMemory } from "@cubos/kube-templates";

// Lê variáveis de ambiente e lança erro descritivo se a variável não existir
const databaseUrl = env.DATABASE_URL;

// Mesmo comportamento para qualquer objeto
const config = configFactory(process.env, "Config");
const apiKey = config.API_KEY;

// Converte quantidades de memória para bytes
parseMemory("1Gi"); // 1073741824
parseMemory("256M"); // 256000000
```

## Tipos do Kubernetes

Os tipos em `src/generated` são gerados a partir das especificações OpenAPI do Kubernetes e dos
CRDs usados pelas classes (`npm run generate`). Dá para usá-los diretamente:

```typescript
import type { io } from "@cubos/kube-templates/src/generated";

const container: io.k8s.api.core.v1.Container = {
  name: "my-container",
  image: "nginx:latest",
};
```

## Desenvolvimento

Pré-requisito: Node.js 24 (versão em `.nvmrc`).

```bash
npm ci

npm run lint             # Biome
npx tsc --noEmit         # checagem de tipos
npm run generate         # regenera src/generated

# testes de lógica pura, sem cluster
npx vitest run tests/statelessApp tests/pgbouncer
```

Os demais testes (`tests/cockroach`, `tests/postgres`, `tests/wordpress`) são de integração:
aplicam os recursos num cluster Kubernetes local criado com [kind](https://kind.sigs.k8s.io/)
(`tests/setup.ts` lê o `kind-kubeconfig` e o container `kube-templates-test-control-plane`) e,
por isso, não rodam no CI do GitHub.

### CI

O workflow [`ci.yml`](.github/workflows/ci.yml) roda em pull requests e na `main`: lint,
type-check, testes unitários, `npm audit` (não bloqueante) e build.

## Publicação

O pacote é publicado no npm pelo workflow [`publish.yml`](.github/workflows/publish.yml)
**quando uma release é publicada no GitHub**:

1. No GitHub, vá em **Releases → Draft a new release**.
2. Crie uma tag no formato `vX.Y.Z` (ex.: `v1.1.0`) apontando para a `main`.
3. Clique em **Publish release**.

A versão publicada no npm é a da tag, sem o `v`. Marcar a release como *pre-release*
(ex.: tag `v1.2.0-rc.1`) publica sob a dist-tag `next` em vez de `latest`.

A publicação usa [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC):
não há `NPM_TOKEN` no repositório, e cada versão sai com
[provenance](https://docs.npmjs.com/generating-provenance-statements) assinado.

> **Versionamento:** até a migração para o GitHub as versões eram `1.0.<id do pipeline>`
> (a última foi `1.0.1153395`). As versões novas seguem semver pela tag e precisam ser
> maiores que essa — comece em `v1.1.0` ou acima.
