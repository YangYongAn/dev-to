import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import ts from 'typescript'
import { mergeConfig, type ConfigEnv, type UserConfig } from 'vite'

import { PLUGIN_LOG_PREFIX, PLUGIN_NAME } from './constants.js'
import { resolveEntryAbsPath, tryResolveWithExtensions } from './pathUtils.js'

import type { DevToReactPluginOptions, ResolvedDevComponentConfig } from './types.js'

/** 判断是否为 lib 模式构建 */
export function isLibBuild(env?: ConfigEnv) {
  return env?.command === 'build' && env?.mode === 'lib'
}

/** 转换为安全的输出目录名 */
export function toSafeOutDirName(componentName: string) {
  return componentName.replace(/[\\/]/g, '_').replace(/\.\./g, '_')
}

/** 转换为合法的 UMD 全局变量名 */
export function toSafeUmdName(componentName: string) {
  let s = componentName.replace(/[^A-Za-z0-9_$]+/g, '_')
  if (!s) s = 'ViteDevComponent'
  if (/^\d/.test(s)) s = `_${s}`
  return s
}

/** 校验是否为合法 JS 标识符 */
export function isValidJsIdentifier(name: string) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)
}

/** 分析文件中的导出（使用 TypeScript AST） */
function analyzeExports(filePath: string): {
  hasDefault: boolean
  namedExports: string[]
} {
  if (!fs.existsSync(filePath)) {
    return { hasDefault: false, namedExports: [] }
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const namedExports: string[] = []
  let hasDefault = false

  // 使用 TypeScript 编译器 API 解析
  // 根据文件扩展名确定脚本类型
  let scriptKind: ts.ScriptKind = ts.ScriptKind.TS
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.tsx') {
    scriptKind = ts.ScriptKind.TSX
  }
  else if (ext === '.jsx') {
    scriptKind = ts.ScriptKind.JSX
  }
  else if (ext === '.js') {
    scriptKind = ts.ScriptKind.JS
  }
  else if (ext === '.ts') {
    scriptKind = ts.ScriptKind.TS
  }

  let sourceFile: ts.SourceFile
  try {
    sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, scriptKind)
  }
  catch (parseError) {
    // 如果解析失败，抛出更友好的错误
    throw new Error(
      `${PLUGIN_LOG_PREFIX} 无法解析入口文件 "${filePath}"。\n`
      + `解析错误: ${parseError instanceof Error ? parseError.message : String(parseError)}\n`
      + `请确保文件是有效的 TypeScript/JavaScript 文件。`,
    )
  }

  // 检查是否有语法错误
  ts.getPreEmitDiagnostics(
    ts.createProgram([filePath], {
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.ESNext,
      jsx:
        scriptKind === ts.ScriptKind.TSX || scriptKind === ts.ScriptKind.JSX
          ? ts.JsxEmit.React
          : undefined,
    }),
  )
  function visit(node: ts.Node) {
    // 检查 export default（两种形式：export default expr 和 export default function/class）
    if (ts.isExportAssignment(node)) {
      // isExportEquals 为 false 或 undefined 都表示 export default
      // 只有显式为 true 时才是 export = ...
      if (node.isExportEquals !== true) {
        // export default ...
        hasDefault = true
      }
      // export = ... 不算 default export
    }

    // 检查 export default 声明
    if (
      ts.isFunctionDeclaration(node)
      || ts.isClassDeclaration(node)
      || ts.isVariableStatement(node)
      || ts.isInterfaceDeclaration(node)
      || ts.isTypeAliasDeclaration(node)
      || ts.isEnumDeclaration(node)
    ) {
      const modifiers = ts.getModifiers(node)
      if (modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        // 检查是否有 default 修饰符
        if (modifiers.some(m => m.kind === ts.SyntaxKind.DefaultKeyword)) {
          hasDefault = true
        }
        else {
          // 命名导出
          if (ts.isFunctionDeclaration(node) && node.name) {
            namedExports.push(node.name.text)
          }
          if (ts.isClassDeclaration(node) && node.name) {
            namedExports.push(node.name.text)
          }
          if (ts.isVariableStatement(node)) {
            // 处理 export const/let/var Name = ...
            node.declarationList.declarations.forEach((decl) => {
              if (ts.isIdentifier(decl.name)) {
                namedExports.push(decl.name.text)
              }
            })
          }
          if (ts.isInterfaceDeclaration(node) && node.name) {
            namedExports.push(node.name.text)
          }
          if (ts.isTypeAliasDeclaration(node) && node.name) {
            namedExports.push(node.name.text)
          }
          if (ts.isEnumDeclaration(node) && node.name) {
            namedExports.push(node.name.text)
          }
        }
      }
    }

    // 检查 export { ... } 或 export { ... } from '...'
    if (ts.isExportDeclaration(node) && node.exportClause) {
      if (ts.isNamedExports(node.exportClause)) {
        node.exportClause.elements.forEach((element) => {
          if (element.name) {
            const exportName = element.name.text
            const { propertyName } = element

            if (propertyName && propertyName.text === 'default') {
              // export { default as Name }
              namedExports.push(exportName)
            }
            else if (exportName === 'default') {
              // export { default } - 这种情况应该很少见，但处理一下
              hasDefault = true
            }
            else {
              // export { Name } 或 export { Name as Alias }
              namedExports.push(exportName)
            }
          }
        })
      }
      else if (ts.isNamespaceExport(node.exportClause)) {
        // export * as Name from '...'
        namedExports.push(node.exportClause.name.text)
      }
    }

    // 检查 export * from '...'
    if (ts.isExportDeclaration(node) && !node.exportClause) {
      // export * from '...' - 这种情况我们无法静态分析，跳过
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  // 去重
  const uniqueExports = Array.from(new Set(namedExports))

  // 调试：如果检测不到导出，输出一些调试信息
  if (!hasDefault && uniqueExports.length === 0) {
    // 尝试用简单正则作为后备检测（仅用于调试）
    const hasDefaultRegex = /export\s+default\s+/
    const hasNamedRegex
      = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g

    const regexHasDefault = hasDefaultRegex.test(content)
    const regexNamedMatches: string[] = []
    let match
    while ((match = hasNamedRegex.exec(content)) !== null) {
      regexNamedMatches.push(match[1])
    }

    // 如果正则检测到了但 AST 没检测到，可能是 AST 解析问题
    if (regexHasDefault || regexNamedMatches.length > 0) {
      console.warn(
        `${PLUGIN_LOG_PREFIX} 警告：AST 分析未检测到导出，但正则检测到：\n`
        + `  文件: ${filePath}\n`
        + `  正则检测 default: ${regexHasDefault}\n`
        + `  正则检测命名导出: ${regexNamedMatches.join(', ') || '无'}\n`
        + `  这可能是 AST 解析问题，将尝试继续构建。`,
      )
      // 如果正则检测到了，使用正则的结果
      if (regexHasDefault) {
        hasDefault = true
      }
      if (regexNamedMatches.length > 0) {
        namedExports.push(...regexNamedMatches)
      }
    }
  }

  return { hasDefault, namedExports: Array.from(new Set(namedExports)) }
}

/** 生成库模式的虚拟入口模块代码（智能处理导出） */
export function generateLibVirtualEntryCode(params: {
  rootDir: string
  defaultEntryAbs: string
  componentName: string
}): string {
  const { defaultEntryAbs, componentName } = params

  // 验证文件是否存在
  if (!fs.existsSync(defaultEntryAbs)) {
    throw new Error(
      `${PLUGIN_LOG_PREFIX} 入口文件不存在: "${defaultEntryAbs}"\n` + `请检查文件路径是否正确。`,
    )
  }

  // 确保文件路径已正确解析（处理扩展名差异）
  const actualFile = tryResolveWithExtensions(defaultEntryAbs) || defaultEntryAbs
  if (!fs.existsSync(actualFile)) {
    throw new Error(
      `${PLUGIN_LOG_PREFIX} 入口文件不存在: "${defaultEntryAbs}"\n`
      + `尝试解析后的路径: "${actualFile}"\n`
      + `请检查文件路径是否正确。`,
    )
  }

  // 使用 file:// 绝对路径，避免相对虚拟模块路径解析失败
  const importTarget = pathToFileURL(actualFile).href

  // 分析导出
  let exports: { hasDefault: boolean, namedExports: string[] }
  try {
    exports = analyzeExports(actualFile)
  }
  catch (error) {
    // 如果分析失败，提供更详细的错误信息
    const errorMsg = error instanceof Error ? error.message : String(error)
    throw new Error(
      `${PLUGIN_LOG_PREFIX} 分析入口文件 "${actualFile}" 的导出时出错：\n`
      + `${errorMsg}\n`
      + `\n`
      + `请检查文件：\n`
      + `  1. 文件是否存在且可读\n`
      + `  2. 文件是否有语法错误\n`
      + `  3. 文件是否有导出（export default 或命名导出）\n`
      + `\n`
      + `原始路径: "${defaultEntryAbs}"\n`
      + `实际解析路径: "${actualFile}"`,
    )
  }

  let code: string

  if (!exports.hasDefault && exports.namedExports.length === 0) {
    // Situation 1: Nothing exported
    throw new Error(
      `${PLUGIN_LOG_PREFIX} Entry file "${defaultEntryAbs}" does not have any exports.\n`
      + `\n`
      + `Please ensure the file has one of the following:\n`
      + `\n`
      + `  1. export default (Recommended):\n`
      + `     export default function ${componentName}() { ... }\n`
      + `     or\n`
      + `     const ${componentName} = () => { ... };\n`
      + `     export default ${componentName};\n`
      + `\n`
      + `  2. Named export matching componentName:\n`
      + `     export function ${componentName}() { ... }\n`
      + `     or\n`
      + `     export const ${componentName} = () => { ... };\n`
      + `\n`
      + `  3. A single named export (any name):\n`
      + `     export function MyComponent() { ... }\n`
      + `     // If there is only one named export, it will be used automatically.\n`
      + `\n`
      + `Current componentName: "${componentName}"`,
    )
  }
  else if (exports.hasDefault) {
    // Situation 2: Has default export
    let prefer = ''
    if (exports.namedExports.includes(componentName)) {
      prefer = isValidJsIdentifier(componentName)
        ? `mod.${componentName}`
        : `mod[${JSON.stringify(componentName)}]`
    }
    const pickedExpr = prefer ? `${prefer} || mod.default || mod` : 'mod.default || mod'

    code = `/** AUTO-GENERATED by ${PLUGIN_NAME} */
import * as mod from ${JSON.stringify(importTarget)};
const picked = ${pickedExpr};
const Card = picked && picked.default ? picked.default : picked;
export default Card;
export * from ${JSON.stringify(importTarget)};
`
  }
  else if (exports.namedExports.length === 1) {
    // Situation 3: No default, but only one named export. Create a default link to it.
    const singleExport = exports.namedExports[0]
    const exportAccess = isValidJsIdentifier(singleExport)
      ? `mod.${singleExport}`
      : `mod[${JSON.stringify(singleExport)}]`

    code = `/** AUTO-GENERATED by ${PLUGIN_NAME} */
import * as mod from ${JSON.stringify(importTarget)};
const Card = ${exportAccess};
export default Card;
export * from ${JSON.stringify(importTarget)};
`
  }
  else {
    // Situation 4: No default, multiple named exports. Check for one matching componentName.
    const hasComponentNameExport = exports.namedExports.some(exp => exp === componentName)

    if (hasComponentNameExport) {
      // Found matching export
      const exportAccess = isValidJsIdentifier(componentName)
        ? `mod.${componentName}`
        : `mod[${JSON.stringify(componentName)}]`

      code = `/** AUTO-GENERATED by ${PLUGIN_NAME} */
import * as mod from ${JSON.stringify(importTarget)};
const Card = ${exportAccess};
export default Card;
export * from ${JSON.stringify(importTarget)};
`
    }
    else {
      // No matching export found
      throw new Error(
        `${PLUGIN_LOG_PREFIX} Entry file "${defaultEntryAbs}" has multiple named exports (${exports.namedExports.join(', ')}), but none match componentName "${componentName}".\n`
        + `\n`
        + `Please resolve this by:\n`
        + `\n`
        + `  1. Adding a default export (Recommended):\n`
        + `     export default function ${componentName}() { ... }\n`
        + `\n`
        + `  2. Adding a named export called "${componentName}":\n`
        + `     export function ${componentName}() { ... }\n`
        + `\n`
        + `  3. Keeping only one named export (it will be used automatically).\n`
        + `\n`
        + `Current componentName: "${componentName}"\n`
        + `Current named exports: ${exports.namedExports.join(', ')}`,
      )
    }
  }

  return code
}

/** 生成虚拟入口模块路径（用于 lib.entry 配置） */
export function getLibVirtualEntryPath(componentName: string): string {
  return `virtual:${PLUGIN_NAME}-lib-entry:${componentName}`
}

/** 将生成的 CSS 文件重命名为与 Component 同名 */
export function normalizeLibCss(outDir: string, baseName: string) {
  if (!fs.existsSync(outDir)) return
  const target = path.join(outDir, `${baseName}.css`)
  if (fs.existsSync(target)) return

  const cssCandidates: string[] = []
  const scanDir = (dir: string, depth: number) => {
    if (depth < 0 || !fs.existsSync(dir)) return
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) scanDir(full, depth - 1)
      else if (e.isFile() && e.name.endsWith('.css')) cssCandidates.push(full)
    }
  }
  scanDir(outDir, 2)

  if (cssCandidates.length !== 1) return
  const from = cssCandidates[0]
  try {
    fs.renameSync(from, target)
  }
  catch {
    try {
      fs.copyFileSync(from, target)
      fs.unlinkSync(from)
    }
    catch {
      // ignore
    }
  }
}

/** 解析当前的构建目标列表 */
export function resolveBuildTargets(params: {
  componentMap: Record<string, string>
  requestedRaw: string
  defaultEntryAbs: string
}) {
  const { componentMap, requestedRaw, defaultEntryAbs } = params
  const componentNames = Object.keys(componentMap)
  const requestedList = requestedRaw
    ? requestedRaw
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : []

  // 排除通配符 Key，它不代表具体的构建目标
  const actualConfiguredNames = componentNames.filter(n => n !== '*')

  if (actualConfiguredNames.length > 0) {
    if (requestedList.length > 0) {
      const picked = requestedList.filter(n => actualConfiguredNames.includes(n))
      if (picked.length === 0) {
        throw new Error(`${PLUGIN_LOG_PREFIX} 指定的 component 不在配置列表中：${requestedRaw}`)
      }
      return picked
    }
    return actualConfiguredNames
  }

  // 如果没有显式配置任何组件名，但通过环境变量请求了特定的名字
  if (requestedList.length > 0) return requestedList

  // 最后的回退方案：使用入口文件名
  const fallbackName = path.parse(defaultEntryAbs || 'index').name || 'index'
  return [fallbackName]
}

/** 生成库模式的构建配置 */
export function generateLibBuildNextConfig(params: {
  rootDir: string
  configDir?: string
  picked: string
  componentMap: Record<string, string>
  resolvedConfig: ResolvedDevComponentConfig
  options: DevToReactPluginOptions
  userConfig: UserConfig
}): {
  next: UserConfig
  outDir: string
  outBase: string
  buildTargets: string[]
  virtualEntryCode: string
  resolvedEntryAbs: string
} {
  const { rootDir, picked, componentMap, resolvedConfig, options, userConfig, configDir } = params

  const outBase = toSafeOutDirName(picked)
  const outDir = path.resolve(rootDir, 'dist', outBase)
  let resolvedEntryAbs = resolvedConfig.defaultEntryAbs

  const entryAbs = (() => {
    const entryFromMap = componentMap[picked]
    if (entryFromMap) {
      const abs = resolveEntryAbsPath(
        rootDir,
        entryFromMap,
        resolvedConfig.defaultEntryAbs,
        configDir,
      )
      if (!abs)
        throw new Error(
          `${PLUGIN_LOG_PREFIX} 无法解析入口：component="${picked}", entry="${entryFromMap}"`,
        )
      resolvedEntryAbs = abs
      // 使用虚拟模块路径，代码将在插件中生成
      return getLibVirtualEntryPath(picked)
    }
    // 使用虚拟模块路径，代码将在插件中生成
    return getLibVirtualEntryPath(picked)
  })()

  // 生成虚拟入口模块代码（用于插件 load 钩子）
  const virtualEntryCode = (() => {
    const entryFromMap = componentMap[picked]
    if (entryFromMap) {
      const abs = resolveEntryAbsPath(
        rootDir,
        entryFromMap,
        resolvedConfig.defaultEntryAbs,
        configDir,
      )
      if (!abs)
        throw new Error(
          `${PLUGIN_LOG_PREFIX} 无法解析入口：component="${picked}", entry="${entryFromMap}"`,
        )
      resolvedEntryAbs = abs
      return generateLibVirtualEntryCode({ rootDir, defaultEntryAbs: abs, componentName: picked })
    }
    resolvedEntryAbs = resolvedConfig.defaultEntryAbs
    return generateLibVirtualEntryCode({
      rootDir,
      defaultEntryAbs: resolvedConfig.defaultEntryAbs,
      componentName: picked,
    })
  })()

  const next: UserConfig = {
    root: rootDir,
    define: {
      ...(userConfig.define || {}),
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    build: {
      outDir,
      emptyOutDir: true,
      cssCodeSplit: false,
      lib: {
        entry: entryAbs,
        name: toSafeUmdName(picked),
        formats: ['umd'],
        fileName: () => `${outBase}.js`,
      },
      rollupOptions: {
        external: ['react', 'react-dom', 'react-dom/client'],
        output: {
          inlineDynamicImports: true,
          // 虚拟入口会导出 default 以及透传的命名导出，使用 named 以兼容
          exports: 'named',
          globals: {
            'react': 'React',
            'react-dom': 'ReactDOM',
            'react-dom/client': 'ReactDOMClient',
          },
          assetFileNames: (assetInfo) => {
            const name = assetInfo?.name || ''
            if (name.endsWith('.css')) return `${outBase}.css`
            return 'assets/[name]-[hash][extname]'
          },
        },
      },
    },
  }

  if (options.build) {
    const merged = mergeConfig({ build: next.build }, { build: options.build }) as UserConfig
    next.build = merged.build
  }

  return {
    next,
    outDir: (next.build?.outDir as string) || outDir,
    outBase,
    buildTargets: [],
    virtualEntryCode,
    resolvedEntryAbs,
  }
}
