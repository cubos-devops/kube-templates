import type { io } from "./generated";
import { generateYaml, mappedEnvs, parseMemory } from "./helpers";
import type { ObjectMeta } from "./kubernetes";
import { CronJob } from "./kubernetes";

type EnvValue =
  | string
  | number
  | { secretName: string; key: string }
  | { fieldPath: string };

export type EmptyDirVolume = {
  type: "emptyDir";
  mountPath: string;
} & (
  | {
      medium?: undefined;
      /**
       * On disk, going over the limit does not fail the write with "disk
       * full": the kubelet evicts the pod. Leave headroom and delete files the
       * app no longer needs.
       */
      sizeLimit?: string;
    }
  | {
      /**
       * Backs the volume with tmpfs, which counts against the container
       * memory limit. Without a size the tmpfs grows until the container is
       * OOMKilled, so `sizeLimit` is required.
       */
      medium: "Memory";
      /**
       * Size of the tmpfs: a write past it fails with "disk full". It must be
       * smaller than the container memory limit, which the process also
       * needs; the YAML generation throws otherwise.
       */
      sizeLimit: string;
    }
);

export function assertMemoryEmptyDirFits(
  volume: EmptyDirVolume,
  memoryLimit: string | number,
) {
  if (
    volume.medium === "Memory" &&
    parseMemory(volume.sizeLimit) >= parseMemory(memoryLimit)
  ) {
    throw new Error(
      `The sizeLimit of the Memory emptyDir at ${volume.mountPath} must be smaller than the container memory limit`,
    );
  }
}

interface CronSpec {
  schedule: string;
  image: string;
  args?: string[];
  command?: string[];
  envs?: Record<string, EnvValue>;
  timeoutSeconds?: number;
  forwardEnvs?: string[];
  secretEnvs?: string[];
  cpu: {
    request: string | number;
    limit: string | number;
  };
  memory: {
    request: string | number;
    limit: string | number;
  };
  volumes?: Array<
    | {
        type: "configMap" | "secret";
        optional?: boolean;
        readOnly?: boolean;
        name: string;
        mountPath: string;
        items?: Array<{ key: string; path: string }>;
      }
    | EmptyDirVolume
  >;
  backoffLimit?: number;
  labels?: Record<string, string>;
  imagePullSecrets?: string[];
  allowConcurrentExecution?: boolean;
  serviceAccountName?: string;
  /**
   * @deprecated does nothing! kept only for compatibility purposes
   */
  disablePreemptibility?: boolean;
}

export class Cron {
  constructor(
    private metadata: ObjectMeta,
    private spec: CronSpec,
  ) {}

  get yaml() {
    const volumes: io.k8s.api.core.v1.Volume[] = [];
    const volumeMounts: io.k8s.api.core.v1.VolumeMount[] = [];

    for (const volume of this.spec.volumes ?? []) {
      const name = `vol-${volume.mountPath.replace(/[^a-zA-Z0-9]/gu, "")}`;

      if (volume.type === "emptyDir") {
        assertMemoryEmptyDirFits(volume, this.spec.memory.limit);
        volumes.push({
          name,
          emptyDir: { medium: volume.medium, sizeLimit: volume.sizeLimit },
        });
        volumeMounts.push({ name, mountPath: volume.mountPath });
        continue;
      }

      if (volume.type === "secret") {
        volumes.push({
          name,
          secret: {
            secretName: volume.name,
            items: volume.items,
            optional: volume.optional ?? false,
          },
        });
      } else {
        volumes.push({
          name,
          [volume.type]: {
            name: volume.name,
            items: volume.items,
            optional: volume.optional ?? false,
          },
        });
      }

      volumeMounts.push({
        name,
        readOnly: volume.readOnly ?? true,
        mountPath: volume.mountPath,
      });
    }

    const basicPodSpec = {
      ...(this.spec.imagePullSecrets?.length
        ? {
            imagePullSecrets: this.spec.imagePullSecrets.map(name => ({
              name,
            })),
          }
        : this.spec.image.startsWith("registry.cubos.io")
          ? { imagePullSecrets: [{ name: "gitlab-registry" }] }
          : {}),
      automountServiceAccountToken: Boolean(this.spec.serviceAccountName),
      serviceAccountName: this.spec.serviceAccountName,
    };

    return generateYaml([
      new CronJob(this.metadata, {
        schedule: this.spec.schedule,
        concurrencyPolicy: this.spec.allowConcurrentExecution
          ? "Allow"
          : "Forbid",
        jobTemplate: {
          spec: {
            template: {
              metadata: {
                labels: this.spec.labels,
              },
              spec: {
                ...basicPodSpec,
                volumes,
                containers: [
                  {
                    name: this.metadata.name,
                    image: this.spec.image,
                    args: this.spec.args,
                    command: this.spec.command,
                    env: mappedEnvs(this.spec),
                    envFrom: (this.spec.secretEnvs ?? []).map(name => ({
                      secretRef: {
                        name,
                      },
                    })),
                    volumeMounts,
                    resources: {
                      limits: {
                        cpu: this.spec.cpu.limit,
                        memory: this.spec.memory.limit,
                      },
                      requests: {
                        cpu: this.spec.cpu.request,
                        memory: this.spec.memory.request,
                      },
                    },
                  },
                ],
                restartPolicy: "Never",
                activeDeadlineSeconds: this.spec.timeoutSeconds,
              },
            },
            ...(this.spec.backoffLimit === undefined
              ? {}
              : { backoffLimit: this.spec.backoffLimit }),
          },
        },
      }),
    ]);
  }
}
