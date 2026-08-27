import { dump } from "js-yaml";

import type { StatelessAppSpec } from "./statelessapp";

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

function stripUndefinedProperties(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(stripUndefinedProperties);
  } else if (typeof obj === "object" && obj) {
    const newObj: any = {};

    for (const prop of Object.keys(obj)) {
      const value = obj[prop];

      if (value === undefined) {
        continue;
      }

      if (Array.isArray(value) && value.length === 0) {
        continue;
      }

      newObj[prop] = stripUndefinedProperties(value);
    }

    return newObj;
  }

  return obj;
}

export function generateYaml(objects: any[]) {
  return objects
    .map(obj => {
      if ("yaml" in obj) {
        return obj.yaml;
      }

      return `---\n${dump(stripUndefinedProperties(obj), {
        noRefs: true,
        sortKeys: true,
        noArrayIndent: true,
      })}`;
    })
    .join("\n");
}

export function configFactory<T extends Record<string, string | undefined>>(
  obj: T,
  name: string,
) {
  return new Proxy(obj, {
    get: (configObj, prop) => {
      if (!(prop in configObj)) {
        throw new Error(`${name} ${String(prop)} not defined`);
      }

      return configObj[String(prop)];
    },
  }) as Record<string, string>;
}

export const env = configFactory(process.env, "Environment variable");

export function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

export function parseMemory(memory: string | number) {
  if (typeof memory === "number") {
    return memory;
  }

  const str = memory
    .replace(/\s/gu, "")
    .replace(/e\d+$/u, n =>
      new Array(parseInt(n.slice(1), 10)).fill("0").join(""),
    );

  let i = 0;

  for (const letter of ["K", "M", "G", "T", "P", "E"]) {
    i += 1;

    const match = new RegExp(`^(\\d+)${letter}(i?)$`, "iu").exec(str);

    if (match) {
      const base = parseInt(match[1], 10);
      const multiplier = (match[2] ? 1024 : 1000) ** i;

      return base * multiplier;
    }
  }

  throw new Error(`Unrecognized memory format: '${memory}'`);
}

export function mappedEnvs(
  spec: Pick<StatelessAppSpec, "envs" | "forwardEnvs">,
) {
  const envs = Object.entries(spec.envs ?? {}).map(([name, value]) => {
    if (typeof value === "object") {
      if ("secretName" in value) {
        return {
          name,
          valueFrom: {
            secretKeyRef: {
              name: value.secretName,
              key: value.key,
            },
          },
        };
      } else if ("fieldPath" in value) {
        return {
          name,
          valueFrom: {
            fieldRef: {
              fieldPath: value.fieldPath,
            },
          },
        };
      }
    }

    return {
      name,
      value: `${value}`,
    };
  });

  const forwardedEnvs = (spec.forwardEnvs ?? []).map(key => ({
    name: key,
    value: env[key],
  }));

  return [...envs, ...forwardedEnvs];
}

export function getRepositoryProvider(): Record<string, string> | null {
  if (process.env.GITHUB_ACTIONS) {
    return {
      "app.kubernetes.io/source-repo": `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}`,
    };
  }

  if (process.env.GITLAB_CI) {
    return { "app.kubernetes.io/source-repo": env.CI_PROJECT_URL };
  }

  return null;
}

const ingressClasses = [
  "alb",
  "internal",
  "nginx",
  "private",
  "public",
  "security-nginx",
  "traefik",
] as const;

export type IngressClasses = (typeof ingressClasses)[number];

export function isValidIngressClass(ingressClassName: IngressClasses): boolean {
  return ingressClasses.includes(ingressClassName);
}
