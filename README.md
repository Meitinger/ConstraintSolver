# Constraint Solver for FUN Programs

[React](https://reactjs.org/) webapp that solves a set of constraints for FUN
language programs based on user-provided rules.

Written in [typescript](https://www.typescriptlang.org/), it uses
[parsimmon](https://github.com/jneen/parsimmon) to parse the program and
[viz.js](http://viz-js.com/) to generate the expression tree graph. The app is
hosted on [GitHub Pages](https://meitinger.github.io/ConstraintSolver/).

This project was created as part of a master's course in computer science at [UIBK](https://informatik.uibk.ac.at/).


## Usage:

First enter a FUN expression according to the following grammar:
(For ease of reading, white-spaces are not noted in the grammar.)

```bnf
<expression>    ::= <simple> | <complex>
<simple>        ::= <boolean> | <constant> | <variable>
<complex>       ::= "(" <any> ")"
<any>           ::= <simple> | <fn> | <fun> | <app> | <if> | <let> | <op>
<boolean>       ::= "true" | "false"
<constant>      ::= ["-"] /[0-9]+/
<variable>      ::= /[a-z_]+/
<fn>            ::= "fn" <variable> "=>" <expression>
<fun>           ::= "fun" <variable> <variable> "=>" <expression>
<app>           ::= <expression> <expression>
<if>            ::= "if" <expression> "then" <expression> "else" <expression>
<let>           ::= "let" <variable> "=" <expression> "in" <expression>
<op>            ::= <expression> <operator> <expression>
<operator>      ::= "+" | "-" | "*" | "/" | "<" | ">" | "<=" | ">=" | "==" | "!=" | "||" | "&&"
```

If the expression is valid, each sub-expression is labelled automatically and
the label is shown inline in the editor. The result of the expression is then
calculated and shown below the editor. The expression tree is drawn as well in
a card of its own. Cards can be rearranged by dragging them by their headers.

In the card labelled "Rules", the constraints on the expression have to be
defined as a set of rules using the `define` method. The code has to be in
[typescript](https://www.typescriptlang.org/) and can make use of any
JavaScript function.

Rules are always defined in the form
```typescript
    define({lhs: ..., rhs: ...})
```
where the left hand side can be a constant, reference or dynamic callback, the
rhs always has to be a reference. Have a look into
[`rules.d.ts`](https://github.com/Meitinger/ConstraintSolver/blob/main/src/rules.d.ts)
to see how these are defined. If you're looking for examples, check out the
two predefined rule sets on control flow and data flow.

Within your code defining the rules, you have access to the parsed syntax tree
by typing `expression`, and also two helper functions: `type` and `label`.
The former returns all expressions of a given type, e.g. `type('fn', 'if')`
returns all `<fn>` and `<if>` expressions.
The latter returns the sub-expression with the given label, e.g. `label(2)` of
expression `(a#2 b#3)#1` would return the `<variable>` expression of a.

Once the analysis is complete, the resulting sets that fulfil the constraints
are listed below the rules.
