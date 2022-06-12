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

interface NumericConstantExpression {
  readonly type: 'n'
  readonly value: number
}

interface BooleanConstantExpression {
  readonly type: 'true' | 'false'
}

interface VariableExpression {
  readonly type: 'var'
  readonly name: string
}

interface OperationExpression {
  readonly type: '+' | '-' | '*' | '/' | '<' | '>' | '<=' | '>=' | '==' | '!=' | '||' | '&&'
  readonly left: Expression
  readonly right: Expression
}

interface IfExpression {
  readonly type: 'if'
  readonly condition: Expression
  readonly thenBody: Expression
  readonly elseBody: Expression
}

interface FnExpression {
  readonly type: 'fn'
  readonly variable: string
  readonly body: Expression
}

interface FunExpression {
  readonly type: 'fun'
  readonly name: string
  readonly variable: string
  readonly body: Expression
}

interface ApplicationExpression {
  readonly type: 'app'
  readonly callable: Expression
  readonly argument: Expression
}

interface LetExpression {
  readonly type: 'let'
  readonly variable: string
  readonly value: Expression
  readonly body: Expression
}

export type _Expression = NumericConstantExpression | BooleanConstantExpression | VariableExpression | OperationExpression | IfExpression | FnExpression | FunExpression | ApplicationExpression | LetExpression // export

export type Operators = OperationExpression['type'] // export

export type Expression = _Expression & {
  readonly label: number
  readonly line: number
  readonly column: number
}
// export
