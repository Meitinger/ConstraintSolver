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

import { _throw, runWorker } from './helpers'
import { Expression } from './program'
import { RunnerInput, RunnerOutput } from './workers'

const MAX_RECURSION = 100

type Value = number | boolean | Expression

interface Context{
  readonly [variable: string]: Value
}

runWorker<RunnerInput, RunnerOutput>(({ expression }) => {
  const formatValue = (value: Value): string => {
    switch (typeof value) {
      case 'boolean': return value ? 'true' : 'false'
      case 'number': return value.toString()
      default: return `reference to #${value.label}`
    }
  }
  const evaluate = (expression: Expression, context: Context, recursion: number): Value => {
    const castError = (subExpression: Expression, result: Value, needed: string): Error => new TypeError(`Evaluation of expression #${subExpression.label} yielded ${formatValue(result)}, needed ${needed}.`)
    const asAny = (subExpression: Expression): Value => evaluate(subExpression, context, recursion)
    const asNumber = (subExpression: Expression): number => {
      const result = evaluate(subExpression, context, recursion)
      return typeof result === 'number' ? result : _throw(castError(subExpression, result, 'number'))
    }
    const asBoolean = (subExpression: Expression): boolean => {
      const result = evaluate(subExpression, context, recursion)
      return typeof result === 'boolean' ? result : _throw(castError(subExpression, result, 'boolean'))
    }

    if (recursion > MAX_RECURSION) { throw new EvalError(`Limit of ${MAX_RECURSION} recursions exceeded.`) }
    switch (expression.type) {
      case 'n': return expression.value
      case 'true': return true
      case 'false': return false
      case 'var': return context[expression.name] ?? _throw(new TypeError(`Variable "${expression.name}" in expression #${expression.label} not in scope.`))
      case '+': return asNumber(expression.left) + asNumber(expression.right)
      case '-': return asNumber(expression.left) - asNumber(expression.right)
      case '*': return asNumber(expression.left) * asNumber(expression.right)
      case '/': return Math.trunc(asNumber(expression.left) / asNumber(expression.right))
      case '<': return asNumber(expression.left) < asNumber(expression.right)
      case '>': return asNumber(expression.left) > asNumber(expression.right)
      case '<=': return asNumber(expression.left) <= asNumber(expression.right)
      case '>=': return asNumber(expression.left) >= asNumber(expression.right)
      case '==': return asAny(expression.left) === asAny(expression.right)
      case '!=': return asAny(expression.left) !== asAny(expression.right)
      case '||': return asBoolean(expression.left) || asBoolean(expression.right)
      case '&&': return asBoolean(expression.left) && asBoolean(expression.right)
      case 'if': return asBoolean(expression.condition) ? asAny(expression.thenBody) : asAny(expression.elseBody)
      case 'fn':
      case 'fun': return expression
      case 'app': {
        const argument = evaluate(expression.argument, context, recursion)
        const callable = evaluate(expression.callable, context, recursion)
        switch (typeof callable) {
          case 'boolean':
          case 'number':
            throw castError(expression.callable, callable, 'reference')
          default:
            switch (callable.type) {
              case 'fn': return evaluate(callable.body, { ...context, [callable.variable]: argument }, recursion + 1)
              case 'fun': return evaluate(callable.body, { ...context, [callable.name]: callable, [callable.variable]: argument }, recursion + 1)
              default: throw castError(expression.callable, callable, 'reference to fn or fun expression')
            }
        }
      }
      case 'let': return evaluate(expression.body, { ...context, [expression.variable]: evaluate(expression.value, context, recursion) }, recursion)
    }
  }

  return { value: formatValue(evaluate(expression, { }, 0)) }
})
