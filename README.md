# gapi-lite
Light Weight Google API Client

<pre>
npm install gapi-lite --save
</pre>

usage
---
<pre>
const GoogleAPI = require('gapi-lite');
const scopes = [
  'https://www.googleapis.com/auth/bigquery',
  'https://www.googleapis.com/auth/bigquery.insertdata',
];
const api = new GoogleAPI('./google-auth.json', scopes);

api.get('google-api-url')
  .then(doSomeThingWithJSOnData)
  .catch(handleError)

api.post('google-api-url', bodyJSON)
  .then(doSomeThingWithJSOnData)
  .catch(handleError)

</pre>