try {
  const Tasks = require('./Tasks.cjs').default;
  Tasks.render({});
  console.log("RENDER SUCCESS");
} catch(e) {
  console.log("RUNTIME ERROR:", e.toString(), "STACK:", e.stack);
}
