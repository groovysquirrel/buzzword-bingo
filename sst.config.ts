/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "buzzword-bingo",
      removal: "remove",
      home: "aws",
    };
  },
  async run() {
    await import("./infra/api");
    await import("./infra/web");
    await import("./infra/storage");
    await import("./infra/websocket");
    const auth = await import("./infra/auth");

    return {
      UserPool: auth.userPool.id,
      Region: aws.getRegionOutput().name,
      IdentityPool: auth.identityPool.id,
      UserPoolClient: auth.userPoolClient.id,
    };
  },
});
