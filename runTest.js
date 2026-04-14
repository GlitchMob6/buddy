const Tasks = require('./Tasks.cjs').default;
try {
  Tasks.render({});
  console.log("RENDER SUCCESS");
} catch(e) {
  console.log("RUNTIME ERROR:", e);
}
