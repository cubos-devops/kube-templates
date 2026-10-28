import { loadAll } from "js-yaml";
import { StatelessApp, type StatelessAppSpec } from "../../src/statelessapp";
import { basicAppMetadataConfig, basicAppSpecConfig } from "./fixture";

function getDocs(app: StatelessApp): any[] {
  return loadAll(app.yaml) as any[];
}

function getPodSpec(app: StatelessApp): any {
  return getDocs(app).find(doc => doc?.kind === "Deployment").spec.template
    .spec;
}

describe("statelessApp volumes", () => {
  it("should mount an emptyDir volume as writable", () => {
    const app = new StatelessApp(basicAppMetadataConfig, {
      ...basicAppSpecConfig,
      volumes: [{ type: "emptyDir", mountPath: "/tmp", sizeLimit: "1Gi" }],
    });

    const podSpec = getPodSpec(app);

    expect(podSpec.volumes).toEqual([
      { name: "vol-tmp", emptyDir: { sizeLimit: "1Gi" } },
    ]);
    expect(podSpec.containers[0].volumeMounts).toEqual([
      { name: "vol-tmp", mountPath: "/tmp" },
    ]);
  });

  it("should pass the emptyDir medium through", () => {
    const app = new StatelessApp(basicAppMetadataConfig, {
      ...basicAppSpecConfig,
      volumes: [
        {
          type: "emptyDir",
          mountPath: "/cache",
          medium: "Memory",
          sizeLimit: "64Mi",
        },
      ],
    });

    expect(getPodSpec(app).volumes).toEqual([
      { name: "vol-cache", emptyDir: { medium: "Memory", sizeLimit: "64Mi" } },
    ]);
  });

  it("should require a sizeLimit on a Memory emptyDir", () => {
    const spec: StatelessAppSpec = {
      ...basicAppSpecConfig,
      volumes: [
        // @ts-expect-error tmpfs without a sizeLimit can OOMKill the container
        { type: "emptyDir", mountPath: "/cache", medium: "Memory" },
      ],
    };

    expect(spec.volumes).toHaveLength(1);
  });

  it("should throw when a Memory emptyDir does not fit in the memory limit", () => {
    const app = new StatelessApp(basicAppMetadataConfig, {
      ...basicAppSpecConfig,
      volumes: [
        {
          type: "emptyDir",
          mountPath: "/cache",
          medium: "Memory",
          sizeLimit: "512Mi",
        },
      ],
    });

    expect(() => app.yaml).toThrow(
      "The sizeLimit of the Memory emptyDir at /cache must be smaller than the container memory limit",
    );
  });

  it("should check a Memory emptyDir against the cron memory limit", () => {
    const app = new StatelessApp(basicAppMetadataConfig, {
      ...basicAppSpecConfig,
      volumes: [
        {
          type: "emptyDir",
          mountPath: "/cache",
          medium: "Memory",
          sizeLimit: "256Mi",
        },
      ],
      crons: [
        {
          name: "cleanup",
          schedule: "0 * * * *",
          command: ["cleanup"],
          args: [],
          memory: { limit: "128Mi" },
        },
      ],
    });

    expect(() => app.yaml).toThrow(
      "The sizeLimit of the Memory emptyDir at /cache must be smaller than the container memory limit",
    );
  });

  it("should keep secret volumes read-only by default next to an emptyDir", () => {
    const app = new StatelessApp(basicAppMetadataConfig, {
      ...basicAppSpecConfig,
      volumes: [
        { type: "secret", name: "certs", mountPath: "/certs" },
        { type: "emptyDir", mountPath: "/tmp" },
      ],
    });

    const podSpec = getPodSpec(app);

    expect(podSpec.volumes).toEqual([
      { name: "vol-certs", secret: { secretName: "certs", optional: false } },
      { name: "vol-tmp", emptyDir: {} },
    ]);
    expect(podSpec.containers[0].volumeMounts).toEqual([
      { name: "vol-certs", readOnly: true, mountPath: "/certs" },
      { name: "vol-tmp", mountPath: "/tmp" },
    ]);
  });

  it("should mount the emptyDir on the app crons", () => {
    const app = new StatelessApp(basicAppMetadataConfig, {
      ...basicAppSpecConfig,
      volumes: [{ type: "emptyDir", mountPath: "/tmp" }],
      crons: [
        {
          name: "cleanup",
          schedule: "0 * * * *",
          command: ["cleanup"],
          args: [],
        },
      ],
    });

    const cronJob = getDocs(app).find(doc => doc?.kind === "CronJob");
    const podSpec = cronJob.spec.jobTemplate.spec.template.spec;

    expect(podSpec.volumes).toEqual([{ name: "vol-tmp", emptyDir: {} }]);
    expect(podSpec.containers[0].volumeMounts).toEqual([
      { name: "vol-tmp", mountPath: "/tmp" },
    ]);
  });
});
