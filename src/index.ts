import dotenv from 'dotenv'
import OpenAI from 'openai'

dotenv.config()

console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const logThreadMessages = (threadId: string) => openai.beta.threads.messages.list(threadId)
  .then(threadMessages => {
    threadMessages.data.forEach(message => {
      console.log(message, message.content)
    })
  })

const getAssistantResponse = ({threadId, runId}: {threadId: string; runId: string; }): Promise<OpenAI.Beta.Threads.Runs.Run> => new Promise((resolve, reject) => {
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

async function main() {
  const assistant = await openai.beta.assistants.create({
    name: "Comedian",
    instructions: "You are a comedian, tell jokes.",
    model: "gpt-4-1106-preview"
  })
  
  const thread = await openai.beta.threads.create()
  
  await openai.beta.threads.messages.create(
    thread.id,
    {
      role: "user",
      content: "Tell me a joke"
    },
  )

  let run = await openai.beta.threads.runs.create(
    thread.id,
    { 
      assistant_id: assistant.id,
    }
  );

  getAssistantResponse({threadId: thread.id, runId: run.id})
    .then(run => {
      console.log('run', run)
      logThreadMessages(thread.id)
    })
}

main()
