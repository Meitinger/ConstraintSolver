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

import * as P from 'parsimmon'
import { runWorker } from './helpers'
import { Expression, _Expression } from './program'
import { InlayHint, ParserInput, ParserOutput } from './workers'

runWorker<ParserInput, ParserOutput>(({ expression }) => {
  const op = <T extends string>(...seps: readonly T[]): P.Parser<T> => P.alt(...seps.map(sep => P.string(sep))).trim(P.optWhitespace)
  const arrow = op('=>', '->')
  const reserved = new Set(['if', 'then', 'else', 'fn', 'fun', 'let', 'in', 'true', 'false'])

  const parser = P.createLanguage<{
    variableName: string
    expression: Expression
    expressionTrim: Expression
    expressionTrimLeft: Expression
    expressionTrimRight: Expression
    group: Expression
    simple: Expression
    booleanConstant: _Expression
    numericConstant: _Expression
    variable: _Expression
    operation: _Expression
    ifElse: _Expression
    fn: _Expression
    fun: _Expression
    app: _Expression
    let: _Expression
  }>({
    variableName: () => P.regexp(/[a-z_]+/).assert(name => !reserved.has(name), 'Reserved keywords cannot be used as variable.'),
    expression: r => P.alt(r.simple, r.group),
    expressionTrim: r => P.alt(r.group.trim(P.optWhitespace), r.simple.trim(P.whitespace)),
    expressionTrimLeft: r => P.alt(P.whitespace.then(r.simple), P.optWhitespace.then(r.group)),
    expressionTrimRight: r => P.alt(r.simple.skip(P.whitespace), r.group.skip(P.optWhitespace)),
    group: r => P.seq(P.string('('), P.alt(r.ifElse, r.fn, r.fun, r.let, r.operation, r.app, r.booleanConstant, r.numericConstant, r.variable).trim(P.optWhitespace), P.string(')'), P.index).map(([, expression, , index]) => ({ label: 0, ...expression, ...index })),
    simple: r => P.seq(P.alt(r.booleanConstant, r.numericConstant, r.variable), P.index).map(([expression, index]) => ({ label: 0, ...expression, ...index })),
    booleanConstant: () => P.alt(P.string('true'), P.string('false')).map(type => ({ type })),
    numericConstant: () => P.regex(/-?[0-9]+/).map(Number).map(value => ({ type: 'n', value })),
    variable: r => r.variableName.map(name => ({ type: 'var', name })),
    operation: r => P.seq(r.expression, op('<=', '>=', '==', '!=', '||', '&&', '+', '-', '*', '/', '<', '>'), r.expression).map(([left, type, right]) => ({ type, left, right })),
    ifElse: r => P.seq(P.string('if'), r.expressionTrim, P.string('then'), r.expressionTrim, P.string('else'), r.expressionTrimLeft).map(([type, condition, , thenBody, , elseBody]) => ({ type, condition, thenBody, elseBody })),
    fn: r => P.seq(P.string('fn').skip(P.whitespace), r.variableName, arrow, r.expression).map(([type, variable,,body]) => ({ type, variable, body })),
    fun: r => P.seq(P.string('fun').skip(P.whitespace), r.variableName.skip(P.whitespace), r.variableName, arrow, r.expression).map(([type, name, variable, , body]) => ({ type, name, variable, body })),
    app: r => P.alt(P.seq(r.group.skip(P.optWhitespace), r.expression), P.seq(r.simple, r.expressionTrimLeft)).map(([callable, argument]) => ({ type: 'app', callable, argument })),
    let: r => P.seq(P.string('let').skip(P.whitespace), r.variableName, op('=', ':='), r.expressionTrimRight, P.string('in'), r.expressionTrimLeft).map(([type, variable, , value, , body]) => ({ type, variable, value, body }))
  })

  const parserResult = parser.expression.trim(P.optWhitespace).parse(expression)
  if (parserResult.status) {
    const inlayHints = new Array<InlayHint>()
    const postProcess = (expression: Expression): Expression => {
      const label = inlayHints.length + 1
      inlayHints.push({
        text: label.toString(),
        position: {
          lineNumber: expression.line,
          column: expression.column
        },
        kind: 0
      })
      switch (expression.type) {
        case 'n': case 'true': case 'false': case 'var':
          return { ...expression, label }
        case '+': case '-': case '*': case '/': case '<': case '>': case '<=': case '>=': case '==': case '!=': case '||': case '&&':
          return { ...expression, label, left: postProcess(expression.left), right: postProcess(expression.right) }
        case 'if':
          return { ...expression, label, condition: postProcess(expression.condition), thenBody: postProcess(expression.thenBody), elseBody: postProcess(expression.elseBody) }
        case 'fn': case 'fun':
          return { ...expression, label, body: postProcess(expression.body) }
        case 'app':
          return { ...expression, label, callable: postProcess(expression.callable), argument: postProcess(expression.argument) }
        case 'let':
          return { ...expression, label, value: postProcess(expression.value), body: postProcess(expression.body) }
      }
    }
    return {
      succeeded: true,
      expression: postProcess(parserResult.value),
      inlayHints
    }
  } else {
    return {
      succeeded: false,
      expected: parserResult.expected,
      ...parserResult.index
    }
  }
})
