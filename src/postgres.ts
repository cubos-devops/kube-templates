import { createHash } from "node:crypto";

import type { io } from "./generated";
import { generateYaml, parseMemory } from "./helpers";
import type { ObjectMeta } from "./kubernetes";
import { Service, StatefulSet } from "./kubernetes";

interface PostgresOptions {
  maxConnections?: number;
  superuserReservedConnections?: number;
  tcpKeepalivesIdle?: number;
  tcpKeepalivesInterval?: number;
  tcpKeepalivesCount?: number;
  tcpUserTimeout?: number;
  authenticationTimeout?: string;
  sharedBuffers?: string;
  hugePages?: boolean | "try";
  tempBuffers?: string;
  maxPreparedTransactions?: number;
  workMem?: string;
  maintenanceWorkMem?: string;
  autovacuumWorkMem?: string | -1;
  logicalDecodingWorkMem?: string;
  maxStackDepth?: string;
  sharedMemoryType?: "mmap" | "sysv";
  dynamicSharedMemoryType?: "posix" | "sysv" | "mmap";
  tempFileLimit?: string | -1;
  maxFilesPerProcess?: number;
  vacuumCostDelay?: number;
  vacuumCostPageHit?: number;
  vacuumCostPageMiss?: number;
  vacuumCostPageDirty?: number;
  vacuumCostLimit?: number;
  bgwriterDelay?: string;
  bgwriterLruMaxpages?: number;
  bgwriterLruMultiplier?: number;
  bgwriterFlushAfter?: number;
  effectiveIoConcurrency?: number;
  maxWorkerProcesses?: number;
  maxParallelMaintenanceWorkers?: number;
  maxParallelWorkersPerGather?: number;
  parallelLeaderParticipation?: boolean;
  maxParallelWorkers?: number;
  oldSnapshotThreshold?: string | 0 | -1;
  backendFlushAfter?: number;
  fsync?: boolean;
  synchronousCommit?: boolean | "local" | "remoteWrite" | "remoteApply";
  walSyncMethod?:
    | "fsync"
    | "openDatasync"
    | "fdatasync"
    | "fsyncWritethrough"
    | "openSync";
  fullPageWrites?: boolean;
  walCompression?: boolean;
  walLogHints?: boolean;
  walInitZero?: boolean;
  walRecycle?: boolean;
  walBuffers?: string | -1;
  walWriterDelay?: string;
  walWriterFlushAfter?: string | 0;
  commitDelay?: number;
  commitSiblings?: number;
  checkpointTimeout?: string;
  maxWalSize?: string;
  minWalSize?: string;
  checkpointCompletionTarget?: number;
  checkpointFlushAfter?: number;
  checkpointWarning?: string;
  enableBitmapscan?: boolean;
  enableHashagg?: boolean;
  enableHashjoin?: boolean;
  enableIndexscan?: boolean;
  enableIndexonlyscan?: boolean;
  enableMaterial?: boolean;
  enableMergejoin?: boolean;
  enableNestloop?: boolean;
  enableParallelAppend?: boolean;
  enableSeqscan?: boolean;
  enableSort?: boolean;
  enableTidscan?: boolean;
  enablePartitionwiseJoin?: boolean;
  enablePartitionwiseAggregate?: boolean;
  enableParallelHash?: boolean;
  enablePartitionPruning?: boolean;
  seqPageCost?: number;
  randomPageCost?: number;
  cpuTupleCost?: number;
  cpuIndexTupleCost?: number;
  cpuOperatorCost?: number;
  parallelTupleCost?: number;
  parallelSetupCost?: number;
  jitAboveCost?: number;
  jitInlineAboveCost?: number;
  jitOptimizeAboveCost?: number;
  minParallelTableScanSize?: string;
  minParallelIndexScanSize?: string;
  effectiveCacheSize?: string;
  geqo?: boolean;
  geqoThreshold?: number;
  geqoEffort?: number;
  geqoPoolSize?: number;
  geqoGenerations?: number;
  geqoSelectionBias?: number;
  geqoSeed?: number;
  defaultStatisticsTarget?: number;
  constraintExclusion?: boolean | "partition";
  cursorTupleFraction?: number;
  fromCollapseLimit?: number;
  joinCollapseLimit?: number;
  forceParallelMode?: boolean;
  jit?: boolean;
  planCacheMode?: "auto" | "forceGenericPlan" | "forceCustomPlan";
  logMinMessages?:
    | "warning"
    | "debug5"
    | "debug4"
    | "debug3"
    | "debug2"
    | "debug1"
    | "info"
    | "notice"
    | "error"
    | "log"
    | "fatal"
    | "panic";
  logMinErrorStatement?:
    | "error"
    | "debug5"
    | "debug4"
    | "debug3"
    | "debug2"
    | "debug1"
    | "info"
    | "notice"
    | "warning"
    | "log"
    | "fatal"
    | "panic";
  logMinDurationStatement?: number;
  logMinDurationSample?: number;
  logStatementSampleRate?: number;
  logTransactionSampleRate?: number;
  debugPrintParse?: boolean;
  debugPrintRewritten?: boolean;
  debugPrintPlan?: boolean;
  debugPrettyPrint?: boolean;
  logCheckpoints?: boolean;
  logConnections?: boolean;
  logDisconnections?: boolean;
  logDuration?: boolean;
  logErrorVerbosity?: "default" | "terse" | "verbose";
  logHostname?: boolean;
  logLockWaits?: boolean;
  logStatement?: "none" | "ddl" | "mod" | "all";
  logParametersOnError?: boolean;
  logReplicationCommands?: boolean;
  logTempFiles?: number;
  trackActivities?: boolean;
  trackCounts?: boolean;
  trackIoTiming?: boolean;
  trackFunctions?: "none" | "pl" | "all";
  trackActivityQuerySize?: number;
  logParserStats?: boolean;
  logPlannerStats?: boolean;
  logExecutorStats?: boolean;
  logStatementStats?: boolean;
  autovacuum?: boolean;
  logAutovacuumMinDuration?: number;
  autovacuumMaxWorkers?: number;
  autovacuumNaptime?: string;
  autovacuumVacuumThreshold?: number;
  autovacuumAnalyzeThreshold?: number;
  autovacuumVacuumScaleFactor?: number;
  autovacuumAnalyzeScaleFactor?: number;
  autovacuumFreezeMaxAge?: number;
  autovacuumMultixactFreezeMaxAge?: number;
  autovacuumVacuumCostDelay?: string | -1;
  autovacuumVacuumCostLimit?: number;
  clientMinMessages?:
    | "notice"
    | "debug5"
    | "debug4"
    | "debug3"
    | "debug2"
    | "debug1"
    | "log"
    | "warning"
    | "error";
  rowSecurity?: boolean;
  defaultTableAccessMethod?: string;
  checkFunctionBodies?: boolean;
  defaultTransactionReadOnly?: boolean;
  defaultTransactionDeferrable?: boolean;
  sessionReplicationRole?: string;
  statementTimeout?: number;
  lockTimeout?: number;
  idleInTransactionSessionTimeout?: number;
  vacuumFreezeMinAge?: number;
  vacuumFreezeTableAge?: number;
  vacuumMultixactFreezeMinAge?: number;
  vacuumMultixactFreezeTableAge?: number;
  vacuumCleanupIndexScaleFactor?: number;
  deadlockTimeout?: string;
  maxLocksPerTransaction?: number;
  maxPredLocksPerTransaction?: number;
  maxPredLocksPerRelation?: number;
  maxPredLocksPerPage?: number;
  arrayNulls?: boolean;
  backslashQuote?: boolean | "safeEncoding";
  escapeStringWarning?: boolean;
  loCompatPrivileges?: boolean;
  operatorPrecedenceWarning?: boolean;
  quoteAllIdentifiers?: boolean;
  standardConformingStrings?: boolean;
  synchronizeSeqscans?: boolean;
  transformNullEquals?: boolean;
  exitOnError?: boolean;
  dataSyncRetry?: boolean;
  maxReplicationSlots?: number;
  walSenderTimeout?: number;
  trackCommitTimestamp?: boolean;
  listenAddresses?: string;
  maxWalSenders?: number;
  walKeepSegments?: number;
  sharedPreloadLibraries?: string;
  "pgStatStatements.track"?: "all" | "top" | "none";
  maxStandbyArchiveDelay?: number;
  maxStandbyStreamingDelay?: number;
  hotStandbyFeedback?: "on" | "off";
  walLevel?: "minimal" | "replica" | "logical";
}

interface PostgresSpec {
  readReplicas?: number;
  version: string;
  customImage?: string;
  cpu: {
    request: string | number;
    limit: string | number;
  };
  memory: string | number;
  postgresUserPassword?: string | { secretName: string; key: string };
  replicaPassword?: string;
  databases?: Array<
    | {
        name: string;
        users?: string[];
      }
    | string
  >;
  users?: Array<{
    username: string;
    password: string;
  }>;
  usersReadOnly?: Array<{
    username: string;
    password: string;
  }>;
  monitoring?: {
    type: "pgAnalyze";
    apiKey: string;
    monitorPostgresDatabase?: boolean;
  };
  initContainers?: io.k8s.api.core.v1.Container[];
  accessConfig?: Array<{
    type: string;
    database: string;
    user: string;
    address: string;
    method: string;
  }>;
  storageClassName?: string;
  storageRequest?: string;
  nodeSelector?: Record<string, string>;
  affinity?: io.k8s.api.core.v1.Affinity;
  tolerations?: io.k8s.api.core.v1.Toleration[];
  imagePullPolicy?: "Always" | "Never" | "IfNotPresent";
  options?: PostgresOptions;
  optionsReplicas?: PostgresOptions;
  overrides?: Partial<io.k8s.api.core.v1.Container>;
  imagePullSecrets?: string[];
}

export class Postgres {
  constructor(
    private metadata: ObjectMeta,
    private spec: PostgresSpec,
  ) {}

  get yaml() {
    const additionalContainers: io.k8s.api.core.v1.Container[] = [];
    const commonReplicationOptions = this.spec.readReplicas
      ? {
          walLevel: "replica",
          maxWalSenders: this.spec.options?.maxWalSenders ?? 20,
          ...(["9", "10", "11", "12"].some(v => this.spec.version.startsWith(v))
            ? { walKeepSegments: this.spec.options?.walKeepSegments ?? 16 }
            : {}),
        }
      : {};

    const masterReplicationOptions = this.spec.readReplicas
      ? {
          listenAddresses: `*`,
          maxReplicationSlots: 20,
        }
      : {};

    const replicationCredentials = {
      user: "replicator",
      pass:
        this.spec.replicaPassword ??
        createHash("sha256")
          .update(JSON.stringify(this.metadata))
          .digest("hex"),
    };

    const replicaReplicationOptions = this.spec.readReplicas
      ? {
          primaryConninfo: `host=${this.metadata.name} port=5432 user=${replicationCredentials.user} password=${replicationCredentials.pass}`,
          hotStandby: "on",
        }
      : {};

    const mem = parseMemory(this.spec.memory);
    const mebibyte = 1024 * 1024;
    const gibibyte = 1024 * mebibyte;

    const [majorVersionString] = this.spec.version.split(".");
    const majorVersion = Number.parseInt(majorVersionString, 10);

    const probeCheck = [
      "bash",
      "-c",
      "PGPASSWORD=$POSTGRES_PASSWORD psql -h 127.0.0.1 -U postgres -c 'SELECT 1'",
    ];

    const pghba = `EOF
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# "local" is for Unix domain socket connections only
local   all             all                                     md5
# IPv4 local connections:
host    all             all             127.0.0.1/32            md5
# IPv6 local connections:
host    all             all             ::1/128                 md5
# Allow replication connections from localhost, by a user with the
# replication privilege.
local   replication     all                                     md5
host    replication     all             127.0.0.1/32            md5
host    replication     all             ::1/128                 md5

host replication ${replicationCredentials.user} 0.0.0.0/0 md5

host all all all md5
EOF
    `;

    const pghbaCustom = this.spec.accessConfig
      ? `EOF
# TYPE  DATABASE        USER            ADDRESS                 METHOD
host replication ${replicationCredentials.user} 0.0.0.0/0 md5
${this.spec.accessConfig
  .map(
    conf =>
      `${conf.type} ${conf.database} ${conf.user} ${conf.address} ${conf.method}`,
  )
  .join("\n")}
EOF
    `
      : "";

    if (this.spec.monitoring?.type === "pgAnalyze") {
      this.spec.options ??= {};
      this.spec.options.sharedPreloadLibraries = this.spec.options
        .sharedPreloadLibraries
        ? `${this.spec.options.sharedPreloadLibraries},pg_stat_statements`
        : "pg_stat_statements";
      this.spec.options.trackActivityQuerySize = 2048;
      this.spec.options["pgStatStatements.track"] = "all";

      this.spec.users ??= [];
      this.spec.users.push({
        username: "pganalyze",
        password: "pganalyze",
      });

      additionalContainers.push(
        ...(this.spec.databases ?? [])
          .map(databaseOrName =>
            typeof databaseOrName === "string"
              ? { name: databaseOrName }
              : databaseOrName,
          )
          .concat(
            ...(this.spec.monitoring.monitorPostgresDatabase
              ? [{ name: "postgres" }]
              : []),
          )
          .map<io.k8s.api.core.v1.Container>(database => ({
            name: `pganalyze-${database.name}`,
            image: "quay.io/pganalyze/collector:v0.33.1",
            command: ["/usr/local/bin/gosu"],
            args: [
              "pganalyze",
              "/home/pganalyze/collector",
              "--statefile=/state/pganalyze-collector.state",
              "--no-log-timestamps",
              "--no-logs",
              "--no-system-information",
            ],
            env: [
              {
                name: "PGA_API_KEY",
                value: this.spec.monitoring!.apiKey,
              },
              {
                name: "DB_HOST",
                value: this.metadata.name,
              },
              {
                name: "DB_NAME",
                value: database.name,
              },
              {
                name: "DB_USERNAME",
                value: "pganalyze",
              },
              {
                name: "DB_PASSWORD",
                value: "pganalyze",
              },
            ],
            resources: {
              limits: {
                cpu: "200m",
                memory: "50Mi",
              },
              requests: {
                cpu: "10m",
                memory: "50Mi",
              },
            },
          })),
      );
    }

    const options = {
      maxConnections: Math.max(100, mem / (8 * mebibyte)),
      sharedBuffers: `${Math.ceil(
        (mem * (mem > gibibyte ? 0.25 : 0.15)) / mebibyte,
      )}MB`,
      effectiveCacheSize: `${Math.ceil(mem / 2 / mebibyte)}MB`,
      ...masterReplicationOptions,
      ...commonReplicationOptions,
      ...(this.spec.options ?? {}),
    };

    const loggingConfigs = {
      logTruncateOnRotation: "on",
      logRotationAge: "1d",
      logFilename: "postgresql-%a.log",
      logRotationSize: 0,
      loggingCollector: "on",
      logDirectory: "/var/lib/postgresql/log",
    };

    const replicaOptions = {
      maxConnections: Math.max(
        100,
        parseMemory(this.spec.memory) / (8 * 1024 * 1024),
      ),
      ...replicaReplicationOptions,
      ...commonReplicationOptions,
      ...(this.spec.options ?? {}),
      ...(this.spec.optionsReplicas ?? {}),
      ...loggingConfigs,
    };

    const users = [
      ...(this.spec.readReplicas
        ? [
            {
              username: replicationCredentials.user,
              password: replicationCredentials.pass,
            },
          ]
        : []),
      ...(this.spec.users ?? []),
    ];

    const replicaStringOptions = Object.entries(replicaOptions)
      .flatMap(([key, value]) => [
        "-c",
        `${key.replace(/[A-Z]/gu, x => `_${x.toLowerCase()}`)}=` +
          `'${
            value === true
              ? "yes"
              : value === false
                ? "no"
                : value?.toString().replace(/'/gu, "'\"'\"'")
          }'`,
      ])
      .join(" ");

    return generateYaml([
      new Service(this.metadata, {
        selector: {
          app: this.metadata.name,
        },
        ports: [
          {
            name: "postgres",
            port: 5432,
          },
        ],
      }),

      new StatefulSet(this.metadata, {
        serviceName: this.metadata.name,
        replicas: 1,
        selector: {
          matchLabels: {
            app: this.metadata.name,
          },
        },
        template: {
          metadata: {
            labels: {
              app: this.metadata.name,
            },
          },
          spec: {
            initContainers: [
              ...(this.spec.readReplicas
                ? [
                    {
                      name: "pg-init",
                      image:
                        this.spec.customImage ??
                        `postgres:${this.spec.version}-alpine`,
                      imagePullPolicy: this.spec.imagePullPolicy ?? "Always",
                      env: [
                        ...(majorVersion >= 18
                          ? [
                              {
                                name: "PGDATA",
                                value: "/var/lib/postgresql/data",
                              },
                            ]
                          : []),
                        {
                          name: "POSTGRES_PASSWORD",
                          ...(this.spec.postgresUserPassword
                            ? typeof this.spec.postgresUserPassword === "object"
                              ? {
                                  valueFrom: {
                                    secretKeyRef: {
                                      name: this.spec.postgresUserPassword
                                        .secretName,
                                      key: this.spec.postgresUserPassword.key,
                                    },
                                  },
                                }
                              : {
                                  value: `${this.spec.postgresUserPassword}`,
                                }
                            : {
                                value: "postgres",
                              }),
                        },
                      ],
                      command: [
                        "/bin/bash",
                        "-ec",
                        `
                        echo Configuring Master...

                        sed -i -r -e "s/^postgres:(.*):\\/sbin\\/nologin$/postgres:\\1:\\/bin\\/sh/" /etc/passwd

                        echo Check if directory is empty...
                        if [ ! -f /var/lib/postgresql/data/postgresql.conf ]; then
                            echo Directory is empty. Initializing database...
                            chown postgres:postgres /var/lib/postgresql/data
                            su postgres -c "initdb -D /var/lib/postgresql/data"
                        fi

                        echo Done.
                      `,
                      ],
                      resources: {
                        limits: {
                          cpu: "100m",
                          memory: "128Mi",
                        },
                        requests: {
                          cpu: 0,
                          memory: "128Mi",
                        },
                      },
                      volumeMounts: [
                        {
                          mountPath: "/var/lib/postgresql/data",
                          name: "data",
                          subPath: "data",
                        },
                        {
                          mountPath: "/dev/shm",
                          name: "shm",
                        },
                      ],
                    },
                  ]
                : []),
              ...(this.spec.initContainers ?? []),
            ],
            automountServiceAccountToken: false,
            ...(this.spec.imagePullSecrets
              ? {
                  imagePullSecrets: this.spec.imagePullSecrets.map(secret => ({
                    name: secret,
                  })),
                }
              : {}),
            containers: [
              {
                name: "postgres",
                image:
                  this.spec.customImage ??
                  `postgres:${this.spec.version}-alpine`,
                args: [
                  "postgres",
                  ...Object.entries(options).flatMap(([key, value]) => [
                    "-c",
                    `${key.replace(/[A-Z]/gu, x => `_${x.toLowerCase()}`)}=` +
                      `${
                        value === true ? "yes" : value === false ? "no" : value
                      }`,
                  ]),
                ],
                env: [
                  ...(majorVersion >= 18
                    ? [
                        {
                          name: "PGDATA",
                          value: "/var/lib/postgresql/data",
                        },
                      ]
                    : []),
                  {
                    name: "POSTGRES_PASSWORD",
                    ...(this.spec.postgresUserPassword
                      ? typeof this.spec.postgresUserPassword === "object"
                        ? {
                            valueFrom: {
                              secretKeyRef: {
                                name: this.spec.postgresUserPassword.secretName,
                                key: this.spec.postgresUserPassword.key,
                              },
                            },
                          }
                        : {
                            value: `${this.spec.postgresUserPassword}`,
                          }
                      : {
                          value: "postgres",
                        }),
                  },
                ],
                imagePullPolicy: this.spec.imagePullPolicy ?? "Always",
                ports: [
                  {
                    name: "postgres",
                    containerPort: 5432,
                  },
                ],
                volumeMounts: [
                  {
                    mountPath: "/var/lib/postgresql/data",
                    name: "data",
                    subPath: "data",
                  },
                  {
                    mountPath: "/dev/shm",
                    name: "shm",
                  },
                ],
                resources: {
                  limits: {
                    cpu: this.spec.cpu.limit,
                    memory: this.spec.memory,
                  },
                  requests: {
                    cpu: this.spec.cpu.request,
                    memory: this.spec.memory,
                  },
                },
                readinessProbe: {
                  exec: {
                    command: probeCheck,
                  },
                  failureThreshold: 1,
                  periodSeconds: 3,
                },
                livenessProbe: {
                  exec: {
                    command: probeCheck,
                  },
                  failureThreshold: 2,
                  periodSeconds: 5,
                  initialDelaySeconds: 60,
                },
                ...this.spec.overrides,
              },
              {
                name: "setup",
                image:
                  this.spec.customImage ??
                  `postgres:${this.spec.version}-alpine`,
                imagePullPolicy: this.spec.imagePullPolicy ?? "Always",
                env: [
                  {
                    name: "POSTGRES_PASSWORD",
                    ...(this.spec.postgresUserPassword
                      ? typeof this.spec.postgresUserPassword === "object"
                        ? {
                            valueFrom: {
                              secretKeyRef: {
                                name: this.spec.postgresUserPassword.secretName,
                                key: this.spec.postgresUserPassword.key,
                              },
                            },
                          }
                        : {
                            value: `${this.spec.postgresUserPassword}`,
                          }
                      : {
                          value: "postgres",
                        }),
                  },
                ],
                command: [
                  "/bin/bash",
                  "-ec",
                  `
                  echo Exporting Postgres user password
                  export PGPASSWORD=$POSTGRES_PASSWORD

                  echo Wait for Postgres to be ready.
                  until psql -h 127.0.0.1 -U postgres -c 'SELECT 1'
                  do
                    echo Not ready yet. Trying again...
                    sleep 1
                  done
                  echo Postgres is ready.

                  function keep_alive {
                    trap 'echo Graceful shutdown; exit 0' SIGTERM
                    while :
                    do
                      sleep 999d &
                      wait $!
                    done
                  }

                  READ_ONLY=$(psql -h 127.0.0.1 -U postgres -qt -c 'SELECT pg_is_in_recovery()' | xargs)
                  if [ "$READ_ONLY" = "t" ]; then
                    echo Database is in read only mode
                    echo Setup will not execute
                    touch /ready
                    keep_alive
                  fi

                  echo Setting password for user postgres
                  psql -h 127.0.0.1 -U postgres -c "ALTER USER postgres ENCRYPTED PASSWORD '$POSTGRES_PASSWORD'"

                  USERS=$(psql -h 127.0.0.1 -U postgres -c "SELECT usename FROM pg_user WHERE NOT usesuper AND usename != 'pganalyze'" | tail -n+3 | sed '$d' | sed '$d')
                  DATABASES=$(psql -h 127.0.0.1 -U postgres -c 'SELECT datname FROM pg_database WHERE NOT datistemplate' | tail -n+3 | sed '$d' | sed '$d')
                  for user in $USERS
                  do
                    for database in $DATABASES
                    do
                      echo Revoke $user on $database
                      psql -h 127.0.0.1 -U postgres -c "REASSIGN OWNED BY \\"$user\\" TO postgres" "$database"
                      psql -h 127.0.0.1 -U postgres -c "REVOKE ALL PRIVILEGES ON DATABASE \\"$database\\" FROM \\"$user\\" CASCADE"
                      psql -h 127.0.0.1 -U postgres -c "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM \\"$user\\" CASCADE" "$database"
                      psql -h 127.0.0.1 -U postgres -c "REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM \\"$user\\" CASCADE" "$database"
                      psql -h 127.0.0.1 -U postgres -c "REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM \\"$user\\" CASCADE" "$database"
                      psql -h 127.0.0.1 -U postgres -c "REVOKE ALL PRIVILEGES ON ALL PROCEDURES IN SCHEMA public FROM \\"$user\\" CASCADE" "$database"
                      psql -h 127.0.0.1 -U postgres -c "REVOKE ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public FROM \\"$user\\" CASCADE" "$database"
                    done

                    ${
                      // Only drop users that should not exist
                      [...users, ...(this.spec.usersReadOnly ?? [])]
                        .map(
                          user => `
                          [ "$user" == '${user.username}' ] && continue
                        `,
                        )
                        .join("\n")
                    }

                    echo Dropping user $user
                    psql -h 127.0.0.1 -U postgres -c "DROP USER \\"$user\\""
                  done

                  ${users
                    .map(
                      user => `
                        echo Creating user ${user.username}...
                        psql -h 127.0.0.1 -U postgres -c "CREATE USER "'"${
                          user.username
                        }"'" ${
                          this.spec.readReplicas &&
                          user.username === replicationCredentials.user
                            ? "REPLICATION "
                            : ""
                        }ENCRYPTED PASSWORD '"'${user.password}'"'" || true
                        psql -h 127.0.0.1 -U postgres -c "ALTER USER "'"${
                          user.username
                        }"'"${
                          this.spec.readReplicas &&
                          user.username === replicationCredentials.user
                            ? "REPLICATION "
                            : ""
                        } ENCRYPTED PASSWORD '"'${user.password}'"'"
                      `,
                    )
                    .join("\n")}

                  ${(this.spec.databases ?? [])
                    .map(databaseOrName =>
                      typeof databaseOrName === "string"
                        ? { name: databaseOrName }
                        : databaseOrName,
                    )
                    .map(
                      database => `
                        echo Creating database ${database.name}...
                        psql -h 127.0.0.1 -U postgres -c 'CREATE DATABASE "${
                          database.name
                        }"' || true

                        ${(database.users ?? [])
                          .map(
                            user => `
                              echo Granting privileges on database ${database.name} to user ${user}...
                              psql -h 127.0.0.1 -U postgres -c 'GRANT CONNECT, CREATE, TEMPORARY ON DATABASE "${database.name}" TO "${user}"'
                              psql -h 127.0.0.1 -U postgres -c 'GRANT ALL PRIVILEGES ON SCHEMA public TO "${user}"' "${database.name}"
                              psql -h 127.0.0.1 -U postgres -c 'GRANT ALL ON ALL TABLES IN SCHEMA public TO "${user}"' "${database.name}"
                              psql -h 127.0.0.1 -U postgres -c 'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO "${user}"' "${database.name}"
                              psql -h 127.0.0.1 -U postgres -c 'GRANT ALL ON ALL ROUTINES IN SCHEMA public TO "${user}"' "${database.name}"
                              psql -h 127.0.0.1 -U postgres -c 'GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO "${user}"' "${database.name}"
                              psql -h 127.0.0.1 -U postgres -c 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO "${user}"' "${database.name}"
                              psql -h 127.0.0.1 -U postgres -c 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO "${user}"' "${database.name}"
                              psql -h 127.0.0.1 -U postgres -c 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TYPES TO "${user}"' "${database.name}"
                              psql -h 127.0.0.1 -U postgres -c 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON ROUTINES TO "${user}"' "${database.name}"
                              psql -h 127.0.0.1 -U postgres -c 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO "${user}"' "${database.name}"
                            `,
                          )
                          .join("\n")}
                      `,
                    )
                    .join("\n")}

                  ${
                    // Read-only users run AFTER database creation so GRANT CONNECT
                    // targets databases that already exist (setup runs under set -e).
                    (this.spec.usersReadOnly ?? [])
                      .map(user => {
                        const readOnlyDatabases = (
                          this.spec.databases ?? []
                        ).map(databaseOrName =>
                          typeof databaseOrName === "string"
                            ? databaseOrName
                            : databaseOrName.name,
                        );
                        return `
                          echo Creating read-only user ${user.username}...
                          psql -h 127.0.0.1 -U postgres -c "CREATE USER "'"${user.username}"'" ENCRYPTED PASSWORD '"'${user.password}'"'" || true
                          psql -h 127.0.0.1 -U postgres -c "ALTER USER "'"${user.username}"'" ENCRYPTED PASSWORD '"'${user.password}'"'"
                          ${readOnlyDatabases
                            .map(
                              database =>
                                `psql -h 127.0.0.1 -U postgres -c 'GRANT CONNECT ON DATABASE "${database}" TO "${user.username}"'`,
                            )
                            .join("\n                          ")}
                          ${
                            majorVersion >= 14
                              ? `psql -h 127.0.0.1 -U postgres -c 'GRANT pg_read_all_data TO "${user.username}"'`
                              : readOnlyDatabases
                                  .map(
                                    database => `
                          psql -h 127.0.0.1 -U postgres -c 'GRANT USAGE ON SCHEMA public TO "${user.username}"' "${database}"
                          psql -h 127.0.0.1 -U postgres -c 'GRANT SELECT ON ALL TABLES IN SCHEMA public TO "${user.username}"' "${database}"
                          psql -h 127.0.0.1 -U postgres -c 'GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO "${user.username}"' "${database}"
                          psql -h 127.0.0.1 -U postgres -c 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO "${user.username}"' "${database}"
                          psql -h 127.0.0.1 -U postgres -c 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO "${user.username}"' "${database}"`,
                                  )
                                  .join("\n")
                          }
                        `;
                      })
                      .join("\n")
                  }

                  ${
                    this.spec.monitoring?.type === "pgAnalyze"
                      ? (this.spec.databases ?? [])
                          .map(databaseOrName =>
                            typeof databaseOrName === "string"
                              ? { name: databaseOrName }
                              : databaseOrName,
                          )
                          .concat(
                            ...(this.spec.monitoring.monitorPostgresDatabase
                              ? [{ name: "postgres" }]
                              : []),
                          )
                          .map(
                            database => `
                              echo Setting up PgAnalyze on database ${database.name}...
                              psql -h 127.0.0.1 -U postgres -c 'CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;' "${database.name}"
                              psql -h 127.0.0.1 -U postgres -c 'CREATE SCHEMA IF NOT EXISTS pganalyze;' "${database.name}"
                              echo -e "CREATE OR REPLACE FUNCTION pganalyze.get_stat_statements(showtext boolean = true) RETURNS SETOF pg_stat_statements AS\\n\\$\\$\\n/* pganalyze-collector */ SELECT * FROM public.pg_stat_statements(showtext);\\n\\$\\$ LANGUAGE sql VOLATILE SECURITY DEFINER;" | psql -h 127.0.0.1 -U postgres "${database.name}"
                              echo -e "CREATE OR REPLACE FUNCTION pganalyze.get_stat_activity() RETURNS SETOF pg_stat_activity AS\\n\\$\\$\\n  /* pganalyze-collector */ SELECT * FROM pg_catalog.pg_stat_activity;\\n\\$\\$ LANGUAGE sql VOLATILE SECURITY DEFINER;" | psql -h 127.0.0.1 -U postgres "${database.name}"
                              echo -e "CREATE OR REPLACE FUNCTION pganalyze.get_column_stats() RETURNS SETOF pg_stats AS\\n\\$\\$\\n  /* pganalyze-collector */ SELECT schemaname, tablename, attname, inherited, null_frac, avg_width,\\n  n_distinct, NULL::anyarray, most_common_freqs, NULL::anyarray, correlation, NULL::anyarray,\\n  most_common_elem_freqs, elem_count_histogram\\n  FROM pg_catalog.pg_stats;\\n\\$\\$ LANGUAGE sql VOLATILE SECURITY DEFINER;" | psql -h 127.0.0.1 -U postgres "${database.name}"
                              echo -e "CREATE OR REPLACE FUNCTION pganalyze.get_stat_replication() RETURNS SETOF pg_stat_replication AS\\n\\$\\$\\n  /* pganalyze-collector */ SELECT * FROM pg_catalog.pg_stat_replication;\\n\\$\\$ LANGUAGE sql VOLATILE SECURITY DEFINER;" | psql -h 127.0.0.1 -U postgres "${database.name}"
                              psql -h 127.0.0.1 -U postgres -c "REVOKE ALL ON SCHEMA public FROM pganalyze;" "${database.name}"
                              psql -h 127.0.0.1 -U postgres -c "GRANT USAGE ON SCHEMA pganalyze TO pganalyze;" "${database.name}"
                            `,
                          )
                          .join("\n")
                      : ""
                  }

                  echo Configuring pg_hba.conf...
                  cat > /db_data/pg_hba.conf << ${
                    this.spec.accessConfig ? pghbaCustom : pghba
                  }

                  psql -h 127.0.0.1 -U postgres -c "SELECT pg_reload_conf();"

                  echo Done.
                  touch /ready
                  keep_alive
                `,
                ],
                resources: {
                  limits: {
                    cpu: "100m",
                    memory: "20Mi",
                  },
                  requests: {
                    cpu: 0,
                    memory: "20Mi",
                  },
                },
                readinessProbe: {
                  exec: {
                    command: ["cat", "/ready"],
                  },
                  failureThreshold: 1,
                  periodSeconds: 3,
                },
                volumeMounts: [
                  {
                    name: "data",
                    mountPath: "/db_data/",
                    subPath: "data",
                  },
                ],
              },
              ...additionalContainers,
            ],
            volumes: [
              {
                name: "shm",
                emptyDir: {
                  medium: "Memory" as const,
                },
              },
            ],
            tolerations: this.spec.tolerations,
            nodeSelector: this.spec.nodeSelector,
            affinity: this.spec.affinity,
          },
        },
        volumeClaimTemplates: [
          {
            metadata: {
              name: "data",
            },
            spec: {
              accessModes: ["ReadWriteOnce"],
              resources: {
                requests: {
                  storage: this.spec.storageRequest ?? "2Gi",
                },
              },
              storageClassName: this.spec.storageClassName,
            },
          },
        ],
      }),

      ...(this.spec.readReplicas
        ? [
            new Service(
              { ...this.metadata, name: `${this.metadata.name}-replica` },
              {
                selector: {
                  app: `${this.metadata.name}-replica`,
                },
                ports: [
                  {
                    name: "pg-replica",
                    port: 5432,
                  },
                ],
              },
            ),
            new StatefulSet(
              { ...this.metadata, name: `${this.metadata.name}-replica` },
              {
                serviceName: `${this.metadata.name}-replica`,
                replicas: this.spec.readReplicas,
                selector: {
                  matchLabels: {
                    app: `${this.metadata.name}-replica`,
                  },
                },
                template: {
                  metadata: {
                    labels: {
                      app: `${this.metadata.name}-replica`,
                    },
                  },
                  spec: {
                    initContainers: this.spec.initContainers,
                    automountServiceAccountToken: false,
                    ...(this.spec.imagePullSecrets
                      ? {
                          imagePullSecrets: this.spec.imagePullSecrets.map(
                            secret => ({
                              name: secret,
                            }),
                          ),
                        }
                      : {}),
                    containers: [
                      {
                        name: "pg-replica",
                        image:
                          this.spec.customImage ??
                          `postgres:${this.spec.version}-alpine`,
                        env: [
                          {
                            name: "POSTGRES_PASSWORD",
                            ...(this.spec.postgresUserPassword
                              ? typeof this.spec.postgresUserPassword ===
                                "object"
                                ? {
                                    valueFrom: {
                                      secretKeyRef: {
                                        name: this.spec.postgresUserPassword
                                          .secretName,
                                        key: this.spec.postgresUserPassword.key,
                                      },
                                    },
                                  }
                                : {
                                    value: `${this.spec.postgresUserPassword}`,
                                  }
                              : {
                                  value: "postgres",
                                }),
                          },
                        ],
                        imagePullPolicy: this.spec.imagePullPolicy ?? "Always",
                        ports: [
                          {
                            name: "pg-replica",
                            containerPort: 5432,
                          },
                        ],
                        command: [
                          "/bin/bash",
                          "-ec",
                          `
                            echo Configuring Replica...

                            echo Checking if standby signal exists...
                            if [ ! -f /var/lib/postgresql/data/standby.signal ]; then
                                echo Signal not found. Cleaning up...
                                rm -rf /var/lib/postgresql/data/*
                                rm -rf /var/lib/postgresql/log/*
                                echo Proceeding to base backup from master...
                                PGPASSWORD=${
                                  replicationCredentials.pass
                                } pg_basebackup -h ${this.metadata.name} -U ${
                                  replicationCredentials.user
                                } -p 5432 -D /var/lib/postgresql/data -Fp -Xs -P -R
                            fi

                            echo Configuring pg_hba.conf...
                            cat > /var/lib/postgresql/data/pg_hba.conf << ${
                              this.spec.accessConfig ? pghbaCustom : pghba
                            }

                            echo Done.

                            chown -R postgres:postgres /var/lib/postgresql/data
                            chown -R postgres:postgres /var/lib/postgresql/log
                            chmod 700 -R /var/lib/postgresql/data
                            chmod 700 -R /var/lib/postgresql/log
                            sed -i -r -e "s/^postgres:(.*):\\/sbin\\/nologin$/postgres:\\1:\\/bin\\/sh/" /etc/passwd
                            su postgres -c "postgres ${replicaStringOptions}"
                          `,
                        ],
                        volumeMounts: [
                          {
                            mountPath: "/var/lib/postgresql/data",
                            name: "data",
                            subPath: "data",
                          },
                          {
                            mountPath: "/dev/shm",
                            name: "shm",
                          },
                          {
                            mountPath: "/var/lib/postgresql/log",
                            name: "logs",
                          },
                        ],
                        resources: {
                          limits: {
                            cpu: this.spec.cpu.limit,
                            memory: this.spec.memory,
                          },
                          requests: {
                            cpu: this.spec.cpu.request,
                            memory: this.spec.memory,
                          },
                        },
                        readinessProbe: {
                          exec: {
                            command: probeCheck,
                          },
                          failureThreshold: 1,
                          periodSeconds: 3,
                        },
                        livenessProbe: {
                          exec: {
                            command: probeCheck,
                          },
                          failureThreshold: 2,
                          periodSeconds: 5,
                          initialDelaySeconds: 60,
                        },
                        ...this.spec.overrides,
                      },
                      {
                        name: "pg-monitor",
                        image: `bash:5.0.18`,
                        imagePullPolicy: this.spec.imagePullPolicy ?? "Always",
                        env: [],
                        command: [
                          "/usr/local/bin/bash",
                          "-ec",
                          `
                          while true; do
                            FILES=$(ls /var/lib/postgresql/log)
                            for file in $FILES
                            do
                              echo Analyzing $file
                              if grep "requested WAL segment.*has already been removed" /var/lib/postgresql/log/$file; then
                                echo Replica is too far behind. Cleaning up...
                                rm -rf /var/lib/postgresql/data/*
                                rm -rf /var/lib/postgresql/log/*
                                exit 1
                              fi
                            done
                            sleep 30
                          done
                        `,
                        ],
                        resources: {
                          limits: {
                            cpu: "100m",
                            memory: "32Mi",
                          },
                          requests: {
                            cpu: 0,
                            memory: "16Mi",
                          },
                        },
                        volumeMounts: [
                          {
                            mountPath: "/var/lib/postgresql/log",
                            name: "logs",
                          },
                          {
                            mountPath: "/var/lib/postgresql/data",
                            name: "data",
                            subPath: "data",
                          },
                        ],
                      },
                    ],
                    volumes: [
                      {
                        name: "shm",
                        emptyDir: {
                          medium: "Memory" as const,
                        },
                      },
                      {
                        name: "logs",
                        emptyDir: {},
                      },
                    ],
                  },
                },
                volumeClaimTemplates: [
                  {
                    metadata: {
                      name: "data",
                    },
                    spec: {
                      accessModes: ["ReadWriteOnce"],
                      resources: {
                        requests: {
                          storage: this.spec.storageRequest ?? "2Gi",
                        },
                      },
                      storageClassName: this.spec.storageClassName,
                    },
                  },
                ],
              },
            ),
          ]
        : []),
    ]);
  }
}
