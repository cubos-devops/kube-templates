import { loadAll } from "js-yaml";
import { StatelessApp } from "../../src/statelessapp";
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
      volumes: [{ type: "emptyDir", mountPath: "/cache", medium: "Memory" }],
    });

    expect(getPodSpec(app).volumes).toEqual([
      { name: "vol-cache", emptyDir: { medium: "Memory" } },
    ]);
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
