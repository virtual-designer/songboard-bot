import Application from "./core/Application";

async function main() {
    const application = new Application();
    await application.boot();
    await application.start();
}

export default main();
