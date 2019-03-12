/*
Author: jacson Bennett
Date: 1.9.18
Exercise 02-01-01

File name: Index.js 

Last Edited By: Jacson Bennett
*/

var express = require('express');
var bodyParser = require('body-parser');
var app = express();
// adds the auth file.
var authenticator = require('./authenticator.js');
// adds the json file 
var config = require('./config.json');
// core module used to format url and stuff
var url = require('url');
// requires third party querystring
var querystring = require('querystring');
// requires in async module
var async = require('async');
// iife = immediately invoked function expression 
var MongoClient = require('mongodb').MongoClient;
var storage = require('./storage.js');
storage.connect();

app.use(require('cookie-parser')());
app.use(bodyParser.json());

app.use(express.static(__dirname + '/public'));

app.set('view engine', 'ejs');

setInterval(function () {
    console.log("Clearing MongoDB cache.");
    storage.deleteFriends();
}, 1000 * 60 * 5);

// app.get('/', function (req, res) {
//     res.send("<h3>Hello World!</h3>");
// });

// this route will get a request token and sends the request to the auth.js file.
app.get('/auth/twitter', authenticator.redirectToTwitterLoginPage);
app.get('/tweet', function (req, res) {
    var credentials = authenticator.getCredentials();
    if (!credentials.access_token || !credentials.access_token_secret) {
        return res.sendStatus(418);
    }
    var url = "https://api.twitter.com/1.1/statuses/update.json";
    //  call to grab the url and credentials.
    authenticator.post(url, credentials.access_token, credentials.access_token_secret, {
            status: "Dylan has no game and is a beta."
        },
        // This is a success or failure function to see if the status was posted.
        function (error, data) {
            if (error) {
                return res.status(406).send(error);
            }
            return res.send("Tweet successful");
        });
})

// searching for a specific friend
app.get('/search', function (req, res) {
    var credentials = authenticator.getCredentials();
    if (!credentials.access_token || !credentials.access_token_secret) {
        return res.sendStatus(418);
    }
    var url = "https://api.twitter.com/1.1/search/tweets.json";
    var query = querystring.stringify({
        q: 'SSJ3Dave'
    });
    url += '?' + query;
    authenticator.get(url, credentials.access_token, credentials.access_token_secret,
        function (error, data) {
            if (error) {
                return res.status(400).send(error);
            }
            res.send(data);
        });
})

// app.get to gather the friends and check credentials.
app.get('/friends', function (req, res) {
    var credentials = authenticator.getCredentials();
    if (!credentials.access_token || !credentials.access_token_secret) {
        return res.sendStatus(418);
    }
    var url = "https://api.twitter.com/1.1/friends/list.json";
    if (req.query.cursor) {
        url += '?' + querystring.stringify({
            cursor: req.query.cursor
        });
    }
    authenticator.get(url, credentials.access_token, credentials.access_token_secret, function (error, data) {
        if (error) {
            return res.status(400).send(error);
        }
        res.send(data);
    })
})

// getting the friends from twitter
app.get('/allfriends', function (req, res) {
    renderMainPageFromTwitter(req, res);
});

app.get('/allfollowers', function (req, res) {
renderFollowersFromTwitter(req, res);    
})
 

// get the / for redirection
app.get('/', function (req, res) {
    var credentials = authenticator.getCredentials();
    if (!credentials.access_token || !credentials.access_token_secret) {
        return res.redirect('login');
    }
    if (!storage.connected()) {
        console.log("Loading friends from Twitter.");
        return renderMainPageFromTwitter(req, res);
    }
    if (!storage.connected()) {
        console.log("Loading friends from Twitter.");
        return renderFollowersFromTwitter(req, res);
    }
    console.log("Loading from MongoDB.");
    storage.getFriends(credentials.twitter_id, function (err, friends) {
        if (err) {
            return res.status(500).send(err);
        }
        if (friends.length > 0) {
            console.log("Friends successfully loaded from MongoDB.");
            friends.sort(function (a, b) {
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            });
            res.render('index', {
                friends: friends
            });
        } else {
            console.log("Loading friends from Twitter.");
            renderMainPageFromTwitter(req, res);
        } 
    });
    storage.getFollowers(credentials.twitter_id, function (err, followers) {
        if (err) {
            return res.status(500).send(err);
        }
        if (followers.length > 0) {
            console.log("Followers successfully loaded from MongoDB.");
            followers.sort(function (a, b) {
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            });
            res.render('followers', {
                followers: followers
            });
        } else {
            console.log("Loading followers from Twitter.");
            renderFollowersFromTwitter(req, res);
        } 
    });    
});
// function to take the data from twitter
function renderMainPageFromTwitter(req, res) {
    var credentials = authenticator.getCredentials();
    async.waterfall([
        // grab friends id
        function (callback) {
            var cursor = -1;
            var ids = [];
            async.whilst(function () {
                    return cursor != 0;
                },
                // callback to assign tasks
                function (callback) {
                    var url = "https://api.twitter.com/1.1/friends/ids.json";
                    url += "?" + querystring.stringify({
                        user_id: credentials.twitter_id,
                        cursor: cursor
                    });
                    // 
                    authenticator.get(url, credentials.access_token, credentials.access_token_secret,
                        function (error, data) {
                            if (error) {
                                return res.status(400).send(error);
                            }
                            data = JSON.parse(data);
                            cursor = data.next_cursor_str;
                            ids = ids.concat(data.ids);
                            callback();
                        });
                },

                function (error) {
                    // console.log('last callback');
                    if (error) {
                        return res.status(500).send(error);
                    }
                    // console.log(ids);
                    callback(null, ids);
                });
        },


        
        // lookup friends data
        function (ids, callback) {
            var getHundredIds = function (i) {
                return ids.slice(100 * i, Math.min(ids.length, 100 * (i + 1)));
            }
            var requestsNeeded = Math.ceil(ids.length / 100);
            async.times(requestsNeeded, function (n, next) {
                    var url = "https://api.twitter.com/1.1/users/lookup.json";
                    url += "?" + querystring.stringify({
                        user_id: getHundredIds(n).join(',')
                    });
                    authenticator.get(url, credentials.access_token, credentials.access_token_secret,
                        function (error, data) {
                            if (error) {
                                return res.status(400).send(error);
                            }
                            var friends = JSON.parse(data);
                            // console.log("n: ",n, friends);
                            next(null, friends);
                        });
                },



                // callback to make the friends appear and load efficiently.
                function (error, friends) {
                    friends = friends.reduce(function (previousValue, currentValue, currentIndex, array) {
                        return previousValue.concat(currentValue)
                    }, []);
                    friends.sort(function (a, b) {
                        return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
                    });
                    friends = friends.map(function (friend) {
                        return {
                            twitter_id: friend.id_str,
                            for_user: credentials.twitter_id,
                            name: friend.name,
                            screen_name: friend.screen_name,
                            location: friend.location,
                            profile_image_url: friend.profile_image_url
                        }
                    });
                    res.render('index', {
                        friends: friends
                    });
                    if (storage.connected()) {
                        storage.insertFriends(friends);
                    }
                    // console.log("friends.length: " + friends.length);
                });
        },
]);
    // res.sendStatus(200);
}

function renderFollowersFromTwitter(req, res) {
    var credentials = authenticator.getCredentials();
    async.waterfall([
        // grab friends id
        function (callback) {
            var cursor = -1;
            var ids = [];
            async.whilst(function () {
                    return cursor != 0;
                },
                // callback to assign tasks
                function (callback) {
                    var url = "https://api.twitter.com/1.1/followers/ids.json";
                    url += "?" + querystring.stringify({
                        user_id: credentials.twitter_id,
                        cursor: cursor
                    });
                    // 
                    authenticator.get(url, credentials.access_token, credentials.access_token_secret,
                        function (error, data) {
                            if (error) {
                                return res.status(400).send(error);
                            }
                            data = JSON.parse(data);
                            cursor = data.next_cursor_str;
                            ids = ids.concat(data.ids);
                            callback();
                        });
                },

                function (error) {
                    // console.log('last callback');
                    if (error) {
                        return res.status(500).send(error);
                    }
                    // console.log(ids);
                    callback(null, ids);
                });
        },

    function (ids, callback) {
        var getHundredIds = function (i) {
            return ids.slice(100 * i, Math.min(ids.length, 100 * (i + 1)));
        }
        var requestsNeeded = Math.ceil(ids.length / 100);
        async.times(requestsNeeded, function (n, next) {
                var url = "https://api.twitter.com/1.1/users/lookup.json";
                url += "?" + querystring.stringify({
                    user_id: getHundredIds(n).join(',')
                });
                authenticator.get(url, credentials.access_token, credentials.access_token_secret,
                    function (error, data) {
                        if (error) {
                            return res.status(400).send(error);
                        }
                        var followers = JSON.parse(data);
                        // console.log("n: ",n, friends);
                        next(null, followers);
                    });
            },


            // callback to make the friends appear and load efficiently.
            function (error, followers) {
                followers = followers.reduce(function (previousValue, currentValue, currentIndex, array) {
                    return previousValue.concat(currentValue)
                }, []);
                followers.sort(function (a, b) {
                    return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
                });
                followers = followers.map(function (follower) {
                    return {
                        twitter_id: follower.id_str,
                        for_user: credentials.twitter_id,
                        name: follower.name,
                        screen_name: follower.screen_name,
                        location: follower.location,
                        profile_image_url: follower.profile_image_url
                    }
                });
                res.render('followers', {
                    followers: followers
                });
                if (storage.connected()) {
                    storage.insertFollowers(followers);
                }
                console.log("followers.length: " + followers.length);
            });
    }
]);
    // res.sendStatus(200);
}



// to get the login and logout data.
app.get('/login', function (req, res) {
    if (storage.connected()) {
        console.log("Deleting friend collection on login.");
        storage.deleteFriends();
        storage.deleteFollowers();
    }
    res.render('login');
});

// this is to delete the collections on the logout button click.
app.get('/logout', function (req, res) {
    authenticator.clearCredentials();
    res.clearCookie('twitter_id');
    if (storage.connected()) {
        console.log("Deleting friend collection logout.");
        storage.deleteFriends();
        storage.deleteFollowers();
    }
    res.redirect('/login');
});

// checks if it is logged in.
function ensureLoggedIn(req, res, next) {
    var credentials = authenticator.getCredentials();
    if (!credentials.access_token || !credentials.access_token_secret || !credentials.twitter_id) {
        return res.sendStatus(401);
    }
    res.cookie('twitter_id', credentials.twitter_id, {
        httponly: true
    });
    next();
}

// gets the friends  notes from the mongodb
app.get('/friends/:uid/notes', ensureLoggedIn, function (req, res) {
    var credentials = authenticator.getCredentials();
    storage.getNotes(credentials.twitter_id, req.params.uid,
        function (err, notes) {
            if (err) {
                return res.status(500).send(err);
            }
            res.send(notes);
        });
});

app.get('/followers', function (req, res) {
    var credentials = authenticator.getCredentials();
    if (!credentials.access_token || !credentials.access_token_secret) {
        return res.sendStatus(418);
    }
    var url = "https://api.twitter.com/1.1/followers/list.json";
    if (req.query.cursor) {
        url += '?' + querystring.stringify({
            cursor: req.query.cursor
        });
    }
    authenticator.get(url, credentials.access_token, credentials.access_token_secret, function (error, data) {
        if (error) {
            return res.status(400).send(error);
        }
        res.send(data);
    });
});

// Post the notes to the database if no problems.
app.post('/friends/:uid/notes', ensureLoggedIn, function (req, res, next) {
    storage.insertNote(req.cookies.twitter_id, req.params.uid, req.body.content, function (err, note) {
        if (err) {
            return res.sendStatus(500).send(err);
        }
        res.send(note);
    });
});
// call to a page and send a response
app.get(url.parse(config.oauth_callback).path, function (req, res) {
    authenticator.authenticate(req, res, function (err) {
        if (err) {
            res.redirect('login');
        } else {
            res.redirect("/");
        }
    });
});

// allows the notes to be updated and changed.
app.put('/friends/:uid/notes/:noteid', ensureLoggedIn, function (req, res) {
    storage.updateNote(req.params.noteid, req.cookies.twitter_id, req.body.content, function (err, note) {
        if (err) {
            return res.sendStatus(500).send(err);
        }
        res.send({
            _id: note._id,
            content: note.content
        })
    });
});

// deleting the friends note when nothing is there.
app.delete('/friends/:uid/notes/:noteid', ensureLoggedIn, function (req, res) {
    storage.deleteNote(req.params.noteid, req.cookies.twitter_id, function (err, note) {
        if (err) {
            return res.sendStatus(500).send(err);
        }
        res.send(200);
    });
});

// listens for port number to connect
app.listen(config.port, function () {
    console.log("Server is listening on localhost:%s", config.port);
    // console.log('OAuth callback:' + url.parse(config.oauth_callback).hostname + url.parse(config.oauth_callback).path);
});