const fs = require("fs");
const path = require("path");

const target = path.join(
  __dirname,
  "..",
  "node_modules",
  "react-native-iap",
  "android",
  "src",
  "play",
  "java",
  "com",
  "dooboolab",
  "rniap",
  "RNIapModule.kt",
);

if (!fs.existsSync(target)) {
  console.log("[patch-react-native-iap] target not found, skipping");
  process.exit(0);
}

const src = fs.readFileSync(target, "utf8");
const from = "val activity = currentActivity";
const to = "val activity = reactContext.currentActivity";

if (src.includes(to)) {
  console.log("[patch-react-native-iap] already patched");
  process.exit(0);
}

if (!src.includes(from)) {
  console.log("[patch-react-native-iap] pattern not found, skipping");
  process.exit(0);
}

const next = src.replace(from, to);
fs.writeFileSync(target, next, "utf8");
console.log("[patch-react-native-iap] patched");
