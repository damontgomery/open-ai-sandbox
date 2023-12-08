import dotenv from 'dotenv'
import OpenAI from 'openai'
import { getAssistantResponse, logThreadMessages } from './openAIAssistantAPI'

dotenv.config()

console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

  getAssistantResponse({threadId: thread.id, runId: run.id, openai})
    .then(run => {
      console.log('run', run)
      logThreadMessages({threadId: thread.id, openai})
    })
}

main()
