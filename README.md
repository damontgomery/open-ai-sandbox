# open-ai-sandbox

This sandbox shows how to create an OpenAI Assistant that uses functions defined by the app to get app-specific data.

*The Assistant feature is a little different from the Chat feature.*

## Sample output

See [sample-output.txt](sample-output.txt).

## Quick start

```bash
cp .env.example .env
# edit .env with open API key

yarn install
yarn start
```

## Architecture

The OpenAI API is a rest service and uses a queue to process requests.

For this reason, the general flow is to create a `run` which is added to a queue. You then have to poll the API to see the status of the run.

When the run is completed, you can make a separate call to get the list of messages from the API.

For this demo, we provide function `tools` which allow the `Assistant` to decide to call those tools as-needed. When the `Assistant` needs to call a tool, the run is set to a `requires_action` status with information about the tool(s) that need to get called. We then submit a new run with the tool values and wait for that run to complete.

*This creates a whole chain of runs and we only really look at the latest ones. Not sure if the old ones get updated or not.*
