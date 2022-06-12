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

import { Expression } from './program'

interface Nothing {
  readonly constant?: never
  readonly variable?: never
  readonly boundVariable?: never
  readonly functionVariable?: never
  readonly expression?: never
  readonly dynamic?: never
  readonly dependencies?: never
}

export interface Constant extends Omit<Nothing, 'constant'> {
  readonly constant: string | number
} // export

interface VariableReference extends Omit<Nothing, 'variable'> {
  readonly variable: Extract<Expression, {type: 'var'}>
}

interface BoundVariableReference extends Omit<Nothing, 'boundVariable'> {
  readonly boundVariable: Extract<Expression, {type: 'fn' | 'fun' | 'let'}>
}

interface FunctionVariableReference extends Omit<Nothing, 'functionVariable'> {
  readonly functionVariable: Extract<Expression, {type: 'fun'}>
}

interface ExpressionReference extends Omit<Nothing, 'expression'> {
  readonly expression: Expression
}

export interface Dynamic extends Omit<Nothing, 'dynamic' | 'dependencies'> {
  readonly dynamic: (dependencies: ReadonlyArray<ReadonlySet<string | number>>) => Iterable<string | number>
  readonly dependencies: readonly Reference[]
} // export

export type Reference = ExpressionReference | VariableReference | BoundVariableReference | FunctionVariableReference // export

export interface Rule {
  readonly lhs: Constant | Reference | Dynamic
  readonly rhs: Reference
} // export
