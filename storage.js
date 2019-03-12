/*
Author: Jacson Bennett
Date: 1.9.18
Exercise 02-01-01

File name: storage.js 

Last Edited By: Jacson Bennett
*/

// declaring mongodb 
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
// getting the connection from mongo
var url = 'mongodb://localhost:27017';
//  what to name the database
var dbName = 'twitter_notes';
// var declaring a database
var database;

module.exports = {
    connect: function () {
        MongoClient.connect(url, function (err, client) {
            if (err) {
                return console.log("Error: " + err);
            }
            database = client.db(dbName);
        });
    },
    connected: function () {
        return typeof database != 'undefined';
    },
    // it is inserting friends into mongodb.
    insertFriends: function (friends) {
        database.collection('friends').insert(friends, function (err) {
            if (err) {
                console.log("Cannot insert friends into database.")
            }
        });
    },
    // this allows the friends to be gotten from the mongodb.
    getFriends: function (userId, callback) {
        var cursor = database.collection('friends').find({
            for_user: userId
        });
        cursor.toArray(callback);
    },
    // this deletes the friends on logout if no errors.
    deleteFriends: function () {
        database.collection('friends').remove(({}),
            function (err) {
                if (err) {
                    console.log("cannot remove friends from database.")
                }

            });
    },
    // gets the notes from the database if there are any.
    getNotes: function (ownerid, friendid, callback) {
        var cursor = database.collection('notes').find({
            owner_id: ownerid,
            friend_id: friendid
        });
        cursor.toArray(function (err, notes) {
            if (err) {
                return callback(err);
            }
            callback(null, notes.map(function (note) {
                return {
                    _id: note._id,
                    content: note.content
                }
            }));
        });
    },
    // this allows a note to be inserted if it isnt empty and no errors.
    insertNote: function (ownerid, friendid, content, callback) {
        database.collection('notes').insert({
                owner_id: ownerid,
                friend_id: friendid,
                content: content
            },
            function (err, result) {
                if (err) {
                    return callback(err, result);
                }
                callback(null, {
                    _id: result.ops[0]._id,
                    content: result.ops[0].content,
                });
            });
    },
    // updates the note if there are any and no errors meaning its empty.
    updateNote: function (noteId, ownerId, content, callback) {
        database.collection('notes').updateOne({
                _id: new ObjectID(noteId),
                owner_id: ownerId
            }, {
                $set: {
                    content: content
                }
            },
            function (err, result) {
                if (err) {
                    return callback(err);
                }
                database.collection('notes').findOne({
                    _id: new ObjectID(noteId)
                }, callback);
            });
    },
    // Deletes the note depending on if its empty or if it had content but got deleted.
    deleteNote: function (noteId, ownerId, callback) {
        database.collection('notes').deleteOne({
            _id: new ObjectID(noteId),
            owner_id: ownerId
        }, callback);
    },

    insertFollowers: function (followers) {
        database.collection('followers').insert(followers, function (err) {
            if (err) {
                console.log("Cannot insert friends into database.")
            }
        }); 
    },
 getFollowers: function (userId, callback) {
        var cursor = database.collection('followers').find({
            for_user: userId
        });
        cursor.toArray(callback);
    },
    // this deletes the friends on logout if no errors.
    deleteFollowers: function () {
        database.collection('followers').remove(({}),
            function (err) {
                if (err) {
                    console.log("cannot remove followers from database.")
                }

            });
    },
}