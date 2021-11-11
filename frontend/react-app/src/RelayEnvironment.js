// your-app-name/src/RelayEnvironment.js
import {Environment, Network, RecordSource, Store} from 'relay-runtime';
import getUrl from './getUrl';

const {scheme, host} = getUrl();

async function fetchGraphQL(text, variables) {
  const response = await fetch(`${scheme}://${host}/graphql`, {
    method: 'POST',
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: text,
      variables,
    }),
  });

  // Get the response as JSON
  return await response.json();
}

// Relay passes a "params" object with the query name and text. So we define a
// helper function to call our fetchGraphQL utility with params.text.
async function fetchRelay(params, variables) {
  console.log(`fetching query ${params.name} with ${JSON.stringify(variables)}`);
  return fetchGraphQL(params.text, variables);
}

export default new Environment({
  network: Network.create(fetchRelay),
  store: new Store(new RecordSource()),
});
