import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MODPACK = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const AS3 = join(MODPACK, 'as3');
const CACHE = join(AS3, '.cache');
const ROYALE_PACKAGE = '@apache-royale/royale-js-swf';
const ROYALE_VERSION = '0.9.12';
const ROYALE_HOME = join(CACHE, 'royale');
const ROYALE = join(ROYALE_HOME, 'node_modules', ROYALE_PACKAGE);
const JARS = join(ROYALE, 'royale-asjs', 'js', 'lib');
const TYPEDEFS = join(ROYALE, 'royale-typedefs', 'airglobal', 'src', 'main');
const PLAYERGLOBAL = join(CACHE, 'playerglobal.swc');
const PLAYERGLOBAL_STAMP = join(CACHE, 'playerglobal.version');

const LIBRARIES = [
  {
    entry: 'src/net/triotmetki/packbadge/PackBadgeLibrary.as',
    output: join(MODPACK, 'features', 'pack_badge', 'flash', 'otmetki_pack_badge.swf')
  }
];

const slashes = (path) => path.replace(/\\/g, '/');

const run = (jar, args) => {
  const result = spawnSync('java', ['-jar', join(JARS, jar), ...args], { stdio: 'inherit' });

  if (result.error) {
    throw new Error(`java is not on PATH (run through mise: bun run swf:build): ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`${jar} failed with exit code ${result.status}`);
  }
};

const isPlayerglobalCurrent = () =>
  existsSync(PLAYERGLOBAL) && existsSync(PLAYERGLOBAL_STAMP) && readFileSync(PLAYERGLOBAL_STAMP, 'utf8') === ROYALE_VERSION;

const buildPlayerglobal = () => {
  const generated = join(CACHE, 'playerglobal');
  const generatorConfig = join(CACHE, 'playerglobalc-config.xml');
  const compcConfig = join(CACHE, 'playerglobal-compc.xml');

  writeFileSync(
    generatorConfig,
    `<royale-config>
  <as-root>${slashes(generated)}</as-root>
  <asdoc-root>${slashes(join(TYPEDEFS, 'playerglobal'))}</asdoc-root>
  <air>false</air>
</royale-config>
`
  );

  writeFileSync(
    compcConfig,
    `<flex-config>
  <compiler>
    <accessible>false</accessible>
    <debug>false</debug>
    <external-library-path append="false"/>
    <library-path append="false"/>
    <source-path>
      <path-element>${slashes(generated)}</path-element>
      <path-element>${slashes(join(TYPEDEFS, 'royale'))}</path-element>
    </source-path>
    <warn-no-constructor>false</warn-no-constructor>
    <define><name>COMPILE::JS</name><value>false</value></define>
    <define><name>COMPILE::SWF</name><value>true</value></define>
    <theme/>
  </compiler>
  <include-sources>
    <path-element>${slashes(generated)}</path-element>
    <path-element>${slashes(join(TYPEDEFS, 'royale'))}</path-element>
  </include-sources>
</flex-config>
`
  );

  run('compiler-playerglobalc.jar', ['+royalelib=externs', `-load-config=${slashes(generatorConfig)}`]);

  run('compc.jar', [
    '+royalelib=externs/frameworks',
    '-targets=SWF',
    `-load-config=${slashes(compcConfig)}`,
    '-warnings=false',
    `-output=${slashes(PLAYERGLOBAL)}`
  ]);

  writeFileSync(PLAYERGLOBAL_STAMP, ROYALE_VERSION);
};

const buildLibrary = ({ entry, output }) => {
  mkdirSync(dirname(output), { recursive: true });

  run('mxmlc.jar', [`-load-config=${slashes(join(AS3, 'build-config.xml'))}`, `-output=${slashes(output)}`, slashes(join(AS3, entry))]);

  process.stdout.write(`swf: ${slashes(output)} (${statSync(output).size} bytes)
`);
};

const ensureRoyale = () => {
  if (existsSync(join(ROYALE, 'package.json'))) {
    return;
  }

  mkdirSync(ROYALE_HOME, { recursive: true });
  writeFileSync(join(ROYALE_HOME, 'package.json'), JSON.stringify({ private: true }));

  const result = spawnSync('bun', ['add', '--ignore-scripts', `${ROYALE_PACKAGE}@${ROYALE_VERSION}`], {
    cwd: ROYALE_HOME,
    stdio: 'inherit',
    shell: true
  });

  if (result.status !== 0) {
    throw new Error(`installing ${ROYALE_PACKAGE}@${ROYALE_VERSION} failed with exit code ${result.status}`);
  }
};

mkdirSync(CACHE, { recursive: true });
ensureRoyale();

if (!isPlayerglobalCurrent()) {
  buildPlayerglobal();
}

LIBRARIES.forEach(buildLibrary);
