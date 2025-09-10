// Run once as admin to install the Agent as a Windows service
const Service = require("node-windows").Service;
const svc = new Service({
  name: "PrintCraftAgent",
  description: "Raw print agent for PrintCraft Studio",
  script: require("path").join(__dirname, "index.js"),
});
svc.on("install", () => svc.start());
svc.install();
