import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'fs'
import { basename, join } from 'path'
import * as simplegit from 'simple-git/promise'
import fill from '../src/filler'
import interpreter from '../src/interpreter'
import link from '../src/linker'
import log, { enableLogs } from '../src/log'
import { Package } from '../src/model'
import { File } from '../src/parser'
import natives from '../src/wre/natives'

enableLogs()

const SANITY_TESTS_REPO = 'git@github.com:uqbar-project/wollok-sanity-tests.git'
const SANITY_TESTS_FOLDER = 'test/sanity'
const WRE_PATH = 'src/wre/lang.wlk'

// TODO: Don't skip tests
const SKIP = [
  'test/sanity/src/mixins/namedObjects/namedObjectInheritanceTest/objectInheritingFromAClass.wtest',
  'test/sanity/src/mixins/namedObjects/namedObjectInheritanceTest/objectInheritingFromAClassNamedParameters.wtest',
  'test/sanity/src/mixins/namedObjects/unnamedObjectInheritanceTest/objectInheritingFromAClass.wtest',
  'test/sanity/src/mixins/namedObjects/unnamedObjectInheritanceTest/objectInheritingFromAClassNamedParameters.wtest',
  'test/sanity/src/constructors/namedParametersWithInheritance.wtest',
  'test/sanity/src/constructors/namedParametersWithLiterals.wtest',
  'test/sanity/src/describe/constReferencesCannotBeAssignedInAFixture.wtest',
  'test/sanity/src/describe/describeCanGroupASetOfIsolatedTestsWithInstanceVariables.wtest',
  'test/sanity/src/describe/testConstReferencesCanBeInitiallyAssignedInAFixture.wtest',
  'test/sanity/src/describe/testFixture.wtest',
  'test/sanity/src/describe/testIssue1221NPEForConstDefinedInFixtures.wtest',
  'test/sanity/src/describe/testWithMethodInvocation.wtest',
  'test/sanity/src/describe/variableOfDescribeDoesntHaveSideEffectsBetweenTests.wtest',
  'test/sanity/src/exceptionTestCase/testCanCreateExceptionUsingNamedParametersWithoutCause.wtest',
  'test/sanity/src/namedObjects/namedObjectInheritanceTest/objectInheritingFromAClass.wtest',
  'test/sanity/src/namedObjects/namedObjectInheritanceTest/objectInheritingFromAClassNamedParameters.wtest',
  'test/sanity/src/namedObjects/unnamedObjectInheritanceTest/objectInheritingFromAClass.wtest',
  'test/sanity/src/namedObjects/unnamedObjectInheritanceTest/objectInheritingFromAClassNamedParameters.wtest',
  'test/sanity/src/numberTestCase.wtest',
  'test/sanity/src/propertiesTestCase/badSetterForPropertyConstInClass.wtest',
  'test/sanity/src/propertiesTestCase/badSetterForPropertyConstInObject.wtest',
  'test/sanity/src/propertiesTestCase/customGetterForPropertyConstInClass.wtest',
  'test/sanity/src/propertiesTestCase/getterAndSetterForPropertyVarInClass.wtest',
  'test/sanity/src/propertiesTestCase/getterAndSetterForPropertyVarInWko.wtest',
  'test/sanity/src/propertiesTestCase/getterForPropertyConstInClass.wtest',
  'test/sanity/src/propertiesTestCase/getterForPropertyConstInWko.wtest',
  'test/sanity/src/propertiesTestCase/setterForPropertyConstInClass.wtest',
  'test/sanity/src/propertiesTestCase/setterForPropertyConstInObject.wtest',
  'test/sanity/src/recursiveToStringTestCase.wtest',
  'test/sanity/src/mixins/mixingAtInstantiation.wtest',
  'test/sanity/src/mixins/multipleMixinAtInstantiationTime.wtest',
  'test/sanity/src/mixins/singleMixinAtInstantiationTime.wtest',
  'test/sanity/src/mixins/toStringFixture.wtest',
]

const git = simplegit()

const getTestsInDir = (path: string): string[] =>
  readdirSync(path).reduce((tests, file) => {
    const filePath = join(path, file)
    return statSync(filePath).isDirectory()
      ? [...tests, ...getTestsInDir(filePath)]
      : filePath.endsWith('.wtest') || filePath.endsWith('.wlk') ? [...tests, filePath] : tests
  }, [] as string[])

const fetchTests = async () => {
  if (existsSync(SANITY_TESTS_FOLDER)) {
    await git.fetch()
  } else {
    mkdirSync(SANITY_TESTS_FOLDER)
    await git.clone(SANITY_TESTS_REPO, SANITY_TESTS_FOLDER)
  }
}

const runAll = async () => {
  log.clear()
  log.separator('RUN ALL TESTS')

  if (!process.argv.includes('--skip-fetch')) {
    log.start('Fetching tests')
    await fetchTests()
    log.done('Fetching tests')
  } else log.info('Will use local version of tests.')

  log.start('Parsing WRE')
  const wreSource = readFileSync(WRE_PATH, 'utf8')
  const wre: Package<'Filled'> = {
    kind: 'Package',
    id: undefined,
    name: 'wollok',
    imports: [],
    members: [fill(File('lang').tryParse(wreSource))],
  }
  log.done('Parsing WRE')

  log.start('Parsing tests')
  const testFiles = getTestsInDir(join(SANITY_TESTS_FOLDER, 'src'))
  const nonSkipedTestFiles = testFiles.filter(file => !SKIP.includes(file))
  log.done('Parsing tests')

  const testNodes = nonSkipedTestFiles.map(testFile =>
    fill(File(basename(testFile).split('.')[0]).tryParse(readFileSync(testFile, 'utf8')))
  )

  log.start('Linking')
  const environment = link([wre, ...testNodes])
  log.done('Linking')

  log.start('Running tests')
  const { runTests } = interpreter(environment, natives)
  await runTests()
  log.done('Running tests')
  log.success('Runned', testFiles.length, 'test files')
}

runAll()