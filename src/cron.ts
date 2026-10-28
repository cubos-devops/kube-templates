import type { io } from "./generated";
import { generateYaml, mappedEnvs } from "./helpers";
import type { ObjectMeta } from "./kubernetes";
import { CronJob } from "./kubernetes";

type EnvValue =
  | string
  | number
  | { secretName: string; key: string }
  | { fieldPath: string };

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
    | {
        type: "emptyDir";
        mountPath: string;
        /**
         * "Memory" backs the volume with tmpfs: everything written counts
         * against the container memory limit, so without a `sizeLimit` a
         * large write ends in an OOMKill.
         */
        medium?: "Memory";
        /**
         * Going over the limit does not fail the write with "disk full": the
         * kubelet evicts the pod. Leave headroom and delete files the app no
         * longer needs.
         */
        sizeLimit?: string;
      }
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
