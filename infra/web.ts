import { api } from "./api";
import { bucket } from "./storage";
import { userPool, identityPool, userPoolClient } from "./auth";

const region = aws.getRegionOutput().name;

export const frontend = new sst.aws.StaticSite("Frontend", {
  path: "packages/frontend",
  build: {
    output: "dist",
    command: "npm run build",
  },
  domain: $app.stage === "prod"
    ? { name: "buzzwordbingo.live", aliases: ["www.buzzwordbingo.live"] }
    : $app.stage.startsWith("version")
    ? { name: `v${$app.stage.slice(7)}.buzzwordbingo.live` }
    : { name: "dev.buzzwordbingo.live" },
  environment: {
    VITE_REGION: region,
    VITE_API_URL: api.url,
    VITE_BUCKET: bucket.name,
    VITE_USER_POOL_ID: userPool.id,
    VITE_IDENTITY_POOL_ID: identityPool.id,
    VITE_USER_POOL_CLIENT_ID: userPoolClient.id,
  },
});
