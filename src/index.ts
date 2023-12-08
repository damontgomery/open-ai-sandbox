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

  const submitToolsOutput = async (run: OpenAI.Beta.Threads.Run) => {
    if (run.status !== 'requires_action' || run.required_action?.type !== 'submit_tool_outputs') {
      return
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
      thread.id,
      run.id,
      {
        tool_outputs: toolOutputs,
      }
    );

    getResponse({threadId: thread.id, runId: toolSubmitRun.id, openai})
    
  }

  const getResponse = ({threadId, runId, openai}: {threadId: string; runId: string; openai: OpenAI}) => {
    getRunResponse({threadId, runId, openai})
      .then(async run => {
        // console.log('run', run)
  
        submitToolsOutput(run)

        logThreadMessages({threadId: thread.id, openai})
      })
      .catch(error => {
        console.error('error', error)
      })
  }

  getResponse({threadId: thread.id, runId: run.id, openai})

}

main()
