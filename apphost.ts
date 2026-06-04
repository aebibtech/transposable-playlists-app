// Aspire TypeScript AppHost
// For more information, see: https://aspire.dev

import { createBuilder } from './.modules/aspire.js';

const builder = await createBuilder();

const proxy = await builder.addViteApp("proxy", ".", {
  runScriptName: "server:dev"
});
await builder.addViteApp("frontend", ".")
  .withReference(proxy)
  .withEnvironment("VITE_PROXY_URL", proxy.getEndpoint("http"));

await builder.build().run();
