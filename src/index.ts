import dotenv from 'dotenv'
import OpenAI from 'openai'
import { getRunResponse, logThreadMessages } from './openAIAssistantAPI'
import { getCurrentLocation,
  getCurrentLocationToolDefinition,
  getCurrentWeather,
  getCurrentWeatherToolDefinition
} from './weatherAPI'

dotenv.config()

console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const availableToolFunctions = new Map<string, Function>([
  ['getCurrentWeather', getCurrentWeather],
  ['getCurrentLocation', getCurrentLocation],
])

async function main() {
  const assistant = await openai.beta.assistants.create({
    name: "Weather App",
    instructions: "You are a weather app and describe the weather.",
    model: "gpt-4-1106-preview",
    tools: [
      getCurrentLocationToolDefinition,
      getCurrentWeatherToolDefinition,
    ],
  })
  
  const thread = await openai.beta.threads.create()
  
  await openai.beta.threads.messages.create(
    thread.id,
    {
      role: "user",
      content: "What is the weather in my current location?"
    },
  )

  let run = await openai.beta.threads.runs.create(
    thread.id,
    { 
      assistant_id: assistant.id,
    }
  );

  getRunResponse({
    threadId: thread.id,
    runId: run.id,
    availableToolFunctions,
    openai
  })
    .then(async () => {
      logThreadMessages({threadId: thread.id, openai})
    })
    .catch(error => {
      console.error('index getRunResponse error', error)
    })
}

main()
