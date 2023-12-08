import OpenAI from 'openai'

export const logThreadMessages = (
  {
    threadId,
    openai
  }: {
    threadId: string;
    openai: OpenAI
  }) => openai.beta.threads.messages.list(threadId)
  .then(threadMessages => {
    console.log('threadMessages')
    threadMessages.data.forEach(message => {
      console.log(message, message.content)
    })
  })

const submitToolsOutput = async (
  {
    run,
    availableToolFunctions,
    openai,
  }: {
    run: OpenAI.Beta.Threads.Run;
    availableToolFunctions: Map<string, Function>;
    openai: OpenAI;
  }): Promise<OpenAI.Beta.Threads.Runs.Run> => {
  if (run.status !== 'requires_action' || run.required_action?.type !== 'submit_tool_outputs') {
    return run
  }

  const toolCalls = run.required_action.submit_tool_outputs.tool_calls

  console.log('toolCalls', toolCalls)

  const toolOutputs = toolCalls.map(toolCall => {
    const {name: functionName, arguments: functionArgumentsRaw} = toolCall.function
    const functionArguments = JSON.parse(functionArgumentsRaw)
    
    if (!availableToolFunctions.has(functionName)) {
      return
    }
    
    let functionResponse = (availableToolFunctions.get(functionName) as Function)(functionArguments)

    if (typeof functionResponse !== 'string') {
      functionResponse = JSON.stringify(functionResponse)
    }

    console.log('functionResponse', functionResponse)
    return {
      tool_call_id: toolCall.id,
      output: functionResponse,
    }
  })
    .filter(toolOutput => toolOutput !== undefined) as OpenAI.Beta.Threads.Runs.RunSubmitToolOutputsParams.ToolOutput[]
  
  console.log('toolOutputs', toolOutputs)

  const toolSubmitRun = await openai.beta.threads.runs.submitToolOutputs(
    run.thread_id,
    run.id,
    {
      tool_outputs: toolOutputs,
    }
  );

  return getRunResponse({
    threadId: run.thread_id,
    runId: toolSubmitRun.id,
    availableToolFunctions,
    openai
  })
}

export const getRunResponse = (
  {
    threadId,
    runId,
    availableToolFunctions,
    openai
  }: {
    threadId: string;
    runId: string;
    availableToolFunctions: Map<string, Function>;
    openai: OpenAI
  }): Promise<OpenAI.Beta.Threads.Runs.Run> => new Promise((resolve, reject) => {
    const runChecker = setInterval(
      () => {
        openai.beta.threads.runs.retrieve(threadId, runId)
          .then(run => {
            if (!['queued', 'in_progress'].includes(run.status)) {
              clearInterval(runChecker)
            }

            if (run.status === 'completed') {
              resolve(run)
            }

            if (run.status === 'requires_action') {
              resolve(submitToolsOutput({run, availableToolFunctions, openai})
              )
            }

            if (
              [
                'failed',
                'cancelled',
                'expired'
              ].includes(run.status)
            ) {
              console.log('run', run)
              reject(run)
            }
          })
          .catch(error => {
            clearInterval(runChecker)
            console.log('getRunResponse error', error)
            reject(error)
          })
      },
      1000
    )
  })
