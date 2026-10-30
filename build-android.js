const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 1. Ensure JAVA_HOME is set to Android Studio JBR
const jbrPath = 'C:\\Program Files\\Android\\Android Studio\\jbr';
if (fs.existsSync(jbrPath)) {
  process.env.JAVA_HOME = jbrPath;
  process.env.PATH = `${jbrPath}\\bin;${process.env.PATH}`;
}

const target = (process.argv[2] || 'aab').toLowerCase();

// 2. Prebuild if android/ directory does not exist
const androidDir = path.join(__dirname, 'android');
if (!fs.existsSync(androidDir)) {
  console.log('Generating Android native project files...');
  spawnSync('npx', ['expo', 'prebuild', '--platform', 'android'], {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
}

// Patch gradlew.bat with JBR fallback if prebuild was freshly run
const gradlewBat = path.join(androidDir, 'gradlew.bat');
if (fs.existsSync(gradlewBat)) {
  let content = fs.readFileSync(gradlewBat, 'utf8');
  if (!content.includes('Android Studio\\jbr')) {
    content = content.replace(
      'if defined JAVA_HOME goto findJavaFromJavaHome',
      'if not defined JAVA_HOME if exist "C:\\Program Files\\Android\\Android Studio\\jbr\\bin\\java.exe" set "JAVA_HOME=C:\\Program Files\\Android\\Android Studio\\jbr"\r\nif defined JAVA_HOME goto findJavaFromJavaHome'
    );
    fs.writeFileSync(gradlewBat, content, 'utf8');
  }
}

// 3. Determine Gradle task and output path
let task = 'bundleRelease';
let outputType = 'AAB (Android App Bundle)';
let outputPath = 'android/app/build/outputs/bundle/release/app-release.aab';

if (target === 'apk-debug' || target === 'debug') {
  task = 'assembleDebug';
  outputType = 'Debug APK';
  outputPath = 'android/app/build/outputs/apk/debug/app-debug.apk';
} else if (target === 'apk') {
  task = 'assembleRelease';
  outputType = 'Release APK';
  outputPath = 'android/app/build/outputs/apk/release/app-release.apk';
}

console.log('\n========================================');
console.log(`Building ${outputType}...`);
console.log(`Executing: .\\gradlew ${task}`);
console.log('========================================\n');

const result = spawnSync('.\\gradlew', [task], {
  cwd: androidDir,
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

if (result.status === 0) {
  console.log('\n========================================');
  console.log(`✔ SUCCESS! ${outputType} is ready:`);
  console.log(`📁 ${path.resolve(__dirname, outputPath)}`);
  console.log('========================================\n');
} else {
  console.error(`\n✖ Build failed with code ${result.status}`);
  process.exit(result.status || 1);
}
