import React, { useState } from 'react';
import { Trash2, Edit2, Check, X } from 'lucide-react';
import './NotesTable.css';

const NotesTable = ({ notes, onDeleteNote, onUpdateNote }) => {
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const handleEdit = (e, note, index) => {
    e.stopPropagation();
    setEditingNoteId(note.id);
    setEditValue(note.note_text || '');
  };

  const handleSave = async (e, noteId) => {
    e.stopPropagation();
    if (onUpdateNote) {
      await onUpdateNote(noteId, editValue);
    }
    setEditingNoteId(null);
    setEditValue('');
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    setEditingNoteId(null);
    setEditValue('');
  };

  const handleDelete = async (e, noteId, index) => {
    e.stopPropagation(); // Prevent row selection when clicking delete
    if (window.confirm(`Are you sure you want to delete note ${index + 1}?`)) {
      if (onDeleteNote) {
        await onDeleteNote(noteId);
      }
    }
  };

  return (
    <div className="notes-table-container" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
      <div className="notes-header">
        <h3>Notes</h3>
      </div>
      <div className="notes-table-wrapper" style={{ flex: 1, overflow: 'auto' }}>
        <table className="notes-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>ID</th>
              <th>Value</th>
              <th style={{ width: '120px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {notes && notes.length > 0 ? (
              notes.map((note, index) => (
                <tr
                  key={note.id || index}
                >
                  <td>{index + 1}</td>
                  <td style={{ textAlign: 'left' }}>
                    {editingNoteId === note.id ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="note-edit-textarea"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSave(e, note.id);
                          }
                          if (e.key === 'Escape') {
                            handleCancel(e);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <div className="note-value-cell">{note.note_text || '-'}</div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {editingNoteId === note.id ? (
                      <div className="edit-actions">
                        <button
                          onClick={(e) => handleSave(e, note.id)}
                          className="save-note-button"
                          title="Save"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="cancel-note-button"
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="note-actions">
                        <button
                          onClick={(e) => handleEdit(e, note, index)}
                          className="edit-note-button"
                          title="Edit note"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, note.id, index)}
                          className="delete-note-button"
                          title="Delete note"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  No notes available. Draw on PDF in Notes mode to add notes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NotesTable;

