/*
Author: Jacson Bennett
Date: 1.9.18
Exercise 02-01-01

File name: authenticator.js 

Last Edited By: Jacson Bennett
*/
// This module will do all the authentication using oauth.

// blueprint for an object/ for oauth from class.
var OAuth = require('oauth').OAuth;
// config file required in
var config = require('./config.json');

// requiring in OAuth 
var oauth = new OAuth(
    config.request_token_url, 
    config.access_token_url,
    config.consumer_key,
    config.consumer_secret,
    config.oauth_version,
    config.oauth_callback,
    config.oauth_signature
);

var twitterCredentials = {
    oauth_token: "",
    oauth_token_secret: "",
    access_token: "",
    access_token_secret : "",
    twitter_id: ""
}

// exports the credentials with a get and post method.
module.exports = {
    getCredentials: function () {
        return twitterCredentials;
    },
    clearCredentials: function () {
        twitterCredentials.oauth_token = "";
        twitterCredentials.oauth_token_secret = "";
        twitterCredentials.access_token = "";
        twitterCredentials.access_token_secret = "";
        twitterCredentials.twitter_id = "";
    },
    get: function (url, access_token, access_token_secret, callback) {
        oauth.get.call(oauth, url, access_token, access_token_secret, callback);
    },
    post: function (url, access_token, access_token_secret, body, callback) {
        oauth.post.call(oauth, url, access_token, access_token_secret, body, callback);
    },
    //   function to redirect to the twitter login authorization.
    redirectToTwitterLoginPage: function (req, res) {
        oauth.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results) {
            if (error) {
                console.log(error);
                res.send("Authentication failed!");
            }
            else {
                twitterCredentials.oauth_token = oauth_token;
                twitterCredentials.oauth_token_secret = oauth_token_secret;
                res.redirect(config.authorize_url +'?oauth_token='+oauth_token);
            }
        });
    },
    // function to get a request and response and check the credentials.
    authenticate: function (req, res, callback) {
        if (!(twitterCredentials.oauth_token && twitterCredentials.oauth_token_secret && req.query.oauth_verifier)) {
            return callback("Request does not have all required keys!");
        }
        // twitterCredentials.oauth_token = "";
        // twitterCredentials.oauth_token_secret = "";
        oauth.getOAuthAccessToken(twitterCredentials.oauth_token, twitterCredentials.oauth_token_secret, req.query.oauth_verifier, function (err, oauth_access_token, oauth_access_token_secret, results) {
         if (err) {
             return callback(err);
         }
         oauth.get('https://api.twitter.com/1.1/account/verify_credentials.json', oauth_access_token, oauth_access_token_secret, function (err, data) {
            if (err) {
                console.log(err);
                return callback(err);
            }   
            // Data from twitter to check credentials that are authorized.
            data = JSON.parse(data);
            twitterCredentials.access_token = oauth_access_token;
            twitterCredentials.access_token_secret = oauth_access_token_secret;
            twitterCredentials.twitter_id = data.id_str;
            console.log(data);
            return callback();
         });  
        });
    }
}