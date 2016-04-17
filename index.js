'use strict';
const fs = require('fs');
const P = require('bluebird');
const jws = require('jws');
const fetch = require('node-fetch');
const FormData = require('form-data');
const GOOGLE_TOKEN_URL = 'https://accounts.google.com/o/oauth2/token';

function GoogleAPI(jsonPath, scopes) {
  this.authKey = JSON.parse(fs.readFileSync(jsonPath).toString());
  this.scope = scopes.join(' ');
  this.expiry = 0;
}
GoogleAPI.prototype.getToken = function getToken() {
  if (this.expiry > Date.now()) {
    return P.resolve(this.token);
  } else {
    const iat = Math.floor(Date.now() / 1000);
    const toSign = {
      header: { alg: 'RS256', typ: 'JWT' },
      payload: {
        iss: this.authKey.client_email,
        scope: this.scope,
        aud: GOOGLE_TOKEN_URL,
        exp: iat + 3600,
        iat,
      },
      secret: this.authKey.private_key,
    };
    const frm = new FormData();
    frm.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
    frm.append('assertion', jws.sign(toSign));
    return fetch(GOOGLE_TOKEN_URL, { method: 'POST', body: frm })
      .then(resp => resp.json())
      .then(resp => {
        this.token = resp.access_token;
        this.expiry = Date.now() + ((this.expires_in - 10) * 1000);
        return this.token;
      });
  }
};

function ServerError(status) { this.message = `Server Error ${status}`; this.status = status; }
ServerError.prototype = Object.create(Error.prototype);

GoogleAPI.prototype.request = function request(url, opts) {
  return P.resolve(
    this.getToken()
      .then(tok => {
        const fopts = opts || {};
        if (!fopts.headers) fopts.headers = {};
        fopts.headers.Accept = 'application/json';
        fopts.headers.Authorization = `Bearer ${tok}`;
        return fetch(url, fopts);
      })
      .then(resp => resp.status >= 400
          ? P.reject(new ServerError(resp.status))
          : resp.json()));
};

GoogleAPI.prototype.get = function get(url) {
  return this.request(url);
};

GoogleAPI.prototype.post = function post(url, body) {
  const opts = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
  return this.request(url, opts);
};

GoogleAPI.prototype.retryPost = function post(url, body, retryCount) {
  const self = this;
  return new P((resolve, reject) => {
    let tries = 0;
    function reschedule(err) {
      if (tries > 2) console.warn(`retrying.error.${tries} ${err.message}`);
      setTimeout(doIt, 500 * tries);
    }
    function doIt() {
      tries += 1;
      self.post(url, body)
        .then(resolve)
        .catch(() => tries < retryCount, reschedule)
        .catch(reject);
    }
    doIt();
  });
};

module.exports = GoogleAPI;
