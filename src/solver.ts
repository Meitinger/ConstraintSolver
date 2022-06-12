/*
 * Constraint Solver for FUN Programs
 * Copyright (C) 2022  Manuel Meitinger
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as TS from 'typescript/lib/typescript'
import { Environment } from './environment'
import { _throw, runWorker } from './helpers'
import { Expression } from './program'
import { Reference, Rule } from './rules'
import { SolverInput, SolverOutput } from './workers'

interface Context {
  readonly [variable: string]: number
}

interface Entry {
  readonly key: string | number
  readonly constant?: true
  readonly data: Set<string | number>
  readonly rules: Set<TranslatedRule>
}

interface TranslatedRule {
  readonly lhs: Iterable<string | number>
  readonly rhs: Entry
}

runWorker<SolverInput, SolverOutput>(({ expression, rules }) => {
  const expressionByLabel = new Map<number, Expression>()
  const expressions = new Map<Expression['type'], Set<Expression>>()
  const labelOfvariableDeclaration = new Map<Expression, number>()
  const getExpressionByLabel = (label: number): Expression => expressionByLabel.get(label) ?? _throw(new TypeError(`Label ${label} not found.`))
  const getExpressionsOfType = function * <T extends Expression['type']> (...types: T[]): Iterable<Extract<Expression, {type: T}>> {
    for (const type of types) {
      const collection = expressions.get(type)
      if (collection !== undefined) {
        yield * collection as Iterable<Extract<Expression, {type: T}>>
      }
    }
  }
  const collectExpressions = (expression: Expression, context: Context): void => {
    const extendContext = (...names: string[]): Context => Object.fromEntries(Object.entries(context).concat(names.map(name => [name, expression.label])))
    let collection = expressions.get(expression.type)
    if (collection === undefined) { expressions.set(expression.type, collection = new Set<Expression>()) }
    collection.add(expression)
    expressionByLabel.set(expression.label, expression)
    switch (expression.type) {
      case 'n': case 'true': case 'false':
        break
      case 'var':
        labelOfvariableDeclaration.set(expression, context[expression.name] ?? _throw(new TypeError(`Variable expression #${expression.label} references and unbound variable '${expression.name}'.`)))
        break
      case '+': case '-': case '*': case '/': case '<': case '>': case '<=': case '>=': case '==': case '!=': case '||': case '&&':
        collectExpressions(expression.left, context)
        collectExpressions(expression.right, context)
        break
      case 'if':
        collectExpressions(expression.condition, context)
        collectExpressions(expression.thenBody, context)
        collectExpressions(expression.elseBody, context)
        break
      case 'fn':
        collectExpressions(expression.body, extendContext(expression.variable))
        break
      case 'fun':
        if (expression.name === expression.variable) { throw new TypeError(`Function expression #${expression.label} uses same name '${expression.name}' for variable and function.`) }
        collectExpressions(expression.body, extendContext(expression.name, expression.variable))
        break
      case 'app':
        collectExpressions(expression.callable, context)
        collectExpressions(expression.argument, context)
        break
      case 'let':
        collectExpressions(expression.value, context)
        collectExpressions(expression.body, extendContext(expression.variable))
        break
    }
  }
  collectExpressions(expression, {})

  const entries = new Map<string, Entry>()
  const getOrCreateEntry = (category: string, key: string | number): Entry => {
    const id = `${category}(${key})`
    const existingEntry = entries.get(id)
    if (existingEntry !== undefined) { return existingEntry } else {
      const createdEntry: Entry = { key, data: new Set(), rules: new Set() }
      entries.set(id, createdEntry)
      return createdEntry
    }
  }
  const getEntryFromReference = (ref: Reference): Entry => {
    if ('variable' in ref) { return getOrCreateEntry('p', `${ref.variable.name}#${labelOfvariableDeclaration.get(ref.variable) ?? _throw(new TypeError('Rule references an unknown variable.'))}`) }
    if ('boundVariable' in ref) { return getOrCreateEntry('p', `${ref.boundVariable.variable}#${ref.boundVariable.label}`) }
    if ('functionVariable' in ref) { return getOrCreateEntry('p', `${ref.functionVariable.name}#${ref.functionVariable.label}`) }
    if ('expression' in ref) { return getOrCreateEntry('C', ref.expression.label) }
    return _throw(new TypeError('Unknown reference type.'))
  }

  const worklist = new Set<Entry>()
  const enactRule = (rule: TranslatedRule): void => {
    let updated = false
    for (const value of rule.lhs) {
      if (!rule.rhs.data.has(value)) {
        rule.rhs.data.add(value)
        updated = true
      }
    }
    if (updated) { worklist.add(rule.rhs) }
  }
  const defineRule = (rule: Rule): void => {
    const rhs = getEntryFromReference(rule.rhs)
    let translatedRule: TranslatedRule
    if ('constant' in rule.lhs) {
      translatedRule = { lhs: [rule.lhs.constant], rhs }
    } else if ('dynamic' in rule.lhs && 'dependencies' in rule.lhs) {
      const dynamic = rule.lhs.dynamic
      const dependencies = rule.lhs.dependencies.map(getEntryFromReference)
      translatedRule = { get lhs () { return dynamic(dependencies.map(dep => dep.data)) }, rhs }
      dependencies.forEach(dep => dep.rules.add(translatedRule))
    } else {
      const lhs = getEntryFromReference(rule.lhs)
      translatedRule = { get lhs () { return lhs.data }, rhs }
      lhs.rules.add(translatedRule)
    }
    enactRule(translatedRule)
  }

  const environment: Environment = {
    define: defineRule,
    label: getExpressionByLabel,
    type: getExpressionsOfType,
    expression
  }
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
  new Function(...Object.keys(environment), TS.transpile(rules, { strict: true, target: TS.ScriptTarget.Latest }))(...Object.values(environment))

  for (const entry of worklist) {
    entry.rules.forEach(enactRule)
  }
  return ({
    analysis: Object.fromEntries([...entries.entries()].sort(([,a], [,b]) =>
      typeof a.key === 'number' && typeof b.key === 'number'
        ? (a.key - b.key)
        : typeof a.key === 'string' && typeof b.key === 'string'
          ? a.key.localeCompare(b.key)
          : typeof a.key === 'number' ? -1 : 1
    ).map(([name, entry]) => [name, [...entry.data]]))
  })
})
