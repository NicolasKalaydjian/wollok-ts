import { Evaluation, RuntimeObject, Natives } from '../interpreter/runtimeModel'

const lib: Natives = {

  console: {

    // TODO:
    println: (_self: RuntimeObject, obj: RuntimeObject) => (evaluation: Evaluation): void => {
      evaluation.invoke('toString', obj)
      evaluation.stepOut()
      const message: RuntimeObject = evaluation.currentFrame!.operandStack.pop()!
      message.assertIsString()
      evaluation.log.info(message.innerValue)
      evaluation.currentFrame!.pushOperand(undefined)
    },

    // TODO:
    readLine: (_self: RuntimeObject) => (_evaluation: Evaluation): void => {
      throw new ReferenceError('To be implemented console.readLine')
    },

    // TODO:
    readInt: (_self: RuntimeObject) => (_evaluation: Evaluation): void => {
      throw new ReferenceError('To be implemented console.readInt')
    },

    newline: (_self: RuntimeObject) => (evaluation: Evaluation): void => {
      const newline = process.platform.toLowerCase().startsWith('win') ? '\r\n' : '\n'
      evaluation.currentFrame!.pushOperand(RuntimeObject.string(evaluation, newline))
    },

  },

}

export default lib