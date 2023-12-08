import OpenAI from "openai";

interface GeoLocation {
  lat: number;
  lon: number;
}

export const getCurrentLocation = (): GeoLocation => {
  return {
    lat: 1.2,
    lon: 3.4,
  }
}

export const getCurrentLocationToolDefinition: OpenAI.Beta.Assistants.AssistantCreateParams.AssistantToolsFunction = {
  type: "function",
  function: {
    name: "getCurrentLocation",
    description: "Get the current location of the user",
    parameters: {
      type: "object",
      properties: {},
    },
  },
}

export const getCurrentWeather = ({lat, lon}: GeoLocation): string => {
  return `The weather in ${lat}, ${lon} is sunny.`
}

export const getCurrentWeatherToolDefinition: OpenAI.Beta.Assistants.AssistantCreateParams.AssistantToolsFunction = {
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
}
