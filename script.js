const noteInput = document.getElementById("noteInput");   
  const addNoteBtn = document.getElementById("addNoteBtn"); 
  const notesBoard = document.getElementById("notesBoard");

 
  // These are the pieces of our pop-up (modal) window for viewing/editing a note.
  const modalOverlay = document.getElementById("modalOverlay");
  const modalDate = document.getElementById("modalDate");
  const modalTextarea = document.getElementById("modalTextarea");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const modalSaveBtn = document.getElementById("modalSaveBtn");
 
  // Step 2: We need to remember which color is picked right now.
  // Let's start with "slate" since that dot is already selected.
  let selectedColor = "slate";
 
  // We also need to remember WHICH note is currently open in the pop-up,
  // so that when we hit "Save", we know which one to update.
  let activeNoteId = null;
 

  let notes = [];
 
  // Step 4: Try to load any notes we saved before (from last time we opened the page).
  // localStorage is like a tiny notebook the browser keeps for us, even after we close the tab.
  function loadNotes() {
    const saved = localStorage.getItem("myStickyNotes"); // ask the browser for saved notes
    if (saved) {
      notes = JSON.parse(saved); // turn the saved text back into a real list
    }
  }
 
  // Step 5: Save our current list of notes into that tiny notebook (localStorage).
  // We do this every time something changes, so we never lose our notes.
  function saveNotes() {
    localStorage.setItem("myStickyNotes", JSON.stringify(notes));
  }
 
  // This little helper compares a note's date to RIGHT NOW and returns words
  // like "Just now", "5 minutes ago", "3 hours ago", or "Aug 6, 2026" for older notes.
  function getRelativeTime(timestamp) {
    const now = Date.now();                          // this exact moment, as a number
    const secondsAgo = Math.floor((now - timestamp) / 1000); // how many seconds have passed
 
    if (secondsAgo < 60) {
      return "Just now";
    }
 
    const minutesAgo = Math.floor(secondsAgo / 60);
    if (minutesAgo < 60) {
      return minutesAgo + (minutesAgo === 1 ? " minute ago" : " minutes ago");
    }
 
    const hoursAgo = Math.floor(minutesAgo / 60);
    if (hoursAgo < 24) {
      return hoursAgo + (hoursAgo === 1 ? " hour ago" : " hours ago");
    }
 
    const daysAgo = Math.floor(hoursAgo / 24);
    if (daysAgo < 7) {
      return daysAgo + (daysAgo === 1 ? " day ago" : " days ago");
    }
 
    // For anything older than a week, just show the real date instead of a big number.
    const dateObj = new Date(timestamp);
    return dateObj.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }
 
  // Step 6: This function draws (shows) all the notes on the screen.
  // We basically wipe the board clean and redraw every note, every time.
  function renderNotes() {
    notesBoard.innerHTML = ""; // clear the board first, like erasing a whiteboard

    // If there are no notes yet, show a friendly message instead of an empty board.
    if (notes.length === 0) {
      notesBoard.innerHTML = `<p class="empty-message">Nothing here yet — add your first note above.</p>`;
      return; // stop here, nothing else to draw
    }

    // Go through each note in our list, one at a time.
    notes.forEach(function (note) {
      // Create a new empty "div" box for this note.
      const noteEl = document.createElement("div");
 
      // Give it CSS classes so it gets styled with the right category stripe color.
      noteEl.className = "note " + note.color;
 

      const iconsRow = document.createElement("div");
      iconsRow.className = "note-icons";
 
      const editBtn = document.createElement("button");
      editBtn.className = "icon-btn";
      editBtn.title = "Edit note";
      editBtn.textContent = "✏️";
      editBtn.addEventListener("click", function () {
        openEditModal(note.id);
      });
      iconsRow.appendChild(editBtn);
 
      // The ✕ button deletes the note, just like before.
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "icon-btn";
      deleteBtn.title = "Delete note";
      deleteBtn.textContent = "✕";
      deleteBtn.addEventListener("click", function () {
        deleteNote(note.id);
      });
      iconsRow.appendChild(deleteBtn);
 
      noteEl.appendChild(iconsRow);
 
      // Put the note's text inside the box.
      // We use textContent (not innerHTML) so the text is always shown safely as plain text.
      const textEl = document.createElement("div");
      textEl.className = "note-text";
      textEl.textContent = note.text;
      noteEl.appendChild(textEl);
 
      // Show how long ago this note was written (like "5 minutes ago").
      const dateEl = document.createElement("div");
      dateEl.className = "note-date";
      dateEl.textContent = getRelativeTime(note.date);
      noteEl.appendChild(dateEl);
 
      // Finally, stick the finished note onto the board.
      notesBoard.appendChild(noteEl);
    });
  }
 
  // Step 7: This function adds a brand new note to our list.
  function addNote() {
    const text = noteInput.value.trim(); // get what was typed, remove extra spaces
 
    // If the box is empty, don't add a blank note. Just stop.
    if (text === "") {
      return;
    }
 
    // Make a new note object. Date.now() gives us a unique number to use as an ID,
    // and we save that SAME number as the note's "date", since it's the moment we wrote it.
    const newNote = {
      id: Date.now(),
      text: text,
      color: selectedColor,
      date: Date.now()
    };
 
    notes.push(newNote); // add the new note to the end of our list
 
    noteInput.value = ""; // clear the typing box so it's ready for the next note
 
    saveNotes();   // save the updated list to the browser's notebook
    renderNotes(); // redraw the board so we can see the new note
  }
 
  // Step 8: This function removes a note when you click its ✕ button.
  function deleteNote(id) {
    // "filter" keeps every note EXCEPT the one with the matching id.
    notes = notes.filter(function (note) {
      return note.id !== id;
    });
 
    saveNotes();   // save the updated (shorter) list
    renderNotes(); // redraw the board without the deleted note
  }
 
  // This opens the pop-up so you can EDIT the note's text.
  function openEditModal(id) {
    const note = notes.find(function (n) { return n.id === id; });
    if (!note) return;
 
    activeNoteId = id;
 
    modalDate.textContent = "Written: " + getRelativeTime(note.date);
    modalTextarea.value = note.text;
 
    modalOverlay.classList.remove("hidden");
    modalTextarea.focus(); // put the cursor in the box right away
  }
 
  // This runs when you click "Save Changes" inside the pop-up.
  function saveEditedNote() {
    const newText = modalTextarea.value.trim();
    if (newText === "") return; // don't allow saving an empty note
 
    notes = notes.map(function (note) {
      if (note.id === activeNoteId) {
        note.text = newText; 
      }
      return note;
    });
 
    saveNotes();
    renderNotes();
    closeModal();
  }
 
  function closeModal() {
    modalOverlay.classList.add("hidden");
    activeNoteId = null;
  }
 

  modalCloseBtn.addEventListener("click", closeModal);
  modalSaveBtn.addEventListener("click", saveEditedNote);
 
  modalOverlay.addEventListener("click", function (event) {
    if (event.target === modalOverlay) {
      closeModal();
    }
  });
 
  addNoteBtn.addEventListener("click", addNote);
 
  noteInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault(); // stop it from adding a new line
      addNote();
    }
  });
 
  loadNotes();
  renderNotes();
 
  setInterval(renderNotes, 30000);