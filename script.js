// DOM Element Selectors
const noteInput = document.getElementById("noteInput");
const addNoteBtn = document.getElementById("addNoteBtn");
const notesBoard = document.getElementById("notesBoard");
const charCount = document.getElementById("charCount");
const createColorPicker = document.getElementById("createColorPicker");

// Search & Filter Selectors
const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const filterTabs = document.getElementById("filterTabs");
const resultsInfo = document.getElementById("resultsInfo");
const sortSelect = document.getElementById("sortSelect");

// Tab count badges
const countAll = document.getElementById("countAll");
const countPinned = document.getElementById("countPinned");
const countSlate = document.getElementById("countSlate");
const countSage = document.getElementById("countSage");
const countClay = document.getElementById("countClay");
const countPlum = document.getElementById("countPlum");
const countArchived = document.getElementById("countArchived");

// Header Actions (Theme, Export, Import)
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeIcon = document.getElementById("themeIcon");
const themeLabel = document.getElementById("themeLabel");
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");

// Format Helper Buttons (Create)
const formatChecklistBtn = document.getElementById("formatChecklistBtn");
const formatBulletBtn = document.getElementById("formatBulletBtn");
const formatBoldBtn = document.getElementById("formatBoldBtn");
const formatTimeBtn = document.getElementById("formatTimeBtn");

// Format Helper Buttons (Modal)
const modalFormatChecklistBtn = document.getElementById("modalFormatChecklistBtn");
const modalFormatBulletBtn = document.getElementById("modalFormatBulletBtn");
const modalFormatBoldBtn = document.getElementById("modalFormatBoldBtn");

// Modal Elements
const modalOverlay = document.getElementById("modalOverlay");
const modalDate = document.getElementById("modalDate");
const modalTextarea = document.getElementById("modalTextarea");
const modalCharCount = document.getElementById("modalCharCount");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalDuplicateBtn = document.getElementById("modalDuplicateBtn");
const modalCloseIconBtn = document.getElementById("modalCloseIconBtn");
const modalSaveBtn = document.getElementById("modalSaveBtn");
const modalColorPicker = document.getElementById("modalColorPicker");

// Toast Elements
const toast = document.getElementById("toast");
const toastMessage = document.getElementById("toastMessage");
const toastActionBtn = document.getElementById("toastActionBtn");

// Category Display Names & Mappings
const CATEGORY_NAMES = {
  slate: "Slate",
  sage: "Sage",
  clay: "Clay",
  plum: "Plum"
};

// Application State
let notes = [];
let selectedColor = "slate";
let modalSelectedColor = "slate";
let activeNoteId = null;
let activeFilter = "all";
let searchQuery = "";
let currentSort = "newest";
let currentTheme = localStorage.getItem("notebookTheme") || "dark";
let toastTimeout = null;
let lastDeletedNote = null;
let lastDeletedIndex = -1;

// Helper: Escape HTML to prevent XSS
function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Helper: Word and character counter
function getCounts(text) {
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return { words, chars };
}

function updateInputCounters() {
  const { words, chars } = getCounts(noteInput.value);
  charCount.textContent = `${words} ${words === 1 ? 'word' : 'words'} · ${chars} chars`;
}

function updateModalCounters() {
  const { words, chars } = getCounts(modalTextarea.value);
  modalCharCount.textContent = `${words} ${words === 1 ? 'word' : 'words'} · ${chars} chars`;
}

// Theme Management
function applyTheme(theme) {
  currentTheme = theme;
  if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
    themeIcon.className = "fa-solid fa-moon";
    themeLabel.textContent = "Dark";
  } else {
    document.documentElement.removeAttribute("data-theme");
    themeIcon.className = "fa-solid fa-sun";
    themeLabel.textContent = "Light";
  }
  localStorage.setItem("notebookTheme", theme);
}

function toggleTheme() {
  const nextTheme = currentTheme === "light" ? "dark" : "light";
  applyTheme(nextTheme);
  showToast(`Switched to ${nextTheme} theme`);
}

// Storage Management
function loadNotes() {
  try {
    const saved = localStorage.getItem("myStickyNotes");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        notes = parsed.map(note => ({
          id: note.id || Date.now() + Math.random(),
          text: note.text || "",
          color: CATEGORY_NAMES[note.color] ? note.color : "slate",
          date: note.date || Date.now(),
          pinned: Boolean(note.pinned),
          archived: Boolean(note.archived)
        }));
      }
    }
  } catch (err) {
    console.warn("Failed to load notes from localStorage:", err);
    notes = [];
  }
}

function saveNotes() {
  try {
    localStorage.setItem("myStickyNotes", JSON.stringify(notes));
  } catch (err) {
    console.error("Failed to save notes to localStorage:", err);
    showToast("Storage full or unavailable");
  }
  updateFilterCounts();
}

// Relative Time Formatter
function getRelativeTime(timestamp) {
  const now = Date.now();
  const secondsAgo = Math.floor((now - timestamp) / 1000);

  if (secondsAgo < 10) return "Just now";
  if (secondsAgo < 60) return `${secondsAgo}s ago`;

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

  const dateObj = new Date(timestamp);
  return dateObj.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

// Toast System with optional Action Button
function showToast(message, actionText, actionCallback, duration = 4000) {
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  toastMessage.textContent = message;

  if (actionText && typeof actionCallback === "function") {
    toastActionBtn.textContent = actionText;
    toastActionBtn.classList.remove("hidden");
    toastActionBtn.onclick = () => {
      actionCallback();
      hideToast();
    };
  } else {
    toastActionBtn.classList.add("hidden");
    toastActionBtn.onclick = null;
  }

  toast.classList.remove("hidden");

  toastTimeout = setTimeout(() => {
    hideToast();
  }, duration);
}

function hideToast() {
  toast.classList.add("hidden");
  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }
}

// Update counts on filter tabs
function updateFilterCounts() {
  const activeNotes = notes.filter(n => !n.archived);
  const total = activeNotes.length;
  const pinned = activeNotes.filter(n => n.pinned).length;
  const slate = activeNotes.filter(n => n.color === "slate").length;
  const sage = activeNotes.filter(n => n.color === "sage").length;
  const clay = activeNotes.filter(n => n.color === "clay").length;
  const plum = activeNotes.filter(n => n.color === "plum").length;
  const archived = notes.filter(n => n.archived).length;

  if (countAll) countAll.textContent = total;
  if (countPinned) countPinned.textContent = pinned;
  if (countSlate) countSlate.textContent = slate;
  if (countSage) countSage.textContent = sage;
  if (countClay) countClay.textContent = clay;
  if (countPlum) countPlum.textContent = plum;
  if (countArchived) countArchived.textContent = archived;
}

// Highlight matched search terms safely
function highlightText(html, query) {
  if (!query) return html;
  const pattern = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return html.replace(pattern, '<mark class="highlight-match">$1</mark>');
}

// Render Markdown & Checklists inside note body
function renderFormattedNoteContent(rawText, query, noteId) {
  const lines = rawText.split("\n");
  const processedLines = lines.map((line, lineIndex) => {
    const trimmed = line.trim();

    // Checklist unchecked: '- [ ] ' or '[ ] '
    const isTodoUnchecked = trimmed.startsWith("- [ ]") || trimmed.startsWith("[ ]");
    if (isTodoUnchecked) {
      const content = trimmed.replace(/^-\s*\[\s*\]\s*|^\[\s*\]\s*/, "");
      let lineHtml = escapeHTML(content);
      lineHtml = parseInlineMarkdown(lineHtml);
      lineHtml = highlightText(lineHtml, query);
      return `<label class="todo-item" data-note-id="${noteId}" data-line="${lineIndex}">
        <input type="checkbox" data-note-id="${noteId}" data-line="${lineIndex}">
        <span>${lineHtml}</span>
      </label>`;
    }

    // Checklist checked: '- [x] ' or '[x] '
    const isTodoChecked = trimmed.match(/^-\s*\[x\]/i) || trimmed.match(/^\[x\]/i);
    if (isTodoChecked) {
      const content = trimmed.replace(/^-\s*\[[xX]\]\s*|^\[[xX]\]\s*/, "");
      let lineHtml = escapeHTML(content);
      lineHtml = parseInlineMarkdown(lineHtml);
      lineHtml = highlightText(lineHtml, query);
      return `<label class="todo-item done" data-note-id="${noteId}" data-line="${lineIndex}">
        <input type="checkbox" checked data-note-id="${noteId}" data-line="${lineIndex}">
        <span>${lineHtml}</span>
      </label>`;
    }

    // Bullet point: '- ' or '* '
    const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ");
    if (isBullet) {
      const content = trimmed.replace(/^[-*]\s+/, "");
      let lineHtml = escapeHTML(content);
      lineHtml = parseInlineMarkdown(lineHtml);
      lineHtml = highlightText(lineHtml, query);
      return `<div class="bullet-item"><span class="bullet-dot">●</span> <span>${lineHtml}</span></div>`;
    }

    // Standard text line
    let lineHtml = escapeHTML(line);
    lineHtml = parseInlineMarkdown(lineHtml);
    lineHtml = highlightText(lineHtml, query);
    return `<div>${lineHtml || "&nbsp;"}</div>`;
  });

  return processedLines.join("");
}

// Parse inline Markdown (links, bold, code)
function parseInlineMarkdown(text) {
  // URLs -> clickable links
  let result = text.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="note-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> $1</a>'
  );

  // Bold: **text**
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Inline Code: `code`
  result = result.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  return result;
}

// Toggle Checkbox Item directly on the note card
function toggleChecklistLine(noteId, lineIndex) {
  const note = notes.find(n => n.id === noteId);
  if (!note) return;

  const lines = note.text.split("\n");
  if (lineIndex < 0 || lineIndex >= lines.length) return;

  const currentLine = lines[lineIndex];

  // If unchecked, turn to checked
  if (currentLine.match(/^-\s*\[\s*\]/)) {
    lines[lineIndex] = currentLine.replace(/^-\s*\[\s*\]/, "- [x]");
    showToast("Item checked off!");
  } else if (currentLine.match(/^\[\s*\]/)) {
    lines[lineIndex] = currentLine.replace(/^\[\s*\]/, "[x]");
    showToast("Item checked off!");
  } else if (currentLine.match(/^-\s*\[[xX]\]/)) {
    lines[lineIndex] = currentLine.replace(/^-\s*\[[xX]\]/, "- [ ]");
    showToast("Item marked pending");
  } else if (currentLine.match(/^\[[xX]\]/)) {
    lines[lineIndex] = currentLine.replace(/^\[[xX]\]/, "[ ]");
    showToast("Item marked pending");
  }

  note.text = lines.join("\n");
  saveNotes();
  renderNotes();
}

// Render Notes Board
function renderNotes() {
  notesBoard.innerHTML = "";

  // Filter notes by active filter tab
  let filtered = notes.filter(note => {
    if (activeFilter === "archived") {
      return note.archived;
    }
    // All normal tabs only show active (non-archived) notes
    if (note.archived) return false;

    if (activeFilter === "all") return true;
    if (activeFilter === "pinned") return note.pinned;
    return note.color === activeFilter;
  });

  // Filter by search query
  const cleanQuery = searchQuery.trim().toLowerCase();
  if (cleanQuery) {
    filtered = filtered.filter(note => note.text.toLowerCase().includes(cleanQuery));
  }

  // Sort notes: Pinned notes always stay on top first, then sort by selected order
  filtered.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;

    if (currentSort === "oldest") {
      return a.date - b.date;
    } else if (currentSort === "az") {
      return a.text.localeCompare(b.text);
    } else {
      // Default: newest first
      return b.date - a.date;
    }
  });

  // Update results summary if filtered or searched
  const isCustomView = cleanQuery || activeFilter !== "all" || currentSort !== "newest";
  if (isCustomView) {
    resultsInfo.classList.remove("hidden");
    const countText = `${filtered.length} of ${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`;
    const filterLabel = activeFilter !== 'all' ? `in "${activeFilter}"` : '';
    const searchLabel = cleanQuery ? `matching "${cleanQuery}"` : '';
    resultsInfo.innerHTML = `<span>Showing ${countText} ${filterLabel} ${searchLabel}</span>
      <button id="resetFilterBtn" class="toast-action" style="font-size:0.8rem;">Reset Filters</button>`;

    const resetBtn = document.getElementById("resetFilterBtn");
    if (resetBtn) {
      resetBtn.onclick = () => {
        searchInput.value = "";
        searchQuery = "";
        clearSearchBtn.classList.add("hidden");
        sortSelect.value = "newest";
        currentSort = "newest";
        setActiveFilter("all");
      };
    }
  } else {
    resultsInfo.classList.add("hidden");
    resultsInfo.innerHTML = "";
  }

  // Empty state handling
  if (filtered.length === 0) {
    const isFiltered = cleanQuery || activeFilter !== "all";
    notesBoard.innerHTML = `
      <div class="empty-message">
        <div class="empty-icon">
          <i class="${activeFilter === 'archived' ? 'fa-solid fa-box-archive' : 'fa-regular fa-note-sticky'}"></i>
        </div>
        <h3 class="empty-title">
          ${activeFilter === 'archived' 
            ? "No archived notes" 
            : (isFiltered ? "No matching notes found" : "Your ObytNote board is empty")}
        </h3>
        <p class="empty-subtext">
          ${activeFilter === 'archived'
            ? "When you archive notes to clean up your board, they will appear here safely."
            : (isFiltered
                ? "Try adjusting your search query, sorting order, or category filter."
                : "Type your first note or task checklist in the box above to get started!")}
        </p>
      </div>
    `;
    return;
  }

  // Render each note card
  filtered.forEach(note => {
    const noteEl = document.createElement("div");
    noteEl.className = `note ${note.color} ${note.pinned ? "is-pinned" : ""} ${note.archived ? "is-archived" : ""}`;
    noteEl.dataset.id = note.id;

    const { words } = getCounts(note.text);
    const categoryTitle = CATEGORY_NAMES[note.color] || "Note";

    noteEl.innerHTML = `
      <div class="note-top-bar">
        <div class="note-category-indicator">
          <span class="category-name ${note.color}">${categoryTitle}</span>
          ${note.pinned ? '<span class="pinned-badge" title="Pinned to top"><i class="fa-solid fa-thumbtack"></i> Pinned</span>' : ''}
          ${note.archived ? '<span class="archived-badge" title="Archived note"><i class="fa-solid fa-box-archive"></i> Archived</span>' : ''}
        </div>
        <div class="note-icons">
          <button class="icon-btn ${note.pinned ? 'active-pin' : ''}" title="${note.pinned ? 'Unpin note' : 'Pin note to top'}" data-action="pin">
            <i class="fa-solid fa-thumbtack"></i>
          </button>
          <button class="icon-btn" title="Copy to clipboard" data-action="copy">
            <i class="fa-regular fa-copy"></i>
          </button>
          <button class="icon-btn" title="Download as text file" data-action="download">
            <i class="fa-solid fa-file-arrow-down"></i>
          </button>
          <button class="icon-btn" title="${note.archived ? 'Unarchive note' : 'Archive note'}" data-action="archive">
            <i class="fa-solid fa-box-archive"></i>
          </button>
          <button class="icon-btn" title="Edit note" data-action="edit">
            <i class="fa-regular fa-pen-to-square"></i>
          </button>
          <button class="icon-btn delete-btn" title="Delete note" data-action="delete">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </div>
      <div class="note-text">${renderFormattedNoteContent(note.text, cleanQuery, note.id)}</div>
      <div class="note-footer">
        <span class="note-date"><i class="fa-regular fa-clock"></i> ${getRelativeTime(note.date)}</span>
        <span class="note-word-count">${words} ${words === 1 ? 'word' : 'words'}</span>
      </div>
    `;

    // Event Delegation for action buttons
    const iconsContainer = noteEl.querySelector(".note-icons");
    iconsContainer.addEventListener("click", e => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      e.stopPropagation();

      const action = btn.dataset.action;
      if (action === "pin") togglePinNote(note.id);
      else if (action === "copy") copyNoteText(note.id, btn);
      else if (action === "download") downloadSingleNote(note.id);
      else if (action === "duplicate") duplicateNote(note.id);
      else if (action === "archive") toggleArchiveNote(note.id);
      else if (action === "edit") openEditModal(note.id);
      else if (action === "delete") deleteNote(note.id);
    });

    // Checkbox click delegation for interactive checklists
    const noteTextEl = noteEl.querySelector(".note-text");
    noteTextEl.addEventListener("change", e => {
      if (e.target && e.target.type === "checkbox") {
        const lineIdx = parseInt(e.target.dataset.line, 10);
        toggleChecklistLine(note.id, lineIdx);
      }
    });

    notesBoard.appendChild(noteEl);
  });
}

// Add Note Action
function addNote() {
  const text = noteInput.value.trim();
  if (text === "") {
    noteInput.focus();
    return;
  }

  const newNote = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    text: text,
    color: selectedColor,
    date: Date.now(),
    pinned: false,
    archived: false
  };

  notes.unshift(newNote);
  noteInput.value = "";
  updateInputCounters();

  saveNotes();
  renderNotes();
  showToast("Note added successfully");
}

// Pin / Unpin Action
function togglePinNote(id) {
  notes = notes.map(note => {
    if (note.id === id) {
      const nextPinned = !note.pinned;
      showToast(nextPinned ? "Note pinned to top" : "Note unpinned");
      return { ...note, pinned: nextPinned };
    }
    return note;
  });

  saveNotes();
  renderNotes();
}

// Archive / Unarchive Action
function toggleArchiveNote(id) {
  notes = notes.map(note => {
    if (note.id === id) {
      const nextArchived = !note.archived;
      showToast(nextArchived ? "Note moved to archive" : "Note restored from archive", "Undo", () => {
        toggleArchiveNote(id);
      });
      return { ...note, archived: nextArchived };
    }
    return note;
  });

  saveNotes();
  renderNotes();
}

// Copy Note Text Action
function copyNoteText(id, btnElement) {
  const note = notes.find(n => n.id === id);
  if (!note) return;

  navigator.clipboard.writeText(note.text).then(() => {
    if (btnElement) {
      btnElement.classList.add("copied-btn");
      btnElement.innerHTML = `<i class="fa-solid fa-check"></i>`;
      setTimeout(() => {
        btnElement.classList.remove("copied-btn");
        btnElement.innerHTML = `<i class="fa-regular fa-copy"></i>`;
      }, 1500);
    }
    showToast("Copied note to clipboard!");
  }).catch(err => {
    console.error("Clipboard write failed:", err);
    showToast("Failed to copy to clipboard");
  });
}

// Download Single Note as .txt
function downloadSingleNote(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;

  const dateStr = new Date(note.date).toLocaleString();
  const fileContent = `OBYTNOTE NOTE\nCategory: ${CATEGORY_NAMES[note.color] || note.color}\nDate: ${dateStr}\n----------------------------------------\n\n${note.text}\n`;

  const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const snippet = note.text.slice(0, 15).replace(/[^a-z0-9]/gi, "_").toLowerCase() || "note";
  a.href = url;
  a.download = `obytnote-${snippet}-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast("Note downloaded as .txt");
}

// Duplicate Note Action
function duplicateNote(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;

  const duplicated = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    text: note.text,
    color: note.color,
    date: Date.now(),
    pinned: false,
    archived: note.archived
  };

  const targetIndex = notes.findIndex(n => n.id === id);
  notes.splice(targetIndex + 1, 0, duplicated);

  saveNotes();
  renderNotes();
  showToast("Note duplicated");
}

// Delete Note Action with Undo
function deleteNote(id) {
  const index = notes.findIndex(n => n.id === id);
  if (index === -1) return;

  lastDeletedNote = notes[index];
  lastDeletedIndex = index;

  notes = notes.filter(n => n.id !== id);
  saveNotes();
  renderNotes();

  showToast("Note deleted", "Undo", () => {
    if (lastDeletedNote) {
      notes.splice(lastDeletedIndex, 0, lastDeletedNote);
      saveNotes();
      renderNotes();
      showToast("Note restored!");
      lastDeletedNote = null;
      lastDeletedIndex = -1;
    }
  });
}

// Edit Modal Handling
function openEditModal(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;

  activeNoteId = id;
  modalSelectedColor = note.color || "slate";

  const dateStr = new Date(note.date).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
  modalDate.textContent = `Created: ${dateStr} (${getRelativeTime(note.date)})`;
  modalTextarea.value = note.text;
  updateModalCounters();

  // Set modal color picker state
  const dots = modalColorPicker.querySelectorAll(".color-dot");
  dots.forEach(dot => {
    if (dot.dataset.color === modalSelectedColor) {
      dot.classList.add("selected");
    } else {
      dot.classList.remove("selected");
    }
  });

  modalOverlay.classList.remove("hidden");
  modalTextarea.focus();
}

function saveEditedNote() {
  const newText = modalTextarea.value.trim();
  if (newText === "") {
    showToast("Note cannot be empty");
    return;
  }

  notes = notes.map(note => {
    if (note.id === activeNoteId) {
      return {
        ...note,
        text: newText,
        color: modalSelectedColor
      };
    }
    return note;
  });

  saveNotes();
  renderNotes();
  closeModal();
  showToast("Changes saved");
}

function closeModal() {
  modalOverlay.classList.add("hidden");
  activeNoteId = null;
}

// Format Helper Insert Logic
function insertTextAtCursor(textarea, prefix, suffix = "") {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selectedText = text.substring(start, end);

  // If text already selected, wrap it
  const replacement = prefix + (selectedText || "") + suffix;
  textarea.value = text.substring(0, start) + replacement + text.substring(end);

  const newCursorPos = start + prefix.length + (selectedText ? selectedText.length : 0);
  textarea.focus();
  textarea.setSelectionRange(newCursorPos, newCursorPos);

  if (textarea === noteInput) updateInputCounters();
  if (textarea === modalTextarea) updateModalCounters();
}

// Export Notes as JSON file
function exportNotes() {
  if (notes.length === 0) {
    showToast("No notes to export");
    return;
  }

  const exportData = {
    exportedAt: new Date().toISOString(),
    app: "ObytNote",
    count: notes.length,
    notes: notes
  };

  const jsonString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
  const downloadAnchor = document.createElement("a");
  const dateFormatted = new Date().toISOString().slice(0, 10);
  downloadAnchor.setAttribute("href", jsonString);
  downloadAnchor.setAttribute("download", `obytnote-notes-${dateFormatted}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();

  showToast(`Exported ${notes.length} notes`);
}

// Import Notes from JSON file
function handleImport(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      const incomingNotes = Array.isArray(parsed) ? parsed : (parsed.notes && Array.isArray(parsed.notes) ? parsed.notes : null);

      if (!incomingNotes) {
        showToast("Invalid notes backup file");
        return;
      }

      let importedCount = 0;
      const existingIds = new Set(notes.map(n => n.id));

      incomingNotes.forEach(item => {
        if (item && item.text) {
          const newId = existingIds.has(item.id) ? Date.now() + Math.random() : (item.id || Date.now() + Math.random());
          existingIds.add(newId);
          notes.unshift({
            id: newId,
            text: String(item.text),
            color: CATEGORY_NAMES[item.color] ? item.color : "slate",
            date: Number(item.date) || Date.now(),
            pinned: Boolean(item.pinned),
            archived: Boolean(item.archived)
          });
          importedCount++;
        }
      });

      saveNotes();
      renderNotes();
      showToast(`Successfully imported ${importedCount} notes!`);
    } catch (err) {
      console.error("Import failed:", err);
      showToast("Error parsing backup file");
    } finally {
      importInput.value = "";
    }
  };

  reader.readAsText(file);
}

// Filter Tab Selection
function setActiveFilter(filterName) {
  activeFilter = filterName;
  const tabs = filterTabs.querySelectorAll(".filter-tab");
  tabs.forEach(tab => {
    if (tab.dataset.filter === filterName) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });
  renderNotes();
}

// Setup Color Picker Clicks
function setupColorPickers() {
  createColorPicker.addEventListener("click", e => {
    const dot = e.target.closest(".color-dot");
    if (!dot) return;
    selectedColor = dot.dataset.color;
    createColorPicker.querySelectorAll(".color-dot").forEach(d => d.classList.remove("selected"));
    dot.classList.add("selected");
  });

  modalColorPicker.addEventListener("click", e => {
    const dot = e.target.closest(".color-dot");
    if (!dot) return;
    modalSelectedColor = dot.dataset.color;
    modalColorPicker.querySelectorAll(".color-dot").forEach(d => d.classList.remove("selected"));
    dot.classList.add("selected");
  });
}

// Wire Event Listeners
function initializeEvents() {
  // Theme Toggle
  themeToggleBtn.addEventListener("click", toggleTheme);

  // Add Note
  addNoteBtn.addEventListener("click", addNote);

  // Note Input Live Counting & Shortcut
  noteInput.addEventListener("input", updateInputCounters);
  noteInput.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      addNote();
    }
  });

  // Format Helpers in Note Input
  formatChecklistBtn.addEventListener("click", () => {
    const prefix = noteInput.value.length === 0 || noteInput.value.endsWith("\n") ? "- [ ] " : "\n- [ ] ";
    insertTextAtCursor(noteInput, prefix);
  });

  formatBulletBtn.addEventListener("click", () => {
    const prefix = noteInput.value.length === 0 || noteInput.value.endsWith("\n") ? "- " : "\n- ";
    insertTextAtCursor(noteInput, prefix);
  });

  formatBoldBtn.addEventListener("click", () => {
    insertTextAtCursor(noteInput, "**", "**");
  });

  formatTimeBtn.addEventListener("click", () => {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateNow = new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });
    insertTextAtCursor(noteInput, `[${dateNow} ${timeNow}] `);
  });

  // Format Helpers in Edit Modal
  modalFormatChecklistBtn.addEventListener("click", () => {
    const prefix = modalTextarea.value.length === 0 || modalTextarea.value.endsWith("\n") ? "- [ ] " : "\n- [ ] ";
    insertTextAtCursor(modalTextarea, prefix);
  });

  modalFormatBulletBtn.addEventListener("click", () => {
    const prefix = modalTextarea.value.length === 0 || modalTextarea.value.endsWith("\n") ? "- " : "\n- ";
    insertTextAtCursor(modalTextarea, prefix);
  });

  modalFormatBoldBtn.addEventListener("click", () => {
    insertTextAtCursor(modalTextarea, "**", "**");
  });

  // Modal Save, Duplicate & Close
  modalSaveBtn.addEventListener("click", saveEditedNote);
  modalDuplicateBtn.addEventListener("click", () => {
    if (activeNoteId) {
      duplicateNote(activeNoteId);
      closeModal();
    }
  });
  modalCloseBtn.addEventListener("click", closeModal);
  modalCloseIconBtn.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", e => {
    if (e.target === modalOverlay) closeModal();
  });

  modalTextarea.addEventListener("input", updateModalCounters);
  modalTextarea.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      saveEditedNote();
    }
  });

  // Sort Selection
  sortSelect.addEventListener("change", e => {
    currentSort = e.target.value;
    renderNotes();
  });

  // Filter Tabs
  filterTabs.addEventListener("click", e => {
    const tab = e.target.closest(".filter-tab");
    if (!tab) return;
    setActiveFilter(tab.dataset.filter);
  });

  // Live Search
  searchInput.addEventListener("input", e => {
    searchQuery = e.target.value;
    if (searchQuery.trim().length > 0) {
      clearSearchBtn.classList.remove("hidden");
    } else {
      clearSearchBtn.classList.add("hidden");
    }
    renderNotes();
  });

  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    searchQuery = "";
    clearSearchBtn.classList.add("hidden");
    searchInput.focus();
    renderNotes();
  });

  // Export & Import
  exportBtn.addEventListener("click", exportNotes);
  importInput.addEventListener("change", handleImport);

  // Global Keyboard Shortcuts
  document.addEventListener("keydown", e => {
    // Escape closes modal or clears search
    if (e.key === "Escape") {
      if (!modalOverlay.classList.contains("hidden")) {
        closeModal();
      } else if (searchQuery) {
        searchInput.value = "";
        searchQuery = "";
        clearSearchBtn.classList.add("hidden");
        renderNotes();
      }
    }

    // '/' to jump focus to search box (unless typing in input/textarea)
    if (e.key === "/" && document.activeElement !== noteInput && document.activeElement !== modalTextarea && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
    }
  });

  setupColorPickers();
}

// Initial Boot
applyTheme(currentTheme);
loadNotes();
initializeEvents();
updateInputCounters();
updateFilterCounts();
renderNotes();

// Auto-refresh relative timestamps every 30 seconds
setInterval(renderNotes, 30000);
