// /*
// Author: Jacson Bennett
// Date: 1.9.18
// Exercise 02-01-01

// File name: storage.js 

// Last Edited By: Jacson Bennett
// */

// // IIFE statement
(function () {
    // shows selected user
    var selectedUserID;
    // sets up an empty cache
    var cache = {};


    function startup() {
        //    gets the friends by class name and returns it into an array
        var friends = document.getElementsByClassName('friend');
        for (var i = 0; i < friends.length; i++) {
            friends[i].addEventListener('click', function () {
                for (var j = 0; j < friends.length; j++) {
                    // creates a class using the for loop per friend that is clicked 
                    friends[j].className = 'friend';
                }
                this.className += ' active';
                selectedUserID = this.getAttribute('uid');
                console.log('selected user id ' + selectedUserID);
                var notes = getNotes(selectedUserID,
                    function (notes) {
                        // create a document frag.
                        var docFragment = document.createDocumentFragment();
                        // creates a note element function call with notes paramater.
                        var notesElements = createNoteElements(notes);
                        notesElements.forEach(function (element) {
                            docFragment.appendChild(element);
                        });
                        var newNoteButton = createAddNoteButton();
                        docFragment.appendChild(newNoteButton);
                        // creates a user interface by appending the notes to the doc.
                        document.getElementById('notes').innerHTML = "";
                        document.getElementById('notes').appendChild(docFragment);

                    });
            });

        }


    }

// function to get the notes using the user ids from MongoDB
    function getNotes(userID, callback) {
        if (cache[userID]) {
            return callback(cache[userID]);
        }
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            // checks the ready state and status of the page to check for errors
            if (xhttp.readyState == 4 && xhttp.status == 200) {
                // parses the data if there is or isnt data.
                var notes = JSON.parse(xhttp.responseText || []);
                cache[userID] = notes;
                callback(notes);
            }
        };
        xhttp.open('GET', '/friends/' + encodeURIComponent(userID) + '/notes');
        // sends a get request
        xhttp.send();

    }

    

    //  function that posts a new note if there is content and everything is ready.
    function postNewNote(userID, note, callback) {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (xhttp.readyState == 4 && xhttp.status == 200) {
                var serverNote = JSON.parse(xhttp.responseText || {});
                cache[userID].push(serverNote);
                callback(serverNote);
            }
        }
        xhttp.open('POST', '/friends/' + encodeURIComponent(userID) + '/notes');
        xhttp.setRequestHeader("Content-Type", "application/json; charset = UTF-8");
        xhttp.send(JSON.stringify(note));
    }

    // function that puts the note into the database if every thing is ready.
    function putNote(userid, note, callback) {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (xhttp.readyState == 4 && xhttp.status == 200) {
                var serverNote = JSON.parse(xhttp.responseText || {});
                callback(serverNote);
            }
        }
        xhttp.open('PUT', '/friends/' + encodeURIComponent(userid) + '/notes/' + encodeURIComponent(note._id), true);
        xhttp.setRequestHeader("Content-Type", "application/json; charset = UTF-8");
        xhttp.send(JSON.stringify(note));
    }

    // function that deletes the note if there is any 
    function deleteNote(userid, note, callback) {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (xhttp.readyState == 4 && xhttp.status == 200) {
                cache[userid] = cache[userid].filter(function (localNote) {
                    return localNote._id != note._id
                });
                callback();
            }
        }
        xhttp.open('DELETE', '/friends/' + encodeURIComponent(userid) + '/notes/' + encodeURIComponent(note._id), true);
        xhttp.send(JSON.stringify(note));
    }

// this is to create the note element of a list item and put it into the dom.
    function createNoteElements(notes) {
        return notes.map(function (note) {
            var element = document.createElement('li');
            element.className = 'note';
            element.setAttribute('contenteditable', true);
            element.textContent = note.content;
            element.addEventListener('blur', function () {
                note.content = this.textContent
                if (note.content == "") {
                    if (note._id) {
                        deleteNote(selectedUserID, note, function () {
                            document.getElementById('notes').removeChild(element);
                        });
                    } else {
                        document.getElementById('notes').removeChild(element);
                    }
                } else if (!note._id) {
                    postNewNote(selectedUserID, {
                        content: this.textContent
                    }, function (newNote) {
                        note._id = newNote._id;
                    });
                } else {
                    putNote(selectedUserID, note, function () {

                    });
                }
            });
// this is an event listener that listens for a enter to change the behavior.
            element.addEventListener('keydown', function (e) {
                if (e.keyCode == 13) {
                    e.preventDefault();
                    if (element.nextSibling.className == 'add-note') {
                        element.nextSibling.click();
                    }
                    else {
                        element.nextSibling.focus();
                    }
                }

            });
            return element;
        });
        return notes;
    }

    //creating the note button to add new notes
    function createAddNoteButton() {
        var element = document.createElement('li');
        element.className = 'add-note';
        element.textContent = "Add a new note...";
        element.addEventListener('click', function () {
            var noteElement = createNoteElements([{}])[0];
            document.getElementById('notes').insertBefore(noteElement, this);
            noteElement.focus();
        });
        return element;
    }

    //adding an event listener so it doesnt execute before the content is loaded
    document.addEventListener('DOMContentLoaded', startup, false);

})();