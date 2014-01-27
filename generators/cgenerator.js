var util = require('util')
var HashMap = require('hashmap').HashMap

module.exports = function (program) {
  // TODO - set up output stream
  gen(program)  
}

var indentPadding = 4
var indentLevel = 0

function emit(line) {
  var pad = indentPadding * indentLevel
  console.log(Array(pad+1).join(' ') + line)
}

function makeOp(op) {
  return {not: '!', and: '&&', or: '||'}[op] || op
}

var makeVariable = (function () {
  // No need to synchronize because Node is single-threaded
  var lastId = 0
  var map = new HashMap()
  return function (v) {
    if (!map.has(v)) map.set(v, ++lastId)
    return '_v' + map.get(v)
  }
}())

function gen(e) {
  return generator[e.constructor.name](e)
}

var generator = {

  'Program': function (program) {
    indentLevel = 0
    emit('#include <stdio.h>')
    emit('int main() {')
    gen(program.block)
    indentLevel++
    emit('return 0;')
    indentLevel--
    emit('}')
  },

  'Block': function (block) {
    indentLevel++
    block.statements.forEach(function (statement) {
      gen(statement)
    })
    indentLevel--
  },

  'VariableDeclaration': function (v) {
    emit(util.format('%s %s = 0;', v.type, makeVariable(v)))
  },

  'AssignmentStatement': function (s) {
    emit(util.format('%s = %s;', gen(s.target), gen(s.source)))
  },

  'ReadStatement': function (s) {
    s.varrefs.forEach(function (v) {
      emit(util.format('scanf("%%d\\n", &%s);', makeVariable(v.referent)))
    })
  },

  'WriteStatement': function (s) {
    s.expressions.forEach(function (e) {
      emit(util.format('printf("%%d\\n", %s);', gen(e)))
    })
  },

  'WhileStatement': function (s) {
    emit('while (' + gen(s.condition) + ') {')
    gen(s.body);
    emit('}');
  },

  'IntegerLiteral': function (literal) {
    return literal.toString();
  },

  'BooleanLiteral': function (literal) {
    // Assume old-style C without a boolean type so just use 0 and 1
    return ['false','true'].indexOf(literal.toString())
  },

  'VariableReference': function (v) {
    return makeVariable(v.referent)
  },

  'UnaryExpression': function (e) {
    return util.format('(%s %s)', makeOp(e.op.lexeme), gen(e.operand))
  },

  'BinaryExpression': function (e) {
    return util.format('(%s %s %s)', gen(e.left), makeOp(e.op.lexeme), gen(e.right))
  }
}
