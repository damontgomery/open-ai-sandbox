import dotenv from 'dotenv'
import OpenAI from 'openai'
import { getRunResponse, logThreadMessages } from './openAIAssistantAPI'

dotenv.config()

console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface GeoLocation {
  lat: number;
  lon: number;
}

const getCurrentWeather = ({lat, lon}: GeoLocation): string => {
  return `The weather in ${lat}, ${lon} is sunny.`
}

const getCurrentLocation = (): GeoLocation => {
  return {
    lat: 1.2,
    lon: 3.4,
  }
}

const availableToolFunctions = new Map<string, Function>([
  ['getCurrentWeather', getCurrentWeather],
  ['getCurrentLocation', getCurrentLocation],
])

const tools: OpenAI.Beta.Assistants.AssistantCreateParams.AssistantToolsFunction[] = [
  {
    type: "function",
    function: {
      name: "getCurrentWeather",
      description: "Get the current weather in a given location",
      parameters: {
        type: "object",
        description: "The city and state, e.g. San Francisco, CA",
        properties: {
          lat: {
            type: "number",
          },
          lon: {
            type: "number",
          },
        },
        required: ["lat", "lon"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCurrentLocation",
      description: "Get the current location of the user",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
]

async function main() {
  const assistant = await openai.beta.assistants.create({
    name: "Weather App",
    instructions: "You are a weather app and describe the weather.",
    model: "gpt-4-1106-preview",
    tools,
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
