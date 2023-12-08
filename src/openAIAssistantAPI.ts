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
    threadMessages.data.forEach(message => {
      console.log(message, message.content)
    })
  })

export const getRunResponse = (
  {
    threadId,
    runId,
    openai
  }: {
    threadId: string;
    runId: string;
    openai: OpenAI
  }): Promise<OpenAI.Beta.Threads.Runs.Run> => new Promise((resolve, reject) => {
    const runChecker = setInterval(
      () => {
        openai.beta.threads.runs.retrieve(threadId, runId)
          .then(run => {
            if (!['queued', 'in_progress'].includes(run.status)) {
              clearInterval(runChecker)
            }

            if (['completed', 'requires_action'].includes(run.status)) {
              resolve(run)
            }

            if (
              [
                'failed',
                'cancelled',
                'requires_action',
                'expired'
              ].includes(run.status)
            ) {
              reject(run)
            }
          })
      },
      1000
    )
  })
